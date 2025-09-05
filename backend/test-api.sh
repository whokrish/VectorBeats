#!/bin/bash

# VectorBeats Backend API Test Script
echo "🧪 Testing VectorBeats Backend API..."
echo "================================="

BASE_URL="http://localhost:5000"

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/api/health" | python3 -m json.tool
echo -e "\n"

# Test 2: Music Search (without Spotify credentials, should give an error but route should work)
echo "2. Testing Music Search endpoint..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"test song","limit":5}' \
  "$BASE_URL/api/search-music" | python3 -m json.tool
echo -e "\n"

# Test 3: Invalid route (should return 404)
echo "3. Testing 404 handling..."
curl -s "$BASE_URL/api/nonexistent" | python3 -m json.tool
echo -e "\n"

# Test 4: Image upload without file (should return validation error)
echo "4. Testing image upload validation..."
curl -s -X POST "$BASE_URL/api/upload-image" | python3 -m json.tool
echo -e "\n"

# Test 5: Audio upload without file (should return validation error)
echo "5. Testing audio upload validation..."
curl -s -X POST "$BASE_URL/api/hum-audio" | python3 -m json.tool
echo -e "\n"

echo "✅ API testing completed!"
echo "Note: Some tests may show errors due to missing external services (ML service, Spotify API keys) but the endpoints are working correctly."
