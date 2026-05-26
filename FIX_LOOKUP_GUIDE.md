# Fix Guide: Quick Lookup for Bug Fixes

Once you've identified the bug via debugging, use this guide to find and fix the issue.

## Bug: Payout Being Multiplied by ~8.4x

### Symptoms
- Bet stake: 100 NGN
- Odds: 1.5
- Expected payout: 150 NGN
- Actual credited: 1,260+ NGN

### Where to Check

#### 1. Are Odds Correct?
**File**: `server/src/services/virtualSportsScheduler.ts` line 165
```typescript
const oddsProd = selsArr.reduce((p: number, sel: any, i: number) => p * (results[i] === 'void' ? 1 : sel.odds), 1);
settledPayout = bet.stake * oddsProd;
```

Check in debug logs:
```
[virtualSportsScheduler] Settling bet: {
  selections: [{odds: 1.5}],  // ← Should be 1.5, not 12.6
  settledPayout: 150
}
```

**If odds = 12.6 instead of 1.5**:
- Odds are wrong at placement time
- Check `src/virtual-sports/shell/MatchListView.tsx` line 164: `odds: option.odds`
- Check market generation functions for your sport

#### 2. Is Stake Correct?
**File**: `server/src/services/wallet.ts` line 110-120
```typescript
const bet = await Bet.create({
  stake: args.stake,  // ← Should be 100, not 1
  // ...
});
```

Check in debug logs:
```
[settleBetAtomic] Crediting payout: {
  betStake: 100,  // ← Should be 100, not 1 or 12
  payoutAmount: 150
}
```

**If stake = 1 instead of 100**:
- Check `src/api/bets.ts` how stake is sent from client
- Check `src/components/` where bet is placed if stake is divided somewhere
- Search for `/ 1500` (currency conversion?) that might be applied to stake

#### 3. Is Currency Conversion Applied Incorrectly?
**File**: `server/src/services/wallet.ts` line 140
```typescript
const credited = await User.findByIdAndUpdate(
  args.userId,
  { $inc: { balance: bet.payout } },  // ← Should be 150 NGN, not 150 USD
  { new: true },
);
```

Check FIAT config:
**File**: `server/src/config/currencies.ts` line 25
```typescript
NGN: { 
  usdPerUnit: 1 / 1500,  // ← NGN to USD is divide by 1500
},
```

**If payout is being multiplied by currency**:
- Check if `bet.payout` is in USD when it should be NGN
- Check if conversion is happening: `payout * 1500` (wrong direction)
- Should be: `usdAmount / (1/1500)` NOT `usdAmount * 1500`

**Search for**:
- `FIAT[].usdPerUnit` usage
- `toUsd()` or `toCurrency()` functions
- Any `* 1500` or `/ 0.00067` in wallet.ts

#### 4. Is Settlement Happening Twice?
**File**: `server/src/services/virtualSportsScheduler.ts` line 195-205
```typescript
for (const s of toSettle) {
  try {
    await settleBetAtomic({...});
  } catch (err) {
    console.error('[virtual_settle] failed settle', s.bet._id, err);
  }
}
```

Check server logs for:
```
[virtualSportsScheduler] Settling bet: {betId: "xxx"}  // First time
[virtualSportsScheduler] Settling bet: {betId: "xxx"}  // Second time? ← BUG!
```

**If settling twice**:
- Check if bet is in `toSettle` array twice
- Check if another settlement process is running (schedulers, webhooks)
- Grep for `settleBetAtomic` and `settleBet` calls

---

## Bug: Over/Under Settling Incorrectly

### Symptoms
- Over 1.5 resolved correctly as 'win'
- Under 1.5 resolved incorrectly as 'loss' (should be 'win')
- Total goals: 1 (1-0 or 0-1 score)

### Where to Check

#### 1. Is optionId Lowercase?
**File**: `src/virtual-sports/shell/MatchListView.tsx` line 164
```typescript
const sel: BetSelection = {
  optionId: option.id,  // ← Should be 'over' or 'under', not 'Over' or 'Under'
  // ...
};
```

Check browser logs:
```
[resolveSoccerSelection] O/U resolution: {
  optionId: 'under',  // ← Must be lowercase
  // ...
}
```

**If optionId = 'Under'**:
- Search for where option.id is set in `src/virtual-sports/soccer/soccerMarkets.ts`
- Check line 210-217 where O/U options are created:
  ```typescript
  { id: 'over', label: 'Over 1.5', p: pOver },
  { id: 'under', label: 'Under 1.5', p: 1-pOver }
  ```
- Should have lowercase `'over'` and `'under'`, not `'Over'` and `'Under'`

#### 2. Is Line Being Extracted Correctly?
**File**: `src/virtual-sports/soccer/soccerSimulation.ts` line 237-243
```typescript
case 'OVER_UNDER': {
  const line = extractLine(marketId) ?? 0;  // ← Should be 1.5, not 0
  const total = h + a;
  if (optionId === 'over')  return total > line ? 'win' : 'loss';
  if (optionId === 'under') return total < line ? 'win' : 'loss';
  return 'loss';
}
```

