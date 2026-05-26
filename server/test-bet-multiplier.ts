// Test script to identify the 8.4x payout multiplication issue
// Usage: npx ts-node test-bet-multiplier.ts

import mongoose from 'mongoose';
import { User } from './src/models/User';
import { Bet } from './src/models/Bet';
import axios from 'axios';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://durchex-casino:DurchexiGames@cluster0.1jmzxi9.mongodb.net/durchex-games?appName=Cluster0';
const API_BASE = 'http://localhost:4000/api';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[test] Connected to MongoDB');

    // Create/get test user
    let user = await User.findOne({ email: 'test-multiplier@test.com' });
    if (!user) {
      user = await User.create({
        email: 'test-multiplier@test.com',
        passwordHash: 'test',
        currency: 'NGN',
        balance: 100000,
        bonusBalance: 0,
      });
      console.log('[test] Created test user:', user._id.toString());
    } else {
      // Reset balance
      user.balance = 100000;
      await user.save();
      console.log('[test] Reset test user balance to 100000');
    }

    // Get JWT token (mock)
    const userId = user._id.toString();

    // Place a simple single bet with 1 selection at 1.5 odds
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('PLACING TEST BET');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Expected: 100 NGN × 1.5 odds = 150 NGN payout');

    // Create a test bet directly in database to simulate placing
    const testBet = await Bet.create({
      userId: user._id,
      gameId: 'test-match-1',
      gameName: 'Test Soccer',
      stake: 100,
      bonusStake: 0,
      currency: 'NGN',
      mode: 'single',
      status: 'pending',
      selections: [
        {
          id: 'sel-1',
          matchId: 'match-1',
          marketId: 'match-1-1x2',
          marketCategory: '1X2',
          optionId: '1',
          optionLabel: 'Home',
          odds: 1.5,
        },
      ],
      details: 'Test bet for multiplier issue',
      placedAt: new Date(),
    });

    console.log('\n✓ Bet placed:');
    console.log(`  Bet ID: ${testBet._id.toString()}`);
    console.log(`  Stake: ${testBet.stake} NGN`);
    console.log(`  Selections: ${(testBet.selections as any).length}`);
    console.log(`  Odds: ${(testBet.selections as any)[0].odds}`);

    // Check what's in the database
    const betInDb = await Bet.findById(testBet._id).lean();
    console.log('\n📊 Bet in database:');
    console.log(`  Stake: ${betInDb?.stake}`);
    console.log(`  Odds value: ${(betInDb?.selections as any)?.[0]?.odds}`);
    console.log(`  Odds type: ${typeof (betInDb?.selections as any)?.[0]?.odds}`);

    // Now simulate the settlement with logging
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SIMULATING SETTLEMENT');
    console.log('═══════════════════════════════════════════════════════════════');

    const results = ['win'];
    const selsArr = testBet.selections as any[];

    console.log('\nSettlement calculation:');
    console.log(`  Results: ${results.join(', ')}`);
    console.log(`  Selection count: ${selsArr.length}`);

    // Simulate the odds calculation
    let settledPayout = 0;
    if (results[0] === 'win') {
      const odds = selsArr[0].odds;
      settledPayout = testBet.stake * odds;
      console.log(`  Stake: ${testBet.stake}`);
      console.log(`  Odds: ${odds}`);
      console.log(`  Calculated payout: ${testBet.stake} × ${odds} = ${settledPayout}`);
    }

    console.log(`\n✓ Expected settled payout: ${settledPayout} NGN`);

    // Check all bets in database to see if any show 8.4x multiplier
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('CHECKING ALL BETS FOR 8.4X ANOMALY');
    console.log('═══════════════════════════════════════════════════════════════');

    const allBets = await Bet.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    let anomaliesFound = 0;
    for (const bet of allBets) {
      if (!bet.selections || (bet.selections as any[]).length === 0) continue;

      const odds = (bet.selections as any)[0].odds;
      if (!odds) continue;

      const expectedPayout = bet.stake * odds;
      if (bet.payout && expectedPayout > 0) {
        const multiplier = bet.payout / expectedPayout;
        if (multiplier > 1.1 || multiplier < 0.9) {
          console.log(`\n⚠️  ANOMALY FOUND:`);
          console.log(`  Bet ID: ${bet._id.toString()}`);
          console.log(`  Stake: ${bet.stake}`);
          console.log(`  Odds: ${odds}`);
          console.log(`  Expected: ${expectedPayout}`);
          console.log(`  Actual: ${bet.payout}`);
          console.log(`  Multiplier: ${multiplier.toFixed(2)}x`);
          anomaliesFound++;
        }
      }
    }

    if (anomaliesFound === 0) {
      console.log('✓ No 8.4x anomalies found in recent bets');
    } else {
      console.log(`\n⚠️  Found ${anomaliesFound} bets with suspicious multipliers`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Check server logs above for any payout multiplication messages!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('[test] Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
