# Eksik environment variables'ları Vercel'e ekle

Write-Host "SERVICE_ROLE_KEY ekleniyor..." -ForegroundColor Yellow
"sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_" | vercel env add SERVICE_ROLE_KEY production preview development

Write-Host "NEXT_PUBLIC_ADMIN_USERNAME ekleniyor..." -ForegroundColor Yellow
"admin" | vercel env add NEXT_PUBLIC_ADMIN_USERNAME production preview development

Write-Host "NEXT_PUBLIC_ADMIN_PASSWORD ekleniyor..." -ForegroundColor Yellow
"admin123" | vercel env add NEXT_PUBLIC_ADMIN_PASSWORD production preview development

Write-Host "NEXT_PUBLIC_BASE_URL ekleniyor..." -ForegroundColor Yellow
"https://mergenkuryesistem.vercel.app" | vercel env add NEXT_PUBLIC_BASE_URL production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_API_KEY ekleniyor..." -ForegroundColor Yellow
"AIzaSyBmOsnmV_WbYY-OziaOzbsuKxxuSSwSIuc" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ekleniyor..." -ForegroundColor Yellow
"alda-gel-kurye-d0537.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_PROJECT_ID ekleniyor..." -ForegroundColor Yellow
"alda-gel-kurye-d0537" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ekleniyor..." -ForegroundColor Yellow
"alda-gel-kurye-d0537.firebasestorage.app" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ekleniyor..." -ForegroundColor Yellow
"1009357218748" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_APP_ID ekleniyor..." -ForegroundColor Yellow
"1:1009357218748:android:b010d01ec02fcc26fb01b9" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production preview development

Write-Host "NEXT_PUBLIC_FIREBASE_VAPID_KEY ekleniyor..." -ForegroundColor Yellow
"BPEGxaVPJTLFzEGPRLPvdGVCMK_gD7pqRLmMqKpCRa-KmRKCFTHMXNGGCqGdLR_RJmyaM" | vercel env add NEXT_PUBLIC_FIREBASE_VAPID_KEY production preview development

Write-Host "✅ Tüm environment variables eklendi!" -ForegroundColor Green
