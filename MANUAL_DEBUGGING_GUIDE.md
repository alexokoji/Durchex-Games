# Manual Debugging Guide for Settlement Issues

## Prerequisites

Before starting, ensure:
- Backend running on `http://localhost:4000`
- Frontend running on `http://localhost:5173`
- Browser DevTools ready (F12)

## Part 1: Inspect Existing Bets in Database

This will help identify if the payout multiplication issue already exists in settled bets.

### Step 1: Run the database inspection script

```bash
cd server
npx ts-node debug-bets.ts
```

This will output:
- Last 10 bets with all details
- Expected vs actual payouts
- Anomaly detection (8.4x multiplier, etc.)
- Statistics by status and mode

**What to look for:**
- Any payout multiplier > 1.1x or < 0.9x = ANOMALY
- O/U selections showing wrong optionId (capitalized vs lowercase)
- Currency mismatches

---

## Part 2: Place and Monitor a Test Bet

### Step 2: Set up browser console logging

1. **Open Browser DevTools**: F12
2. **Go to Console tab**
3. **Copy-paste this monitoring script** to catch logs in real-time:

```javascript
// Capture all settlement logs
const logs = [];
const originalLog = console.log;
console.log = function(...args) {
  originalLog.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
  if (msg.includes('[') && (msg.includes('BetSlip') || msg.includes('Wallet') || msg.includes('resolve'))) {
    logs.push(msg);
  }
};

// Export logs to console when needed
window.exportLogs = () => {
  const output = logs.join('\n\n');
  console.log('=== SETTLEMENT LOGS ===\n' + output);
  return output;
};

console.log('✓ Monitoring active. Call exportLogs() to see captured settlement logs.');
```

Press Enter after pasting. It will show: `✓ Monitoring active...`

### Step 3: Navigate to Virtual Sports

1. On the app, navigate to **Virtual Sports** → **Soccer**
2. Select a league (e.g., **EPL**)
3. Look for an upcoming match

### Step 4: Place a test bet with KNOWN VALUES

**Important**: Use a single bet (not multi or system) for easiest debugging.

**Example bet setup:**
- League: EPL (Soccer)
- Market: **1X2** (simplest market)
- Selection: **Home Win (1)**
- Stake: **100 NGN** (or smallest amount)
- Line odds: **1.5** (should be displayed on the button)

✓ Complete the bet

**Note down:**
- Bet ID (shown in confirmation)
- Exact stake amount
- Exact odds value
- Expected payout if win: **stake × odds** = 100 × 1.5 = **150 NGN**
- Expected profit: 50 NGN

### Step 5: Wait for match settlement

The scheduler runs every minute, so the match should settle within 1-2 minutes.

**Watch for:**
- Console logs starting with `[BetSlipContext]`, `[WalletContext]`, `[resolveSoccerSelection]`
- Check if game won or lost

### Step 6: Capture the logs

In browser console, type:

```javascript
exportLogs()
```

**Copy the entire output** and save it.

---

## Part 3: Check Server Logs

While the bet is settling, watch the **backend terminal**.

**Look for these log patterns:**

```
[virtualSportsScheduler] Settling bet: {
  betId: "...",
  stake: 100,
  settledPayout: 150,  // Should match expected
  won: true/false
}

[settleBetAtomic] Crediting payout: {
  payoutAmount: 150  // Should match settledPayout
}
```

**Copy these logs** from the server console.

---

## Part 4: Database Verification

After settlement, run:

```bash
cd server
npx ts-node debug-bets.ts
```

Find your test bet in the output. Verify:
- `Actual Payout` matches what was credited
- No anomalous multiplier

---

## Part 5: Over/Under Specific Test

If you want to specifically test the O/U bug:

### Repeat Part 2-4 with these changes:

**Bet setup:**
- Market: **Over/Under**
- Line: **1.5 goals**
- Selection: **Under 1.5**
- Stake: **100 NGN**
- Odds: **1.8** (typical O/U odds)

**Expected payout if win:** 100 × 1.8 = **180 NGN**

