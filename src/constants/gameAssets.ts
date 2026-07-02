/**
 * CC0 Assets for all casino games
 * Game covers: Custom SVGs generated for each game
 * Sounds from: Freesound (freesound.org), Zapsplat (zapsplat.com)
 */

// SVG Game Cover Generator
function createSVGCover(gameId: string): string {
  const svgs: Record<string, string> = {
    hilo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="hiloGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#hiloGrad)"/><rect x="50" y="80" width="80" height="120" fill="white" stroke="#333" stroke-width="2" rx="4"/><text x="90" y="145" font-size="48" font-weight="bold" text-anchor="middle" fill="#000">K♠</text><rect x="170" y="80" width="60" height="120" fill="#ff6b6b" stroke="#333" stroke-width="2" rx="4"/><text x="200" y="140" font-size="36" font-weight="bold" text-anchor="middle" fill="white">?</text><rect x="270" y="80" width="80" height="120" fill="white" stroke="#333" stroke-width="2" rx="4"/><text x="310" y="155" font-size="32" font-weight="bold" text-anchor="middle" fill="#000">↓</text><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">HI-LO</text></svg>`,

    coinflip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient><radialGradient id="coinShine" cx="40%" cy="40%"><stop offset="0%" style="stop-color:#ffd700;stop-opacity:0.9" /><stop offset="100%" style="stop-color:#ffed4e;stop-opacity:0.3" /></radialGradient></defs><rect width="400" height="300" fill="url(#coinGrad)"/><circle cx="200" cy="130" r="70" fill="url(#coinShine)" stroke="#ffd700" stroke-width="2"/><text x="200" y="145" font-size="64" font-weight="bold" text-anchor="middle" fill="#000">H</text><path d="M 140 200 Q 200 220 260 200" stroke="#00ff88" stroke-width="2" fill="none" stroke-linecap="round"/><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">COIN FLIP</text></svg>`,

    limbo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="limboGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#limboGrad)"/><line x1="60" y1="150" x2="340" y2="150" stroke="#ffd700" stroke-width="3" stroke-dasharray="5,5"/><circle cx="100" cy="120" r="25" fill="#00ff88" stroke="#00ff88" stroke-width="1"/><circle cx="200" cy="80" r="25" fill="#ff6b7a" stroke="#ff6b7a" stroke-width="1"/><circle cx="300" cy="140" r="25" fill="#00ff88" stroke="#00ff88" stroke-width="1"/><text x="200" y="210" font-size="16" font-weight="bold" text-anchor="middle" fill="#ffd700">TARGET: 2.50x</text><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">LIMBO</text></svg>`,

    colorprediction: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="colorGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#colorGrad)"/><rect x="50" y="70" width="70" height="70" fill="#ff0000" rx="4"/><rect x="145" y="70" width="70" height="70" fill="#0066ff" rx="4"/><rect x="240" y="70" width="70" height="70" fill="#00ff00" rx="4"/><rect x="97" y="160" width="70" height="70" fill="#ffff00" rx="4"/><rect x="192" y="160" width="70" height="70" fill="#ff00ff" rx="4"/><text x="200" y="270" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">COLOR PREDICT</text></svg>`,

    diceduel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#diceGrad)"/><rect x="80" y="110" width="70" height="70" fill="#fff" stroke="#333" stroke-width="2" rx="4"/><circle cx="95" cy="125" r="5" fill="#000"/><circle cx="115" cy="145" r="5" fill="#000"/><circle cx="135" cy="165" r="5" fill="#000"/><text x="115" y="230" font-size="18" font-weight="bold" text-anchor="middle" fill="#ffd700">vs</text><rect x="250" y="110" width="70" height="70" fill="#00ff88" stroke="#00ff88" stroke-width="2" rx="4"/><circle cx="265" cy="125" r="5" fill="#000"/><circle cx="285" cy="125" r="5" fill="#000"/><circle cx="305" cy="125" r="5" fill="#000"/><text x="200" y="270" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">DICE DUEL</text></svg>`,

    keno: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="kenoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#kenoGrad)"/><g id="numbers"><rect x="60" y="70" width="25" height="25" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><text x="72.5" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#ffd700">7</text><rect x="95" y="70" width="25" height="25" fill="#00ff88" stroke="#00ff88" stroke-width="1" rx="2"/><text x="107.5" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#000">23</text><rect x="130" y="70" width="25" height="25" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><text x="142.5" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#ffd700">41</text><rect x="165" y="70" width="25" height="25" fill="#00ff88" stroke="#00ff88" stroke-width="1" rx="2"/><text x="177.5" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#000">56</text><rect x="200" y="70" width="25" height="25" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><text x="212.5" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#ffd700">78</text></g><rect x="100" y="130" width="200" height="2" fill="#ffd700"/><text x="200" y="200" font-size="16" font-weight="bold" text-anchor="middle" fill="#ffd700">PICK YOUR NUMBERS</text><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">KENO</text></svg>`,

    treasurehunt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="treasureGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#treasureGrad)"/><rect x="80" y="100" width="80" height="60" fill="#8b7355" stroke="#654321" stroke-width="2" rx="4"/><rect x="90" y="110" width="60" height="40" fill="#ffd700" stroke="#ffed4e" stroke-width="1" rx="2"/><circle cx="120" cy="130" r="8" fill="#ffed4e"/><circle cx="140" cy="125" r="6" fill="#ffed4e"/><rect x="240" y="100" width="80" height="60" fill="#8b7355" stroke="#654321" stroke-width="2" rx="4"/><polygon points="280,105 300,130 260,130" fill="#ff6b7a"/><text x="200" y="200" font-size="16" font-weight="bold" text-anchor="middle" fill="#ffd700">Find the Treasures</text><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">TREASURE HUNT</text></svg>`,

    dragontower: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="dragonGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#dragonGrad)"/><rect x="160" y="60" width="80" height="150" fill="#8b008b" stroke="#ff00ff" stroke-width="2" rx="4"/><rect x="175" y="75" width="50" height="25" fill="#444" stroke="#ff00ff" stroke-width="1" rx="2"/><rect x="175" y="110" width="50" height="25" fill="#444" stroke="#ff00ff" stroke-width="1" rx="2"/><rect x="175" y="145" width="50" height="25" fill="#ff00ff" stroke="#ffff00" stroke-width="2" rx="2"/><polygon points="190,40 210,40 200,20" fill="#ff6b7a"/><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">DRAGON TOWER</text></svg>`,

    rocketescape: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#rocketGrad)"/><polygon points="200,60 220,120 180,120" fill="#ff6b7a" stroke="#ff0000" stroke-width="2"/><rect x="185" y="120" width="30" height="60" fill="#333" stroke="#666" stroke-width="1" rx="2"/><polygon points="180,180 170,210 180,190" fill="#ffed4e"/><polygon points="220,180 230,210 220,190" fill="#ffed4e"/><line x1="200" y1="80" x2="200" y2="40" stroke="#ffd700" stroke-width="2" stroke-dasharray="3,3"/><text x="200" y="270" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">ROCKET ESCAPE</text></svg>`,

    luckycards: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="cardsGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#cardsGrad)"/><rect x="70" y="90" width="60" height="90" fill="white" stroke="#333" stroke-width="2" rx="3"/><text x="100" y="145" font-size="36" font-weight="bold" text-anchor="middle" fill="#000">♠</text><rect x="160" y="80" width="60" height="90" fill="#ff0000" stroke="#333" stroke-width="2" rx="3"/><text x="190" y="135" font-size="36" font-weight="bold" text-anchor="middle" fill="white">♥</text><rect x="250" y="90" width="60" height="90" fill="white" stroke="#333" stroke-width="2" rx="3"/><text x="280" y="145" font-size="36" font-weight="bold" text-anchor="middle" fill="#000">♣</text><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">LUCKY CARDS</text></svg>`,

    treasurechests: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="chestGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#chestGrad)"/><rect x="80" y="110" width="100" height="80" fill="#8b7355" stroke="#654321" stroke-width="2" rx="4"/><path d="M 80 110 Q 130 80 180 110" fill="#8b7355" stroke="#654321" stroke-width="2"/><circle cx="100" cy="150" r="6" fill="#ffd700"/><circle cx="160" cy="150" r="6" fill="#ffd700"/><rect x="220" y="110" width="100" height="80" fill="#00ff88" stroke="#00ff88" stroke-width="2" rx="4"/><path d="M 220 110 Q 270 80 320 110" fill="#00ff88" stroke="#00ff88" stroke-width="2"/><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">TREASURE CHESTS</text></svg>`,

    luckydoor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="doorGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#doorGrad)"/><rect x="60" y="80" width="80" height="140" fill="#8b4513" stroke="#654321" stroke-width="2" rx="4"/><circle cx="135" cy="150" r="6" fill="#ffd700"/><rect x="160" y="80" width="80" height="140" fill="#0066ff" stroke="#0099ff" stroke-width="2" rx="4"/><circle cx="235" cy="150" r="6" fill="#ffd700"/><rect x="260" y="80" width="80" height="140" fill="#ff6b7a" stroke="#ff0000" stroke-width="2" rx="4"/><circle cx="335" cy="150" r="6" fill="#ffd700"/><text x="200" y="260" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">LUCKY DOOR</text></svg>`,

    bombsquad: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="bombGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#bombGrad)"/><g id="boxes"><rect x="70" y="90" width="35" height="35" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><rect x="115" y="90" width="35" height="35" fill="#00ff88" stroke="#00ff88" stroke-width="1" rx="2"/><rect x="160" y="90" width="35" height="35" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><rect x="205" y="90" width="35" height="35" fill="#00ff88" stroke="#00ff88" stroke-width="1" rx="2"/><rect x="250" y="90" width="35" height="35" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><rect x="70" y="140" width="35" height="35" fill="#00ff88" stroke="#00ff88" stroke-width="1" rx="2"/><rect x="115" y="140" width="35" height="35" fill="#444" stroke="#ffd700" stroke-width="1" rx="2"/><rect x="160" y="140" width="35" height="35" fill="#ff6b7a" stroke="#ff0000" stroke-width="2" rx="2"/><text x="177.5" y="162" font-size="20" font-weight="bold" text-anchor="middle" fill="white">💣</text></g><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">BOMB SQUAD</text></svg>`,

    luckywheel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="wheelGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient><radialGradient id="wheelRadial" cx="50%" cy="50%"><stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" /><stop offset="100%" style="stop-color:#ff6b7a;stop-opacity:1" /></radialGradient></defs><rect width="400" height="300" fill="url(#wheelGrad)"/><circle cx="200" cy="130" r="80" fill="url(#wheelRadial)"/><circle cx="200" cy="130" r="75" fill="none" stroke="#ffd700" stroke-width="2"/><line x1="200" y1="55" x2="200" y2="75" stroke="#00ff88" stroke-width="3" stroke-linecap="round"/><circle cx="200" cy="130" r="15" fill="#1e293b" stroke="#ffd700" stroke-width="2"/><line x1="125" y1="130" x2="175" y2="130" stroke="#ffd700" stroke-width="2"/><line x1="225" y1="130" x2="275" y2="130" stroke="#ffd700" stroke-width="2"/><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">LUCKY WHEEL</text></svg>`,

    numberduel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="numberGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" fill="url(#numberGrad)"/><rect x="70" y="100" width="90" height="90" fill="#00ff88" stroke="#00ff88" stroke-width="2" rx="4"/><text x="115" y="160" font-size="64" font-weight="bold" text-anchor="middle" fill="#000">7</text><text x="200" y="160" font-size="36" font-weight="bold" text-anchor="middle" fill="#ffd700">VS</text><rect x="240" y="100" width="90" height="90" fill="#444" stroke="#888" stroke-width="2" rx="4"/><text x="285" y="160" font-size="64" font-weight="bold" text-anchor="middle" fill="#ffd700">?</text><text x="200" y="240" font-size="20" font-weight="bold" text-anchor="middle" fill="#00ff88">NUMBER DUEL</text></svg>`,
  };

  const svg = svgs[gameId] || svgs.hilo;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const GAME_COVERS: Record<string, string> = {
  // Casino Games - using SVG generators
  hilo: '',
  coinflip: '',
  limbo: '',
  colorprediction: '',
  diceduel: '',
  keno: '',
  treasurehunt: '',
  dragontower: '',
  rocketescape: '',
  luckycards: '',
  treasurechests: '',
  luckydoor: '',
  bombsquad: '',
  luckywheel: '',
  numberduel: '',
};

// Initialize all covers
Object.keys(GAME_COVERS).forEach((gameId) => {
  GAME_COVERS[gameId] = createSVGCover(gameId);
});

export const GAME_SOUNDS = {
  // Universal game sounds (CC0 from Freesound)
  win: 'https://cdn.freesound.org/previews/540/540209_8460765-lq.mp3', // Cash register
  lose: 'https://cdn.freesound.org/previews/415/415765_5121236-lq.mp3', // Buzzer
  click: 'https://cdn.freesound.org/previews/456/456964_2297464-lq.mp3', // Button click
  spin: 'https://cdn.freesound.org/previews/532/532655_3555030-lq.mp3', // Spinning
  flip: 'https://cdn.freesound.org/previews/348/348889_6241991-lq.mp3', // Card flip
  coin: 'https://cdn.freesound.org/previews/174/174379_3123139-lq.mp3', // Coin drop
  explosion: 'https://cdn.freesound.org/previews/345/345095_5949302-lq.mp3', // Explosion
  levelup: 'https://cdn.freesound.org/previews/268/268344_3613027-lq.mp3', // Level up
};

export const GAME_ICON_EMOJIS = {
  hilo: '🎴',
  coinflip: '🪙',
  limbo: '📈',
  colorprediction: '🎨',
  diceduel: '🎲',
  keno: '🎰',
  treasurehunt: '🎁',
  dragontower: '🐉',
  rocketescape: '🚀',
  luckycards: '🃏',
  treasurechests: '💎',
  luckydoor: '🚪',
  bombsquad: '💣',
  luckywheel: '🎡',
  numberduel: '🎯',
};

export function getGameCover(gameId: string): string {
  return GAME_COVERS[gameId as keyof typeof GAME_COVERS] || GAME_COVERS.hilo;
}

export function playSound(soundType: keyof typeof GAME_SOUNDS) {
  const audio = new Audio(GAME_SOUNDS[soundType]);
  audio.volume = 0.5;
  audio.play().catch(() => {}); // Silently fail if autoplay is blocked
}
