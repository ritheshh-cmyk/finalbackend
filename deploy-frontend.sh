#!/bin/bash
set -e

echo "🚀 DEPLOYING FRONTEND TO VERCEL"
echo "==============================="

cd expensoo

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🏗️ Building project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npx vercel --prod

echo ""
echo "✅ FRONTEND DEPLOYMENT COMPLETED!"
echo "================================"
echo "🌐 Frontend URL: https://callmemobiles.vercel.app"
echo ""
echo "🔄 Verify deployment:"
echo "1. Open https://callmemobiles.vercel.app"
echo "2. Try logging in with: callmeowner / owner@777"
echo "3. Check that dashboard loads with data"
