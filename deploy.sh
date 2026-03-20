#!/bin/bash

# Salami App Azure Deployment Script
# This script deploys your Salami App to Azure App Service

echo "🚀 Salami App - Azure Deployment"
echo "=================================="
echo ""

# Check if logged in
echo "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure"
    echo "Please run: az login"
    exit 1
fi

ACCOUNT=$(az account show --query "name" -o tsv)
echo "✅ Logged in as: $ACCOUNT"
echo ""

# Set variables
RESOURCE_GROUP="salami-app-rg"
APP_NAME="salami-app-$(date +%s)"
LOCATION="eastus"
PLAN_NAME="salami-app-plan"

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   App Name: $APP_NAME"
echo "   Location: $LOCATION"
echo "   Plan: $PLAN_NAME"
echo ""

# Create resource group
echo "1️⃣  Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --query "id" -o tsv

# Create App Service Plan (Free tier)
echo ""
echo "2️⃣  Creating App Service Plan (Free tier)..."
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku F1 \
  --is-linux \
  --query "id" -o tsv

# Create Web App
echo ""
echo "3️⃣  Creating Web App..."
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "NODE:20-lts" \
  --query "defaultHostName" -o tsv

# Configure deployment from Git
echo ""
echo "4️⃣  Configuring Git deployment..."
DEPLOYMENT_USER="salamiappuser"
DEPLOYMENT_PASS=$(openssl rand -base64 32)

echo "Setting deployment credentials..."
az webapp deployment user set \
  --user-name "$DEPLOYMENT_USER" \
  --password "$DEPLOYMENT_PASS"

# Get Git URL
GIT_URL=$(az webapp deployment source config-local-git \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "url" -o tsv)

echo "Git URL: $GIT_URL"

# Configure Node.js settings
echo ""
echo "5️⃣  Configuring Node.js settings..."
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "NODE_ENV=production"

# Add Git remote
echo ""
echo "6️⃣  Adding Git remote..."
cd "$(dirname "$0")" || exit
git remote remove azure 2>/dev/null || true
git remote add azure "$GIT_URL"

# Push to Azure
echo ""
echo "7️⃣  Deploying to Azure..."
git push azure master -u

# Get app URL
WEBAPP_URL=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostName" -o tsv)

echo ""
echo "✅ Deployment Complete!"
echo "=================================="
echo "Your app is live at: https://$WEBAPP_URL"
echo ""
echo "Deployment Credentials:"
echo "  Username: $DEPLOYMENT_USER"
echo "  Password: $DEPLOYMENT_PASS"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "App Name: $APP_NAME"
echo ""
echo "Next steps:"
echo "  1. Open: https://$WEBAPP_URL"
echo "  2. Test the registration form"
echo "  3. View logs: az webapp log tail -n $APP_NAME -g $RESOURCE_GROUP"
