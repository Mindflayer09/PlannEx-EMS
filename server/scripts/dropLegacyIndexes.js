/**
 * Script to drop legacy indexes that are causing conflicts
 * Run once with: node scripts/dropLegacyIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function dropLegacyIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    
    console.log('Dropping legacy indexes...');
    
    // Drop the problematic club_1_role_1 index
    try {
      await db.collection('users').dropIndex('club_1_role_1');
      console.log('✅ Dropped legacy index: club_1_role_1');
    } catch (err) {
      console.log('⚠️ Index club_1_role_1 not found or already dropped');
    }

    // Drop the club_1 index
    try {
      await db.collection('users').dropIndex('club_1');
      console.log('✅ Dropped legacy index: club_1');
    } catch (err) {
      console.log('⚠️ Index club_1 not found or already dropped');
    }
    
    // Drop any other legacy club-related indexes
    const indexes = await db.collection('users').listIndexes().toArray();
    console.log('\nRemaining indexes on users collection:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });
    
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropLegacyIndexes();
