require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

async function inspectOldBetDetails() {
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

    // Get bets with anomalies (high payout multiplier)
    const bets = await betsCollection
      .find({ status: 'won', payout: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log(`\n[inspectOldBetDetails] Found ${bets.length} won bets with payouts\n`);

    for (const bet of bets) {
      const calcPayout = bet.stake; // Assume empty selections
      const multiplier = calcPayout > 0 ? bet.payout / calcPayout : 0;
      
      if (multiplier > 1.5) {
        console.log(`\n=== ANOMALY DETECTED ===`);
        console.log(`Bet ID: ${bet._id}`);
        console.log(`Stake: ${bet.stake} ${bet.currency}`);
        console.log(`Payout: ${bet.payout} ${bet.currency}`);
        console.log(`Multiplier: ${multiplier.toFixed(2)}x`);
        console.log(`Mode: ${bet.mode}`);
        console.log(`SystemK: ${bet.systemK}`);
        console.log(`Multiplier field: ${bet.multiplier}`);
        console.log(`Status: ${bet.status}`);
        
        // Check selections structure
        const selections = bet.selections || [];
        console.log(`\nSelections:`);
        console.log(`  Type: ${typeof selections}`);
        console.log(`  Is Array: ${Array.isArray(selections)}`);
        console.log(`  Length: ${Array.isArray(selections) ? selections.length : 'N/A'}`);
        
        if (Array.isArray(selections) && selections.length > 0) {
          console.log(`  [0]: ${JSON.stringify(selections[0]).substring(0, 150)}`);
        } else if (typeof selections === 'object' && selections !== null) {
          console.log(`  Keys: ${Object.keys(selections)}`);
          console.log(`  Value: ${JSON.stringify(selections).substring(0, 200)}`);
        }
        
        // Try to figure out how to get 3x from stake
        console.log(`\nReverse calculation:`);
        if (multiplier > 1) {
          console.log(`  If stake=${bet.stake} and payout=${bet.payout}`);
          console.log(`  Then implicitOdds = payout/stake = ${(bet.payout / bet.stake).toFixed(3)}`);
        }
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('[inspectOldBetDetails] Error:', error.message);
    process.exit(1);
  }
}

inspectOldBetDetails();
