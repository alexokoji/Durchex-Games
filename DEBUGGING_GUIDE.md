# Settlement Issues Debugging Guide

## Overview
I've added comprehensive logging across the settlement chain to diagnose two issues:
1. **Payout Multiplication (~8.4x)**: Potential payout 99,900 → credited 840,000+
2. **Over/Under Settlement Failure**: Unders marked as lost when they should win

## Logging Points Added

### 1. Client-Side Settlement (React)

#### BetSlipContext.tsx
Logs when a ticket is being settled with the wallet:
```
[BetSlipContext] Settling ticket: {
  walletBetId,
  mode,           // 'single', 'multi', 'system'
  stake,          // Original bet amount
  status,         // 'won', 'lost', 'partial', 'void'
  selectionsCount,
  settlementResults,  // Array of {selectionId, result}
  settledPayout,  // Amount being credited
  won
}
```

#### WalletContext.tsx
Logs before and after settlement call:
```
[WalletContext.settleBet] Settlement: {
  betId,
  stake,
  payout,         // Amount server should credit
  won,
  multiplier,
  resolvedPayout  // Final payout being sent to API
}

[WalletContext.settleBet] Settlement result: {
  betId,
  dbPayout,       // What's actually in database
  newBalance      // User's new balance after settlement
}
```

### 2. Client Simulation (Soccer)

#### soccerSimulation.ts
Logs O/U resolution for each selection:
```
[resolveSoccerSelection] O/U resolution: {
  optionId,       // 'over' or 'under'
  marketId,       // e.g., 'match-id-ou-1.5'
  line,           // Extracted line value (e.g., 1.5)
  finalScore: {h, a},
  total,          // h + a
  result          // 'win', 'loss', 'void'
}
```

### 3. Server-Side Settlement

#### virtualSportsScheduler.ts
Logs each bet being settled:
```
[virtualSportsScheduler] Settling bet: {
  betId,
  userId,
  mode,           // 'single', 'multi', 'system'
  stake,
  selections: [{id, odds}, ...],  // Verify odds values
  settledPayout,  // Amount being credited
  won
}
```

#### wallet.ts (settleBetAtomic)
Logs the actual database credit operation:
```
[settleBetAtomic] Crediting payout: {
  betId,
  userId,
  betCurrency,    // Currency of the bet
  betStake,
  payoutAmount,   // Direct from bet.payout
  expectedProfit  // payoutAmount - stake
}

[settleBetAtomic] After credit: {
  betId,
  newBalance,
  userCurrency    // User's account currency
}
```

## How to Debug

### Step 1: Place a Test Bet
- Use your staging/test environment
- Place a simple virtual sports bet with **known values**:
  - Stake: 100 NGN
  - Odds: 1.5
  - Expected payout if win: 150 NGN
  - Expected profit: 50 NGN
- Note down the exact bet ID

### Step 2: Open Browser DevTools
- F12 to open Developer Tools
- Go to **Console** tab
- Place your test bet
- Keep the console visible

### Step 3: Let Match Settle
- Wait for the match to finish and settlement to run
- Watch for logs in the console starting with:
  - `[BetSlipContext] Settling ticket:`
  - `[WalletContext.settleBet]`
  - `[resolveSoccerSelection]`

### Step 4: Check Server Logs
- Check your server console/logs for:
  - `[virtualSportsScheduler] Settling bet:`
  - `[settleBetAtomic] Crediting payout:`
  - `[settleBetAtomic] After credit:`

### Step 5: Trace the Numbers
Compare the values at each step:

```
Expected flow (with 100 NGN stake, 1.5 odds, win):
1. Payout = 100 * 1.5 = 150 NGN

Client flow:
  BetSlipContext: settledPayout = 150
  WalletContext: payout = 150, resolvedPayout = 150

Server flow:
  virtualSportsScheduler: settledPayout = 150
  settleBetAtomic: payoutAmount = 150
  wallet.ts: $inc { balance: 150 }
```

