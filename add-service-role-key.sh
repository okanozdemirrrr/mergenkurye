#!/bin/bash
# SERVICE_ROLE_KEY'i Vercel'e ekle

# Production
vercel env add SERVICE_ROLE_KEY production <<EOF
sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_
EOF

# Preview
vercel env add SERVICE_ROLE_KEY preview <<EOF
sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_
EOF

# Development
vercel env add SERVICE_ROLE_KEY development <<EOF
sb_secret_9CfOQBAR_eFgmjiGo46xVA_YxKXfD3_
EOF

echo "✅ SERVICE_ROLE_KEY eklendi!"
