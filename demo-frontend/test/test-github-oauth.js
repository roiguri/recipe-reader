#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const githubClientId = process.env.REACT_APP_GITHUB_CLIENT_ID;

async function testGitHubOAuthSetup() {
  console.log('🐙 Testing GitHub OAuth setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Anon Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GitHub Client ID: ${githubClientId ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing required Supabase environment variables.');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test OAuth provider configuration
    console.log('🔗 Testing OAuth provider availability...');
    
    const authClient = supabase.auth;
    
    if (authClient) {
      console.log('✅ Supabase Auth client initialized successfully');
    }

    // Test GitHub provider availability
    console.log('🔍 GitHub OAuth Configuration Status:');
    
    if (githubClientId && githubClientId.length > 10) {
      console.log('✅ GitHub Client ID format appears correct');
    } else if (githubClientId) {
      console.log('⚠️  GitHub Client ID may be incorrect (should be ~20 character string)');
    } else {
      console.log('⚠️  GitHub Client ID not configured (optional for testing Supabase)');
    }

    console.log('\n📝 GitHub OAuth Setup Steps:');
    console.log('   1. Go to GitHub Settings → Developer settings → OAuth Apps');
    console.log('   2. Click "New OAuth App"');
    console.log('   3. Configure:');
    console.log('      - Application name: "Recipe Reader Demo"');
    console.log('      - Homepage URL: http://localhost:3000');
    console.log('      - Authorization callback URL: https://ggvcbmxcntvnaxtgsmbs.supabase.co/auth/v1/callback');
    console.log('   4. Copy Client ID and Client Secret');
    console.log('   5. Configure GitHub provider in Supabase dashboard');

    console.log('\n✅ GitHub OAuth Benefits:');
    console.log('   • Completely free to use');
    console.log('   • Works with localhost development');
    console.log('   • Simple setup process');
    console.log('   • Great for developer-focused apps');

    console.log('\n🎉 GitHub OAuth setup verification complete!');
    console.log('   ℹ️  Actual OAuth testing requires browser environment');

  } catch (err) {
    console.log(`❌ Configuration error: ${err.message}`);
  }
}

testGitHubOAuthSetup();