import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseCustomerNote } from '../parseCustomerNote'
import { extractPhoneFromAddressDescription } from '../extractPhoneFromAddressDescription'
import { mapPayment } from '../mapPayment'
import { mapLines } from '../mapLines'
import { mapPackageToLocal } from '../mapPackageToLocal'
import {
  fixtureCancelled,
  fixtureMealCard,
  fixtureModel1Store,
  fixtureModel2Go,
  fixtureUnknownPayment,
} from '../__fixtures__/samplePackages'

describe('parseCustomerNote', () => {
  it('restoran / kurye / servis ayırır', () => {
    const n = parseCustomerNote(fixtureModel1Store.customerNote)
    assert.ok(n.mutfakNotu?.includes('tavuk'))
    assert.ok(n.kuryeNotu?.toLowerCase().includes('5dk'))
    assert.equal(n.servisIstiyorMu, true)
    assert.ok(n.ham.length > 0)
  })

  it('öneksiz metni genel not yapar', () => {
    const n = parseCustomerNote('Kapıda zili çalın')
    assert.equal(n.genelNot, 'Kapıda zili çalın')
    assert.equal(n.mutfakNotu, null)
    assert.equal(n.kuryeNotu, null)
  })
})

describe('extractPhoneFromAddressDescription', () => {
  it('tarif içinden telefon yakalar', () => {
    const phone = extractPhoneFromAddressDescription(
      fixtureModel1Store.address?.addressDescription
    )
    assert.equal(phone, '05310311211')
  })

  it('yoksa null döner', () => {
    const phone = extractPhoneFromAddressDescription(
      fixtureMealCard.address?.addressDescription
    )
    assert.equal(phone, null)
  })
})

describe('mapPayment', () => {
  it('PAY_WITH_CARD → online, tahsilat yok', () => {
    const p = mapPayment({ paymentType: 'PAY_WITH_CARD' })
    assert.equal(p.paymentMethod, 'online')
    assert.equal(p.courierCollectsPayment, false)
  })

  it('PAY_WITH_MEAL_CARD → meal source', () => {
    const p = mapPayment(fixtureMealCard.payment)
    assert.equal(p.paymentMethod, 'online')
    assert.equal(p.mealCardSource, 'PLUXEE - ONLINE')
    assert.equal(p.courierCollectsPayment, false)
  })

  it('PAY_WITH_ON_DELIVERY CASH → tahsilat', () => {
    const p = mapPayment(fixtureModel1Store.payment)
    assert.equal(p.courierCollectsPayment, true)
    assert.equal(p.paymentMethod, 'cash')
  })

  it('bilinmeyen paymentType → düşürmez', () => {
    const p = mapPayment(fixtureUnknownPayment.payment)
    assert.equal(p.unknownPaymentType, true)
    assert.ok(p.paymentTypeRaw.includes('SOMETHING') || p.paymentTypeRaw === 'bilinmeyen' || p.paymentTypeRaw.length > 0)
  })
})

describe('mapLines', () => {
  it('adet = items length; modifier fiyat ekler', () => {
    const { items, unmatchedProductIds } = mapLines(fixtureModel1Store.lines)
    assert.equal(items[0].quantity, 1)
    assert.equal(items[1].quantity, 2)
    // 120 + 15 + 5 = 140 (extra ingredients ayrı option, unit price modifier sum)
    assert.equal(items[0].price, 140)
    assert.ok(items[0].selected_options.some((o) => o.option_name.includes('Cheddar')))
    assert.ok(unmatchedProductIds.includes('111001'))
  })
})

describe('mapPackageToLocal', () => {
  it('Model 1 gerçek adres; customer_phone null; order_number=orderNumber', () => {
    const m = mapPackageToLocal(fixtureModel1Store)
    assert.equal(m.is_address_masked, false)
    assert.equal(m.customer_phone, null)
    assert.equal(m.pin_code, '11866940602')
    assert.equal(m.order_number, '11866940602')
    assert.equal(m.external_order_number, '11866940602')
    assert.equal(m.trendyol_order_code, '006')
    assert.equal(m.adres_tarifinden_bulunan_telefon, '05310311211')
    assert.equal(m.exclude_from_courier_queue, false)
    assert.ok(m.delivery_address.includes('Örnek Mah'))
  })

  it('Galaxy appName → platform getir', () => {
    const m = mapPackageToLocal({
      ...fixtureModel1Store,
      id: 'galaxy00000000000000000000000000000000000000000000000000000001',
      orderNumber: '11866949999',
      userInformation: { appName: 'Galaxy' },
    })
    assert.equal(m.trendyol_app_name, 'Galaxy')
    assert.equal(m.platform, 'getir')
  })

  it('Model 2 maskeli + kurye kuyruğu dışı; restoran için saklanır', () => {
    const m = mapPackageToLocal(fixtureModel2Go)
    assert.equal(m.is_address_masked, true)
    assert.equal(m.exclude_from_courier_queue, true)
    assert.equal(m.local_status, 'new_order')
  })

  it('iptal → local cancelled + cancelInfo', () => {
    const m = mapPackageToLocal(fixtureCancelled)
    assert.equal(m.local_status, 'cancelled')
    assert.equal(m.cancel_info?.reasonText, 'Müşteri iptal etti')
  })

  it('eşleşmeyen ürün siparişi düşürmez', () => {
    const m = mapPackageToLocal(fixtureModel1Store, {
      productLookup: { getLocalProductId: () => undefined },
    })
    assert.ok(m.unmatched_product_ids.length >= 1)
    assert.ok(m.items.length >= 1)
  })

  it('kupon paket seviyesinde saklanır', () => {
    const m = mapPackageToLocal(fixtureModel1Store)
    assert.equal(m.coupon_seller_amount, 10)
  })
})

describe('idempotency key semantics', () => {
  it('aynı packageId+status ikinci map aynı anahtar', () => {
    const a = mapPackageToLocal(fixtureModel1Store)
    const b = mapPackageToLocal(fixtureModel1Store)
    assert.equal(a.trendyol_package_id, b.trendyol_package_id)
    assert.equal(a.package_status, b.package_status)
  })
})
