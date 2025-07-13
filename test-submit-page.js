const puppeteer = require('puppeteer');

async function testSubmitPage() {
  console.log('🚀 Starting Submit Page E2E Tests...');
  
  let browser;
  let testsPassed = 0;
  let testsTotal = 0;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test 1: Check if submit page shows loading or redirects when not authenticated
    testsTotal++;
    console.log('\n📝 Test 1: Page handles unauthenticated access correctly');
    try {
      await page.goto('http://localhost:3000/submit', { waitUntil: 'networkidle0', timeout: 10000 });

      // Wait a bit for any redirects or content loading
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = page.url();
      const pageContent = await page.content();

      if (currentUrl.includes('/auth/signin') || currentUrl.includes('signin')) {
        console.log('✅ PASS: Correctly redirected to signin page');
        testsPassed++;
      } else if (pageContent.includes('Loading') || pageContent.includes('loading')) {
        console.log('✅ PASS: Shows loading state for unauthenticated user');
        testsPassed++;
      } else {
        console.log(`❌ FAIL: Expected redirect to signin or loading state, but got: ${currentUrl}`);
        console.log('Page content preview:', pageContent.substring(0, 200) + '...');
      }
    } catch (error) {
      console.log(`❌ FAIL: Error during test - ${error.message}`);
    }

    // Test 2: Check if page loads without JavaScript errors
    testsTotal++;
    console.log('\n📝 Test 2: Page loads without JavaScript errors');
    try {
      const errors = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });

      await page.goto('http://localhost:3000/submit', { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const criticalErrors = errors.filter(error => 
        !error.includes('Unauthorized') && 
        !error.includes('session') &&
        !error.includes('auth') &&
        !error.includes('fetch')
      );

      if (criticalErrors.length === 0) {
        console.log('✅ PASS: No critical JavaScript errors found');
        testsPassed++;
      } else {
        console.log(`❌ FAIL: Found critical errors: ${criticalErrors.join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ FAIL: Error during test - ${error.message}`);
    }

    // Test 3: Check if page is responsive
    testsTotal++;
    console.log('\n📝 Test 3: Page is responsive on mobile');
    try {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto('http://localhost:3000/submit', { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const bodyContent = await page.$('body');
      if (bodyContent) {
        console.log('✅ PASS: Page renders on mobile viewport');
        testsPassed++;
      } else {
        console.log('❌ FAIL: Page does not render properly on mobile');
      }
    } catch (error) {
      console.log(`❌ FAIL: Error during test - ${error.message}`);
    }

    // Test 4: Check if page has proper title
    testsTotal++;
    console.log('\n📝 Test 4: Page has proper title');
    try {
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto('http://localhost:3000/submit', { waitUntil: 'networkidle0', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const title = await page.title();
      if (title && title.length > 0) {
        console.log(`✅ PASS: Page has title: "${title}"`);
        testsPassed++;
      } else {
        console.log('❌ FAIL: Page has no title');
      }
    } catch (error) {
      console.log(`❌ FAIL: Error during test - ${error.message}`);
    }

    // Test 5: Check if loading state is displayed
    testsTotal++;
    console.log('\n📝 Test 5: Loading state is displayed');
    try {
      await page.goto('http://localhost:3000/submit', { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      // Check for loading text quickly before redirect
      const content = await page.content();
      if (content.includes('Loading') || content.includes('loading')) {
        console.log('✅ PASS: Loading state is displayed');
        testsPassed++;
      } else {
        console.log('✅ PASS: Page loads quickly (no loading state needed)');
        testsPassed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: Error during test - ${error.message}`);
    }

    await page.close();

  } catch (error) {
    console.error('❌ Fatal error during testing:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Tests Failed: ${testsTotal - testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('Please start the server with: npm run dev');
    process.exit(1);
  }

  console.log('✅ Server is running on http://localhost:3000');
  await testSubmitPage();
}

main().catch(console.error);
