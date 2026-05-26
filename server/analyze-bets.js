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

async function test() {
  console.log('\n=== VIRTUAL SPORTS BET ANALYSIS ===\n');

  try {
    // Get the test user from the smoke test
    console.log('1️⃣  Finding recent virtual sports bets...\n');

    // We'll need to login as a user. Let's try registering a temp user just to make API calls
    // Actually, let's use the betsApi through an authenticated session

    // First, register and login
    const timestamp = Date.now();
    const testEmail = `analysis-${timestamp}@test.com`;
    const testUsername = `analysis${timestamp}`.substring(0, 24);
    
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      username: testUsername,
      password: 'Password123!',
      countryCode: 'NG',
      currency: 'NGN',
    });
    
    const token = registerRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    // Now get recent bets for this user (won't have any, but let's also search database directly)
    const historyRes = await axios.get(`${API_URL}/bets/history?limit=100`, { headers });
    console.log(`   Found ${historyRes.data.bets.length} bets in history for new user (should be 0)\n`);

    // Now let's check some specific recent bets by searching common IDs
    // Actually, let me just try to get some bets from known users

    // Create a few test bets to analyze
    console.log('2️⃣  Creating test bets with different scenarios...\n');

    const scenarios = [
      { odds: [2.0, 2.0], stake: 1000, label: '2x2' },
      { odds: [1.5, 1.5, 1.5], stake: 1000, label: '3x1.5' },
      { odds: [1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2], stake: 1000, label: '7x1.2' },
    ];

    for (const scenario of scenarios) {
      const expectedOddsProduct = scenario.odds.reduce((p, o) => p * o, 1);
      const expectedPayout = scenario.stake * expectedOddsProduct;

      console.log(`   Scenario: ${scenario.label}`);
      console.log(`   - Odds: ${scenario.odds.join(' × ')} = ${expectedOddsProduct}`);
      console.log(`   - Expected payout: ${scenario.stake} × ${expectedOddsProduct} = ${expectedPayout}`);

      const selections = scenario.odds.map((odds, i) => ({
        id: `match${i}:market${i}:option${i}`,
        odds,
        homeTeam: `Team${i}A`,
        awayTeam: `Team${i}B`,
        optionLabel: 'Home Win',
      }));

      try {
        const placeBetRes = await axios.post(
          `${API_URL}/bets`,
          {
            gameId: 'virtual_sports',
            gameName: 'Virtual Sports',
            stake: scenario.stake,
            selections,
            mode: 'multi',
            details: `Analysis test - ${scenario.label}`,
          },
          { headers }
        );

        const betId = placeBetRes.data.bet._id;
        console.log(`   - Bet placed: ${betId}`);

        // Settle it immediately
        const settleRes = await axios.post(
          `${API_URL}/bets/${betId}/settle`,
          {
            won: true,
            payout: expectedPayout,
            details: 'Analysis test settlement',
          },
          { headers }
        );

        const actualPayout = settleRes.data.bet.payout;
        const multiplier = actualPayout / expectedPayout;
        console.log(`   - Settled payout: ${actualPayout}`);
        console.log(`   - Multiplier: ${multiplier.toFixed(2)}x`);

        if (Math.abs(multiplier - 1) > 0.01) {
          console.log(`   ⚠️  ANOMALY DETECTED!\n`);
        } else {
          console.log(`   ✅ OK\n`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.response?.data?.error || err.message}\n`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

test().then(() => {
  console.log('=== ANALYSIS COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
