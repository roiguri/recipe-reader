#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');

function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
}

function validateLocales() {
  try {
    const localeFiles = fs.readdirSync(LOCALES_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    if (localeFiles.length === 0) {
      console.error('❌ No locale files found in', LOCALES_DIR);
      process.exit(1);
    }
    
    console.log(`🔍 Validating ${localeFiles.length} locale files: ${localeFiles.join(', ')}`);
    
    const localeData = {};
    const flattenedData = {};
    
    // Load and flatten all locale files
    for (const locale of localeFiles) {
      const filePath = path.join(LOCALES_DIR, `${locale}.json`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        localeData[locale] = JSON.parse(content);
        flattenedData[locale] = flattenObject(localeData[locale]);
      } catch (error) {
        console.error(`❌ Error parsing ${locale}.json:`, error.message);
        process.exit(1);
      }
    }
    
    // Get all unique keys across all locales
    const allKeys = new Set();
    Object.values(flattenedData).forEach(data => 
      Object.keys(data).forEach(key => allKeys.add(key))
    );
    
    const sortedKeys = Array.from(allKeys).sort();
    
    console.log(`📊 Found ${sortedKeys.length} unique translation keys`);
    
    let hasErrors = false;
    const missingKeys = {};
    const extraKeys = {};
    
    // Check each locale for missing/extra keys
    for (const locale of localeFiles) {
      const localeKeys = Object.keys(flattenedData[locale]);
      const missing = sortedKeys.filter(key => !localeKeys.includes(key));
      const extra = localeKeys.filter(key => !sortedKeys.includes(key));
      
      if (missing.length > 0) {
        missingKeys[locale] = missing;
        hasErrors = true;
      }
      
      if (extra.length > 0) {
        extraKeys[locale] = extra;
        hasErrors = true;
      }
    }
    
    // Report results
    if (hasErrors) {
      console.log('\n❌ VALIDATION FAILED\n');
      
      // Report missing keys
      for (const [locale, missing] of Object.entries(missingKeys)) {
        if (missing.length > 0) {
          console.log(`🚫 Missing keys in ${locale}.json:`);
          missing.forEach(key => console.log(`   - ${key}`));
          console.log('');
        }
      }
      
      // Report extra keys
      for (const [locale, extra] of Object.entries(extraKeys)) {
        if (extra.length > 0) {
          console.log(`⚠️  Extra keys in ${locale}.json:`);
          extra.forEach(key => console.log(`   + ${key}`));
          console.log('');
        }
      }
      
      process.exit(1);
    } else {
      console.log('✅ All locale files are synchronized!');
      
      // Show summary
      console.log('\n📋 Summary:');
      localeFiles.forEach(locale => {
        const keyCount = Object.keys(flattenedData[locale]).length;
        console.log(`   ${locale}.json: ${keyCount} keys`);
      });
    }
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateLocales();
}

module.exports = { validateLocales, flattenObject };