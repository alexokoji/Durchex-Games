import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Bet } from '../src/models/Bet';

async function inspectBetOdds() {
  try {
    // Connect to DB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://cluster0.mongodb.net/durchex';
    await mongoose.connect(mongoUri);
    console.log('[inspectBetOdds] Connected to MongoDB');

    // Find recent bets
    const recentBets = await Bet.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    console.log(`\n[inspectBetOdds] Found ${recentBets.length} recent bets\n`);

    for (const bet of recentBets) {
      const selections = (bet.selections as any[]) || [];
      
      // Calculate expected payout based on stored odds
      let expectedPayout = bet.stake;
      if (bet.mode === 'multi' && selections.length > 0) {
        expectedPayout = selections.reduce((p, sel) => p * sel.odds, bet.stake);
      } else if (bet.mode === 'single' && selections.length > 0) {
        expectedPayout = selections.reduce((sum, sel) => sum + (bet.stake * sel.odds), 0);
      }

      const oddMultiplier = bet.payout && expectedPayout > 0 ? bet.payout / expectedPayout : 0;
      const anomaly = oddMultiplier > 1.2 || oddMultiplier < 0.8;

      console.log(`Bet ID: ${bet._id}`);
      console.log(`  Mode: ${bet.mode}`);
      console.log(`  Stake: ${bet.stake} ${bet.currency}`);
      console.log(`  Selections:`, selections.map((s, i) => ({
        index: i,
        id: s.id,
        odds: s.odds,
        label: s.label,
      })));
      console.log(`  Calculated Payout (from stored odds): ${expectedPayout} ${bet.currency}`);
      console.log(`  Actual Payout in DB: ${bet.payout} ${bet.currency}`);
      console.log(`  Payout Multiplier: ${oddMultiplier.toFixed(2)}x`);
      console.log(`  ⚠️ ANOMALY: ${anomaly ? 'YES - PAYOUT IS WRONG!' : 'No'}`);
      console.log(`  Status: ${bet.status}`);
      console.log('');
    }

    await mongoose.disconnect();
    console.log('[inspectBetOdds] Disconnected from MongoDB');
  } catch (error) {
    console.error('[inspectBetOdds] Error:', error);
    process.exit(1);
  }
}

inspectBetOdds();
