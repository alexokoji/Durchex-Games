const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
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

const API_URL = 'http://localhost:4000/api';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('\n=== SCHEDULER SETTLEMENT SMOKE TEST ===\n');

  try {
    // 1. Register test user
    console.log('1️⃣  Registering test user...');
    const timestamp = Date.now();
    const testEmail = `scheduler-test-${timestamp}@test.com`;
    const testUsername = `schedtest${timestamp}`.substring(0, 24);
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      username: testUsername,
      password: 'Password123!',
      countryCode: 'NG',
      currency: 'NGN',
    });
    const userId = registerRes.data.user._id;
    const token = registerRes.data.accessToken;
    console.log(`✅ User created: ${userId}\n`);

    // 2. Deposit funds
    console.log('2️⃣  Adding funds to wallet...');
    const headers = { Authorization: `Bearer ${token}` };

    // 3. Place a virtual sports bet
    console.log('\n3️⃣  Placing virtual sports multi bet (SCHEDULER will settle)...');
    const stake = 1000;
    const selections = [
      { id: 'match1:market1:option1', odds: 2.5, homeTeam: 'Team A', awayTeam: 'Team B', optionLabel: 'Home Win' },
      { id: 'match2:market2:option2', odds: 1.8, homeTeam: 'Team C', awayTeam: 'Team D', optionLabel: 'Home Win' },
    ];
    const expectedOdds = 2.5 * 1.8;
    const expectedPayout = stake * expectedOdds;

    console.log(`   Stake: ${stake} NGN`);
    console.log(`   Odds: ${selections.map(s => s.odds).join(' × ')} = ${expectedOdds}`);
    console.log(`   Expected payout: ${stake} × ${expectedOdds} = ${expectedPayout} NGN`);
    console.log(`   Selection IDs: ${selections.map(s => s.id).join(', ')}\n`);

    const placeBetRes = await axios.post(
      `${API_URL}/bets`,
      {
        gameId: 'virtual_sports',
        gameName: 'Virtual Sports',
        stake,
        selections,
        mode: 'multi',
        details: 'Scheduler test bet - waiting for auto-settlement',
      },
      { headers }
    );

    const betId = placeBetRes.data.bet._id;
    const balanceAfterBet = placeBetRes.data.balance;
    console.log(`✅ Bet placed: ${betId}`);
    console.log(`   Balance after bet: ${balanceAfterBet} NGN`);
    console.log(`   Waiting for scheduler to settle...\n`);

    // 4. Wait for scheduler to process (runs every 60 seconds, but let's wait longer to be safe)
    console.log('4️⃣  Waiting 65 seconds for scheduler to run...');
    for (let i = 0; i < 65; i++) {
      process.stdout.write('.');
      await delay(1000);
    }
    console.log('\n   Done waiting\n');

    // 5. Check if bet was settled by scheduler
    console.log('5️⃣  Checking if scheduler settled the bet...');
    const historyRes = await axios.get(`${API_URL}/bets/history?limit=50`, { headers });
    const settledBet = historyRes.data.bets.find(b => b._id === betId);

    if (!settledBet) {
      console.log('❌ Bet not found in history!\n');
      process.exit(1);
    }

    console.log(`✅ Bet found`);
    console.log(`   Status: ${settledBet.status}`);
    console.log(`   Payout: ${settledBet.payout} NGN`);
    console.log(`   Multiplier field: ${settledBet.multiplier ?? 'undefined'}\n`);

    // 6. Get current wallet balance
    const walletRes = await axios.get(`${API_URL}/wallet`, { headers });
    const finalBalance = walletRes.data.balance;

    console.log('6️⃣  SCHEDULER SETTLEMENT RESULTS:\n');
    console.log(`   Expected payout:        ${expectedPayout} NGN`);
    console.log(`   Payout stored in DB:    ${settledBet.payout} NGN`);
    console.log(`   Final wallet balance:   ${finalBalance} NGN`);

    if (settledBet.status === 'pending') {
      console.log('\n   ⚠️  BET STILL PENDING: Scheduler did not settle the bet');
      console.log('   This could mean:');
      console.log('   - Scheduler has not run yet');
      console.log('   - Scheduler skipped this bet (selections may not be valid)');
      console.log('   - Scheduler encountered an error (check server logs)\n');
    } else {
      const multiplier = settledBet.payout / expectedPayout;
      if (Math.abs(multiplier - 1) < 0.01) {
        console.log(`\n   ✅ CORRECT: Settled payout matches expected (${multiplier.toFixed(2)}x)\n`);
      } else {
        console.log(`\n   ⚠️  MULTIPLIER DETECTED: ${multiplier.toFixed(2)}x (${settledBet.payout} / ${expectedPayout})\n`);
        if (multiplier > 1.5) {
          console.log(`   This is the BUG! The 8.4x multiplier issue would show here if present.\n`);
        }
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

test().then(() => {
  console.log('=== SCHEDULER TEST COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
