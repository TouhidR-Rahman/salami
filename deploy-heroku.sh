#!/bin/bash

# Heroku Deployment Script for Salami App

set -e

echo "🚀 Deploying Salami App to Heroku"
echo "=================================="
echo ""

# Check if logged in
if ! heroku auth:whoami &>/dev/null; then
    echo "❌ Not logged in to Heroku"
    echo "Please run: heroku login"
    exit 1
fi

USER=$(heroku auth:whoami)
echo "✅ Logged in as: $USER"
echo ""

APP_NAME="salami-app-ahnaf"

# Step 1: Create Heroku app
echo "1️⃣  Creating Heroku app..."
heroku create "$APP_NAME" 2>/dev/null || echo "App already exists"
echo "✅ App created/verified"

# Step 2: Configure Node.js environment
echo ""
echo "2️⃣  Configuring Node.js settings..."
heroku config:set NODE_ENV=production --app "$APP_NAME" > /dev/null
heroku config:set NODE_BUILD_PATH=backend --app "$APP_NAME" > /dev/null
echo "✅ Settings configured"

# Step 3: Deploy from Git
echo ""
echo "3️⃣  Pushing code to Heroku..."
git push heroku main -u 2>&1 | tail -20
echo "✅ Deployment pushed"

# Step 4: View deployed app
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================="

APP_URL="https://$APP_NAME.herokuapp.com"
echo "Your app is now live at:"
echo ""
echo "🌐 $APP_URL"
echo ""
echo "View logs: heroku logs --tail --app $APP_NAME"
echo "Open app: heroku open --app $APP_NAME"
echo ""
