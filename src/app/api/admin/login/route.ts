/**
 * @file src/app/api/admin/login/route.ts
 * @description Admin giriş API — şifre doğrulama + başarılı girişte Telegram log (non-blocking)
 *
 * Not: Localde `output: 'export'` olduğu için next/headers headers() kullanılamaz.
 * IP/UA NextRequest.headers ile alınır. Telegram, Vercel'de kesilmesin diye after() ile gider.
 */

import { NextRequest, NextResponse } from 'next/server'

function getClientIp(headerStore: Headers): string {
  const forwardedFor = headerStore.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'Bilinmiyor'
  }
  const realIp = headerStore.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'Bilinmiyor'
}

async function sendTelegramLoginLog(params: {
  username: string
  ip: string
  userAgent: string
  date: string
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.replace(/^["']|["']$/g, '').trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.replace(/^["']|["']$/g, '').trim()

  if (!token || !chatId) {
    console.error('Telegram log atlandı: TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik')
    return
  }

  const text = [
    '🔐 Admin Giriş Bildirimi',
    '',
    `👤 Kullanıcı: ${params.username}`,
    `🌐 IP: ${params.ip}`,
    `💻 Cihaz: ${params.userAgent}`,
    `📅 Tarih: ${params.date}`
  ].join('\n')

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      console.error('Telegram login log başarısız:', res.status, data)
    } else {
      console.log('Telegram login log gönderildi')
    }
  } catch (err) {
    console.error('Telegram login log hatası:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      )
    }

    const adminUser = 'admin'
    const adminPass = 'admin12344'

    if (username !== adminUser || password !== adminPass) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı adı veya şifre hatalı!' },
        { status: 401 }
      )
    }

    const ip = getClientIp(request.headers)
    const userAgent = request.headers.get('user-agent') || 'Bilinmiyor'
    const date = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })

    // Vercel serverless fire-and-forget'i öldürüyor; kısa await ile garanti gönder
    await sendTelegramLoginLog({ username, ip, userAgent, date })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login API hatası:', error)
    return NextResponse.json(
      { success: false, error: 'Giriş yapılırken bir hata oluştu' },
      { status: 500 }
    )
  }
}
