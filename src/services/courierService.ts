/**
 * @file src/services/courierService.ts
 * @description Kurye İşlemleri Servisi.
 * Kuryelerle ilgili iş mantığını (Business Logic) içerir. Gün sonu hesap kapatma, 
 * borç ödeme işlemleri ve veritabanı güncellemelerini yönetir.
 */
import { supabase } from '@/app/lib/supabase'
import { CourierDebt } from '@/types'

/**
 * Gün sonu kasası işlemi
 */
export async function handleEndOfDay(
    courierId: string,
    data: {
        dailyCashTotal: number
        amountReceived: number
        oldDebts: CourierDebt[]
    }
) {
    try {
        const { dailyCashTotal, amountReceived, oldDebts } = data
        const totalOldDebt = oldDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
        const grandTotal = dailyCashTotal + totalOldDebt
        const difference = grandTotal - amountReceived

        let newDebtAmount = 0
        let paymentToDebts = 0

        if (difference > 0) {
            // Eksik ödeme - önce eski borçları öde
            let remainingPayment = amountReceived - dailyCashTotal

            if (remainingPayment > 0) {
                // Eski borçlara ödeme yap (en eskiden başlayarak)
                const sortedDebts = [...oldDebts].sort((a, b) =>
                    new Date(a.debt_date).getTime() - new Date(b.debt_date).getTime()
                )

                for (const debt of sortedDebts) {
                    if (remainingPayment <= 0) break

                    const paymentAmount = Math.min(remainingPayment, debt.remaining_amount)
                    const newRemaining = debt.remaining_amount - paymentAmount

                    await supabase
                        .from('courier_debts')
                        .update({
                            remaining_amount: newRemaining,
                            status: newRemaining === 0 ? 'paid' : 'pending'
                        })
                        .eq('id', debt.id)

                    remainingPayment -= paymentAmount
                    paymentToDebts += paymentAmount
                }
            }

            newDebtAmount = difference - paymentToDebts
        } else if (difference < 0) {
            // Fazla ödeme - tüm borçları kapat
            paymentToDebts = totalOldDebt

            for (const debt of oldDebts) {
                await supabase
                    .from('courier_debts')
                    .update({
                        remaining_amount: 0,
                        status: 'paid'
                    })
                    .eq('id', debt.id)
            }
        } else {
            // Tam ödeme
            paymentToDebts = totalOldDebt

            for (const debt of oldDebts) {
                await supabase
                    .from('courier_debts')
                    .update({
                        remaining_amount: 0,
                        status: 'paid'
                    })
                    .eq('id', debt.id)
            }
        }

        // Yeni borç kaydı oluştur (eğer varsa)
        if (newDebtAmount > 0) {
            await supabase
                .from('courier_debts')
                .insert({
                    courier_id: courierId,
                    debt_date: new Date().toISOString().split('T')[0],
                    amount: newDebtAmount,
                    remaining_amount: newDebtAmount,
                    status: 'pending'
                })
        }

        // İşlem kaydı oluştur
        await supabase
            .from('debt_transactions')
            .insert({
                courier_id: courierId,
                transaction_date: new Date().toISOString().split('T')[0],
                daily_cash_total: dailyCashTotal,
                amount_received: amountReceived,
                new_debt_amount: newDebtAmount,
                payment_to_debts: paymentToDebts,
                notes: `Gün sonu kasası - ${difference > 0 ? 'Açık' : difference < 0 ? 'Bahşiş' : 'Tam'}`
            })

        return { success: true, newDebtAmount, paymentToDebts }
    } catch (error) {
        console.error('Gün sonu işlem hatası:', error)
        return { success: false, error }
    }
}

/**
 * Borç ödeme işlemi
 */
export async function handlePayDebt(
    courierId: string,
    amount: number,
    debts: CourierDebt[]
) {
    try {
        const totalDebt = debts.reduce((sum, d) => sum + d.remaining_amount, 0)

        if (amount > totalDebt) {
            throw new Error('Ödeme tutarı toplam borçtan fazla olamaz')
        }

        let remainingPayment = amount
        let paidToDebts = 0

        // En eski borçtan başlayarak öde
        const sortedDebts = [...debts].sort((a, b) =>
            new Date(a.debt_date).getTime() - new Date(b.debt_date).getTime()
        )

        for (const debt of sortedDebts) {
            if (remainingPayment <= 0) break

            const paymentAmount = Math.min(remainingPayment, debt.remaining_amount)
            const newRemaining = debt.remaining_amount - paymentAmount

            await supabase
                .from('courier_debts')
                .update({
                    remaining_amount: newRemaining,
                    status: newRemaining === 0 ? 'paid' : 'pending'
                })
                .eq('id', debt.id)

            remainingPayment -= paymentAmount
            paidToDebts += paymentAmount
        }

        // Kalan tutar varsa yeni borç olarak kaydet
        const newDebtAmount = totalDebt - amount

        if (newDebtAmount > 0) {
            await supabase
                .from('courier_debts')
                .insert({
                    courier_id: courierId,
                    debt_date: new Date().toISOString().split('T')[0],
                    amount: newDebtAmount,
                    remaining_amount: newDebtAmount,
                    status: 'pending'
                })
        }

        return { success: true, paidAmount: paidToDebts, newDebtAmount }
    } catch (error) {
        console.error('Borç ödeme hatası:', error)
        return { success: false, error }
    }
}
