/**
 * @file src/services/restaurantService.ts
 * @description Restoran İşlemleri Servisi - YENİ FİNANSAL MİMARİ
 * 
 * KRİTİK DEĞİŞİKLİK:
 * restaurant_debts artık "Paket Masrafı Borçları"nı temsil ediyor
 * 
 * YENİ FORMÜL:
 * Brüt Ciro = SUM(packages.amount)
 * Toplam Masraf = SUM(restaurant_debts.amount)
 * Net Ödenmesi Gereken = (Brüt Ciro - Toplam Masraf) - Önceki Ödemeler
 */
import { supabase } from '@/app/lib/supabase'

/**
 * Restoran finansal özeti - SQL fonksiyonunu çağır
 */
export async function getRestaurantFinancialSummary(
    restaurantId: string,
    startDate?: string,
    endDate?: string
) {
    try {
        const { data, error } = await supabase.rpc('get_restaurant_financial_summary', {
            p_restaurant_id: restaurantId,
            p_start_date: startDate || null,
            p_end_date: endDate || null
        })

        if (error) throw error

        return {
            success: true,
            data: data[0] || {
                brut_ciro: 0,
                toplam_masraf: 0,
                net_hakedis: 0,
                onceki_odemeler: 0,
                net_odenecek: 0,
                paket_sayisi: 0
            }
        }
    } catch (error) {
        console.error('Finansal özet hatası:', error)
        return { success: false, error }
    }
}

/**
 * Restoran hesap ödeme işlemi - YENİ MİMARİ
 * 
 * MANTIK:
 * 1. Ödeme kaydı oluştur (restaurant_payment_transactions)
 * 2. Paket masraflarını 'paid' olarak işaretle (restaurant_debts)
 * 3. Siparişleri settled olarak işaretle (packages)
 */
/**
 * Restoran hesap ödeme işlemi - YENİ MİMARİ + NÜKLEER HATA YAKALAMA
 * 
 * MANTIK:
 * 1. Ödeme kaydı oluştur (restaurant_payment_transactions)
 * 2. Paket masraflarını 'paid' olarak işaretle (restaurant_debts)
 * 3. Siparişleri settled olarak işaretle (packages)
 */
