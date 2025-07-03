#!/usr/bin/env node

/**
 * Environment validation script for demo frontend
 * Ensures all required environment variables are configured
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY',
  'REACT_APP_API_URL'
];

const optionalEnvVars = [
  'REACT_APP_ENV',
  'REACT_APP_GOOGLE_CLIENT_ID',
  'REACT_APP_GITHUB_CLIENT_ID',
  'REACT_APP_CONTACT_EMAIL'
];

function parseEnvFile(filePath) {
  const envVars = {};
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          envVars[key] = value;
        }
      }
    });
  }
  return envVars;
}

function loadEnvFile() {
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envVars = parseEnvFile(envLocalPath);
  
  // Load into process.env
  Object.entries(envVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function validateEnvFiles() {
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  
  const envExampleExists = fs.existsSync(envExamplePath);
  const envLocalExists = fs.existsSync(envLocalPath);
  
  console.log('📁 Checking environment files...');
  
  // In production/CI environments, .env.local might not exist (using process.env directly)
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.CI || 
                      process.env.NETLIFY ||
                      process.env.BUILD_ID;
  
  if (!envLocalExists && !isProduction) {
    console.log('❌ No .env.local file found');
    if (envExampleExists) {
      console.log('💡 Copy .env.example to .env.local and fill in your values');
    }
    return false;
  }
  
  if (envExampleExists) {
    console.log('✅ Found .env.example (template)');
  }
  
  if (envLocalExists) {
    console.log('✅ Found .env.local (your config)');
  } else if (isProduction) {
    console.log('✅ Production environment detected, using process.env variables');
  }
  
  return true;
}

function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');
  
  // Check environment files
  if (!validateEnvFiles()) {
    process.exit(1);
  }
  
  // Load .env.local file manually
  loadEnvFile();
  console.log('\n📋 Checking required variables...');
  
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
    console.log('   2. Fill in your Supabase URL and anonymous key values');
    console.log('   3. For production, configure environment variables in your deployment platform');
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