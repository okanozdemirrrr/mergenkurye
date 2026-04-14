/**
 * @file src/utils/realtimeHelpers.ts
 * @description Supabase Realtime Bağlantı Yöneticisi
 * Sessiz yeniden bağlanma ve hata yönetimi
 */

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

interface RealtimeConfig {
  channelName: string
  table: string
  filter?: string
  onUpdate: () => void
  onError?: (error: any) => void
  reconnectInterval?: number
}

export class RealtimeManager {
  private channel: RealtimeChannel | null = null
  private supabase: SupabaseClient
  private config: RealtimeConfig
  private reconnectTimer: NodeJS.Timeout | null = null
  private isSubscribed: boolean = false

  constructor(supabase: SupabaseClient, config: RealtimeConfig) {
    this.supabase = supabase
    this.config = {
      ...config,
      reconnectInterval: config.reconnectInterval || 3000
    }
  }

  async subscribe() {
    try {
      // Önceki bağlantıyı temizle
      if (this.channel) {
        await this.unsubscribe()
      }

      // Yeni kanal oluştur
      this.channel = this.supabase.channel(this.config.channelName)

      // Postgres değişikliklerini dinle
      const changeConfig: any = {
        event: '*',
        schema: 'public',
        table: this.config.table
      }

      if (this.config.filter) {
        changeConfig.filter = this.config.filter
      }

      this.channel.on('postgres_changes', changeConfig, () => {
        this.config.onUpdate()
      })

      // Subscribe ve status kontrolü
      const status = await this.channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime bağlandı: ${this.config.channelName}`)
          this.isSubscribed = true
          // Başarılı bağlantıda reconnect timer'ı temizle
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`⚠️ Realtime bağlantı hatası: ${this.config.channelName} - ${status}`)
          this.isSubscribed = false
          
          // Hata callback'i varsa çağır
          if (this.config.onError) {
            this.config.onError(err || new Error(status))
          }

          // Sessiz yeniden bağlanma
          this.scheduleReconnect()
        }
      })

      return status
    } catch (error) {
      console.error(`❌ Realtime subscription hatası: ${this.config.channelName}`, error)
      
      if (this.config.onError) {
        this.config.onError(error)
      }

      // Hata durumunda da yeniden bağlanmayı dene
      this.scheduleReconnect()
      
      return null
    }
  }

  private scheduleReconnect() {
    // Zaten bir reconnect timer varsa, yenisini oluşturma
    if (this.reconnectTimer) {
      return
    }

    console.log(`🔄 ${this.config.reconnectInterval}ms sonra yeniden bağlanılacak: ${this.config.channelName}`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isSubscribed) {
        console.log(`🔌 Yeniden bağlanılıyor: ${this.config.channelName}`)
        this.subscribe()
      }
    }, this.config.reconnectInterval)
  }

  async unsubscribe() {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      if (this.channel) {
        await this.supabase.removeChannel(this.channel)
        this.channel = null
        this.isSubscribed = false
        console.log(`🔌 Realtime bağlantı kesildi: ${this.config.channelName}`)
      }
    } catch (error) {
      console.error(`❌ Unsubscribe hatası: ${this.config.channelName}`, error)
    }
  }

  getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      hasChannel: !!this.channel
    }
  }
}

// Basit kullanım için helper fonksiyon
export function createRealtimeSubscription(
  supabase: SupabaseClient,
  config: RealtimeConfig
): RealtimeManager {
  return new RealtimeManager(supabase, config)
}
