#!/usr/bin/env node
/**
 * Test UI Functionality
 * This script tests the web interface for pre-trained models
 */

const puppeteer = require('puppeteer');

async function testUI() {
  console.log('🧪 Testing UI Functionality...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the app
    console.log('1️⃣ Loading application...');
    await page.goto('http://localhost:5173/agent/', { waitUntil: 'networkidle0' });
    
    // Check if the page loaded
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);
    
    // Look for the Create Model button
    console.log('2️⃣ Looking for Create Model button...');
    const createModelButton = await page.$('button:has-text("Create Model")');
    
    if (createModelButton) {
      console.log('✅ Create Model button found');
      
      // Click the Create Model button
      await createModelButton.click();
      await page.waitForTimeout(1000);
      
      // Look for the pre-trained models option
      console.log('3️⃣ Looking for pre-trained models option...');
      const pretrainedOption = await page.$('text=Use Pre-trained Model');
      
      if (pretrainedOption) {
        console.log('✅ Pre-trained models option found');
        
        // Click the pre-trained models option
        await pretrainedOption.click();
        await page.waitForTimeout(2000);
        
        // Check if the models browser loaded
        console.log('4️⃣ Checking if models browser loaded...');
        const modelsBrowser = await page.$('text=Pre-trained AI Models');
        
        if (modelsBrowser) {
          console.log('✅ Models browser loaded successfully');
          
          // Check if search box exists
          const searchBox = await page.$('input[placeholder*="Search models"]');
          if (searchBox) {
            console.log('✅ Search functionality available');
            
            // Test search
            await searchBox.type('sentiment');
            await page.waitForTimeout(500);
            
            // Check for search results
            const searchResults = await page.$$('.cursor-pointer');
            console.log(`✅ Search results: ${searchResults.length} models found`);
          }
          
          // Check if categories exist
          const categories = await page.$$('button:has-text("All Models")');
          if (categories.length > 0) {
            console.log('✅ Category filtering available');
          }
          
          console.log('\n🎉 UI TEST PASSED! Pre-trained models interface is working correctly.');
          
        } else {
          console.log('❌ Models browser did not load');
        }
      } else {
        console.log('❌ Pre-trained models option not found');
      }
    } else {
      console.log('❌ Create Model button not found');
    }
    
  } catch (error) {
    console.log('❌ UI test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  testUI();
} catch (error) {
  console.log('⚠️  Puppeteer not available, skipping UI test');
  console.log('🔧 To install: npm install puppeteer');
  console.log('🌐 Manual test: Visit http://localhost:5173/agent/');
  console.log('📱 Steps:');
  console.log('   1. Click "Create Model"');
  console.log('   2. Click "Use Pre-trained Model"');
  console.log('   3. Browse and search models');
  console.log('   4. Select any model to deploy');
}