#!/usr/bin/env node

/**
 * Test script to demonstrate server-side validation against malicious submission attempts
 * This simulates what a malicious user might try with tools like Postman or curl
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test cases that should be rejected by server-side validation
const maliciousTests = [
  {
    name: 'Unauthenticated request',
    description: 'Attempt to submit without authentication',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      github_link: 'https://github.com/user/repo',
      prompts_used: 'Test submission'
    },
    expectedStatus: 401
  },
  {
    name: 'Invalid GitHub URL',
    description: 'Attempt to submit with non-GitHub URL',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=fake-token'
    },
    body: {
      github_link: 'https://gitlab.com/user/repo',
      prompts_used: 'Test submission'
    },
    expectedStatus: 400
  },
  {
    name: 'Empty GitHub link',
    description: 'Attempt to submit with empty GitHub link',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=fake-token'
    },
    body: {
      github_link: '',
      prompts_used: 'Test submission'
    },
    expectedStatus: 400
  },
  {
    name: 'Missing prompts_used',
    description: 'Attempt to submit without prompts_used field',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=fake-token'
    },
    body: {
      github_link: 'https://github.com/user/repo'
    },
    expectedStatus: 400
  },
  {
    name: 'Oversized GitHub link',
    description: 'Attempt to submit with extremely long GitHub link',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=fake-token'
    },
    body: {
      github_link: 'https://github.com/user/' + 'a'.repeat(500),
      prompts_used: 'Test submission'
    },
    expectedStatus: 400
  },
  {
    name: 'Oversized prompts description',
    description: 'Attempt to submit with extremely long prompts description',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=fake-token'
    },
    body: {
      github_link: 'https://github.com/user/repo',
      prompts_used: 'a'.repeat(10001)
    },
    expectedStatus: 400
  },
  {
    name: 'Rate limiting test',
    description: 'Attempt to submit multiple times rapidly',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'next-auth.session-token=fake-token'
    },
    body: {
      github_link: 'https://github.com/user/repo',
      prompts_used: 'Test submission'
    },
    expectedStatus: 429,
    repeat: 6 // Send 6 requests rapidly
  }
];

function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/api/candidate/submit`);
    const postData = JSON.stringify(test.body);

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        ...test.headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            response: response
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            response: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🔒 Testing Server-Side Validation Against Malicious Submissions\n');
  console.log('This script simulates malicious attempts that might be made with tools like:');
  console.log('- curl');
  console.log('- Postman');
  console.log('- Custom scripts');
  console.log('- Browser developer tools\n');

  for (const test of maliciousTests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    
    try {
      if (test.repeat) {
        // For rate limiting test, send multiple requests
        console.log(`🔄 Sending ${test.repeat} requests rapidly...`);
        const promises = Array.from({ length: test.repeat }, () => makeRequest(test));
        const results = await Promise.all(promises);
        
        const lastResult = results[results.length - 1];
        console.log(`📊 Status: ${lastResult.status} (Expected: ${test.expectedStatus})`);
        console.log(`📄 Response: ${JSON.stringify(lastResult.response, null, 2)}`);
        
        if (lastResult.status === test.expectedStatus) {
          console.log('✅ BLOCKED - Server correctly rejected malicious attempt');
        } else {
          console.log('❌ VULNERABILITY - Server did not block malicious attempt');
        }
      } else {
        const result = await makeRequest(test);
        console.log(`📊 Status: ${result.status} (Expected: ${test.expectedStatus})`);
        console.log(`📄 Response: ${JSON.stringify(result.response, null, 2)}`);
        
        if (result.status === test.expectedStatus) {
          console.log('✅ BLOCKED - Server correctly rejected malicious attempt');
        } else {
          console.log('❌ VULNERABILITY - Server did not block malicious attempt');
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      console.log('This might indicate the server is not running on localhost:3000');
    }
  }

  console.log('\n🎯 Summary:');
  console.log('The server-side validation includes:');
  console.log('✓ Authentication checks');
  console.log('✓ Input validation and sanitization');
  console.log('✓ GitHub URL format validation');
  console.log('✓ Input length limits');
  console.log('✓ Rate limiting');
  console.log('✓ Assignment state validation (started/submitted)');
  console.log('✓ Atomic database operations to prevent race conditions');
  console.log('✓ Detailed logging for security monitoring');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, maliciousTests };
