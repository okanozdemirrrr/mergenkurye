/**
 * @file src/utils/retry.ts
 * @description Bağlantı dayanıklılığı için retry logic
 * 🛡️ AŞAMA 5: Network hatalarında otomatik yeniden deneme
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * 🛡️ Exponential backoff ile retry logic
 * 
 * @example
 * const data = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * )
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry
  } = options

  let lastError: Error | null = null
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Son denemeyse hata fırlat
      if (attempt === maxAttempts) {
        throw lastError
      }

      // Network hatası mı kontrol et
      const isNetworkError = 
        lastError.message.toLowerCase().includes('fetch') ||
        lastError.message.toLowerCase().includes('network') ||
        lastError.message.toLowerCase().includes('timeout')

      // Network hatası değilse retry yapma
      if (!isNetworkError) {
        throw lastError
      }

      // Retry callback
      if (onRetry) {
        onRetry(attempt, lastError)
      }

      console.warn(`🔄 Retry ${attempt}/${maxAttempts} - ${delay}ms sonra tekrar denenecek:`, lastError.message)

      // Bekle
      await sleep(delay)

      // Delay'i artır (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelay)
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * 🛡️ Timeout ile fetch wrapper
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

/**
 * 🛡️ Supabase query için retry wrapper
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  return retryWithBackoff(async () => {
    const result = await queryFn()
    
    // Supabase error varsa fırlat
    if (result.error) {
      throw result.error
    }
    
    return result
  }, options)
}

/**
 * 🛡️ Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 🛡️ Circuit Breaker Pattern
 * Sürekli başarısız olan istekleri geçici olarak durdurur
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 dakika
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Circuit açıksa ve timeout geçmediyse hata fırlat
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      
      if (timeSinceLastFailure < this.timeout) {
        throw new Error('Circuit breaker is open - too many failures')
      }
      
      // Timeout geçtiyse half-open'a geç
      this.state = 'half-open'
    }

    try {
      const result = await fn()
      
      // Başarılı - circuit'i kapat
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failureCount = 0
      }
      
      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      // Threshold'u geçtiyse circuit'i aç
      if (this.failureCount >= this.threshold) {
        this.state = 'open'
        console.error(`🔴 Circuit breaker opened after ${this.failureCount} failures`)
      }

      throw error
    }
  }

  reset() {
    this.state = 'closed'
    this.failureCount = 0
    this.lastFailureTime = 0
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    }
  }
}
