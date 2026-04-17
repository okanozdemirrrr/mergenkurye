/**
 * @file src/app/kurye/hooks/useCourierVoiceCommands.ts
 * @description Kurye Sesli Komut Sistemi Hook'u
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState, useEffect, useRef } from 'react'

interface Package {
  id: number
  order_number?: string
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
  restaurant?: {
    name: string
    phone?: string
    address?: string
  }
}

interface UseVoiceCommandsProps {
  isMounted: boolean
  isLoggedIn: boolean
  packagesRef: React.MutableRefObject<Package[]>
  selectedPaymentMethods: { [key: number]: 'cash' | 'card' | 'iban' }
  setSelectedPaymentMethods: React.Dispatch<React.SetStateAction<{ [key: number]: 'cash' | 'card' | 'iban' }>>
  setErrorMessage: (msg: string) => void
  handleAcceptPackage: (packageId: number) => Promise<void>
  handleUpdateStatus: (packageId: number, nextStatus: Package['status'], additionalData?: any) => Promise<void>
  handleDeliver: (packageId: number) => Promise<void>
  handleOpenNavigation: (pkg: Package) => void
}

export function useCourierVoiceCommands({
  isMounted,
  isLoggedIn,
  packagesRef,
  selectedPaymentMethods,
  setSelectedPaymentMethods,
  setErrorMessage,
  handleAcceptPackage,
  handleUpdateStatus,
  handleDeliver,
  handleOpenNavigation
}: UseVoiceCommandsProps) {
  // SESLİ KOMUT STATE'LERİ - ORİJİNAL MANTIK
  const [isListening, setIsListening] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState('')
  const [recognition, setRecognition] = useState<any>(null)
  const [showVoiceHelp, setShowVoiceHelp] = useState(false)
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sesli komut yardım pop-up'ı - SADECE DİNLEME MODUNDA 10 saniye sonra göster - ORİJİNAL MANTIK
  useEffect(() => {
    if (!isMounted || !isLoggedIn || !isListening) {
      return
    }

    const timer = setTimeout(() => {
      setShowVoiceHelp(true)
    }, 10000) // 10 saniye

    return () => clearTimeout(timer)
  }, [isMounted, isLoggedIn, isListening])

  // Beep sesi çal - ORİJİNAL MANTIK
  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  // Sesli konuşma - ORİJİNAL MANTIK
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Önce konuşmayı durdur
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'tr-TR'
      utterance.rate = 0.9 // Daha yavaş ve anlaşılır
      utterance.pitch = 1.1 // Daha nazik ve profesyonel ton
      utterance.volume = 1.0

      // Sesleri yükle ve Türkçe kadın sesini seç
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('🎙️ Mevcut sesler:', voices.map(v => ({ name: v.name, lang: v.lang })))

        // Türkçe kadın sesi ara (öncelik sırasına göre)
        const turkishFemaleVoice =
          voices.find(voice => voice.lang === 'tr-TR' && voice.name.includes('Filiz')) || // Google Türkçe kadın
          voices.find(voice => voice.lang === 'tr-TR' && voice.name.includes('Yelda')) || // Microsoft Türkçe kadın
          voices.find(voice => voice.lang === 'tr-TR' && voice.name.includes('Female')) ||
          voices.find(voice => voice.lang === 'tr-TR' && !voice.name.includes('Male')) ||
          voices.find(voice => voice.lang.startsWith('tr'))

        if (turkishFemaleVoice) {
          utterance.voice = turkishFemaleVoice
          console.log('🎙️ Seçilen ses:', turkishFemaleVoice.name, turkishFemaleVoice.lang)
        } else {
          console.warn('⚠️ Türkçe kadın sesi bulunamadı, varsayılan ses kullanılıyor')
        }

        window.speechSynthesis.speak(utterance)
      }

      // Sesler yüklenmişse hemen kullan, yoksa yüklenene kadar bekle
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak()
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak()
        }
      }
    }
  }

  // Sesli komut toggle - ORİJİNAL MANTIK
  const toggleVoiceRecognition = () => {
    if (!recognition) return

    if (isListening) {
      // Dinleme durduruluyor
      recognition.abort()
      setIsListening(false)

      // Timeout'u temizle
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current)
        voiceTimeoutRef.current = null
      }
    } else {
      // Dinleme başlatılıyor
      try {
        recognition.start()
        setIsListening(true)
        playBeep()

        // Müziği sustur (Audio Focus)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused'
        }

        // 6 saniye sonra otomatik kapat (PC için)
        voiceTimeoutRef.current = setTimeout(() => {
          if (recognition && isListening) {
            console.log('⏱️ 6 saniye timeout - otomatik kapatılıyor')
            recognition.abort()
            setIsListening(false)
            speak('Zaman aşımı')
          }
        }, 6000)

      } catch (error) {
        console.error('Ses tanıma başlatılamadı:', error)
        setErrorMessage('Mikrofon başlatılamadı')
        setTimeout(() => setErrorMessage(''), 3000)
      }
    }
  }

  // Sesli komut işleme - ORİJİNAL MANTIK
  const handleVoiceCommand = async (command: string) => {
    const transcript = command.toLowerCase().trim()
    console.log('🎤 SESLİ KOMUT ALINDI:', transcript)

    // Timeout'u temizle
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current)
      voiceTimeoutRef.current = null
    }

    // Komut işleme başladı - recognition'ı zorla durdur
    if (recognition && isListening) {
      recognition.stop() // Önce normal durdur
      recognition.abort() // Sonra zorla durdur
      setIsListening(false)
    }

    // Müziği tekrar başlat
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
    }

    // Sayı çıkarma - Regex ile ekleri temizle ve saf sayıyı al
    const numberWords: { [key: string]: number } = {
      'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5,
      'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10
    }

    let slotNumber: number | null = null

    // Ekleri temizle (birin -> bir, ikinin -> iki, üçü -> üç)
    const cleanedTranscript = transcript
      .replace(/([a-zğüşıöç]+)(in|ın|un|ün|i|ı|u|ü|e|a|nin|nın|nun|nün)\b/gi, '$1')

    console.log('🧹 Temizlenmiş transcript:', cleanedTranscript)

    for (const [word, num] of Object.entries(numberWords)) {
      // Kelime sınırlarını kontrol et (tam eşleşme)
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(cleanedTranscript)) {
        slotNumber = num
        console.log('🔢 Slot numarası tespit edildi:', slotNumber)
        break
      }
    }

    // REF'ten güncel paketleri al
    const currentPackages = packagesRef.current
    console.log('📦 Ref\'ten alınan paket sayısı:', currentPackages.length)

    // SAYISAL KOMUTLAR - ID ile paket bul
    if (slotNumber) {
      console.log('📦 Aktif paketler:', currentPackages.filter(p => p.status !== 'delivered').map(p => ({ id: p.id, customer: p.customer_name, status: p.status })))

      // ID'den paketi bul
      const pkg = currentPackages.find(p => p.id === slotNumber && p.status !== 'delivered')

      console.log('📦 Bulunan paket:', pkg ? { id: pkg.id, status: pkg.status } : null)

      if (!pkg) {
        console.warn('⚠️ Paket bulunamadı, id:', slotNumber)
        speak(`${slotNumber} bulunamadı`)
        return
      }

      console.log('✅ İşlem yapılacak paket:', { id: pkg.id, customer: pkg.customer_name, status: pkg.status })

      // [Numara] kabul / onayla / tamam
      if (transcript.includes('kabul') || transcript.includes('onayla') || transcript.includes('tamam')) {
        console.log('🟢 KABUL komutu tetiklendi, packageId:', pkg.id, 'status:', pkg.status)
        if (pkg.status === 'assigned' || pkg.status === 'waiting') {
          console.log('🟢 handleAcceptPackage çağrılıyor...')
          await handleAcceptPackage(pkg.id)
          const customerName = pkg.customer_name.split(' ')[0] // İlk isim
          speak(`${slotNumber} numara kabul edildi. Yolun açık olsun ${customerName} Bey'e gidiyorsun`)
        } else {
          console.log('⚠️ Paket zaten kabul edilmiş, mevcut status:', pkg.status)
          speak('Bu paket zaten kabul edilmiş')
        }
        return
      }

      // [Numara] aldım / paket bende / teslim al
      if (transcript.includes('aldım') || transcript.includes('bende') || transcript.includes('teslim al')) {
        console.log('🟡 TESLIM AL komutu tetiklendi, packageId:', pkg.id, 'status:', pkg.status)
        if (pkg.status === 'picking_up') {
          console.log('🟡 handleUpdateStatus çağrılıyor...')
          await handleUpdateStatus(pkg.id, 'on_the_way', { picked_up_at: new Date().toISOString() })
          speak(`${slotNumber} numara alındı. Güvenli sürüşler`)
        } else {
          console.log('⚠️ Paket picking_up durumunda değil, mevcut status:', pkg.status)
          speak('Önce kabul edin')
        }
        return
      }

      // [Numara] bitti / teslim edildi / teslim / kapat (+ ödeme yöntemi)
      if (transcript.includes('bitti') || transcript.includes('teslim') || transcript.includes('kapat')) {
        console.log('🔵 TESLİM ET komutu tetiklendi, packageId:', pkg.id, 'status:', pkg.status)

        if (pkg.status !== 'on_the_way') {
          console.log('⚠️ Paket on_the_way durumunda değil, mevcut status:', pkg.status)
          speak('Önce paketi restorandan almalısınız')
          return
        }

        // Ödeme yöntemini transcript'ten algıla
        let paymentMethod = selectedPaymentMethods[pkg.id]

        if (transcript.includes('nakit') || transcript.includes('nakıt')) {
          paymentMethod = 'cash'
          setSelectedPaymentMethods(prev => ({ ...prev, [pkg.id]: 'cash' }))
          console.log('💵 Ödeme yöntemi sesli komuttan algılandı: NAKİT')
        } else if (transcript.includes('kart') || transcript.includes('kredi')) {
          paymentMethod = 'card'
          setSelectedPaymentMethods(prev => ({ ...prev, [pkg.id]: 'card' }))
          console.log('💳 Ödeme yöntemi sesli komuttan algılandı: KART')
        }

        console.log('💳 Ödeme yöntemi:', paymentMethod)
        if (!paymentMethod) {
          console.warn('⚠️ Ödeme yöntemi seçilmemiş')
          speak('Lütfen ödeme yöntemini nakit veya kart olarak belirtin. Örneğin, bir nakit teslim veya bir kart teslim diyebilirsiniz')
          setErrorMessage('Lütfen ödeme yöntemini seçin!')
          setTimeout(() => setErrorMessage(''), 3000)
          return
        }

        console.log('🔵 handleDeliver çağrılıyor...')
        await handleDeliver(pkg.id)
        const paymentText = paymentMethod === 'cash' ? 'nakit' : 'kart'
        speak(`${slotNumber} numara ${paymentText} olarak teslim edildi. Harika iş`)
        return
      }

      // [Numara] dükkan / restoran / işletme
      if (transcript.includes('dükkan') || transcript.includes('restoran') || transcript.includes('işletme')) {
        console.log('🏪 DÜKKAN ARA komutu tetiklendi')
        console.log('📞 Restoran bilgisi:', pkg.restaurant)

        if (pkg.restaurant?.phone) {
          const phoneNumber = pkg.restaurant.phone
          const restaurantName = pkg.restaurant.name
          console.log('📞 Aranacak numara:', phoneNumber)
          window.location.href = `tel:${phoneNumber}`
          speak(`${restaurantName} restoranı aranıyor`)
        } else {
          console.warn('⚠️ Restoran telefonu yok')
          speak('Restoran telefon numarası bulunamadı')
        }
        return
      }

      // [Numara] müşteri / kişi / ara
      if (transcript.includes('müşteri') || transcript.includes('kişi') || transcript.includes('ara')) {
        console.log('📞 MÜŞTERİ ARA komutu tetiklendi')
        console.log('📞 Müşteri telefonu:', pkg.customer_phone)

        if (pkg.customer_phone) {
          const customerName = pkg.customer_name.split(' ')[0]
          console.log('📞 Aranacak numara:', pkg.customer_phone)
          window.location.href = `tel:${pkg.customer_phone}`
          speak(`${customerName} Bey aranıyor`)
        } else {
          console.warn('⚠️ Müşteri telefonu yok')
          speak('Müşteri telefon numarası bulunamadı')
        }
        return
      }

      // [Numara] konum / yol / harita / navigasyon
      if (transcript.includes('konum') || transcript.includes('yol') || transcript.includes('harita') || transcript.includes('navigasyon')) {
        console.log('🗺️ NAVİGASYON komutu tetiklendi')
        handleOpenNavigation(pkg)
        speak('Navigasyon açılıyor. Güvenli sürüşler')
        return
      }
    }

    // GENEL KOMUTLAR (numarasız) - İlk aktif paketi kullan
    console.log('🔄 Genel komut modu (numarasız)')

    // Kabul
    if (transcript.includes('kabul') || transcript.includes('onayla') || transcript.includes('tamam')) {
      const pendingPackage = currentPackages.find(pkg =>
        pkg.status === 'assigned' || pkg.status === 'waiting'
      )
      console.log('🟢 Genel KABUL komutu, bulunan paket:', pendingPackage)

      if (pendingPackage) {
        await handleAcceptPackage(pendingPackage.id)
        speak('Kabul edildi')
      } else {
        speak('Paket yok')
      }
      return
    }

    // Teslim Et (genel komut - numarasız)
    if (transcript.includes('bitti') || transcript.includes('teslim') || transcript.includes('kapat')) {
      const activePackage = currentPackages.find(pkg => pkg.status === 'on_the_way')
      console.log('🔵 Genel TESLİM komutu, bulunan paket:', activePackage)

      if (activePackage) {
        // Ödeme yöntemini transcript'ten algıla
        let paymentMethod = selectedPaymentMethods[activePackage.id]

        if (transcript.includes('nakit') || transcript.includes('nakıt')) {
          paymentMethod = 'cash'
          setSelectedPaymentMethods(prev => ({ ...prev, [activePackage.id]: 'cash' }))
          console.log('💵 Ödeme yöntemi sesli komuttan algılandı: NAKİT')
        } else if (transcript.includes('kart') || transcript.includes('kredi')) {
          paymentMethod = 'card'
          setSelectedPaymentMethods(prev => ({ ...prev, [activePackage.id]: 'card' }))
          console.log('💳 Ödeme yöntemi sesli komuttan algılandı: KART')
        }

        if (!paymentMethod) {
          speak('Nakit mi kart mı')
          setErrorMessage('Lütfen ödeme yöntemini seçin!')
          setTimeout(() => setErrorMessage(''), 3000)
          return
        }
        await handleDeliver(activePackage.id)
        speak(`${paymentMethod === 'cash' ? 'Nakit' : 'Kart'} teslim edildi`)
      } else {
        speak('Paket yok')
      }
      return
    }

    // Müşteri Ara
    if (transcript.includes('müşteri') || transcript.includes('kişi')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('📞 Genel MÜŞTERİ ARA komutu, bulunan paket:', activePackage)

      if (activePackage && activePackage.customer_phone) {
        window.location.href = `tel:${activePackage.customer_phone}`
        speak('Müşteri aranıyor')
      } else {
        speak('Telefon yok')
      }
      return
    }

    // Dükkan Ara
    if (transcript.includes('dükkan') || transcript.includes('restoran') || transcript.includes('işletme')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('🏪 Genel DÜKKAN ARA komutu, bulunan paket:', activePackage)

      if (activePackage && activePackage.restaurant?.phone) {
        window.location.href = `tel:${activePackage.restaurant.phone}`
        speak('Dükkan aranıyor')
      } else {
        speak('Telefon yok')
      }
      return
    }

    // Navigasyon
    if (transcript.includes('konum') || transcript.includes('yol') || transcript.includes('harita') || transcript.includes('navigasyon')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('🗺️ Genel NAVİGASYON komutu, bulunan paket:', activePackage)

      if (activePackage) {
        handleOpenNavigation(activePackage)
        speak('Navigasyon açılıyor')
      } else {
        speak('Paket yok')
      }
      return
    }

    // Adres Sorgula
    if (transcript.includes('sıra') || transcript.includes('nere') || transcript.includes('adres')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('📍 ADRES SORGULA komutu, bulunan paket:', activePackage)

      if (activePackage) {
        const address = activePackage.delivery_address
        const amount = activePackage.amount
        speak(`${address}. ${amount} lira`)
      } else {
        speak('Paket yok')
      }
      return
    }

    console.warn('⚠️ Komut anlaşılamadı:', transcript)
    // Sessizce geç, kullanıcıyı rahatsız etme
  }

  // Web Speech API Setup - ORİJİNAL MANTIK
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    // Web Speech API desteği kontrolü
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Tarayıcı ses tanıma desteklemiyor')
      return
    }

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.lang = 'tr-TR'
    recognitionInstance.continuous = false // Tek cümle sonrası otomatik dur
    recognitionInstance.interimResults = true // Cümle bitmeden algılamaya başla
    recognitionInstance.maxAlternatives = 1

    recognitionInstance.onresult = (event: any) => {
      const last = event.results.length - 1
      const result = event.results[last]

      // Final result (kesin sonuç) geldiğinde işle
      if (result.isFinal) {
        const transcript = result[0].transcript.toLowerCase()
        console.log('🎤 Final transcript:', transcript)
        setVoiceCommand(transcript)

        // Komut algılandı, hemen durdur ve işle
        recognitionInstance.abort() // Zorla durdur
        setIsListening(false)
        handleVoiceCommand(transcript)
      } else {
        // Interim result (geçici sonuç) - sadece log
        const transcript = result[0].transcript.toLowerCase()
        console.log('🎤 Interim transcript:', transcript)
        setVoiceCommand(transcript)
      }
    }

    recognitionInstance.onerror = (event: any) => {
      console.error('Ses tanıma hatası:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setErrorMessage('Mikrofon izni gerekli')
        setTimeout(() => setErrorMessage(''), 3000)
      } else if (event.error === 'aborted') {
        // Abort normal, hata değil
        console.log('🛑 Recognition aborted (normal)')
      }
    }

    recognitionInstance.onend = () => {
      console.log('🛑 Recognition ended')
      setIsListening(false)
    }

    setRecognition(recognitionInstance)

    // Media Session API - Bluetooth/Interkom kontrolleri
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('pause', () => {
        toggleVoiceRecognition()
      })
      navigator.mediaSession.setActionHandler('play', () => {
        if (isListening) {
          toggleVoiceRecognition()
        }
      })
    }

    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort()
      }
    }
  }, [isMounted])

  return {
    // State
    isListening,
    voiceCommand,
    showVoiceHelp,
    setShowVoiceHelp,
    
    // Functions
    toggleVoiceRecognition,
    speak
  }
}
