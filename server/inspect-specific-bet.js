require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

async function inspectSpecificBet() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/duchexigames';
    
    if (mongoUri.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('[inspectSpecificBet] Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const betsCollection = db.collection('bets');

    // Query for the specific bet we just created
    const targetBetId = '6a1594364ffd475aac185567';
    
    const bet = await betsCollection.findOne({
      _id: new mongoose.Types.ObjectId(targetBetId)
    });

    if (!bet) {
      console.log('[inspectSpecificBet] Bet not found, checking by string ID...');
      // Try without ObjectId conversion
      const betByString = await betsCollection.findOne({
        _id: targetBetId
      });
      
      if (!betByString) {
        console.log('[inspectSpecificBet] Bet still not found. Showing last 5 bets:');
        const recent = await betsCollection
          .find({})
          .sort({ _id: -1 })
          .limit(5)
          .toArray();
        
        for (const b of recent) {
          console.log('\nBet ID:', b._id);
          console.log('  Status:', b.status);
          console.log('  Mode:', b.mode);
          console.log('  Selections count:', Array.isArray(b.selections) ? b.selections.length : (b.selections ? Object.keys(b.selections).length : 0));
        }
        await mongoose.disconnect();
        return;
      }
    }

    const displayBet = bet || betByString;
    
    console.log('Bet ID:', displayBet._id);
    console.log('Mode:', displayBet.mode);
    console.log('Stake:', displayBet.stake, displayBet.currency);
    console.log('Status:', displayBet.status);
    console.log('\nSelections stored in DB:');
    
    const selections = displayBet.selections || [];
    if (Array.isArray(selections)) {
      console.log('  Array with', selections.length, 'items');
      for (let i = 0; i < selections.length; i++) {
        const sel = selections[i];
        console.log(`  [${i}]:`, {
          id: sel.id,
          odds: sel.odds,
          optionLabel: sel.optionLabel,
        });
      }
    } else if (typeof selections === 'object') {
      console.log('  Object type:', Object.keys(selections));
      console.log('  Full:', JSON.stringify(selections, null, 2).substring(0, 500));
    } else {
      console.log('  Type:', typeof selections, 'Value:', selections);
    }

    // Calculate expected payout
    let expectedPayout = displayBet.stake;
    if (displayBet.mode === 'multi' && Array.isArray(selections) && selections.length > 0) {
      expectedPayout = selections.reduce((p, sel) => p * sel.odds, displayBet.stake);
    }

    console.log('\nPayout Analysis:');
    console.log('  Expected payout (from stored odds):', expectedPayout, displayBet.currency);
    console.log('  Actual payout in DB:', displayBet.payout, displayBet.currency);
    console.log('  Multiplier:', displayBet.payout && expectedPayout > 0 ? (displayBet.payout / expectedPayout).toFixed(2) + 'x' : 'N/A');

    await mongoose.disconnect();
  } catch (error) {
    console.error('[inspectSpecificBet] Error:', error.message);
    process.exit(1);
  }
}

inspectSpecificBet();
