/**
 * @file src/app/privacy-policy/page.tsx
 * @description Gizlilik Politikası Sayfası - KVKK ve GDPR Uyumlu
 */
'use client'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        {/* Header */}
        <div className="border-b-4 border-orange-500 pb-4 mb-6">
          <h1 className="text-4xl font-bold text-orange-600">🔒 Gizlilik Politikası</h1>
          <p className="text-slate-600 italic mt-2">Son Güncelleme: 9 Şubat 2026</p>
        </div>

        {/* Important Notice */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-8">
          <p className="text-slate-800">
            <strong>Önemli:</strong> Mergen Kurye uygulamasını kullanarak bu gizlilik politikasını kabul etmiş olursunuz. 
            Lütfen dikkatle okuyunuz.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-slate-700">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">1. Genel Bilgiler</h2>
            <p className="leading-relaxed">
              Mergen Kurye ("biz", "bizim" veya "uygulama"), kullanıcılarımızın gizliliğini korumayı taahhüt eder. 
              Bu gizlilik politikası, mobil uygulamamız aracılığıyla toplanan, kullanılan ve paylaşılan kişisel 
              verilerin nasıl işlendiğini açıklar.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">2. Toplanan Veriler ve Kullanım Amaçları</h2>

            <div className="space-y-6">
              {/* 2.1 Location */}
              <div>
                <h3 className="text-xl font-semibold text-orange-600 mb-3">2.1. 📍 Konum Verileri</h3>
                <p className="font-semibold mb-2">Toplanan Veri:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>GPS koordinatları (enlem, boylam)</li>
                  <li>Konum doğruluğu bilgisi</li>
                  <li>Konum zaman damgası</li>
                  <li>Arka plan konum verileri</li>
                </ul>
                <p className="font-semibold mb-2">Kullanım Amacı:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li><strong>Teslimat Takibi:</strong> Kuryelerin gerçek zamanlı konumunu harita üzerinde göstermek</li>
                  <li><strong>Rota Optimizasyonu:</strong> En hızlı teslimat rotasını belirlemek</li>
                  <li><strong>Performans Analizi:</strong> Teslimat sürelerini ve verimliliği ölçmek</li>
                  <li><strong>Güvenlik:</strong> Kurye güvenliğini sağlamak ve acil durumlarda konum tespiti yapmak</li>
                </ul>
                <p className="font-semibold mb-2">Arka Plan Konum İzni:</p>
                <p className="leading-relaxed">
                  Uygulama kapalıyken veya arka planda çalışırken konum verisi toplamak için arka plan konum izni 
                  talep edilir. Bu izin, kuryelerin teslimat sırasında sürekli takip edilmesini sağlar ve 
                  müşterilere gerçek zamanlı teslimat durumu bilgisi verir.
                </p>
              </div>

              {/* 2.2 Microphone */}
              <div>
                <h3 className="text-xl font-semibold text-orange-600 mb-3">2.2. 🎤 Mikrofon Verisi</h3>
                <p className="font-semibold mb-2">Toplanan Veri:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Sesli komut ses akışı (geçici)</li>
                  <li>Ses tanıma sonuçları</li>
                </ul>
                <p className="font-semibold mb-2">Kullanım Amacı:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li><strong>Sesli Komut Özelliği:</strong> Kuryelerin eller serbest çalışabilmesi için sesli komutlarla 
                  sipariş durumunu güncellemek (örn: "kabul et", "teslim edildi")</li>
                  <li><strong>Güvenlik:</strong> Sürüş sırasında telefona dokunmadan işlem yapabilmek</li>
                </ul>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mt-3">
                  <p className="font-semibold">Önemli Not:</p>
                  <p>
                    Ses kayıtları <strong>SAKLANMAZ</strong>. Mikrofon verisi sadece anlık komut tanıma için kullanılır 
                    ve işlem tamamlandıktan sonra silinir. Hiçbir ses kaydı sunucularımızda depolanmaz.
                  </p>
                </div>
              </div>

              {/* 2.3 Notifications */}
              <div>
                <h3 className="text-xl font-semibold text-orange-600 mb-3">2.3. 🔔 Bildirim Verileri</h3>
                <p className="font-semibold mb-2">Toplanan Veri:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Cihaz bildirim token'ı</li>
                  <li>Bildirim tercihleri</li>
                </ul>
                <p className="font-semibold mb-2">Kullanım Amacı:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Anlık Bildirimler:</strong> Yeni sipariş, teslimat güncellemeleri ve sistem bildirimleri göndermek</li>
                  <li><strong>İletişim:</strong> Önemli sistem güncellemeleri ve duyurular hakkında bilgilendirme</li>
                </ul>
              </div>

              {/* 2.4 Device Info */}
              <div>
                <h3 className="text-xl font-semibold text-orange-600 mb-3">2.4. 📱 Cihaz Bilgileri</h3>
                <p className="font-semibold mb-2">Toplanan Veri:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Cihaz modeli ve işletim sistemi</li>
                  <li>Uygulama sürümü</li>
                  <li>İnternet bağlantı durumu</li>
                  <li>Uygulama kullanım istatistikleri</li>
                </ul>
                <p className="font-semibold mb-2">Kullanım Amacı:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Teknik Destek:</strong> Hata ayıklama ve performans iyileştirme</li>
                  <li><strong>Uyumluluk:</strong> Farklı cihazlarda düzgün çalışmayı sağlamak</li>
                </ul>
              </div>

              {/* 2.5 User Account */}
              <div>
                <h3 className="text-xl font-semibold text-orange-600 mb-3">2.5. 👤 Kullanıcı Hesap Bilgileri</h3>
                <p className="font-semibold mb-2">Toplanan Veri:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Kullanıcı adı</li>
                  <li>Şifre (şifrelenmiş)</li>
                  <li>Ad Soyad</li>
                  <li>Telefon numarası</li>
                  <li>E-posta adresi</li>
                  <li>Şirket bilgileri</li>
                </ul>
                <p className="font-semibold mb-2">Kullanım Amacı:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Kimlik Doğrulama:</strong> Güvenli giriş ve yetkilendirme</li>
                  <li><strong>İletişim:</strong> Hesap ve sipariş bildirimleri</li>
                  <li><strong>Hesap Yönetimi:</strong> Kullanıcı profilini yönetmek</li>
                </ul>
              </div>

              {/* 2.6 Financial Account Info */}
              <div>
                <h3 className="text-xl font-semibold text-orange-600 mb-3">2.6. 💳 Finansal Hesap Bilgileri</h3>
                <p className="font-semibold mb-2">Toplanan Veri:</p>
                <ul className="list-disc pl-6 space-y-1 mb-3">
                  <li>Ödeme yöntemi tercihleri (Nakit, Kart, IBAN)</li>
                  <li>Sipariş tutarları</li>
                  <li>Ödeme geçmişi</li>
                </ul>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-3 mb-3">
                  <p className="font-semibold text-blue-900 mb-2">🏦 IBAN Tahsilat Bilgisi:</p>
                  <p className="text-blue-800 text-sm">
                    Müşteriler IBAN ile ödeme yapmayı seçtiklerinde, ödeme şu hesaba yapılır:
                  </p>
                  <div className="mt-2 bg-white rounded p-3 text-sm">
                    <div><strong>Hesap Sahibi:</strong> İbrahim Okan Özdemir</div>
                    <div><strong>IBAN:</strong> TR79 0001 0090 1065 9157 6050 01</div>
                    <div><strong>Banka:</strong> Ziraat Bankası</div>
                  </div>
                  <p className="text-blue-700 text-xs mt-2">
                    <strong>Önemli:</strong> Kredi kartı numaraları, CVV kodları veya banka hesap şifreleri 
                    <strong> ASLA TOPLANMAZ</strong>. Sadece ödeme yöntemi tercihi ve tutar bilgisi saklanır.
                  </p>
                </div>
                <p className="font-semibold mb-2">Kullanım Amacı:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Ödeme Yönetimi:</strong> Sipariş ödemelerini takip etmek</li>
                  <li><strong>Kurye Kazançları:</strong> Kuryelerin kazançlarını hesaplamak</li>
                  <li><strong>Finansal Raporlama:</strong> Gelir istatistiklerini oluşturmak</li>
                  <li><strong>Muhasebe:</strong> Yasal zorunluluklar için kayıt tutmak</li>
                </ul>
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mt-3">
                  <p className="font-semibold">Güvenlik Notu:</p>
                  <p className="text-sm">
                    Tüm finansal veriler SSL/TLS şifreleme ile korunur ve Supabase güvenli 
                    veritabanında saklanır. Hassas finansal bilgiler (kart numaraları, şifreler) 
                    hiçbir zaman sistemimizde depolanmaz.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">3. Veri Saklama ve Güvenlik</h2>
            <h3 className="text-xl font-semibold text-orange-600 mb-3">3.1. Veri Saklama Süresi</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Konum Verileri:</strong> 90 gün boyunca saklanır, sonra otomatik silinir</li>
              <li><strong>Mikrofon Verileri:</strong> Hiç saklanmaz (anlık işlenir)</li>
              <li><strong>Hesap Bilgileri:</strong> Hesap aktif olduğu sürece saklanır</li>
              <li><strong>Finansal Veriler:</strong> Ödeme yöntemi ve tutar bilgileri muhasebe için 5 yıl saklanır</li>
              <li><strong>Sipariş Geçmişi:</strong> Muhasebe ve raporlama için 5 yıl saklanır</li>
              <li><strong>IBAN Bilgisi:</strong> Sistem tarafında sabit olarak saklanır (İbrahim Okan Özdemir - TR79 0001 0090 1065 9157 6050 01)</li>
            </ul>

            <h3 className="text-xl font-semibold text-orange-600 mb-3">3.2. Güvenlik Önlemleri</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>🔐 SSL/TLS şifreleme ile veri iletimi</li>
              <li>🔒 Şifrelerin hash'lenerek saklanması</li>
              <li>🛡️ Supabase güvenli veritabanı altyapısı</li>
              <li>🔑 Row Level Security (RLS) ile veri izolasyonu</li>
              <li>📊 Düzenli güvenlik denetimleri</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">4. Veri Paylaşımı</h2>
            <p className="font-semibold mb-2">Verileriniz KİMLERLE paylaşılır:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Şirket İçi:</strong> Sadece yetkili yöneticiler ve ilgili personel</li>
              <li><strong>Hizmet Sağlayıcılar:</strong> Supabase (veritabanı), Google Maps (harita)</li>
              <li><strong>Yasal Zorunluluk:</strong> Mahkeme kararı veya yasal talep durumunda</li>
            </ul>
            <p className="font-semibold mb-2">Verileriniz KİMLERLE paylaşılMAZ:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>❌ Üçüncü taraf reklam şirketleri</li>
              <li>❌ Veri aracıları</li>
              <li>❌ Sosyal medya platformları</li>
              <li>❌ Analitik şirketler (anonim istatistikler hariç)</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">5. Kullanıcı Hakları</h2>
            <p className="mb-3">KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında haklarınız:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>📋 <strong>Bilgi Talep Etme:</strong> Hangi verilerinizin toplandığını öğrenme</li>
              <li>✏️ <strong>Düzeltme:</strong> Yanlış verilerin düzeltilmesini isteme</li>
              <li>🗑️ <strong>Silme:</strong> Verilerinizin silinmesini talep etme</li>
              <li>🚫 <strong>İtiraz:</strong> Veri işlemeye itiraz etme</li>
              <li>📤 <strong>Taşınabilirlik:</strong> Verilerinizi başka bir platforma aktarma</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">6. Çocukların Gizliliği</h2>
            <p className="leading-relaxed">
              Uygulamamız 18 yaş altı kullanıcılara yönelik değildir. Bilerek 18 yaş altı kişilerden 
              veri toplamıyoruz. Eğer 18 yaş altı bir kullanıcının veri sağladığını fark edersek, 
              bu verileri derhal sileriz.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">7. İzin Yönetimi</h2>
            <p className="mb-3">Uygulama izinlerini istediğiniz zaman değiştirebilirsiniz:</p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li><strong>Android:</strong> Ayarlar → Uygulamalar → Mergen Kurye → İzinler</li>
              <li><strong>Uygulama İçi:</strong> Profil → Ayarlar → İzinler</li>
            </ul>
            <p className="text-sm text-slate-600">
              <strong>Not:</strong> Bazı izinleri iptal etmek uygulamanın bazı özelliklerini devre dışı bırakabilir.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">8. Çerezler ve Takip Teknolojileri</h2>
            <p className="mb-3">Uygulamamız şu teknolojileri kullanır:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Local Storage:</strong> Oturum bilgilerini saklamak için</li>
              <li><strong>Session Storage:</strong> Geçici veri saklamak için</li>
              <li><strong>Analytics:</strong> Anonim kullanım istatistikleri (opsiyonel)</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">9. Değişiklikler</h2>
            <p className="leading-relaxed">
              Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler olduğunda 
              uygulama içi bildirim ile bilgilendirileceksiniz. Güncellenmiş politika bu sayfada 
              yayınlanacak ve "Son Güncelleme" tarihi değiştirilecektir.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">10. İletişim</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="mb-3">Gizlilik politikası hakkında sorularınız veya talepleriniz için:</p>
              <ul className="space-y-2">
                <li>📧 <strong>E-posta:</strong> ozdemiribrahimokan@gmail.com</li>
                <li>📱 <strong>Telefon:</strong> +90 505 059 16 29</li>
              </ul>
              <p className="mt-3"><strong>Veri Sorumlusu:</strong> Mergen Kurye</p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-orange-700 mb-4">11. Yasal Uyum</h2>
            <p className="mb-3">Bu gizlilik politikası şu yasalara uygun olarak hazırlanmıştır:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>🇹🇷 KVKK (Kişisel Verilerin Korunması Kanunu - 6698 sayılı kanun)</li>
              <li>🇪🇺 GDPR (General Data Protection Regulation)</li>
              <li>📱 Google Play Store Politikaları</li>
            </ul>
          </section>

          {/* Final Notice */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mt-8">
            <p><strong>Son Güncelleme:</strong> 9 Şubat 2026</p>
            <p><strong>Versiyon:</strong> 1.0.0</p>
            <p><strong>Geçerlilik:</strong> Bu politika, uygulamanın tüm sürümleri için geçerlidir.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-300 text-center text-slate-600 text-sm">
          <p>© 2026 Mergen Kurye - Tüm hakları saklıdır.</p>
          <p className="mt-2">Bu gizlilik politikası Türkiye Cumhuriyeti yasalarına tabidir.</p>
          <div className="mt-6">
            <a 
              href="/"
              className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              ← Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
