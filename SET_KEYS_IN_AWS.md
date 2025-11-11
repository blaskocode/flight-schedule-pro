# Setting API Keys Directly in AWS Secrets Manager

This guide shows you how to set your API keys directly in AWS Secrets Manager, which is more secure than using environment variables.

## Option 1: Deploy First, Then Set Keys (Recommended)

### Step 1: Deploy Infrastructure (Without Keys)

Deploy the stacks first - the secrets will be created with placeholder values:

```bash
# Deploy all stacks (keys not required for this step)
./scripts/deploy-all.sh
```

The Secrets stack will create two secrets in AWS Secrets Manager:
- OpenAI API key secret
- WeatherAPI.com key secret

### Step 2: Get Secret ARNs

After deployment, get the secret ARNs:

```bash
# Get OpenAI secret ARN
OPENAI_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Secrets \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenAISecretArn`].OutputValue' \
  --output text)

echo "OpenAI Secret ARN: $OPENAI_SECRET_ARN"

# Get WeatherAPI secret ARN
WEATHER_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Secrets \
  --query 'Stacks[0].Outputs[?OutputKey==`WeatherApiSecretArn`].OutputValue' \
  --output text)

echo "WeatherAPI Secret ARN: $WEATHER_SECRET_ARN"
```

### Step 3: Update Secrets with Your Keys

Update each secret with your actual API keys:

```bash
# Update OpenAI key
aws secretsmanager put-secret-value \
  --secret-id "$OPENAI_SECRET_ARN" \
  --secret-string '{"apiKey":"sk-your-actual-openai-key-here"}'

# Update WeatherAPI key
aws secretsmanager put-secret-value \
  --secret-id "$WEATHER_SECRET_ARN" \
  --secret-string '{"apiKey":"your-actual-weatherapi-key-here"}'
```

### Step 4: Verify Secrets

Verify the secrets were updated (this will show the keys, so be careful):

```bash
# Verify OpenAI secret (shows the key)
aws secretsmanager get-secret-value \
  --secret-id "$OPENAI_SECRET_ARN" \
  --query 'SecretString' \
  --output text | jq -r '.apiKey'

# Verify WeatherAPI secret (shows the key)
aws secretsmanager get-secret-value \
  --secret-id "$WEATHER_SECRET_ARN" \
  --query 'SecretString' \
  --output text | jq -r '.apiKey'
```

---

## Option 2: Create Secrets Manually Before Deployment

If you prefer to create the secrets manually before deploying:

### Step 1: Create Secrets in AWS Secrets Manager

```bash
# Create OpenAI secret
aws secretsmanager create-secret \
  --name "FlightSchedulePro-OpenAI-Key" \
  --description "OpenAI API key for AI rescheduling" \
  --secret-string '{"apiKey":"sk-your-actual-openai-key-here"}'

# Create WeatherAPI secret
aws secretsmanager create-secret \
  --name "FlightSchedulePro-WeatherAPI-Key" \
  --description "WeatherAPI.com API key" \
  --secret-string '{"apiKey":"your-actual-weatherapi-key-here"}'
```

### Step 2: Update Secrets Stack to Use Existing Secrets

You would need to modify `infrastructure/lib/secrets-stack.ts` to reference existing secrets instead of creating new ones. However, **Option 1 is recommended** as it's simpler and the CDK will manage everything.

---

## Option 3: Use AWS Console (GUI Method)

### Step 1: Deploy Infrastructure

```bash
./scripts/deploy-all.sh
```

### Step 2: Open AWS Secrets Manager Console

1. Go to [AWS Secrets Manager Console](https://console.aws.amazon.com/secretsmanager/)
2. Find the secrets created by the stack:
   - Look for secrets with names containing "OpenAI" and "WeatherAPI"
   - Or search for "FlightSchedulePro"

### Step 3: Update Each Secret

For each secret:

1. Click on the secret name
2. Click **"Retrieve secret value"** tab
3. Click **"Edit"**
4. Update the JSON:
   ```json
   {
     "apiKey": "your-actual-key-here"
   }
   ```
5. Click **"Save"**

---

## Quick Script: Set Keys After Deployment

Save this as `set-keys-in-aws.sh`:

```bash
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
```

Make it executable:
```bash
chmod +x set-keys-in-aws.sh
```

---

## Recommended Workflow

1. **Deploy infrastructure first** (without keys):
   ```bash
   ./scripts/deploy-all.sh
   ```

2. **Set keys in AWS Secrets Manager** (using one of the methods above)

3. **Keys are automatically used** by Lambda functions - no code changes needed!

---

## Security Benefits

✅ **Keys never in your terminal history**  
✅ **Keys never in environment variables**  
✅ **Keys encrypted at rest in AWS**  
✅ **Keys only accessible by authorized Lambda functions**  
✅ **Can rotate keys without redeploying**  

---

## Troubleshooting

### Issue: "Secret not found"

**Solution**: Make sure the Secrets stack is deployed:
```bash
aws cloudformation describe-stacks --stack-name FlightSchedulePro-Secrets
```

### Issue: "Access denied"

**Solution**: Make sure your AWS credentials have Secrets Manager permissions:
```bash
aws secretsmanager list-secrets
```

### Issue: Lambda can't read secrets

**Solution**: The CDK should have granted permissions automatically. Verify:
```bash
# Check Lambda function has secret access
aws lambda get-policy --function-name <function-name>
```

---

## Next Steps

After setting keys in AWS:

1. ✅ Keys are stored securely
2. ✅ Lambda functions will use them automatically
3. ✅ No need to set environment variables
4. ✅ Proceed with database initialization and frontend deployment

**Ready to deploy?** Run `./scripts/deploy-all.sh` first, then set your keys using one of the methods above!

