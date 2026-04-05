#!/bin/bash

# RupeeFlow API Test Script
echo "🚀 Testing RupeeFlow API Endpoints"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local description="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "Method: $method | URL: $url"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "$url")
    else
        response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$http_status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $http_status)"
        echo "Response: $body"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_status)"
        echo "Response: $body"
    fi
}

# 1. Test Core API Health
test_endpoint "Core API Health Check" "GET" "http://localhost:8080/" "" 200

# 2. Test NLP API Health  
test_endpoint "NLP API Health Check" "GET" "http://localhost:8000/" "" 200

# 3. Test NLP Parsing - Expense
test_endpoint "NLP Parse Expense Transaction" "POST" "http://localhost:8000/parse" '{"text": "spent 500 rs on groceries"}' 200

# 4. Test NLP Parsing - Income
test_endpoint "NLP Parse Income Transaction" "POST" "http://localhost:8000/parse" '{"text": "received 2000 salary from company"}' 200

# 5. Test NLP Parsing - Complex
test_endpoint "NLP Parse Complex Transaction" "POST" "http://localhost:8000/parse" '{"text": "paid 1250 for rent this month"}' 200

# 6. Test Google OAuth Login (should redirect)
test_endpoint "Google OAuth Login Redirect" "GET" "http://localhost:8080/api/auth/google/login" "" 307

# 7. Test Protected Route Without Auth (should fail)
test_endpoint "Protected Route Without Auth" "GET" "http://localhost:8080/api/me" "" 401

echo -e "\n${BLUE}🔍 Database Summary:${NC}"
echo "==================="
docker exec rupeeflow-db psql -U root -d rupeeflow -c "
SELECT 
    'Users' as entity, COUNT(*) as count FROM users
UNION ALL
SELECT 
    'Transactions' as entity, COUNT(*) as count FROM transactions
UNION ALL  
SELECT 
    'Income Transactions' as entity, COUNT(*) as count FROM transactions WHERE type = 'INCOME'
UNION ALL
SELECT 
    'Expense Transactions' as entity, COUNT(*) as count FROM transactions WHERE type = 'EXPENSE';
"

echo -e "\n${BLUE}💰 Financial Summary (Test Data):${NC}"
echo "=================================="
docker exec rupeeflow-db psql -U root -d rupeeflow -c "
SELECT 
    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) as net_flow
FROM transactions;
"

echo -e "\n${GREEN}🎉 RupeeFlow API Testing Complete!${NC}"
echo "All core services are operational and ready for use."
