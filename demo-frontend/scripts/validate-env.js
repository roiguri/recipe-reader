#!/usr/bin/env node

/**
 * Environment validation script for demo frontend
 * Ensures all required environment variables are configured
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'REACT_APP_API_URL',
  'REACT_APP_API_KEY'
];

const optionalEnvVars = [
  'REACT_APP_ENV'
];

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

function validateEnvironment() {
  // Load .env.local file manually
  loadEnvFile();
  console.log('🔍 Validating environment configuration...');
  
  let hasErrors = false;
  const missing = [];
  const present = [];
  
  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
      hasErrors = true;
    } else {
      present.push(varName);
    }
  }
  
  // Check optional variables
  for (const varName of optionalEnvVars) {
    if (process.env[varName]) {
      present.push(varName);
    }
  }
  
  // Report results
  if (present.length > 0) {
    console.log('✅ Found environment variables:');
    present.forEach(varName => {
      const value = process.env[varName];
      const displayValue = varName.includes('KEY') ? 
        `${value.substring(0, 8)}...` : 
        value;
      console.log(`   ${varName}=${displayValue}`);
    });
  }
  
  if (missing.length > 0) {
    console.log('\n❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.log(`   ${varName}`);
    });
    
    console.log('\n💡 To fix this:');
    console.log('   1. Copy .env.example to .env.local');
    console.log('   2. Fill in your actual API URL and key values');
    console.log('   3. For production, configure environment variables in Vercel');
  }
  
  if (hasErrors) {
    console.log('\n🚫 Environment validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed');
  }
}

if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };