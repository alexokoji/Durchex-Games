import { calculatePayout } from '../../../src/virtual-sports/core/oddsEngine';

// Minimal combo generator
function combinations(n: number, k: number): number[][] {
  if (k <= 0 || k > n) return [];
  const out: number[][] = [];
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push([...idx]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

// Client-style applyResults (copied from client BetSlipContext)
function clientApplyResults(ticket: any, results: ('win'|'loss'|'void')[]) {
  if (ticket.mode === 'single') {
    let payout = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r === 'win')  payout += calculatePayout(ticket.stake, ticket.selections[i].odds);
      else if (r === 'void') payout += ticket.stake;
    }
    const allWon = results.every(r => r === 'win');
    const allLost = results.every(r => r === 'loss');
    return { status: allWon ? 'won' : allLost ? 'lost' : 'partial', settledPayout: payout };
  }
  if (ticket.mode === 'multi') {
    if (results.some(r => r === 'loss')) {
      return { status: 'lost', settledPayout: 0 };
    }
    const odds = ticket.selections.reduce((p: number, sel: any, i: number) => p * (results[i] === 'void' ? 1 : sel.odds), 1);
    return { status: 'won', settledPayout: ticket.stake * odds };
  }
  // system
  const k = ticket.systemK ?? 2;
  const n = ticket.selections.length;
  const winningCombos = combinations(n, k).filter(combo => combo.every(i => results[i] === 'win'));
  if (winningCombos.length === 0) return { status: 'lost', settledPayout: 0 };
  const payout = winningCombos.reduce((sum, combo) => {
    const oddsProduct = combo.reduce((p, i) => p * ticket.selections[i].odds, 1);
    return sum + ticket.stake * oddsProduct;
  }, 0);
  const fullWin = winningCombos.length === combinations(n, k).length;
  return { status: fullWin ? 'won' : 'partial', settledPayout: payout };
}

// Server-style applyResults (mirrors virtualSportsScheduler logic)
function serverApplyResults(bet: any, results: ('win'|'loss'|'void')[]) {
  const selsArr = bet.selections as any[];
  const isSingle = bet.mode === 'single';
  if (isSingle) {
    let payout = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r === 'win') payout += calculatePayout(bet.stake, selsArr[i].odds);
      else if (r === 'void') payout += bet.stake;
    }
    return { settledPayout: payout };
  }
  const systemK = (typeof bet.systemK === 'number' && Number.isInteger(bet.systemK)) ? bet.systemK : undefined;
  if (!systemK) {
    const anyLoss = results.some(r => r === 'loss');
    if (anyLoss) return { settledPayout: 0 };
    const oddsProd = selsArr.reduce((p: number, sel: any, i: number) => p * (results[i] === 'void' ? 1 : sel.odds), 1);
    return { settledPayout: bet.stake * oddsProd };
  }
  const n = selsArr.length;
  const combos = combinations(n, systemK);
  const winningCombos = combos.filter(combo => combo.every(i => results[i] === 'win'));
  if (winningCombos.length === 0) return { settledPayout: 0 };
  const payout = winningCombos.reduce((sum, combo) => {
    const oddsProduct = combo.reduce((p, idx) => p * selsArr[idx].odds, 1);
    return sum + bet.stake * oddsProduct;
  }, 0);
  return { settledPayout: payout };
}

function randomOdds() { return 1.2 + Math.random() * 4; }

// Run randomized tests
function runTests(iter = 200) {
  let mismatches = 0;
  for (let t = 0; t < iter; t++) {
    const n = 2 + Math.floor(Math.random() * 6); // 2..7 selections
    const mode = Math.random() < 0.6 ? (Math.random() < 0.2 ? 'single' : 'multi') : 'system';
    const systemK = mode === 'system' ? 2 + Math.floor(Math.random() * Math.min(3, n - 1)) : undefined;
    const selections = Array.from({ length: n }, (_, i) => ({ id: `s${i}`, odds: randomOdds() }));
    const ticket = { mode, systemK, stake: 10, selections };
    const results: ('win'|'loss'|'void')[] = selections.map(() => {
      const r = Math.random();
      return r < 0.6 ? 'win' : r < 0.9 ? 'loss' : 'void';
    });
    // For single mode, client treats as single when ticket.mode === 'single'
    if (mode === 'single') ticket.mode = 'single';
    const client = clientApplyResults(ticket, results as any);
    const server = serverApplyResults(ticket as any, results as any);
    const cP = Math.round((client.settledPayout ?? 0) * 100) / 100;
    const sP = Math.round((server.settledPayout ?? 0) * 100) / 100;
    if (cP !== sP) {
      mismatches++;
      console.log('Mismatch:', { mode, systemK, n, results, client: cP, server: sP });
    }
  }
  console.log('Done. mismatches:', mismatches);
}

runTests(500);
