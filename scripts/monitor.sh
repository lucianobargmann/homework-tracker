#!/bin/bash

# Production Monitoring Script
# Usage: ./scripts/monitor.sh [URL]

URL=${1:-"http://localhost:3000"}

echo "🔍 Monitoring Homework Tracker at $URL"
echo "=================================="

# Health check
echo "🏥 Health Check:"
curl -s "$URL/api/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test authentication endpoint
echo "🔐 Authentication Check:"
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/auth/providers")
if [ "$AUTH_RESPONSE" = "200" ]; then
    echo "✅ Authentication endpoint responding"
else
    echo "❌ Authentication endpoint failed (HTTP $AUTH_RESPONSE)"
fi
echo ""

# Test admin route (should redirect to signin)
echo "🛡️ Admin Route Protection:"
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/admin")
if [ "$ADMIN_RESPONSE" = "307" ] || [ "$ADMIN_RESPONSE" = "302" ]; then
    echo "✅ Admin route properly protected (redirects to signin)"
elif [ "$ADMIN_RESPONSE" = "200" ]; then
    echo "⚠️ Admin route accessible (might be cached or authenticated)"
else
    echo "❌ Admin route failed (HTTP $ADMIN_RESPONSE)"
fi
echo ""

# Test candidate routes
echo "👤 Candidate Route Protection:"
WELCOME_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/welcome")
if [ "$WELCOME_RESPONSE" = "307" ] || [ "$WELCOME_RESPONSE" = "302" ]; then
    echo "✅ Welcome route properly protected"
else
    echo "❌ Welcome route protection failed (HTTP $WELCOME_RESPONSE)"
fi

SUBMIT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/submit")
if [ "$SUBMIT_RESPONSE" = "307" ] || [ "$SUBMIT_RESPONSE" = "302" ]; then
    echo "✅ Submit route properly protected"
else
    echo "❌ Submit route protection failed (HTTP $SUBMIT_RESPONSE)"
fi
echo ""

# Test static assets
echo "📁 Static Assets:"
LOGO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/metacto-logo.svg")
if [ "$LOGO_RESPONSE" = "200" ]; then
    echo "✅ Static assets loading"
else
    echo "❌ Static assets failed (HTTP $LOGO_RESPONSE)"
fi
echo ""

# Performance check
echo "⚡ Performance Check:"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$URL")
echo "Response time: ${RESPONSE_TIME}s"
if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "✅ Good response time"
else
    echo "⚠️ Slow response time"
fi
echo ""

echo "🎯 Monitoring complete!"
echo ""
echo "💡 Tips:"
echo "- Run this script regularly to monitor health"
echo "- Set up automated monitoring with tools like Uptime Robot"
echo "- Monitor logs for errors: docker logs homework-tracker"
echo "- Check database size: ls -lh prisma/*.db"
