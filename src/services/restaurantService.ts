/**
 * @file src/services/restaurantService.ts
 * @description Restoran İşlemleri Servisi.
 * Restoranlarla ilgili finansal ve operasyonel işlemleri yönetir. 
 * Restoran ödemeleri ve borç kapatma süreçlerini koordine eder.
 */
import { supabase } from '@/app/lib/supabase'
import { RestaurantDebt } from '@/types'

/**
 * Restoran hesap ödeme işlemi
 */
export async function handleRestaurantPayment(
    restaurantId: number | string,
    data: {
        totalOrderAmount: number
        amountPaid: number
        orderIds: number[]
    }
) {
    try {
        const { totalOrderAmount, amountPaid, orderIds } = data

        if (amountPaid > totalOrderAmount) {
            throw new Error('Fazla tutar girdiniz, lütfen ödemeyi kontrol edin')
        }

        const difference = totalOrderAmount - amountPaid
        let newDebtAmount = 0

        // Eksik ödeme varsa borç kaydı oluştur
        if (difference > 0) {
            newDebtAmount = difference

            await supabase
                .from('restaurant_debts')
                .insert({
                    restaurant_id: restaurantId,
                    debt_date: new Date().toISOString().split('T')[0],
                    amount: newDebtAmount,
                    remaining_amount: newDebtAmount,
                    status: 'pending'
                })
        }

        // Siparişleri settled olarak işaretle
        await supabase
            .from('packages')
            .update({ restaurant_settled_at: new Date().toISOString() })
            .in('id', orderIds)

        // İşlem kaydı oluştur
        await supabase
            .from('restaurant_payment_transactions')
            .insert({
                restaurant_id: restaurantId,
                transaction_date: new Date().toISOString().split('T')[0],
                total_order_amount: totalOrderAmount,
                amount_paid: amountPaid,
                new_debt_amount: newDebtAmount,
                payment_to_debts: 0,
                notes: `Hesap ödemesi - ${difference === 0 ? 'Tam' : 'Eksik'}`
            })

        return { success: true, newDebtAmount }
    } catch (error) {
        console.error('Restoran ödeme hatası:', error)
        return { success: false, error }
    }
}

/**
 * Restoran borç ödeme işlemi
 */
export async function handleRestaurantDebtPayment(
    restaurantId: number | string,
    amount: number,
    debts: RestaurantDebt[]
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
                .from('restaurant_debts')
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
                .from('restaurant_debts')
                .insert({
                    restaurant_id: restaurantId,
                    debt_date: new Date().toISOString().split('T')[0],
                    amount: newDebtAmount,
                    remaining_amount: newDebtAmount,
                    status: 'pending'
                })
        }

        return { success: true, paidAmount: paidToDebts, newDebtAmount }
    } catch (error) {
        console.error('Restoran borç ödeme hatası:', error)
        return { success: false, error }
    }
}
