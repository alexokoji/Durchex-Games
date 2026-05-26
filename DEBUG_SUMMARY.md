# Settlement Issues Debugging - Summary

## 🎯 Objective
Identify and fix two critical bugs:
1. **Payout Multiplication (~8.4x)**: Potential payout 99,900 being credited as 840,000+
2. **Over/Under Settlement Failure**: Under bets showing as lost when should win

## ✅ What Has Been Completed

### 1. Comprehensive Logging Infrastructure
All settlement flow points now have detailed console logging:
- **Client**: BetSlipContext, WalletContext, soccerSimulation
- **Server**: virtualSportsScheduler, wallet settlement
- **Coverage**: Trace payout from selection to database credit

### 2. Configuration Fixed
- ✓ CORS correctly configured for localhost:5173
- ✓ Backend ready for requests

### 3. Debugging Tools Created

#### Tool 1: Database Inspection Script
**File**: `server/debug-bets.ts`

Run:
```bash
cd server
npm run debug:bets
```

Shows:
- Last 10 settled bets with all details
- Expected vs actual payouts
- Anomaly detection (8.4x multiplier, etc.)
- O/U settlement details
- Statistics by mode/status

#### Tool 2: Manual Testing Guide
**File**: `MANUAL_DEBUGGING_GUIDE.md`

Step-by-step instructions:
- Part 1: Run database inspection
- Part 2: Place test bet with known values
- Part 3: Monitor browser console logs
- Part 4: Check server logs
- Part 5: Verify in database
- Part 6: Collect all evidence

#### Tool 3: Quick Launch Script
**File**: `start-dev.ps1`

Run:
```bash
.\start-dev.ps1
```

Starts both servers in separate terminals with checks and next steps.

## 🚀 Quick Start (Pick One Approach)

### Approach A: Check Existing Data (5 minutes)
Already have bets in the database? Analyze them first:

```bash
cd server
npm run debug:bets
```

**Look for:**
- Payout multiplier > 1.1x = ANOMALY
- O/U optionId (should be lowercase 'over'/'under')
- Currency mismatches

**If you find anomalies**: Share the output and I can pinpoint the exact bug.

### Approach B: Place Fresh Test Bets (20-30 minutes)
No existing data or want clean test:

1. **Start servers**:
   ```bash
   .\start-dev.ps1
   ```
   Or manually:
   ```bash
   # Terminal 1
   cd server && npm run dev
   
   # Terminal 2
   npm run dev
   ```

2. **Open browser**: http://localhost:5173

3. **Follow MANUAL_DEBUGGING_GUIDE.md Part 2-6**
   - Place test bet with stake=100, odds=1.5
   - Capture browser logs
   - Capture server logs
   - Verify in database

## 📊 What You'll Capture

### Browser Console Logs
When bet settles, you'll see:
```
[BetSlipContext] Settling ticket: {
  stake: 100,
  selections: [...],
  settledPayout: 150,  // Expected: 100 × 1.5
  won: true
}

[WalletContext.settleBet] Settlement: {
  payout: 150,
  resolvedPayout: 150
}

[WalletContext.settleBet] Settlement result: {
  dbPayout: 150,
  newBalance: (previous + 150)
}
```

### Server Console Logs
```
[virtualSportsScheduler] Settling bet: {
  stake: 100,
  selections: [{odds: 1.5}],
  settledPayout: 150,
  won: true
}

[settleBetAtomic] Crediting payout: {
  payoutAmount: 150,
  expectedProfit: 50
}
```

### Database Check
```bash
npm run debug:bets
```

Output shows:
```
Stake: 100
Actual Payout: 150  ✓ Correct
Expected Payout (if win): 150
✓ No anomaly
```

## 🔍 Bug Indicators

### If Payout Multiplication Bug Exists
You'll see **150 becoming 1,260** (or 1,500+ etc.):
```
Expected: 100 × 1.5 = 150
Actual: 1,260
Multiplier: 8.4x ← BUG FOUND!
```

