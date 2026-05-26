# Debugging Documentation Index

Complete guide for identifying and fixing the settlement issues.

## 📚 Documentation Files

### 1. **DEBUG_SUMMARY.md** ← START HERE
Quick overview of what was done and how to get started.
- What bugs we're fixing
- What's been completed  
- Two approaches (quick data check or fresh test)
- 5-minute vs 30-minute options

### 2. **MANUAL_DEBUGGING_GUIDE.md** ← DETAILED TESTING
Step-by-step instructions for placing bets and capturing logs.
- Part 1: Database inspection
- Part 2-4: Place and monitor test bets
- Part 5: Over/Under specific testing
- Part 6: Evidence collection template

### 3. **FIX_LOOKUP_GUIDE.md** ← AFTER FINDING THE BUG
Exact locations in code and how to fix them.
- Where to look for each bug symptom
- Code snippets showing the issue
- How to fix once identified
- Database query examples

### 4. **DEBUGGING_GUIDE.md**
Original quick reference (kept for context).

---

## ⚡ Quick Start Options

### Option A: Check Existing Bets (5 minutes)
```bash
cd server
npm run debug:bets
```

Analyzes last 10 bets in database. Look for:
- Payout multiplier anomalies
- O/U settlement details
- Currency issues

### Option B: Launch Full Environment (30 minutes)
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

Then follow **MANUAL_DEBUGGING_GUIDE.md** Part 2-6

---

## 🔍 What You'll Find

### Payout Multiplication Bug
```
Expected: 100 × 1.5 = 150 NGN
Actual credited: 1,260+ NGN  ← 8.4x multiplier
```

Root causes to check (in FIX_LOOKUP_GUIDE.md):
1. Odds value wrong (1.5 vs 12.6)
2. Stake value wrong (100 vs 1)
3. Currency conversion applied incorrectly
4. Settlement running twice

### O/U Settlement Bug
```
Over 1.5 result: 'win' ✓
Under 1.5 result: 'loss' ✗ (should be 'win')
```

Root causes to check:
1. optionId capitalized ('Under' vs 'under')
2. Line extraction failing (returns 0 instead of 1.5)
3. Market ID format inconsistent
4. Total score calculation wrong

---

## 📋 Evidence Collection

When you find an anomaly, collect:

1. **Test Bet Details**
   - Stake: [amount] [currency]
   - Odds: [value]
   - Expected vs actual payout

2. **Browser Console Output**
   - [BetSlipContext] logs
   - [WalletContext] logs
   - [resolveSoccerSelection] logs (for O/U)

3. **Server Console Output**
   - [virtualSportsScheduler] logs
   - [settleBetAtomic] logs

4. **Database Output**
   - `npm run debug:bets` output
   - Payout multiplier calculation

---

## 🛠️ Tools Created

| Tool | Location | Command |
|------|----------|---------|
| Database Inspector | `server/debug-bets.ts` | `cd server && npm run debug:bets` |
| Startup Script | `start-dev.ps1` | `.\start-dev.ps1` |
| Manual Guide | `MANUAL_DEBUGGING_GUIDE.md` | Read for details |
| Fix Lookup | `FIX_LOOKUP_GUIDE.md` | Use after finding bug |

---

## 📝 Code Changes Made

### Logging Added
1. `src/virtual-sports/core/BetSlipContext.tsx` - Ticket settlement logs
2. `src/contexts/WalletContext.tsx` - Payout settlement logs  
3. `src/virtual-sports/soccer/soccerSimulation.ts` - O/U resolution logs
4. `server/src/services/virtualSportsScheduler.ts` - Bet settlement logs
5. `server/src/services/wallet.ts` - Payout crediting logs

### Configuration Fixed
1. `server/.env` - CORS set to localhost:5173 (was 4173)

### Scripts Added
1. `server/debug-bets.ts` - Database inspection tool
2. `start-dev.ps1` - Convenient startup
3. `server/package.json` - Added `npm run debug:bets`

---

## ✅ Workflow

```
1. Read DEBUG_SUMMARY.md (2 min)
   ↓
2. Choose approach:
   A) Quick: npm run debug:bets (5 min)
   B) Fresh: start-dev.ps1 + manual testing (30 min)
   ↓
3. Collect evidence (logs + database)
   ↓
4. Use FIX_LOOKUP_GUIDE.md to locate bug
   ↓
5. Apply fix and test
   ↓
6. Verify settlement logs show correct values
```

---

## 🎯 Success Criteria

### Payout Multiplication Fixed
✓ Test bet: 100 stake × 1.5 odds → 150 credited
✓ Server logs show no 8.4x multiplier
✓ Database shows correct payout

### O/U Settlement Fixed
✓ Over 1.5 win → 'win' result
✓ Under 1.5 (total < 1.5) → 'win' result
✓ optionId is lowercase in all logs

---

## 📞 Troubleshooting

**Frontend blank page?**
- Check CORS: `cat server/.env | grep CORS`
- Should be: `CORS_ORIGINS=...localhost:5173`
- Clear cache: Ctrl+Shift+Delete
- Hard reload: Ctrl+Shift+R

**No logs appearing?**
- Backend running? `curl http://localhost:4000`
- Frontend connected? Check Network tab in DevTools
- Check browser console for JavaScript errors

**Database inspection shows nothing?**
- No bets created yet: Place a test bet first
- Wrong database? Check `MONGO_URI` in `.env`
- Connection error? Check MongoDB connection status

---

## 🚀 Ready to Debug!

**Next Step**: Open DEBUG_SUMMARY.md and choose your approach (Option A or B)

Files are ready to use. Good luck! 🎯
