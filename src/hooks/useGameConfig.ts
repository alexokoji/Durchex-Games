import { useEffect, useState } from 'react';
import { adminApi, type PublicGameConfig } from '../api/admin';
import { getChatSocket } from '../api/chat';

/** Sensible defaults so games can render before the API call lands. */
const FALLBACK: PublicGameConfig = {
  crash:    { houseEdge: 0.01, instaBustRate: 0.05, moonshotRate: 0.05 },
  dice:     { houseEdge: 0.01 },
  plinko:   { houseEdge: 0.01 },
  slots:    { rtp: 0.95 },
  mines:    { houseEdge: 0.01 },
  roulette: { houseEdge: 0.027 },
};

let cached: PublicGameConfig | null = null;
let inflight: Promise<PublicGameConfig> | null = null;

async function loadOnce(): Promise<PublicGameConfig> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = adminApi.publicGameConfig()
    .then(cfg => { cached = cfg; return cfg; })
    .catch(() => FALLBACK)
    .finally(() => { inflight = null; });
  return inflight;
}

/** React hook returning the latest public game-config, with the fallback
 *  defaults available immediately so games never block on the network. */
export function useGameConfig(): PublicGameConfig {
  const [cfg, setCfg] = useState<PublicGameConfig>(cached ?? FALLBACK);
  useEffect(() => {
    let cancelled = false;
    void loadOnce().then(c => { if (!cancelled) setCfg(c); });

    // Listen for server broadcasts signalling config updates and reload.
    const socket = getChatSocket();
    function onUpdate() {
      cached = null;
      void loadOnce().then(c => { if (!cancelled) setCfg(c); });
    }
    socket.on('public-game-config:updated', onUpdate);
    return () => { cancelled = true; };
  }, []);
  return cfg;
}
