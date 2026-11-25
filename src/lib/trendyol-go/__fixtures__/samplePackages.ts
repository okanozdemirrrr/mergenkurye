/**
 * Gerçek geçmiş sipariş yapısından türetilmiş, anonimleştirilmiş fixture'lar.
 * Müşteri adı / adres / telefon uydurma veya maskeli.
 */
import type { TrendyolPackage } from '../types'

/** Model 1 — STORE, gerçek adres */
export const fixtureModel1Store: TrendyolPackage = {
  id: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234ab',
  supplierId: 6654483,
  storeId: '374640',
  orderCode: '006',
  orderId: '9001002003',
  orderNumber: '11866940602',
  deliveryType: 'STORE',
  packageStatus: 'Created',
  packageCreationDate: 1710000000000,
  packageModificationDate: 1710000100000,
  totalPrice: 285.5,
  totalDeliveryPrice: 25,
  callCenterPhone: '0212 365 34 03',
  customerNote:
    'restoran:1 menüdeki burgerlerde sadece tavuk ve marul olsun lütfen.\nkurye:abi 5dk kala arayabilirsen iyi olur yurttayım - Servis İstiyorum',
  testPackage: false,
  coupon: { totalSellerAmount: 10 },
  address: {
    address1: 'Örnek Mah., Test Cd. Apt: 12, Kat: 3, Daire: 8',
    apartmentNumber: 'TGO Yemek',
    floor: 'TGO Yemek',
    doorNumber: 'TGO Yemek',
    city: 'Samsun',
    district: 'Atakum',
    neighborhood: 'Örnek',
    postalCode: '55200',
    latitude: '41.286700',
    longitude: '36.330000',
    addressDescription: 'Tel No: 05310311211 , Ondokuz Mayıs Anadolu Lisesi arkası',
    phone: '0212 365 34 03',
    firstName: 'A***',
    lastName: 'Y***',
  },
  payment: {
    paymentType: 'PAY_WITH_ON_DELIVERY',
    onDelivery: { paymentType: 'CASH' },
  },
  lines: [
    {
      productId: 111001,
      name: 'Klasik Burger',
      unitSellingPrice: 120,
      price: 120,
      description: 'Az pişmiş',
      items: [{ packageItemId: 'pi1', lineItemId: 'li1', isCancelled: false }],
      modifierProducts: [
        {
          name: 'Ekstra Cheddar',
          price: 15,
          productId: 222,
          modifierProducts: [{ name: 'Çift porsiyon', price: 5, productId: 223 }],
        },
      ],
      extraIngredients: [{ name: 'Turşu', price: 3 }],
      removedIngredients: [{ name: 'Soğan' }],
    },
    {
      productId: 111002,
      name: 'Patates',
      unitSellingPrice: 40,
      items: [
        { packageItemId: 'pi2', lineItemId: 'li2', isCancelled: false },
        { packageItemId: 'pi3', lineItemId: 'li3', isCancelled: false },
      ],
      modifierProducts: [],
    },
  ],
}

/** Model 2 — GO, maskeli adres */
export const fixtureModel2Go: TrendyolPackage = {
  id: 'b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
  supplierId: 6654483,
  storeId: '374640',
  orderCode: '014',
  orderId: '9001002004',
  orderNumber: '11866940699',
  deliveryType: 'GO',
  packageStatus: 'Picking',
  packageCreationDate: 1710001000000,
  packageModificationDate: 1710001100000,
  totalPrice: 190,
  totalDeliveryPrice: 0,
  callCenterPhone: '0212 365 34 03',
  customerNote: 'Kapıda zili çalın',
  testPackage: false,
  address: {
    address1: 'TGO Yemek',
    apartmentNumber: 'TGO Yemek',
    floor: 'TGO Yemek',
    doorNumber: 'TGO Yemek',
    city: 'TGO Yemek',
    district: 'TGO Yemek',
    neighborhood: 'TGO Yemek',
    latitude: '0',
    longitude: '0',
    addressDescription: 'TGO Yemek',
    phone: '0212 365 34 03',
    firstName: 'TGO',
    lastName: 'Yemek',
  },
  payment: { paymentType: 'PAY_WITH_CARD' },
  lines: [
    {
      productId: 111001,
      name: 'Klasik Burger',
      unitSellingPrice: 190,
      items: [{ packageItemId: 'x1', lineItemId: 'y1', isCancelled: false }],
    },
  ],
}

export const fixtureMealCard: TrendyolPackage = {
  ...fixtureModel1Store,
  id: 'c3d4e5f6789012345678901234567890123456789012345678901234abcdef',
  orderCode: '021',
  orderNumber: '11866940710',
  customerNote: undefined,
  address: {
    ...fixtureModel1Store.address!,
    addressDescription: 'Yurt girişi, beyaz kapı — telefon yok bu tarifte',
  },
  payment: {
    paymentType: 'PAY_WITH_MEAL_CARD',
    mealCard: { cardSourceType: 'PLUXEE - ONLINE' },
  },
}

export const fixtureUnknownPayment: TrendyolPackage = {
  ...fixtureModel1Store,
  id: 'd4e5f6789012345678901234567890123456789012345678901234abcdef01',
  orderCode: '030',
  orderNumber: '11866940800',
  payment: { paymentType: 'PAY_WITH_SOMETHING_NEW' },
}

export const fixtureCancelled: TrendyolPackage = {
  ...fixtureModel1Store,
  id: fixtureModel1Store.id,
  packageStatus: 'Cancelled',
  packageModificationDate: 1710000200000,
  cancelInfo: { reasonCode: 'CUSTOMER', reasonText: 'Müşteri iptal etti' },
}
