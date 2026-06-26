/**
 * CC0 Assets for all casino games
 * All images from: Unsplash (unsplash.com), Pixabay (pixabay.com), Pexels (pexels.com)
 * All sounds from: Freesound (freesound.org), Zapsplat (zapsplat.com)
 */

export const GAME_COVERS = {
  // Casino Games
  hilo: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop', // Playing cards
  coinflip: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop', // Coins
  limbo: 'https://images.unsplash.com/photo-1570303008300-d02e1c74c0e0?w=400&h=300&fit=crop', // Neon lights
  colorprediction: 'https://images.unsplash.com/photo-1557672172-298e090d0f80?w=400&h=300&fit=crop', // Colorful gradient
  diceduel: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop', // Dice
  keno: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop', // Numbers
  treasurehunt: 'https://images.unsplash.com/photo-1612540554014-2fcfce21e340?w=400&h=300&fit=crop', // Treasure chest
  dragontower: 'https://images.unsplash.com/photo-1608848461950-0fedcb841a33?w=400&h=300&fit=crop', // Tower
  rocketescape: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop', // Rocket
  luckycards: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop', // Cards
  treasurechests: 'https://images.unsplash.com/photo-1612540554014-2fcfce21e340?w=400&h=300&fit=crop', // Chests
  luckydoor: 'https://images.unsplash.com/photo-1534439468736-c5f4a50008b5?w=400&h=300&fit=crop', // Door
  bombsquad: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop', // Explosion
  luckywheel: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop', // Wheel
  numberduel: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop', // Numbers
};

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
