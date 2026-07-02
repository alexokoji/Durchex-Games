/**
 * Settlement debugging utilities to diagnose pending bet issues.
 */

export function logSettlementStart(gameId: string, betId: string, stake: number, payout: number, won: boolean) {
  console.log('[Settlement] Starting settlement flow', {
    timestamp: new Date().toISOString(),
    gameId,
    betId,
    stake,
    payout,
    won,
    profit: payout - stake,
  });
}

export function logSettlementSuccess(gameId: string, betId: string, payout: number) {
  console.log('[Settlement] ✅ Settlement completed successfully', {
    timestamp: new Date().toISOString(),
    gameId,
    betId,
    payout,
  });
}

export function logSettlementError(gameId: string, betId: string, error: any) {
  console.error('[Settlement] ❌ Settlement FAILED', {
    timestamp: new Date().toISOString(),
    gameId,
    betId,
    errorMessage: error?.message || String(error),
    errorCode: error?.code || 'unknown',
    errorType: error?.name || typeof error,
    fullError: error,
  });
}

export function logSettlementWarning(message: string, data: any) {
  console.warn('[Settlement] ⚠️ ' + message, {
    timestamp: new Date().toISOString(),
    ...data,
  });
}