### Step 6: Look for Anomalies
If you see **150 → 1,260** (~8.4x):
- Check if odds are actually **1.5** or **12.6** (too high)
- Check if stake is **1** not **100** (divided somewhere)
- Check user currency conversion (NGN vs USD?)

If O/U shows wrong result:
- Check `optionId` - should be exactly 'over' or 'under' (lowercase)
- Check `marketId` format - should have line like `ou-1.5`
- Check `line` extraction - should be 1.5 not null/0/something else
- Compare line with `total` - Over wins if total > line

## Common Issues to Check

### Payout Multiplication
1. **Odds stored wrong**: Check `selections.odds` - is it 1.5 or 12.6?
2. **Stake divided**: Was stake 100 or stored as 1?
3. **Currency factor**: Is NGN being converted to USD incorrectly?
   - NGN usdPerUnit = 1/1500 ≈ 0.00067
   - If multiplied instead of divided: 1500x or 1 / (1/1500) = 1500x
4. **Multiple credits**: Is settlement happening twice?

### O/U Settlement Wrong
1. **optionId case**: Check if stored as 'Under' instead of 'under'
2. **Line extraction fails**: Check if marketId format differs
3. **Market ID mismatch**: Selection created with one format, resolved with another
4. **Total score wrong**: finalScore showing wrong h + a

## Collecting Evidence

When you see the issue, **collect this information**:

1. **Browser Console Output**:
   - Screenshot or copy `[BetSlipContext]` log
   - Screenshot or copy `[WalletContext]` logs (both)
   - Screenshot or copy `[resolveSoccerSelection]` log for O/U bets

2. **Server Console Output**:
   - Screenshot or copy `[virtualSportsScheduler]` log
   - Screenshot or copy `[settleBetAtomic]` logs (both)

3. **Database Check**:
   - Query the `bets` collection for your test betId
   - Check: stake, selections[].odds, payout, status

4. **User Account**:
   - Check user balance before and after settlement
   - Check currency field

## Example Debug Session

```
TEST: 100 NGN stake, 1.5 odds, Over 1.5, wins (final score 2-0)

Browser Console:
[BetSlipContext] Settling ticket: {
  stake: 100,
  selections: [{id: "...:ou-1.5:over", ...}],
  settledPayout: 150,
  won: true
}

[WalletContext.settleBet] Settlement: {
  stake: 100,
  payout: 150,
  won: true,
  resolvedPayout: 150
}

[resolveSoccerSelection] O/U resolution: {
  optionId: 'over',
  marketId: 'match-id-ou-1.5',
  line: 1.5,
  finalScore: {h: 2, a: 0},
  total: 2,
  result: 'win'
}

[WalletContext.settleBet] Settlement result: {
  dbPayout: 150,
  newBalance: 100 (prior) + 150 = 250 ✓
}

Server Console:
[virtualSportsScheduler] Settling bet: {
  stake: 100,
  selections: [{odds: 1.5}],
  settledPayout: 150,
  won: true
}

[settleBetAtomic] Crediting payout: {
  betStake: 100,
  payoutAmount: 150,
  expectedProfit: 50
}

Result: ✓ Correct - 150 NGN credited
```

If instead you see:
```
settledPayout: 1,260  (8.4x multiplier!)
```

Then check:
- Are odds actually 12.6? No = bug in odds calculation
- Is stake 1 not 100? No = bug in stake handling
- Currency conversion? Check FIAT config

## Report Template

When sharing findings, provide:

```
**Test Bet Details**:
- Stake: [amount] [currency]
- Sport: [sport]
- Market: [market type]
- Odds: [odds value]
- Result: [win/loss/void]
- Expected Payout: [amount]
- Actual Credited: [amount]

**O/U Specific**:
- Over/Under: [over/under]
- Line: [1.5/2.5/etc]
- Final Score: [h-a]
- Total: [h+a]
- Expected Result: [win/loss]
- Actual Result: [win/loss]

**Key Logs**:
[Paste relevant console logs here]
```

---

Build successful ✓ - All logging compiled without errors.
Ready to test!
