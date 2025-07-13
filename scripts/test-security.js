#!/usr/bin/env node

/**
 * Manual security test script to verify page access control
 * Run this with: node scripts/test-security.js
 */

const http = require('http')

const BASE_URL = 'http://localhost:3000'

const testCases = [
  {
    name: 'Admin page without auth',
    path: '/admin',
    expectedStatus: 307, // Should redirect to signin
    description: 'Should redirect to signin when accessing admin page without authentication'
  },
  {
    name: 'Welcome page without auth',
    path: '/welcome',
    expectedStatus: 307, // Should redirect to signin
    description: 'Should redirect to signin when accessing candidate page without authentication'
  },
  {
    name: 'Assignment page without auth',
    path: '/assignment',
    expectedStatus: 307, // Should redirect to signin
    description: 'Should redirect to signin when accessing assignment page without authentication'
  },
  {
    name: 'Submit page without auth',
    path: '/submit',
    expectedStatus: 307, // Should redirect to signin
    description: 'Should redirect to signin when accessing submit page without authentication'
  },
  {
    name: 'Public signin page',
    path: '/auth/signin',
    expectedStatus: 200, // Should be accessible
    description: 'Should allow access to signin page without authentication'
  },
  {
    name: 'Public home page',
    path: '/',
    expectedStatus: 200, // Should be accessible
    description: 'Should allow access to home page without authentication'
  }
]

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Test-Script'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

async function runTests() {
  console.log('🔒 Running Security Tests...\n')
  
  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`)
      console.log(`Description: ${testCase.description}`)
      console.log(`Path: ${testCase.path}`)
      
      const response = await makeRequest(testCase.path)
      
      console.log(`Expected Status: ${testCase.expectedStatus}`)
      console.log(`Actual Status: ${response.statusCode}`)
      
      if (response.statusCode === testCase.expectedStatus) {
        console.log('✅ PASS\n')
        passed++
      } else {
        console.log('❌ FAIL')
        if (response.headers.location) {
          console.log(`Redirect Location: ${response.headers.location}`)
        }
        console.log('')
        failed++
      }
    } catch (error) {
      console.log(`❌ FAIL - Error: ${error.message}\n`)
      failed++
    }
  }

  console.log('📊 Test Results:')
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Total: ${passed + failed}`)
  
  if (failed === 0) {
    console.log('\n🎉 All security tests passed!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some security tests failed!')
    process.exit(1)
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/')
    console.log('✅ Server is running on http://localhost:3001\n')
    return true
  } catch (error) {
    console.log('❌ Server is not running on http://localhost:3000')
    console.log('Please start the server with: npm run dev')
    console.log('Then run this test again.\n')
    return false
  }
}

async function main() {
  console.log('🔍 Security Test Suite for Homework Tracker\n')
  
  const serverRunning = await checkServer()
  if (!serverRunning) {
    process.exit(1)
  }
  
  await runTests()
}

main().catch(console.error)
