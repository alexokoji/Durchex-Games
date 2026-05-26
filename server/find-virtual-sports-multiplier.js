const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.substring(0, eqIdx).trim();
      const value = line.substring(eqIdx + 1).trim();
      process.env[key] = value;
    }
  });
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://durchex-casino:DurchexiGames@cluster0.1jmzxi9.mongodb.net/durchex-games?appName=Cluster0';
console.log('Using URI:', MONGO_URI.substring(0, 50) + '...');

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const bets = db.collection('bets');

  // Find virtual sports bets with multiplier field set
  const virtualSportsBets = await bets
    .find({
      gameId: 'virtual_sports',
      multiplier: { $exists: true, $ne: null },
    })
    .limit(10)
    .toArray();

  console.log(`\nFound ${virtualSportsBets.length} virtual sports bets with multiplier field:\n`);

  for (const bet of virtualSportsBets) {
    const multiplier = bet.multiplier ? (bet.payout / bet.stake).toFixed(2) : 'N/A';
    console.log(
      `Bet: ${bet._id}`,
      `| Stake: ${bet.stake}`,
      `| Payout: ${bet.payout}`,
      `| Multiplier field: ${bet.multiplier}`,
      `| Calculated (payout/stake): ${multiplier}x`,
      `| Status: ${bet.status}`,
      `| Mode: ${bet.mode}`,
      `| Selections count: ${bet.selections ? bet.selections.length : 0}`
    );
  }

  // Also find recently won/lost virtual sports bets to check for anomalies
  const recentBets = await bets
    .find({
      gameId: 'virtual_sports',
      status: { $in: ['won', 'lost'] },
    })
    .sort({ settledAt: -1 })
    .limit(20)
    .toArray();

  console.log(`\n\nRecent settled virtual sports bets (last 20):\n`);

  for (const bet of recentBets) {
    const expectedOdds = bet.selections?.reduce((p, s) => p * (s.odds || 1), 1) || 1;
    const expectedPayout = bet.stake * expectedOdds;
    const actualPayout = bet.payout || 0;
    const multiplier = actualPayout / expectedPayout;

    if (Math.abs(multiplier - 1) > 0.01) {
      console.log(
        `⚠️  ANOMALY: ${bet._id}`,
        `| Stake: ${bet.stake}`,
        `| Expected payout: ${expectedPayout.toFixed(2)}`,
        `| Actual payout: ${actualPayout}`,
        `| Multiplier: ${multiplier.toFixed(2)}x`,
        `| Status: ${bet.status}`,
        `| Mode: ${bet.mode}`
      );
    }
  }

  mongoose.connection.close();
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
