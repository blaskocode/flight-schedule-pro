#!/bin/bash

echo "🔑 Setting API Keys in AWS Secrets Manager"
echo ""

# Get secret ARNs
echo "📋 Getting secret ARNs..."
OPENAI_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Secrets \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenAISecretArn`].OutputValue' \
  --output text 2>/dev/null)

WEATHER_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Secrets \
  --query 'Stacks[0].Outputs[?OutputKey==`WeatherApiSecretArn`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$OPENAI_SECRET_ARN" ] || [ -z "$WEATHER_SECRET_ARN" ]; then
  echo "❌ Error: Secrets stack not deployed yet"
  echo "   Run: ./scripts/deploy-all.sh first"
  exit 1
fi

echo "✅ Found secrets"
echo ""

# Prompt for keys
read -sp "Enter your OpenAI API key: " OPENAI_KEY
echo ""
read -p "Enter your WeatherAPI.com key: " WEATHER_KEY

# Update secrets
echo ""
echo "📤 Updating secrets..."

aws secretsmanager put-secret-value \
  --secret-id "$OPENAI_SECRET_ARN" \
  --secret-string "{\"apiKey\":\"$OPENAI_KEY\"}" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ OpenAI key updated"
else
  echo "❌ Failed to update OpenAI key"
fi

aws secretsmanager put-secret-value \
  --secret-id "$WEATHER_SECRET_ARN" \
  --secret-string "{\"apiKey\":\"$WEATHER_KEY\"}" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ WeatherAPI key updated"
else
  echo "❌ Failed to update WeatherAPI key"
fi

echo ""
echo "✅ Done! Keys are now stored securely in AWS Secrets Manager"
