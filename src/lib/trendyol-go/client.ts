/**
 * Trendyol Go Meal API — SALT OKUMA istemcisi.
 * picked / invoiced / manual-shipped / manual-delivered / unsupplied /
 * test siparişi oluşturma — YOK, çağrılmaz, kodu yazılmaz.
 */

import { buildRequiredHeaders } from './auth'
import { maskAuthorizationHeader } from './crypto'
import { summarizeForLog } from './maskSecrets'
import {
  PROD_BASE,
  STAGE_BASE,
  type TrendyolGoAuth,
  type TrendyolGoEnvironment,
  type TrendyolPackage,
  type TrendyolPackageStatus,
  type TrendyolPackagesResponse,
} from './types'

export class TrendyolGoHttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body: string,
    public retryAfterMs?: number
  ) {
    super(message)
    this.name = 'TrendyolGoHttpError'
  }
}

export interface TrendyolGoClientOptions {
  auth: TrendyolGoAuth
  environment: TrendyolGoEnvironment
  onLog?: (entry: {
    method: string
    path: string
    queryMasked?: string
    statusCode?: number
    requestSummary?: string
    responseSummary?: string
    hata?: string
    durationMs: number
  }) => void | Promise<void>
  /** 5xx / 429 / ağ — üstel geri çekilme */
  maxRetries?: number
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryAfter(res: Response): number | undefined {
  const h = res.headers.get('Retry-After')
  if (!h) return undefined
  const sec = Number(h)
  if (Number.isFinite(sec)) return sec * 1000
  const date = Date.parse(h)
  if (Number.isFinite(date)) return Math.max(0, date - Date.now())
  return undefined
}

export function turkishErrorMessage(status: number, body: string): string {
  if (status === 400) return 'Hatalı parametre — istek bilgilerini kontrol edin.'
  if (status === 401) return 'Kimlik bilgisi yanlış (API Key/Secret veya Token).'
  if (status === 403) return 'Bu paket veya mağaza bu supplierId’ye ait değil.'
  if (status === 404) return 'Paket bulunamadı.'
  if (status === 429) return 'İstek limiti aşıldı (429). Bir süre sonra tekrar deneyin.'
  if (status >= 500) return 'Trendyol sunucu hatası (geçici).'
  return `Trendyol API hatası (${status}): ${body.slice(0, 200)}`
}

export class TrendyolGoReadClient {
  private base: string
  private auth: TrendyolGoAuth
  private onLog?: TrendyolGoClientOptions['onLog']
  private maxRetries: number

  constructor(opts: TrendyolGoClientOptions) {
    this.base = opts.environment === 'stage' ? STAGE_BASE : PROD_BASE
    this.auth = opts.auth
    this.onLog = opts.onLog
    this.maxRetries = opts.maxRetries ?? 3
  }

  private async getJson<T>(
    path: string,
    query?: Record<string, string | number | undefined>
  ): Promise<T> {
    const qs = new URLSearchParams()
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
      }
    }
    const qstr = qs.toString()
    const url = `${this.base}${path}${qstr ? `?${qstr}` : ''}`
    const headers = buildRequiredHeaders(this.auth)

    let attempt = 0
    let lastError: unknown

    while (attempt <= this.maxRetries) {
      const started = Date.now()
      try {
        const res = await fetch(url, { method: 'GET', headers })
        const durationMs = Date.now() - started
        const text = await res.text()
        let parsed: unknown = null
        try {
          parsed = text ? JSON.parse(text) : null
        } catch {
          parsed = text
        }

        await this.onLog?.({
          method: 'GET',
          path,
          queryMasked: qstr || undefined,
          statusCode: res.status,
          requestSummary: summarizeForLog({
            authorization: maskAuthorizationHeader(headers.Authorization),
            agent: headers['x-agentname'],
            executor: headers['x-executor-user'],
          }),
          responseSummary: summarizeForLog(parsed),
          hata: res.ok ? undefined : turkishErrorMessage(res.status, text),
          durationMs,
        })

        if (res.ok) return parsed as T

        const retryAfterMs = parseRetryAfter(res)
        const retryable = res.status === 429 || res.status >= 500
        if (!retryable || attempt >= this.maxRetries) {
          throw new TrendyolGoHttpError(
            turkishErrorMessage(res.status, text),
            res.status,
            text,
            retryAfterMs
          )
        }

        const backoff =
          retryAfterMs ?? Math.min(30_000, 500 * Math.pow(2, attempt))
        await sleep(backoff)
        attempt += 1
        continue
      } catch (err) {
        lastError = err
        if (err instanceof TrendyolGoHttpError) {
          if (err.statusCode === 401 || err.statusCode === 403) throw err
          if (err.statusCode === 429 || err.statusCode >= 500) {
            // already handled above for retry; rethrow if exhausted
            if (attempt >= this.maxRetries) throw err
          } else {
            throw err
          }
        }
        // Ağ hatası
        await this.onLog?.({
          method: 'GET',
          path,
          queryMasked: qstr || undefined,
          hata: err instanceof Error ? err.message : 'Ağ hatası',
          durationMs: Date.now() - started,
        })
        if (attempt >= this.maxRetries) {
          throw new TrendyolGoHttpError(
            'Ağ hatası — Trendyol’a ulaşılamadı.',
            0,
            err instanceof Error ? err.message : String(err)
          )
        }
        await sleep(Math.min(30_000, 500 * Math.pow(2, attempt)))
        attempt += 1
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Trendyol isteği başarısız')
  }

  /** GET /suppliers/{supplierId}/packages */
  async listPackages(params: {
    supplierId: number | string
    storeId: string
    packageStatuses: TrendyolPackageStatus[] | string
    packageModificationStartDate: number
    packageModificationEndDate: number
    page?: number
    size?: number
  }): Promise<TrendyolPackagesResponse> {
    const size = Math.min(params.size ?? 50, 50)
    const statuses = Array.isArray(params.packageStatuses)
      ? params.packageStatuses.join(',')
      : params.packageStatuses

    return this.getJson<TrendyolPackagesResponse>(
      `/suppliers/${params.supplierId}/packages`,
      {
        storeId: params.storeId,
        packageStatuses: statuses,
        packageModificationStartDate: params.packageModificationStartDate,
        packageModificationEndDate: params.packageModificationEndDate,
        page: params.page ?? 0,
        size,
      }
    )
  }

  /** GET /suppliers/{supplierId}/packages/{packageId} */
  async getPackage(
    supplierId: number | string,
    packageId: string
  ): Promise<TrendyolPackage> {
    return this.getJson<TrendyolPackage>(
      `/suppliers/${supplierId}/packages/${packageId}`
    )
  }

  /**
   * Tüm sayfaları çeker (size max 50).
   * imleç ilerletme çağıranın sorumluluğunda — tüm sayfalar bitmeden ilerletme.
   */
  async listAllPackages(
    params: Omit<Parameters<TrendyolGoReadClient['listPackages']>[0], 'page'>
  ): Promise<{ packages: TrendyolPackage[]; totalCount: number }> {
    const all: TrendyolPackage[] = []
    let page = 0
    let totalPages = 1
    let totalCount = 0

    while (page < totalPages) {
      const res = await this.listPackages({ ...params, page, size: 50 })
      totalCount = res.totalCount ?? all.length
      totalPages = Math.max(1, res.totalPages ?? 1)
      all.push(...(res.content || []))
      page += 1
      if (!(res.content || []).length) break
    }

    return { packages: all, totalCount }
  }
}
