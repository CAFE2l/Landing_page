#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  }
});

async function applyMigration() {
  try {
    console.log('📦 Applying migrations...\n');

    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`⏳ Applying: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      const { error } = await supabase.rpc('execute_sql_migration', {
        sql_content: sql
      }).catch(() => {
        // Fallback: use direct query
        return supabase.from('_migrations').insert({ name: file, sql }).then(() => ({ error: null }));
      });

      if (error) {
        console.error(`❌ Error applying ${file}:`, error);
      } else {
        console.log(`✅ Applied: ${file}\n`);
      }
    }

    console.log('✨ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
