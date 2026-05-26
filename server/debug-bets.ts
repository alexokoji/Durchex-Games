import dns from 'node:dns';
import mongoose from 'mongoose';
import { Bet } from './src/models/Bet';
import { User } from './src/models/User';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://durchex-casino:DurchexiGames@cluster0.1jmzxi9.mongodb.net/durchex-games?appName=Cluster0';

async function main() {
  try {
    if (MONGO_URI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('[mongo] using DNS servers', dns.getServers().join(', '));
    }
    await mongoose.connect(MONGO_URI);
    console.log('[connected] MongoDB');

    // Find recent virtual sports bets
    const bets = await Bet.find({ gameId: 'virtual_sports' })
      .sort({ placedAt: -1 })
      .limit(30)
      .lean();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECENT VIRTUAL SPORTS BETS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const bet of bets) {
      const user = await User.findById(bet.userId).select('currency email balance').lean();
      const sels = Array.isArray(bet.selections) ? bet.selections : [];
      
      console.log(`\n📊 BET ID: ${bet._id}`);
      console.log(`   User: ${user?.email} (${user?.currency}) - Current Balance: ${user?.balance}`);
      console.log(`   Status: ${bet.status}`);
      console.log(`   Mode: ${bet.mode}`);
      console.log(`   Stake: ${bet.stake} ${bet.currency}`);
      console.log(`   Selections Count: ${sels.length}`);
      
      if (sels.length > 0) {
        const odds = sels.map((s: any) => s.odds);
        console.log(`   Odds: [${odds.join(', ')}]`);
        console.log(`   Selections details:`);
        for (const sel of sels) {
          console.log(`     - [${sel.id}] ${sel.homeTeam} vs ${sel.awayTeam} (${sel.marketCategory} / ${sel.optionLabel}) @ ${sel.odds}`);
        }
        
        if (bet.mode === 'single') {
          const expectedPayout = bet.stake * odds.reduce((sum: number, o: number) => sum + o, 0); // client single behavior if all win
          console.log(`   Potential Payout (if all win, client parlay-single): ${expectedPayout}`);
        } else if (bet.mode === 'multi') {
          const oddsProd = odds.reduce((a: number, b: number) => a * b, 1);
          const expectedPayout = bet.stake * oddsProd;
          console.log(`   Expected Payout (if win): ${expectedPayout}`);
        }
      }
      
      console.log(`   Actual Payout: ${bet.payout ?? 'N/A'}`);
      console.log(`   Details: ${bet.details ?? 'None'}`);
      console.log(`   Placed: ${new Date(bet.placedAt).toLocaleString()}`);
      if (bet.settledAt) {
        console.log(`   Settled: ${new Date(bet.settledAt).toLocaleString()}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('[error]', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
