# API Keys Setup Guide

This guide walks you through obtaining and setting up the required API keys for Flight Schedule Pro.

## Required API Keys

You need two API keys:
1. **WeatherAPI.com** - For weather data
2. **OpenAI** - For AI-powered reschedule suggestions

## Step 1: Get WeatherAPI.com Key

### Option A: Free Tier (Recommended for Testing)

1. Go to [WeatherAPI.com](https://www.weatherapi.com/)
2. Click **"Sign Up"** (top right)
3. Fill in your details and create an account
4. After signup, you'll be taken to your dashboard
5. Your API key will be displayed on the dashboard
6. **Free tier includes**: 1 million requests/month

### Option B: Already Have an Account

1. Log in to [WeatherAPI.com](https://www.weatherapi.com/login)
2. Navigate to your dashboard
3. Your API key is displayed at the top

**Example API Key Format**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## Step 2: Get OpenAI API Key

### Step 2.1: Create OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Click **"Sign Up"** or **"Log In"**
3. Create an account or log in with existing credentials

### Step 2.2: Add Payment Method

⚠️ **Important**: OpenAI requires a payment method even for free tier usage.

1. Go to [Billing Settings](https://platform.openai.com/account/billing)
2. Click **"Add payment method"**
3. Add a credit card (you'll only be charged for usage beyond free tier)

### Step 2.3: Get API Key

1. Go to [API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Give it a name (e.g., "Flight Schedule Pro")
4. **Copy the key immediately** - you won't be able to see it again!
5. Store it securely

**Example API Key Format**: `sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

⚠️ **Security Note**: Never commit API keys to version control!

---

## Step 3: Set Environment Variables

### Option A: Set for Current Session (Recommended for Deployment)

Set the environment variables in your terminal before running deployment:

```bash
# Set WeatherAPI.com key
export WEATHER_API_KEY="your-weatherapi-key-here"

# Set OpenAI key
export OPENAI_API_KEY="sk-your-openai-key-here"

# Verify they're set
echo "Weather API Key: ${WEATHER_API_KEY:0:10}..."  # Shows first 10 chars
echo "OpenAI API Key: ${OPENAI_API_KEY:0:10}..."    # Shows first 10 chars
```

### Option B: Add to Shell Profile (Persistent)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Add these lines to your shell profile
export WEATHER_API_KEY="your-weatherapi-key-here"
export OPENAI_API_KEY="sk-your-openai-key-here"
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Option C: Create .env File (For Local Development)

Create a `.env` file in the project root (add to `.gitignore`):

```bash
# .env (DO NOT COMMIT THIS FILE!)
WEATHER_API_KEY=your-weatherapi-key-here
OPENAI_API_KEY=sk-your-openai-key-here
```

Then source it:
```bash
export $(cat .env | xargs)
```

---

## Step 4: Verify Keys Are Set

Run these commands to verify:

```bash
# Check if WeatherAPI key is set
if [ -z "$WEATHER_API_KEY" ]; then
  echo "❌ WEATHER_API_KEY is not set"
else
  echo "✅ WEATHER_API_KEY is set (${#WEATHER_API_KEY} characters)"
fi

# Check if OpenAI key is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ OPENAI_API_KEY is not set"
else
  echo "✅ OPENAI_API_KEY is set (${#OPENAI_API_KEY} characters)"
fi
```

---

## Step 5: How Keys Are Used During Deployment

When you run `./scripts/deploy-all.sh`:

1. **Secrets Stack** is deployed first
   - Creates AWS Secrets Manager secrets
   - Secrets are created with placeholder values initially

2. **Environment Variables** are read
   - The deployment script reads `WEATHER_API_KEY` and `OPENAI_API_KEY`
   - These values are stored in AWS Secrets Manager

3. **Lambda Functions** access secrets
   - Lambda functions read from Secrets Manager at runtime
   - Keys are never hardcoded in Lambda code

### Security Best Practices

✅ **Good**:
- Keys stored in AWS Secrets Manager (encrypted)
- Keys never in code or version control
- Keys accessed at runtime by Lambda functions

❌ **Bad**:
- Hardcoding keys in code
- Committing keys to git
- Logging keys in CloudWatch

---

## Step 6: Update Keys After Deployment

If you need to update keys after deployment:

### Get Secret ARNs

```bash
# Get OpenAI secret ARN
aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Secrets \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenAISecretArn`].OutputValue' \
  --output text

# Get WeatherAPI secret ARN
aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Secrets \
  --query 'Stacks[0].Outputs[?OutputKey==`WeatherApiSecretArn`].OutputValue' \
  --output text
```

### Update Secrets

```bash
# Update OpenAI key
aws secretsmanager put-secret-value \
  --secret-id <OpenAI-Secret-ARN> \
  --secret-string '{"apiKey":"sk-your-new-openai-key"}'

# Update WeatherAPI key
aws secretsmanager put-secret-value \
  --secret-id <WeatherAPI-Secret-ARN> \
  --secret-string '{"apiKey":"your-new-weatherapi-key"}'
```

---

## Troubleshooting

### Issue: "API key not set" error during deployment

**Solution**: Make sure environment variables are exported:
```bash
export WEATHER_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

### Issue: "Invalid API key" error from WeatherAPI

**Solution**: 
- Verify the key is correct (no extra spaces)
- Check your WeatherAPI.com account is active
- Verify you haven't exceeded rate limits

### Issue: "Insufficient quota" error from OpenAI

**Solution**:
- Check your OpenAI account billing
- Verify payment method is added
- Check usage limits in OpenAI dashboard

### Issue: Keys work locally but not in Lambda

**Solution**:
- Verify secrets are stored in AWS Secrets Manager
- Check Lambda has permission to read secrets
- Verify secret ARN is correct in Lambda environment variables

---

## Cost Information

### WeatherAPI.com
- **Free Tier**: 1 million requests/month
- **Paid Plans**: Start at $4/month for higher limits
- **For this app**: Free tier should be sufficient for testing

### OpenAI
- **Pay-as-you-go**: ~$0.03 per 1K tokens (GPT-4)
- **Free Tier**: $5 credit for new accounts
- **For this app**: Each reschedule generation uses ~500-1000 tokens
- **Estimated cost**: ~$0.01-0.03 per reschedule request

---

## Quick Setup Script

Save this as `setup-api-keys.sh`:

```bash
#!/bin/bash

echo "🔑 API Keys Setup"
echo ""

# Prompt for WeatherAPI key
read -p "Enter your WeatherAPI.com API key: " WEATHER_KEY
export WEATHER_API_KEY="$WEATHER_KEY"

# Prompt for OpenAI key
read -sp "Enter your OpenAI API key: " OPENAI_KEY
echo ""
export OPENAI_API_KEY="$OPENAI_KEY"

# Verify
echo ""
echo "✅ Keys set! Verifying..."
echo "Weather API Key: ${WEATHER_API_KEY:0:10}..."
echo "OpenAI API Key: ${OPENAI_API_KEY:0:10}..."

# Save to shell profile (optional)
read -p "Save to ~/.zshrc? (y/n): " SAVE
if [ "$SAVE" = "y" ]; then
  echo "" >> ~/.zshrc
  echo "# Flight Schedule Pro API Keys" >> ~/.zshrc
  echo "export WEATHER_API_KEY=\"$WEATHER_API_KEY\"" >> ~/.zshrc
  echo "export OPENAI_API_KEY=\"$OPENAI_API_KEY\"" >> ~/.zshrc
  echo "✅ Saved to ~/.zshrc"
fi

echo ""
echo "✅ Setup complete! You can now run: ./scripts/deploy-all.sh"
```

Make it executable:
```bash
chmod +x setup-api-keys.sh
./setup-api-keys.sh
```

---

## Next Steps

Once your API keys are set:

1. **Verify keys are set**:
   ```bash
   echo $WEATHER_API_KEY
   echo $OPENAI_API_KEY
   ```

2. **Proceed with deployment**:
   ```bash
   ./scripts/deploy-all.sh
   ```

3. **Keys will be automatically stored** in AWS Secrets Manager during deployment

---

## Security Reminders

🔒 **Never**:
- Commit API keys to git
- Share keys in screenshots or messages
- Hardcode keys in source code
- Log keys in application logs

✅ **Always**:
- Use environment variables
- Store in AWS Secrets Manager (production)
- Rotate keys periodically
- Use least-privilege IAM policies

---

**Ready to deploy?** Once keys are set, run `./scripts/deploy-all.sh`!

