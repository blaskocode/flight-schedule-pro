#!/bin/bash
# Quick script to set API keys
# Edit this file with your keys, then run: source set-keys.sh

export WEATHER_API_KEY="PASTE_YOUR_WEATHERAPI_KEY_HERE"
export OPENAI_API_KEY="PASTE_YOUR_OPENAI_KEY_HERE"

echo "✅ API keys set!"
echo "Weather API Key: ${WEATHER_API_KEY:0:10}..."
echo "OpenAI API Key: ${OPENAI_API_KEY:0:10}..."

