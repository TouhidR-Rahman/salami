#!/bin/bash

# Salami App - Azure Deployment Script
# Deploy to Azure App Service using Git

set -e

echo "🚀 Salami App - Azure Deployment"
echo "=================================="
echo ""

# Check if logged in
if ! az account show &>/dev/null; then
    echo "❌ Not logged in to Azure"
    exit 1
fi

ACCOUNT=$(az account show --query "name" -o tsv)
echo "✅ Logged in as: $ACCOUNT"
echo ""

# Configuration
RESOURCE_GROUP="salamiappgroup"
APP_NAME="salami-app-ahnaf"
PLAN_NAME="salamiplan"

echo "📋 Deploying Salami App to Azure..."
echo "   App Name: $APP_NAME"
echo "   Resource Group: $RESOURCE_GROUP"
echo ""

# Step 1: Create Web App (using existing plan)
echo "1️⃣  Creating Web App..."
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "NODE|20-lts" \
  --startup-file "backend/server.js" \
  --output none 2>/dev/null || echo "⚠️  App already exists, updating..."

echo "✅ Web App created/verified"

# Step 2: Configure Node.js settings
echo ""
echo "2️⃣  Configuring Node.js Settings..."
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    "NODE_ENV=production" \
    "WEBSITE_NODE_DEFAULT_VERSION=20-lts" \
    "SCM_DO_BUILD_DURING_DEPLOYMENT=true" \
  --output none

echo "✅ Settings configured"

# Step 3: Setup Git deployment
echo ""
echo "3️⃣  Setting up Git deployment..."

# Get Git URL
GIT_URL=$(az webapp deployment source config-local-git \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "url" -o tsv)

echo "Git URL: $GIT_URL"

# Add remote
cd "/Users/ahnaftahmid/Docc/Coding/Salami App"
git remote remove azure 2>/dev/null || true
git remote add azure "$GIT_URL"

# Step 4: Push to Azure
echo ""
echo "4️⃣  Pushing code to Azure..."
git push azure main -u 2>&1 | tail -10

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "=================================="

# Get the app URL
WEBAPP_URL=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostName" -o tsv)

echo "Your app is live at:"
echo ""
echo "🌐 https://$WEBAPP_URL"
echo ""
echo "Additional commands:"
echo "  View logs: az webapp log tail -n $APP_NAME -g $RESOURCE_GROUP"
echo "  Restart: az webapp restart -n $APP_NAME -g $RESOURCE_GROUP"
echo ""