**In browser console, watch for:**

```
[resolveSoccerSelection] O/U resolution: {
  optionId: 'under',           // ← Must be lowercase 'under'
  marketId: 'match-id-ou-1.5', // ← Must contain '-ou-' and line
  line: 1.5,                    // ← Must extract correctly to 1.5
  finalScore: {h: 0, a: 1},
  total: 1,
  result: 'win'                 // ← Should be 'win' since 1 < 1.5
}
```

---

## Part 6: Collect Evidence

Create a document with:

### A. Test Bet Details
```
Sport: Soccer
League: EPL
Market: 1X2 / Over/Under 1.5
Selection: Home / Under
Stake: 100 NGN
Odds: 1.5 / 1.8
Expected Payout: 150 / 180 NGN
Actual Credited: ? NGN
```

### B. Browser Console Logs
- Output from `exportLogs()`
- All `[BetSlipContext]` and `[WalletContext]` entries

### C. Server Logs
- `[virtualSportsScheduler] Settling bet:` entries
- `[settleBetAtomic]` entries
- Full console output during settlement

### D. Database Check
- Output from `debug-bets.ts` showing the settled bet
- Payout multiplier calculation

---

## Troubleshooting

### Issue: No logs appearing

**Check:**
1. Is backend actually running? Test: `curl http://localhost:4000`
2. Is frontend connected? Check Network tab in DevTools (should see API requests)
3. Do you see page content loading? If blank, see below

### Issue: Frontend blank page

**Fix:**
1. Check CORS_ORIGINS in `server/.env` matches your port
2. Clear browser cache: Ctrl+Shift+Delete
3. Hard reload: Ctrl+Shift+R
4. Check DevTools Console for errors

### Issue: Match already settled before we observe

**Solution:**
- Place multiple bets across different upcoming matches
- Monitor virtual sports scheduler logs: `tail -f server-output.log | grep virtualSportsScheduler`

### Issue: No upcoming matches

**Check:**
1. Admin panel → Virtual Sports Predictions
2. If "No upcoming kickoffs", the 24-hour lookahead might still be limited
3. Verify AdminVirtualSportsPanel.tsx fix was applied

---

## Quick Reference: Expected Logs for Winning Bet

**Single bet, stake 100, odds 1.5:**

```
Browser Console:
[BetSlipContext] Settling ticket: {
  stake: 100,
  settledPayout: 150,
  won: true
}

[WalletContext.settleBet] Settlement: {
  payout: 150,
  resolvedPayout: 150
}

[WalletContext.settleBet] Settlement result: {
  dbPayout: 150,
  newBalance: (prev + 150)
}

Server Console:
[virtualSportsScheduler] Settling bet: {
  stake: 100,
  settledPayout: 150,
  won: true
}

[settleBetAtomic] Crediting payout: {
  payoutAmount: 150,
  expectedProfit: 50
}

Database (debug-bets.ts):
Actual Payout: 150
Expected Payout: 150
✓ No multiplier anomaly
```

If you see **150 → 1260** (8.4x) anywhere in this chain = BUG!

---

## Common Bug Indicators

### Payout Multiplication Bug

Look for these patterns:
```
Expected: 100 × 1.5 = 150
Actual credited: 1,260
Multiplier: 8.4x

OR

Expected: 100 × 1.5 = 150
Actual credited: 25,000+
Multiplier: 166x+
```

**Likely cause:** Odds or stake value is wrong at some point in the chain.

### O/U Settlement Bug

Look for:
```
Over 1.5 result: 'win' ✓
Under 1.5 result: 'loss' ✗ (should be 'win' if total < 1.5)

Possible causes:
- optionId: 'Under' (capitalized, not 'under')
- line: 0 or null (not 1.5)
- total calculation wrong
```

---

## Submitting Findings

Please provide:

1. **Test Bet Details** (as shown in Part 6.A)
2. **All three log sources** (Browser, Server, Database)
3. **Any anomalies** you observed
4. **Currency information** (NGN, USD, etc.)

This will allow precise identification of the root cause!
