#!/bin/bash
# Simple endpoint testing script
# Make sure server is running: npm run dev

BASE_URL="http://localhost:3000"

echo "🧪 Testing Smart Dispatch API Endpoints"
echo "========================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "$BASE_URL/health" | jq '.' || curl -s "$BASE_URL/health"
echo ""
echo ""

# Test 2: Get Orders (empty initially)
echo "2️⃣  Testing GET /api/orders..."
curl -s "$BASE_URL/api/orders" | jq '.' || curl -s "$BASE_URL/api/orders"
echo ""
echo ""

# Test 3: Create Orders (sample data)
echo "3️⃣  Testing POST /api/orders (create sample order)..."
curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [
      {
        "order_number": "TEST-001",
        "customer_name": "John Doe",
        "address": "123 Main St, City, State",
        "phone": "555-0100",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "package_weight": 5.5,
        "priority": "normal"
      }
    ]
  }' | jq '.' || curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [
      {
        "order_number": "TEST-001",
        "customer_name": "John Doe",
        "address": "123 Main St, City, State",
        "phone": "555-0100",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "package_weight": 5.5,
        "priority": "normal"
      }
    ]
  }'
echo ""
echo ""

# Test 4: Get Orders again (should have the new order)
echo "4️⃣  Testing GET /api/orders (after creation)..."
curl -s "$BASE_URL/api/orders" | jq '.' || curl -s "$BASE_URL/api/orders"
echo ""
echo ""

echo "✅ Testing complete!"
echo ""
echo "💡 Tips:"
echo "   - Visit http://localhost:3000/docs for Swagger UI (interactive testing)"
echo "   - Use Postman or Insomnia for more advanced testing"
echo "   - Check server logs for detailed request/response info"
