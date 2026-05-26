#!/usr/bin/env node
require('dotenv').config({ path: '.env' });
const http = require('http');

async function testBetPlacement() {
  // First, get an auth token by creating a test user
  console.log('[testBetPlacement] Starting test...\n');

  // Register a test user
  const registerResult = await makeRequest('POST', '/api/auth/register', {
    email: 'test-user-' + Date.now() + '@example.com',
    username: 'testuser' + Date.now().toString().slice(-6),
    password: 'TestPass@1234',
    currency: 'NGN',
  });

  if (!registerResult.ok) {
    console.error('[testBetPlacement] Register failed:', registerResult);
    process.exit(1);
  }

  const userId = registerResult.user._id;
  const token = registerResult.accessToken || registerResult.tokens?.accessToken;

  console.log('[testBetPlacement] Registered user:', userId);
  console.log('[testBetPlacement] Auth token obtained\n');

  // Now place a bet with selections
  const betPayload = {
    gameId: 'virtual_sports',
    gameName: 'Virtual Sports',
    stake: 100,
    details: 'Test bet with selections',
    mode: 'multi',
    selections: [
      {
        id: 'match1:market1:option1',
        matchId: 'match1',
        marketId: 'market1',
        marketCategory: '1x2',
        marketLabel: '1X2',
        optionId: 'option1',
        optionLabel: 'Home Win',
        odds: 2.5,
        sport: 'soccer',
        leagueId: 'league1',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startsAt: Date.now() + 3600000,
        addedAt: Date.now(),
      },
      {
        id: 'match2:market2:option2',
        matchId: 'match2',
        marketId: 'market2',
        marketCategory: '1x2',
        marketLabel: '1X2',
        optionId: 'option2',
        optionLabel: 'Home Win',
        odds: 1.8,
        sport: 'soccer',
        leagueId: 'league1',
        homeTeam: 'Team C',
        awayTeam: 'Team D',
        startsAt: Date.now() + 3600000,
        addedAt: Date.now(),
      },
    ],
  };

  console.log('[testBetPlacement] Placing bet with payload:');
  console.log(JSON.stringify(betPayload, null, 2));
  console.log('');

  const placeBetResult = await makeRequest('POST', '/api/bets', betPayload, token);

  if (!placeBetResult.ok) {
    console.error('[testBetPlacement] Place bet failed:', placeBetResult);
    process.exit(1);
  }

  console.log('[testBetPlacement] Bet placed successfully:');
  console.log(JSON.stringify(placeBetResult.bet, null, 2));
  console.log('');

  console.log('[testBetPlacement] Check server logs for the selections logging above');
}

function makeRequest(method, path, data, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ ok: res.statusCode < 400, ...json, statusCode: res.statusCode });
        } catch (e) {
          resolve({ ok: false, error: 'Invalid JSON response', body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

testBetPlacement().catch(console.error);
