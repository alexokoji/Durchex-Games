const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function test() {
  console.log('\n=== BOOKING CODE CURRENCY MISMATCH TEST ===\n');

  try {
    const timestamp = Date.now();

    // 1. Register NGN User
    console.log('1️⃣  Registering NGN user...');
    const ngnEmail = `ngn-${timestamp}@test.com`;
    const ngnUsername = `ngn${timestamp}`.substring(0, 24);
    
    const ngnRegisterRes = await axios.post(`${API_URL}/auth/register`, {
      email: ngnEmail,
      username: ngnUsername,
      password: 'Password123!',
      countryCode: 'NG',
      currency: 'NGN',
    });
    
    const ngnUser = ngnRegisterRes.data.user;
    const ngnToken = ngnRegisterRes.data.accessToken;
    const ngnHeaders = { Authorization: `Bearer ${ngnToken}` };
    console.log(`✅ NGN User created: ${ngnUser.id}`);
    console.log(`   Balance: ${ngnUser.balance} NGN, Bonus Balance: ${ngnUser.bonusBalance} NGN\n`);

    // 2. Register USD User
    console.log('2️⃣  Registering USD user...');
    const usdEmail = `usd-${timestamp}@test.com`;
    const usdUsername = `usd${timestamp}`.substring(0, 24);
    
    const usdRegisterRes = await axios.post(`${API_URL}/auth/register`, {
      email: usdEmail,
      username: usdUsername,
      password: 'Password123!',
      countryCode: 'US',
      currency: 'USD',
    });
    
    const usdUser = usdRegisterRes.data.user;
    const usdToken = usdRegisterRes.data.accessToken;
    const usdHeaders = { Authorization: `Bearer ${usdToken}` };
    console.log(`✅ USD User created: ${usdUser.id}`);
    console.log(`   Balance: ${usdUser.balance} USD, Bonus Balance: ${usdUser.bonusBalance} USD\n`);

    // 3. Mint booking code as USD user with currency USD
    console.log('3️⃣  Minting USD booking code as USD User...');
    const selections = [
      {
        id: 'epl-w30-mci-ars:epl-mci-ars-1x2:2',
        matchId: 'epl-w30-mci-ars',
        marketId: 'epl-mci-ars-1x2',
        marketCategory: '1X2',
        marketLabel: 'Match Result (1X2)',
        optionId: '2',
        optionLabel: 'Arsenal',
        odds: 2.0,
        sport: 'soccer',
        leagueId: 'epl',
        homeTeam: 'Man City',
        awayTeam: 'Arsenal',
        startsAt: Date.now() + 3600000,
        addedAt: Date.now(),
      },
      {
        id: 'epl-w30-whu-new:epl-whu-new-1x2:2',
        matchId: 'epl-w30-whu-new',
        marketId: 'epl-whu-new-1x2',
        marketCategory: '1X2',
        marketLabel: 'Match Result (1X2)',
        optionId: '2',
        optionLabel: 'Newcastle',
        odds: 2.5,
        sport: 'soccer',
        leagueId: 'epl',
        homeTeam: 'West Ham',
        awayTeam: 'Newcastle',
        startsAt: Date.now() + 3600000,
        addedAt: Date.now(),
      }
    ];

    const mintRes = await axios.post(
      `${API_URL}/booking-codes`,
      {
        selections,
        suggestedStake: 100,
        currency: 'USD',
        label: 'Test 2-leg USD slip',
      },
      { headers: usdHeaders }
    );

    const bookingCode = mintRes.data.code;
    console.log(`✅ Booking Code minted: ${bookingCode}`);
    console.log(`   Selections count: ${mintRes.data.selections}\n`);

    // 4. Redeem booking code as NGN user
    console.log(`4️⃣  Redeeming booking code ${bookingCode} as NGN User...`);
    const redeemRes = await axios.get(`${API_URL}/booking-codes/${bookingCode}`, { headers: ngnHeaders });
    const booking = redeemRes.data;
    console.log(`✅ Booking Code redeemed:`);
    console.log(`   Currency: ${booking.currency}`);
    console.log(`   Suggested Stake: ${booking.suggestedStake} ${booking.currency}`);
    console.log(`   Selections odds: ${booking.selections.map(s => s.odds).join(', ')}\n`);

    // 5. Place bet as NGN User
    // Let's simulate client behavior: 
    // If the client doesn't convert currency, it uses the raw suggestedStake (100)
    console.log('5️⃣  Placing bet as NGN User with raw suggestedStake...');
    const odds = booking.selections.reduce((p, s) => p * s.odds, 1);
    const stake = booking.suggestedStake; // 100 (which will be 100 NGN)
    const expectedPayout = stake * odds; // 100 * 5.0 = 500 NGN

    console.log(`   Odds product: ${odds}`);
    console.log(`   Stake: ${stake} NGN`);
    console.log(`   Expected payout: ${expectedPayout} NGN`);

    const placeRes = await axios.post(
      `${API_URL}/bets`,
      {
        gameId: 'virtual_sports',
        gameName: 'Virtual Sports',
        stake: stake,
        selections: booking.selections,
        mode: 'multi',
        details: `Redeemed ${bookingCode}`,
      },
      { headers: ngnHeaders }
    );

    const bet = placeRes.data.bet;
    console.log(`✅ Bet Placed:`);
    console.log(`   Bet ID: ${bet._id}`);
    console.log(`   Stake: ${bet.stake} ${bet.currency}`);
    console.log(`   Status: ${bet.status}\n`);

    // 6. Settle bet as WON
    console.log('6️⃣  Settling bet as WON...');
    const settleRes = await axios.post(
      `${API_URL}/bets/${bet._id}/settle`,
      {
        won: true,
        payout: expectedPayout,
      },
      { headers: ngnHeaders }
    );

    const settledBet = settleRes.data.bet;
    const finalBalance = settleRes.data.balance;
    console.log(`✅ Bet Settled:`);
    console.log(`   Bet Status stored: ${settledBet.status}`);
    console.log(`   Bet Payout stored: ${settledBet.payout} ${settledBet.currency}`);
    console.log(`   User Final Real Balance: ${finalBalance} NGN`);
    console.log(`   Expected Real Balance Increase: ${expectedPayout} NGN`);

    const multiplier = settledBet.payout / expectedPayout;
    console.log(`\n📊 Settlement Multiplier: ${multiplier}x`);
    if (multiplier !== 1) {
      console.log('❌ ERROR: Payout was multiplied/inflated!');
    } else {
      console.log('✅ SUCCESS: Payout matches expected value!');
    }

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

test().then(() => {
  console.log('\n=== CURRENCY TEST COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
