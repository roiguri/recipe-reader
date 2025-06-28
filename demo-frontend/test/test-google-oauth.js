#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

async function testGoogleOAuthSetup() {
  console.log('🔍 Testing Google OAuth setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Anon Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Google Client ID: ${googleClientId ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing required Supabase environment variables.');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test OAuth provider configuration
    console.log('🔗 Testing OAuth provider availability...');
    
    // This would normally be called in a browser environment
    // Here we're just testing that the client can be created and configured
    const authClient = supabase.auth;
    
    if (authClient) {
      console.log('✅ Supabase Auth client initialized successfully');
    }

    // Test Google provider availability (conceptual - actual OAuth requires browser)
    console.log('🔍 Google OAuth Configuration Status:');
    
    if (googleClientId && googleClientId.includes('.apps.googleusercontent.com')) {
      console.log('✅ Google Client ID format appears correct');
    } else if (googleClientId) {
      console.log('⚠️  Google Client ID may be incorrect (should end with .apps.googleusercontent.com)');
    } else {
      console.log('⚠️  Google Client ID not configured (optional for testing Supabase)');
    }

    console.log('\n📝 Next steps to complete Google OAuth setup:');
    console.log('   1. Follow the guide in docs/google-oauth-setup.md');
    console.log('   2. Configure Google Cloud Console OAuth credentials');
    console.log('   3. Enable Google provider in Supabase dashboard');
    console.log('   4. Add Google Client ID to .env.local');
    console.log('   5. Test OAuth flow in browser environment');

    console.log('\n🎉 OAuth setup verification complete!');
    console.log('   ℹ️  Actual OAuth testing requires browser environment');

  } catch (err) {
    console.log(`❌ Configuration error: ${err.message}`);
  }
}

testGoogleOAuthSetup();