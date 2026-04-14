// Samsun 19 Mayıs İlçesi - Mahalle, Cadde ve Sokak Veritabanı

export interface Street {
  name: string
  type: 'sokak' | 'cadde' | 'bulvar'
}

export interface Neighborhood {
  name: string
  streets: Street[]
}

export interface District {
  name: string
  neighborhoods: Neighborhood[]
}

export const SAMSUN_ADDRESS_DATA: District[] = [
  {
    name: '19 Mayıs',
    neighborhoods: [
      {
        name: 'Cumhuriyet Mahallesi',
        streets: [
          { name: 'Atatürk Bulvarı', type: 'bulvar' },
          { name: 'Cumhuriyet Caddesi', type: 'cadde' },
          { name: 'İstiklal Caddesi', type: 'cadde' },
          { name: 'Gazi Caddesi', type: 'cadde' },
          { name: 'İnönü Caddesi', type: 'cadde' },
          { name: '1. Sokak', type: 'sokak' },
          { name: '2. Sokak', type: 'sokak' },
          { name: '3. Sokak', type: 'sokak' },
          { name: '4. Sokak', type: 'sokak' },
          { name: '5. Sokak', type: 'sokak' },
          { name: 'Gül Sokak', type: 'sokak' },
          { name: 'Lale Sokak', type: 'sokak' },
          { name: 'Papatya Sokak', type: 'sokak' },
          { name: 'Menekşe Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Pazar Mahallesi',
        streets: [
          { name: 'Pazar Caddesi', type: 'cadde' },
          { name: 'Çarşı Caddesi', type: 'cadde' },
          { name: 'Ticaret Caddesi', type: 'cadde' },
          { name: 'Esnaf Caddesi', type: 'cadde' },
          { name: 'Bakkal Sokak', type: 'sokak' },
          { name: 'Berber Sokak', type: 'sokak' },
          { name: 'Kasap Sokak', type: 'sokak' },
          { name: 'Manav Sokak', type: 'sokak' },
          { name: 'Terzi Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Dereköy Mahallesi',
        streets: [
          { name: 'Dere Caddesi', type: 'cadde' },
          { name: 'Köy Caddesi', type: 'cadde' },
          { name: 'Tarla Caddesi', type: 'cadde' },
          { name: 'Bağ Sokak', type: 'sokak' },
          { name: 'Bahçe Sokak', type: 'sokak' },
          { name: 'Çiftlik Sokak', type: 'sokak' },
          { name: 'Meyve Sokak', type: 'sokak' },
          { name: 'Sebze Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Üniversite Mahallesi',
        streets: [
          { name: 'Akademi Caddesi', type: 'cadde' },
          { name: 'Kampüs Caddesi', type: 'cadde' },
          { name: 'Rektörlük Caddesi', type: 'cadde' },
          { name: 'Bilim Sokak', type: 'sokak' },
          { name: 'Eğitim Sokak', type: 'sokak' },
          { name: 'Öğrenci Sokak', type: 'sokak' },
          { name: 'Kütüphane Sokak', type: 'sokak' },
          { name: 'Fakülte Sokak', type: 'sokak' },
          { name: 'Araştırma Sokak', type: 'sokak' },
          { name: 'Teknoloji Sokak', type: 'sokak' },
          { name: 'Laboratuvar Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Yurt Mahallesi',
        streets: [
          { name: 'KYK Caddesi', type: 'cadde' },
          { name: 'Özel Yurt Caddesi', type: 'cadde' },
          { name: 'Barınma Caddesi', type: 'cadde' },
          { name: 'Pansiyon Sokak', type: 'sokak' },
          { name: 'Konaklama Sokak', type: 'sokak' },
          { name: 'Öğrenci Evi Sokak', type: 'sokak' },
          { name: 'Apart Sokak', type: 'sokak' },
          { name: 'Lojman Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Hangarlar Mahallesi',
        streets: [
          { name: 'Havaalanı Caddesi', type: 'cadde' },
          { name: 'Uçak Caddesi', type: 'cadde' },
          { name: 'Terminal Caddesi', type: 'cadde' },
          { name: 'Hangar Sokak', type: 'sokak' },
          { name: 'Pist Sokak', type: 'sokak' },
          { name: 'Kargo Sokak', type: 'sokak' },
          { name: 'Lojistik Sokak', type: 'sokak' },
          { name: 'Depo Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Yeşiltepe Mahallesi',
        streets: [
          { name: 'Ağaç Caddesi', type: 'cadde' },
          { name: 'Orman Caddesi', type: 'cadde' },
          { name: 'Doğa Caddesi', type: 'cadde' },
          { name: 'Çam Sokak', type: 'sokak' },
          { name: 'Meşe Sokak', type: 'sokak' },
          { name: 'Kavak Sokak', type: 'sokak' },
          { name: 'Çiçek Sokak', type: 'sokak' },
          { name: 'Yeşil Sokak', type: 'sokak' },
          { name: 'Park Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Yeni Mahalle',
        streets: [
          { name: 'Anadolu Caddesi', type: 'cadde' },
          { name: 'Akdeniz Caddesi', type: 'cadde' },
          { name: 'Karadeniz Caddesi', type: 'cadde' },
          { name: 'Marmara Sokak', type: 'sokak' },
          { name: 'Ege Sokak', type: 'sokak' },
          { name: 'Doğu Sokak', type: 'sokak' },
          { name: 'Batı Sokak', type: 'sokak' },
          { name: 'Kuzey Sokak', type: 'sokak' },
          { name: 'Güney Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Sanayi Mahallesi',
        streets: [
          { name: 'Sanayi Caddesi', type: 'cadde' },
          { name: 'Fabrika Caddesi', type: 'cadde' },
          { name: 'Organize Caddesi', type: 'cadde' },
          { name: 'İmalat Sokak', type: 'sokak' },
          { name: 'Üretim Sokak', type: 'sokak' },
          { name: 'Depo Sokak', type: 'sokak' },
          { name: 'Atölye Sokak', type: 'sokak' },
          { name: 'Tesis Sokak', type: 'sokak' },
        ]
      },
      {
        name: 'Merkez Mahallesi',
        streets: [
          { name: 'Adnan Menderes Caddesi', type: 'cadde' },
          { name: 'Alparslan Türkeş Caddesi', type: 'cadde' },
          { name: 'Hürriyet Caddesi', type: 'cadde' },
          { name: '6. Sokak', type: 'sokak' },
          { name: '7. Sokak', type: 'sokak' },
          { name: '8. Sokak', type: 'sokak' },
          { name: '9. Sokak', type: 'sokak' },
          { name: '10. Sokak', type: 'sokak' },
          { name: 'Çınar Sokak', type: 'sokak' },
          { name: 'Yasemin Sokak', type: 'sokak' },
        ]
      }
    ]
  }
]

// Yardımcı fonksiyonlar
export function getDistrictByName(districtName: string): District | undefined {
  return SAMSUN_ADDRESS_DATA.find(d => d.name === districtName)
}

export function getNeighborhoodsForDistrict(districtName: string): string[] {
  const district = getDistrictByName(districtName)
  if (!district) return []
  
  return district.neighborhoods.map(n => n.name)
}

export function getNeighborhoodByName(districtName: string, neighborhoodName: string): Neighborhood | undefined {
  const district = getDistrictByName(districtName)
  if (!district) return undefined
  
  return district.neighborhoods.find(n => n.name === neighborhoodName)
}

export function getStreetsForNeighborhood(districtName: string, neighborhoodName: string): Street[] {
  const neighborhood = getNeighborhoodByName(districtName, neighborhoodName)
  if (!neighborhood) return []
  
  return neighborhood.streets
}

export function getAllStreetsForDistrict(districtName: string): Street[] {
  const district = getDistrictByName(districtName)
  if (!district) return []
  
  const allStreets: Street[] = []
  district.neighborhoods.forEach(neighborhood => {
    allStreets.push(...neighborhood.streets)
  })
  
  return allStreets
}

export function filterStreetsByQuery(streets: Street[], query: string): Street[] {
  if (!query || query.trim() === '') return streets // Boş query'de tüm sokakları döndür
  
  const normalizedQuery = query.toLowerCase().trim()
  
  return streets.filter(street => 
    street.name.toLowerCase().includes(normalizedQuery)
  ).sort((a, b) => {
    // Önce tam eşleşenler
    const aStarts = a.name.toLowerCase().startsWith(normalizedQuery)
    const bStarts = b.name.toLowerCase().startsWith(normalizedQuery)
    
    if (aStarts && !bStarts) return -1
    if (!aStarts && bStarts) return 1
    
    // Sonra alfabetik sıralama
    return a.name.localeCompare(b.name, 'tr')
  })
}

export function getStreetTypeLabel(type: Street['type']): string {
  const labels = {
    'sokak': 'Sk.',
    'cadde': 'Cd.',
    'bulvar': 'Blv.'
  }
  return labels[type]
}