**If line = 0**:
- Check `extractLine()` function at line 311-313:
  ```typescript
  function extractLine(marketId: string): number | null {
    const match = marketId.match(/-?(\d+(?:\.\d+)?)(?!.*\d)/);
    return match ? parseFloat(match[1]) : null;
  }
  ```
- Verify marketId format is correct: `'match-id-ou-1.5'` or similar
- Check if market creation uses different format

**Debug by checking browser log**:
```
[resolveSoccerSelection] O/U resolution: {
  marketId: 'match-id-ou-1.5',  // ← Must have '-ou-1.5'
  line: 1.5,                      // ← Extracted correctly
  total: 1,
  result: 'win'                   // ← Should be 'win' since 1 < 1.5
}
```

#### 3. Is Market ID Format Consistent?
**File**: `src/virtual-sports/soccer/soccerMarkets.ts` line 210-217
```typescript
// O/U market generation
const ouMarkets: Market[] = GOAL_LINES.map(line => ({
  id: `${matchId}-ou-${line}`,  // ← Format: "match-id-ou-1.5"
  category: 'OVER_UNDER',
  label: `Over/Under ${line}`,
  options: [
    { id: 'over', label: `Over ${line}`, p: pOver },
    { id: 'under', label: `Under ${line}`, p: 1 - pOver }
  ]
}));
```

Check in debug logs that marketId matches this pattern:
```
[BetSlipContext] Settling ticket: {
  selections: [{
    marketId: 'match-id-ou-1.5'  // ← Must have this format
  }]
}
```

**If format is different**:
- Search market generation in all sports files
- Check `soccer/soccerMarkets.ts`, `basketball/basketballMarkets.ts`, etc.
- Ensure all use consistent `ou-${line}` pattern

#### 4. Is Total Score Correct?
**File**: `src/virtual-sports/soccer/soccerSimulation.ts` line 214
```typescript
export function resolveSoccerSelection(
  selection: BetSelection,
  match: SimulatedMatch,
): 'win' | 'loss' | 'void' {
  const { home: h, away: a } = match.finalScore;  // ← Check these values
  const total = h + a;  // ← Should be 1, not 3
  // ...
}
```

Check browser log:
```
[resolveSoccerSelection] O/U resolution: {
  finalScore: {h: 1, a: 0},  // ← Check match simulation
  total: 1,
  result: 'win'
}
```

**If total is wrong**:
- Bug in match simulation, not settlement
- Check `soccerSimulation.ts` `simulateSoccerMatch()` function
- Check if goals are being counted correctly in events

---

## Odds Too High (1.5 → 12.6)

### Most Likely Cause
Market options being generated with wrong odds.

**File**: `src/virtual-sports/soccer/soccerMarkets.ts` lines 50-100

```typescript
function generate1X2Market(): Market {
  // Probabilities
  const p1 = 0.4;   // 40% home win
  const pX = 0.3;   // 30% draw
  const p2 = 0.3;   // 30% away win
  
  // Convert to decimal odds: odds = 1 / probability
  const o1 = 1 / p1;   // ← If this is 1/0.4 = 2.5, correct
  const oX = 1 / pX;   // ← If this is 1/0.3 = 3.33, correct
  const o2 = 1 / p2;   // ← If this is 1/0.3 = 3.33, correct
  
  return {
    options: [
      { id: '1', label: 'Home', p: p1, odds: o1 },
      { id: 'X', label: 'Draw', p: pX, odds: oX },
      { id: '2', label: 'Away', p: p2, odds: o2 }
    ]
  };
}
```

**Check**:
- Are probabilities > 1? (Should be 0-1)
- Is odds calculation reversed? (Should be 1/p not p/1)
- Are odds marked up? (1/p * margin)?

---

## Quick Fix Checklist

For each bug, verify these in order:

### Payout Multiplication
- [ ] Odds value in virtualSportsScheduler logs = expected (1.5)?
- [ ] Stake value in settleBetAtomic logs = expected (100)?
- [ ] No currency conversion happening to payout?
- [ ] Settlement only running once?
- [ ] Final balance = original + 150?

### O/U Settlement Wrong
- [ ] optionId is lowercase 'under' not 'Under'?
- [ ] marketId contains 'ou-1.5' format?
- [ ] extractLine() returns 1.5 not 0?
- [ ] finalScore.home + finalScore.away = total?
- [ ] Logic: total < line → 'win' for under?

---

## Emergency: Check Raw Database

If logs are unclear, query the database directly:

```javascript
// In MongoDB compass or shell
db.bets.find({status: 'won'}).limit(5).pretty()

// Look at:
// - stake value
// - selections[0].odds
// - payout value
// Calculate: payout / (stake * odds[0]) 
// Should be 1.0, if 8.4 = bug found!
```

---

## Can't Find the Issue?

If you've checked all above and still can't find it:

1. Add more specific logging at suspected points
2. Check git history for recent changes to these files
3. Search codebase for factors: 8.4, 1500, 0.00067, etc.
4. Check if there's a middleware or hook modifying bet data
5. Search for async operations that might run settlement twice

Ask for help with specific logs showing the anomaly!
