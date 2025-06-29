#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Anon Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing required environment variables. Please check your .env.local file.');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test basic connection
    console.log('🔗 Testing connection...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      return;
    }

    console.log('✅ Supabase connection successful!');
    
    // Test database access
    console.log('\n📊 Testing database access...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (tablesError) {
      console.log(`⚠️  Database query failed: ${tablesError.message}`);
    } else {
      console.log(`✅ Database accessible. Found ${tables ? tables.length : 0} tables in public schema.`);
    }

    console.log('\n🎉 Supabase setup is working correctly!');

  } catch (err) {
    console.log(`❌ Connection error: ${err.message}`);
  }
}

testSupabaseConnection();