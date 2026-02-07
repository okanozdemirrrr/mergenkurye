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

        // Tüm eski borçları sil (paid olarak işaretle)
        for (const debt of oldDebts) {
            await supabase
                .from('courier_debts')
                .update({
                    remaining_amount: 0,
                    status: 'paid'
                })
                .eq('id', debt.id)
        }

        let newDebtAmount = 0
        let paymentToDebts = totalOldDebt

        // Eğer ödeme yetersizse, farkı yeni borç olarak kaydet
        if (difference > 0) {
            newDebtAmount = difference

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

        // Tüm eski borçları sil (paid olarak işaretle)
        for (const debt of debts) {
            await supabase
                .from('courier_debts')
                .update({
                    remaining_amount: 0,
                    status: 'paid'
                })
                .eq('id', debt.id)
        }

        // Eğer ödeme toplam borçtan azsa, farkı yeni borç olarak kaydet
        if (amount < totalDebt) {
            const newDebtAmount = totalDebt - amount

            await supabase
                .from('courier_debts')
                .insert({
                    courier_id: courierId,
                    debt_date: new Date().toISOString().split('T')[0],
                    amount: newDebtAmount,
                    remaining_amount: newDebtAmount,
                    status: 'pending'
                })

            return { success: true, paidAmount: amount, newDebtAmount }
        }

        // Tam ödeme veya fazla ödeme durumunda sadece eski borçları kapat
        return { success: true, paidAmount: amount, newDebtAmount: 0 }
    } catch (error) {
        console.error('Borç ödeme hatası:', error)
        return { success: false, error }
    }
}
