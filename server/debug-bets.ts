// Script to inspect bets in the database for debugging payout issues
// Usage: npx ts-node debug-bets.ts

import mongoose from 'mongoose';
import { Bet } from './src/models/Bet';
import { User } from './src/models/User';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://durchex-casino:DurchexiGames@cluster0.1jmzxi9.mongodb.net/durchex-games?appName=Cluster0';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[connected] MongoDB');

    // Find recent bets (last 10)
    const bets = await Bet.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECENT BETS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const bet of bets) {
      const user = await User.findById(bet.userId).select('currency email').lean();
      
      console.log(`\n📊 BET ID: ${bet._id}`);
      console.log(`   User: ${user?.email} (${user?.currency})`);
      console.log(`   Status: ${bet.status}`);
      console.log(`   Mode: ${bet.mode}`);
      console.log(`   Stake: ${bet.stake} ${bet.currency}`);
      console.log(`   Selections: ${bet.selections.length}`);
      
      // Calculate expected payout
      if (bet.selections.length > 0) {
        const odds = bet.selections.map((s: any) => s.odds);
        console.log(`   Odds: [${odds.join(', ')}]`);
        
        if (bet.mode === 'single') {
          const expectedPayout = bet.stake * odds[0];
          console.log(`   Expected Payout (if win): ${expectedPayout}`);
        } else if (bet.mode === 'multi') {
          const oddsProd = odds.reduce((a: number, b: number) => a * b, 1);
          const expectedPayout = bet.stake * oddsProd;
          console.log(`   Expected Payout (if win): ${expectedPayout}`);
        }
      }
      
      console.log(`   Actual Payout: ${bet.payout ?? 'N/A'}`);
      
      if (bet.payout && bet.selections.length > 0) {
        const odds = bet.selections.map((s: any) => s.odds);
        const expectedPayout = bet.mode === 'multi' 
          ? bet.stake * odds.reduce((a: number, b: number) => a * b, 1)
          : bet.stake * odds[0];
        
        const multiplier = expectedPayout > 0 ? bet.payout / expectedPayout : 0;
        if (multiplier > 1.1 || multiplier < 0.9) {
          console.log(`   ⚠️  PAYOUT MULTIPLIER: ${multiplier.toFixed(2)}x (ANOMALY!)`);
        }
      }
      
      // Check for O/U
      const ouSelections = bet.selections.filter((s: any) => s.marketCategory === 'OVER_UNDER');
      if (ouSelections.length > 0) {
        console.log(`   O/U Selections: ${ouSelections.length}`);
        for (const sel of ouSelections) {
          console.log(`     - ${sel.optionId}: ${sel.marketId}`);
        }
      }
      
      console.log(`   Placed: ${new Date(bet.placedAt).toLocaleString()}`);
      if (bet.settledAt) {
        console.log(`   Settled: ${new Date(bet.settledAt).toLocaleString()}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    // Count bets by status and mode
    const stats = await Bet.aggregate([
      {
        $group: {
          _id: { status: '$status', mode: '$mode' },
          count: { $sum: 1 },
          avgStake: { $avg: '$stake' },
          avgPayout: { $avg: '$payout' },
        }
      }
    ]);
    
    console.log('STATISTICS:');
    console.log('───────────────────────────────────────────────────────────────');
    for (const stat of stats) {
      console.log(`${stat._id.status.toUpperCase()} (${stat._id.mode}): ${stat.count} bets`);
      console.log(`  Avg Stake: ${stat.avgStake?.toFixed(2) || 'N/A'}`);
      console.log(`  Avg Payout: ${stat.avgPayout?.toFixed(2) || 'N/A'}`);
    }

  } catch (err) {
    console.error('[error]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
