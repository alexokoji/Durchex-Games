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
  console.log('\n=== VIRTUAL SPORTS BET SMOKE TEST ===\n');

  try {
    // 1. Register test user
    console.log('1️⃣  Registering test user...');
    const timestamp = Date.now();
    const testEmail = `smoke-test-${timestamp}@test.com`;
    const testUsername = `smoketest${timestamp}`.substring(0, 24);
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
    console.log('2️⃣  Adding test funds to wallet...');
    const headers = { Authorization: `Bearer ${token}` };
    const walletRes = await axios.get(`${API_URL}/wallet`, { headers });
    console.log(`   Starting balance: ${walletRes.data.balance} ${walletRes.data.currency}`);

    // 3. Place a virtual sports bet with known odds
    console.log('\n3️⃣  Placing virtual sports multi bet...');
    const stake = 1000;
    const selections = [
      { id: 'match1:market1:option1', odds: 2.5, homeTeam: 'Team A', awayTeam: 'Team B', optionLabel: 'Home Win' },
      { id: 'match2:market2:option2', odds: 1.8, homeTeam: 'Team C', awayTeam: 'Team D', optionLabel: 'Home Win' },
    ];
    const expectedOdds = 2.5 * 1.8;
    const expectedPayout = stake * expectedOdds;

    console.log(`   Stake: ${stake} NGN`);
    console.log(`   Odds: ${selections.map(s => s.odds).join(' × ')} = ${expectedOdds}`);
    console.log(`   Expected payout: ${stake} × ${expectedOdds} = ${expectedPayout} NGN\n`);

    const placeBetRes = await axios.post(
      `${API_URL}/bets`,
      {
        gameId: 'virtual_sports',
        gameName: 'Virtual Sports',
        stake,
        selections,
        mode: 'multi',
        details: 'Smoke test bet',
      },
      { headers }
    );

    const betId = placeBetRes.data.bet._id;
    const balanceAfterBet = placeBetRes.data.balance;
    console.log(`✅ Bet placed: ${betId}`);
    console.log(`   Balance after bet: ${balanceAfterBet} NGN\n`);

    // Wait a bit for DB to settle
    await delay(500);

    // 4. Check pending bets
    console.log('4️⃣  Checking pending bets in database...');
    const pendingRes = await axios.get(`${API_URL}/bets/pending`, { headers });
    const pendingBet = pendingRes.data.bets.find(b => b._id === betId);
    if (pendingBet) {
      console.log(`✅ Bet found in pending: ${betId}`);
      console.log(`   Mode: ${pendingBet.mode}`);
      console.log(`   Stake: ${pendingBet.stake}`);
      console.log(`   Status: ${pendingBet.status}`);
      console.log(`   Selections stored: ${pendingBet.selections ? pendingBet.selections.length : 0} items\n`);
      if (pendingBet.selections && pendingBet.selections.length > 0) {
        pendingBet.selections.forEach((sel, i) => {
          console.log(`      [${i}] id=${sel.id}, odds=${sel.odds}`);
        });
      }
    }

    // 5. Settle the bet as won via API (simulating scheduler)
    console.log('\n5️⃣  Simulating bet settlement (marking as WON)...');
    console.log(`   Settling with payout: ${expectedPayout} NGN\n`);

    const settleRes = await axios.post(
      `${API_URL}/bets/${betId}/settle`,
      {
        won: true,
        payout: expectedPayout,
        details: 'Smoke test settlement - all selections won',
      },
      { headers }
    );

    const settledBet = settleRes.data.bet;
    const balanceAfterSettle = settleRes.data.balance;

    console.log(`✅ Bet settled as WON`);
    console.log(`   Settled payout stored in DB: ${settledBet.payout} NGN`);
    console.log(`   Balance after settlement: ${balanceAfterSettle} NGN\n`);

    // 6. Calculate what actually happened
    const balanceIncrease = balanceAfterSettle - balanceAfterBet;
    const creditsPerExpectedPayout = balanceIncrease / expectedPayout;

    console.log('6️⃣  SMOKE TEST RESULTS:\n');
    console.log(`   Expected payout:        ${expectedPayout} NGN`);
    console.log(`   Actual payout credited: ${balanceIncrease} NGN`);
    console.log(`   Multiplier:             ${creditsPerExpectedPayout.toFixed(2)}x`);

    if (Math.abs(creditsPerExpectedPayout - 1) < 0.01) {
      console.log('\n   ✅ CORRECT: Payout matches expected amount\n');
    } else if (creditsPerExpectedPayout > 1.5) {
      console.log(`\n   ⚠️  MULTIPLIER BUG DETECTED: Payout is ${creditsPerExpectedPayout.toFixed(2)}x expected!\n`);
    } else {
      console.log(`\n   ⚠️  UNEXPECTED: Payout ratio is ${creditsPerExpectedPayout.toFixed(2)}x\n`);
    }

    // 7. Query the actual bet from history
    console.log('7️⃣  Fetching bet from history...');
    const historyRes = await axios.get(`${API_URL}/bets/history?limit=10`, { headers });
    const historyBet = historyRes.data.bets.find(b => b._id === betId);
    if (historyBet) {
      console.log(`✅ Bet found in history`);
      console.log(`   Status: ${historyBet.status}`);
      console.log(`   Payout stored: ${historyBet.payout} NGN`);
      console.log(`   Multiplier field: ${historyBet.multiplier ?? 'undefined'}\n`);
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

test().then(() => {
  console.log('=== SMOKE TEST COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
