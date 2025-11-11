#!/bin/bash

echo "🔑 Flight Schedule Pro - API Keys Setup"
echo ""

# Prompt for WeatherAPI key
read -p "Enter your WeatherAPI.com API key: " WEATHER_KEY
export WEATHER_API_KEY="$WEATHER_KEY"

# Prompt for OpenAI key
read -sp "Enter your OpenAI API key (hidden): " OPENAI_KEY
echo ""
export OPENAI_API_KEY="$OPENAI_KEY"

# Verify
echo ""
echo "✅ Keys set! Verifying..."
if [ -n "$WEATHER_API_KEY" ]; then
  echo "✓ Weather API Key: ${WEATHER_API_KEY:0:10}... (${#WEATHER_API_KEY} chars)"
else
  echo "✗ Weather API Key: NOT SET"
fi

if [ -n "$OPENAI_API_KEY" ]; then
  echo "✓ OpenAI API Key: ${OPENAI_API_KEY:0:10}... (${#OPENAI_API_KEY} chars)"
else
  echo "✗ OpenAI API Key: NOT SET"
fi

# Save to shell profile (optional)
echo ""
read -p "Save to ~/.zshrc for future sessions? (y/n): " SAVE
if [ "$SAVE" = "y" ] || [ "$SAVE" = "Y" ]; then
  echo "" >> ~/.zshrc
  echo "# Flight Schedule Pro API Keys" >> ~/.zshrc
  echo "export WEATHER_API_KEY=\"$WEATHER_API_KEY\"" >> ~/.zshrc
  echo "export OPENAI_API_KEY=\"$OPENAI_API_KEY\"" >> ~/.zshrc
  echo "✅ Saved to ~/.zshrc"
  echo "   Run 'source ~/.zshrc' or restart terminal to load in new sessions"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Current session: Keys are set and ready to use"
echo "🚀 Next step: Run './scripts/deploy-all.sh' to deploy"