**Immediate actions:**
- Check odds value - is it actually 1.5 or 12.6?
- Check stake - is it 100 or 1?
- Check if currency conversion happening
- Check if settlement running twice

### If O/U Settlement Bug Exists
Over wins but Under loses:
```
Over 1.5 (total = 2): 'win'  ✓
Under 1.5 (total = 2): 'loss'  ✗ SHOULD WIN!

[resolveSoccerSelection] O/U resolution: {
  optionId: 'Under',  ← WRONG! Should be 'under'
  line: 0,             ← WRONG! Should be 1.5
  result: 'loss'
}
```

## 📋 Evidence Collection Template

When you find an anomaly, provide:

```
TEST BET DETAILS:
- Stake: [amount] [currency]
- Odds: [value]
- Expected Payout: [amount]
- Actual Credited: [amount]
- Multiplier: [ratio]

KEY LOGS:
[BetSlipContext log from browser]
[virtualSportsScheduler log from server]
[settleBetAtomic log from server]

DATABASE:
[Output from npm run debug:bets]

OBSERVATIONS:
[Where you see the 8.4x or O/U issue]
```

## 🔧 Root Cause Analysis

Once you have logs, I can pinpoint the bug:

### Payout Multiplication Path
```
Selection.odds (1.5) 
  ↓ [Check if correct value]
BetSlipContext.calculatePayout() = 100 × 1.5 = 150
  ↓ [Check browser log]
BetSlipContext.settledPayout = 150
  ↓ [Check client log]
WalletContext.resolvedPayout = 150
  ↓ [Check if being sent correctly]
API → server settlement
  ↓ [Check server log]
virtualSportsScheduler.settledPayout = 150
  ↓ [Check server calculation]
settleBetAtomic.payoutAmount = 150
  ↓ [Check database credit]
User.balance += 150

✓ If all match = correct
✗ If any jump (150→1260) = FOUND THE BUG
```

### O/U Settlement Path
```
Selection created: optionId = 'under'
  ↓ [Check MatchListView.tsx]
Stored in Bet document: optionId = 'under'
  ↓ [Check database]
Resolved: resolveSoccerSelection(selection)
  ↓ [Check browser log for optionId and line]
Extract line from marketId: 'ou-1.5' → 1.5
  ↓ [Check if extraction works]
Calculate: total < line ? 'win' : 'loss'
  ✓ Should work correctly
✗ If optionId='Under' or line=0 = FOUND THE BUG
```

## ⏱️ Timeline

- **5 min**: Run `npm run debug:bets` to check existing data
- **15-20 min**: Place 1-2 test bets and capture logs
- **5 min**: Review logs for anomalies
- **Once anomalies identified**: I can fix immediately

## 📞 Support

If you get stuck:
1. Check MANUAL_DEBUGGING_GUIDE.md Troubleshooting section
2. Ensure CORS is set correctly: `cat server/.env | grep CORS`
3. Check if servers are actually running: `curl http://localhost:4000`
4. Clear browser cache if frontend not loading

## 📚 File Reference

| File | Purpose |
|------|---------|
| `MANUAL_DEBUGGING_GUIDE.md` | Step-by-step testing guide |
| `start-dev.ps1` | Quick startup script |
| `server/debug-bets.ts` | Database inspection tool |
| `server/package.json` | Added `npm run debug:bets` |
| `server/.env` | CORS fixed to localhost:5173 |
| `src/virtual-sports/core/BetSlipContext.tsx` | Logging added |
| `src/contexts/WalletContext.tsx` | Logging added |
| `src/virtual-sports/soccer/soccerSimulation.ts` | O/U logging added |
| `server/src/services/virtualSportsScheduler.ts` | Settlement logging |
| `server/src/services/wallet.ts` | Payout logging |

---

**Ready to debug! Start with either `npm run debug:bets` or `.\start-dev.ps1` based on your preference above.**
