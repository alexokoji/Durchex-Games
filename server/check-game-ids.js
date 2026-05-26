require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

async function checkGameIds() {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (mongoUri.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    const db = mongoose.connection.db;
    const betsCollection = db.collection('bets');

    // Get bets with high multiplier anomalies
    const bets = await betsCollection
      .find({ status: 'won', payout: { $gt: 0 }, multiplier: { $gt: 1.5 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`\n[checkGameIds] Found ${bets.length} anomalous bets\n`);

    const gameIds = new Set();
    const gameNames = new Set();
    
    for (const bet of bets) {
      gameIds.add(bet.gameId);
      gameNames.add(bet.gameName);
      
      console.log(`Bet: gameId="${bet.gameId}", gameName="${bet.gameName}", mode="${bet.mode}", multiplier=${bet.multiplier}, payout=${bet.payout}`);
    }
    
    console.log(`\nUnique gameIds: ${Array.from(gameIds).join(', ')}`);
    console.log(`Unique gameNames: ${Array.from(gameNames).join(', ')}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('[checkGameIds] Error:', error.message);
    process.exit(1);
  }
}

checkGameIds();