export async function handleRestaurantPayment(
    restaurantId: number | string,
    data: {
        brutCiro: number          // Toplam paket tutarı
        toplamMasraf: number      // restaurant_debts toplamı
        netHakedis: number        // Ciro - Masraf
        amountPaid: number        // Ödenen tutar
        orderIds: number[]        // Hangi siparişler
        packageCount: number      // Kaç paket
    }
) {
    try {
        const { brutCiro, toplamMasraf, netHakedis, amountPaid, orderIds, packageCount } = data

        // 🔴 GUARD CLAUSE: Validasyon
        if (amountPaid <= 0) {
            console.error('❌ VALIDASYON HATASI: Ödeme tutarı sıfırdan büyük olmalı', { amountPaid })
            return { 
                success: false, 
                error: { message: 'Ödeme tutarı sıfırdan büyük olmalıdır' }
            }
        }

        if (amountPaid > netHakedis) {
            console.error('❌ VALIDASYON HATASI: Ödeme tutarı net hakediş tutarından fazla', { amountPaid, netHakedis })
            return { 
                success: false, 
                error: { message: `Ödeme tutarı (${amountPaid}₺) net hakediş tutarından (${netHakedis}₺) fazla olamaz` }
            }
        }

        // 🔥 NÜKLEER LOG: INSERT öncesi veriyi logla
        const insertPayload = {
            restaurant_id: restaurantId,
            transaction_date: new Date().toISOString().split('T')[0],
            brut_ciro: brutCiro,
            toplam_masraf: toplamMasraf,
            net_hakedis: netHakedis,
            amount_paid: amountPaid,
            package_count: packageCount,
            order_ids: orderIds,
            notes: `${amountPaid === netHakedis ? 'Tam ödeme' : 'Kısmi ödeme'} - ${packageCount} paket`
        }
        
        console.log('💾 SUPABASE INSERT BAŞLIYOR:', {
            table: 'restaurant_payment_transactions',
            payload: insertPayload
        })

        // 1. Ödeme işlemi kaydı oluştur (AUDIT LOG)
        const { data: insertedData, error: transactionError } = await supabase
            .from('restaurant_payment_transactions')
            .insert(insertPayload)
            .select()

        // 🔴 HATA KONTROLÜ: INSERT başarısız mı?
        if (transactionError) {
            console.error('❌ SUPABASE INSERT HATASI:', {
                error: transactionError,
                message: transactionError.message,
                details: transactionError.details,
                hint: transactionError.hint,
                code: transactionError.code,
                payload: insertPayload
            })
            return { 
                success: false, 
                error: { 
                    message: `Ödeme kaydı oluşturulamadı: ${transactionError.message}`,
                    details: transactionError.details,
                    hint: transactionError.hint,
                    code: transactionError.code
                }
            }
        }

        // 🔴 HATA KONTROLÜ: Veri döndü mü?
        if (!insertedData || insertedData.length === 0) {
            console.error('❌ SUPABASE INSERT: Veri döndürülmedi', { insertedData })
            return { 
                success: false, 
                error: { message: 'Ödeme kaydı oluşturuldu ama veri döndürülmedi (RLS sorunu olabilir)' }
            }
        }

        console.log('✅ SUPABASE INSERT BAŞARILI:', insertedData[0])

        // 2. Paket masraflarını 'paid' olarak işaretle
        // Ödenen tutara göre en eski masraflardan başlayarak işaretle
        const { data: debts, error: debtFetchError } = await supabase
            .from('restaurant_debts')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'pending')
            .order('debt_date', { ascending: true })

        if (debtFetchError) {
            console.error('❌ MASRAF FETCH HATASI:', {
                error: debtFetchError,
                message: debtFetchError.message,
                restaurantId
            })
            return { 
                success: false, 
                error: { message: `Masraflar alınamadı: ${debtFetchError.message}` }
            }
        }

        console.log('📦 MASRAFLAR ALINDI:', { count: debts?.length || 0, debts })

        let remainingPayment = amountPaid
        const paidDebtIds: string[] = []

        for (const debt of debts || []) {
            if (remainingPayment <= 0) break

            if (remainingPayment >= debt.amount) {
                // Bu masrafı tamamen öde
                const { error: updateError } = await supabase
                    .from('restaurant_debts')
                    .update({
                        status: 'paid',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', debt.id)

                if (updateError) {
                    console.error('❌ MASRAF UPDATE HATASI:', {
                        error: updateError,
                        debtId: debt.id,
                        amount: debt.amount
                    })
                    // Devam et, diğer masrafları öde
                } else {
                    console.log('✅ MASRAF ÖDENDİ:', { debtId: debt.id, amount: debt.amount })
                }

                remainingPayment -= debt.amount
                paidDebtIds.push(debt.id)
            } else {
                // Kısmi ödeme - bu masrafı bölemeyiz, sonraki ödemede ödenecek
                console.log('⚠️ KISMI ÖDEME: Kalan tutar masrafı karşılamıyor', {
                    remainingPayment,
                    debtAmount: debt.amount
                })
                break
            }
        }

        // 3. Siparişleri settled olarak işaretle
        const { error: updateError } = await supabase
            .from('packages')
            .update({ restaurant_settled_at: new Date().toISOString() })
            .in('id', orderIds)

        if (updateError) {
            console.error('❌ PACKAGE UPDATE HATASI:', {
                error: updateError,
                orderIds
            })
            // Bu kritik değil, devam et
        } else {
            console.log('✅ SİPARİŞLER SETTLED:', { count: orderIds.length })
        }

        const successMsg = amountPaid === netHakedis ? '✅ Tam ödeme yapıldı' : '⚠️ Kısmi ödeme yapıldı'
        console.log('🎉 ÖDEME İŞLEMİ TAMAMLANDI:', {
            message: successMsg,
            paidDebtCount: paidDebtIds.length,
            remainingAmount: remainingPayment
        })

        return { 
            success: true,
            paidDebtCount: paidDebtIds.length,
            remainingAmount: remainingPayment,
            message: successMsg
        }
    } catch (error: any) {
        console.error('❌ BEKLENMEYEN HATA (handleRestaurantPayment):', {
            error,
            message: error.message,
            stack: error.stack,
            restaurantId,
            data
        })
        return { 
            success: false, 
            error: { message: error.message || 'Bilinmeyen hata' }
        }
    }
}

/**
 * Restoran borç ödeme işlemi - Sadece eski masrafları öde
 * (Bu fonksiyon artık çok kullanılmayacak, handleRestaurantPayment tercih edilmeli)
 */
export async function handleRestaurantDebtPayment(
    restaurantId: number | string,
    amount: number
) {
    try {
        if (amount <= 0) {
            throw new Error('Ödeme tutarı sıfırdan büyük olmalıdır')
        }

        // Bekleyen masrafları al
        const { data: debts, error: debtFetchError } = await supabase
            .from('restaurant_debts')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'pending')
            .order('debt_date', { ascending: true })

        if (debtFetchError) throw debtFetchError

        const totalDebt = (debts || []).reduce((sum, d) => sum + d.amount, 0)

        if (amount > totalDebt) {
            throw new Error('Ödeme tutarı toplam masraftan fazla olamaz')
        }

        let remainingPayment = amount
        let paidToDebts = 0

        // En eski masraftan başlayarak öde
        for (const debt of debts || []) {
            if (remainingPayment <= 0) break

            if (remainingPayment >= debt.amount) {
                // Bu masrafı tamamen öde
                await supabase
                    .from('restaurant_debts')
                    .update({
                        status: 'paid',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', debt.id)

                remainingPayment -= debt.amount
                paidToDebts += debt.amount
            } else {
                // Kısmi ödeme - bu masrafı bölemeyiz
                break
            }
        }

        // İşlem kaydı oluştur
        await supabase
            .from('restaurant_payment_transactions')
            .insert({
                restaurant_id: restaurantId,
                transaction_date: new Date().toISOString().split('T')[0],
                brut_ciro: 0,
                toplam_masraf: totalDebt,
                net_hakedis: -totalDebt,
                amount_paid: paidToDebts,
                package_count: 0,
                order_ids: [],
                notes: 'Sadece masraf ödemesi'
            })

        return { 
            success: true, 
            paidAmount: paidToDebts, 
            remainingDebt: totalDebt - paidToDebts,
            message: '✅ Masraf ödemesi yapıldı'
        }
    } catch (error) {
        console.error('Restoran masraf ödeme hatası:', error)
        return { success: false, error }
    }
}
