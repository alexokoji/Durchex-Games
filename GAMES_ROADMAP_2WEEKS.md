# 2-Week MVP Game Development Roadmap

## Week 1: Foundation + Hi-Lo + Coin Flip

### Phase 1A: Shared Infrastructure (Days 1-2)
- ✅ **GameEngine** — unified betting/RNG/sound wrapper (done)
- ✅ **SoundManager** — Web Audio API + Freesound integration (done)
- ✅ **GameAnimator** — easing functions + tween utilities (done)
- Create game database model (store game results + leaderboards)
- API endpoints: `/api/games/:gameId/play`, `/api/games/leaderboard`

### Phase 1B: Hi-Lo Game (Days 2-4)
- ✅ Core game logic (done)
- ✅ React UI component (done)
- Add routes + HomePage integration (done)
- Get CC0 card images from Freesound/Unsplash
- Add card flip animations (CSS transitions)
- Integrate sound: coin flip SFX, win/lose audio
- Add auto-play + statistics
- Test multiplier logic (1→1.8x, 2→3.2x, etc.)

**Assets to source (CC0):**
- Poker card deck (free on Freesound/Pixabay)
- Flip/shuffle sound (Freesound)
- Win/lose chimes (Freesound)
- Hi-Lo cover image (Midjourney/DALL-E or Unsplash)

### Phase 1C: Coin Flip Game (Days 4-6)
- ✅ Core game logic (done)
- ✅ React UI + CSS 3D animation (done)
- Add routes + HomePage integration (done)
- Get CC0 coin images
- Improve 3D CSS animation (smooth spin, landing effect)
- Sound effects: coin flip, land, win/lose
- Add best-of-3 mode
- Leaderboard integration

**Assets to source (CC0):**
- Coin models or textures (Freesound/Pixabay)
- Coin flip/landing sounds (Freesound)
- Coin Flip cover image (Midjourney)

### Phase 1D: Polish (Day 6-7)
- Database migrations for game results
- Admin panel: game stats + top earners
- Mobile responsiveness testing
- Performance: sound lazy-load, animation FPS

---

## Week 2: 2–3 More Games + Leaderboards

### Phase 2A: Limbo Game (Days 8-9)
**Simple:** Player chooses multiplier, random generator produces result. Win if generated ≥ chosen.
- Core logic: 5 minutes
- UI: 30 minutes
- Animation: multiplier counter ticking up, cash-out button
- Sound: multiplier tick, explosion on loss
- Assets: simple gradient background, SFX

### Phase 2B: Keno Game (Days 9-11)
**Moderate:** Player picks numbers (1–80), draw 20, match N numbers for payout.
- Core logic: lottery draw, payout calculation
- UI: number grid selection + animated number reveals
- Animation: ball drop effect, number highlighting
- Sound: ball draws, match chime
- Assets: ball images/icons, drawing SFX

### Phase 2C: Dragon Tower (Days 11-13)
**Visual:** Climb tower, pick safe tiles, avoid dragons, increasing multiplier.
- Core logic: tile selection, dragon placement (RNG)
- UI: tower grid, level progression bar
- Animation: tile flip, dragon appear effect (particle system)
- Sound: step up, dragon roar, multiplier increase
- Assets: dragon sprite, fire particles (Freesound sprites/itch.io)

### Phase 2D: Leaderboards + Polish (Days 13-14)
- **Backend:** `/api/games/leaderboard?gameId=&period=daily|weekly|all`
- **Frontend:** Leaderboard card on each game (top 10)
- **PvP Ready:** Structure for future live multiplayer (websocket hooks)
- Fix bugs, optimize assets, final QA

---

## Asset Sourcing Strategy (Free/CC0)

| Asset Type | Sources | Budget |
|---|---|---|
| **Sound** | Freesound.org (CC0/CC-BY), Zapsplat | Free |
| **Images** | Pixabay, Unsplash, Pexels | Free |
| **Covers** | Midjourney API ($10/mo) or DALL-E 3 | ~$10 |
| **Game Icons** | Itch.io, OpenGameArt | Free |
| **Fonts** | Google Fonts | Free |
| **Particle/VFX** | Itch.io (free game asset packs) | Free |

**Total Asset Cost:** $0–15 for the MVP.

---

## Tech Stack (Revised for MVP Speed)

Instead of Babylon.js (heavyweight), use:
- **Animations:** CSS 3D transforms + requestAnimationFrame
- **Particles:** Canvas 2D context (simple burst effects)
- **Audio:** Web Audio API (already in SoundManager)
- **No extra dependencies** → faster builds

Replace Babylon.js file with **SimpleSceneManager** using Canvas 2D only.

---

## Critical Path (Must-Do for MVP)

1. **Game DB Schema** (Bet → GameResult mapping)
2. **Hi-Lo + Coin Flip** (proof of concept)
3. **Leaderboard API + UI**
4. **Asset integration** (sounds + cover images)
5. **Mobile polish** (responsive, touch-friendly)

**Stretch Goals (if time):**
- Limbo (simplest to add)
- Keno (moderate complexity)
- Dragon Tower (visual showcase)

---

## File Structure

```
src/
  games/
    shared/
      GameEngine.ts             ✅ core betting + RNG
      SoundManager.ts           ✅ Web Audio
      GameAnimator.ts           ✅ tweens
      SimpleSceneManager.ts     ← replace Babylon (Canvas 2D)
    hiLo/
      HiLoGame.ts              ✅ logic
      (UI in pages/HiLoGame.tsx)
    coinFlip/
      CoinFlipGame.ts          ✅ logic
      (UI in pages/CoinFlipGame.tsx)
    limbo/
      LimboGame.ts             ← build this week 2
    keno/
      KenoGame.ts
    dragonTower/
      DragonTowerGame.ts
  pages/
    HiLoGame.tsx               ✅ UI
    CoinFlipGame.tsx           ✅ UI
    LimboGame.tsx              ← build week 2
    KenoGame.tsx
    DragonTowerGame.tsx
  components/
    Leaderboard.tsx            ← new component

server/
  src/
    models/
      GameResult.ts            ← new schema
    routes/
      games.ts                 ← game endpoints
```

---

## Next Steps to Unblock

1. **Remove Babylon.js dependency** → Replace with Canvas 2D utilities
2. **Fix WalletContext integration** → Use correct betting API
3. **Install only needed deps:** `uuid`, `@babylonjs/core` → optional, skip for MVP
4. **Source free assets** → Start with Freesound/Pixabay placeholders
5. **Build & deploy** → Week 1 Day 7

---

## Success Criteria (Week 2 MVP)

- [ ] Hi-Lo playable, settles correctly
- [ ] Coin Flip playable, settles correctly
- [ ] Both games appear on HomePage
- [ ] Leaderboard shows top 10 players per game
- [ ] Sound effects working (win/lose SFX)
- [ ] Mobile responsive (tested on mobile)
- [ ] 2 additional games (Limbo or Keno)
- [ ] All games use shared engine (no code duplication)

---

## Cost Summary

**Development:** Your time (2 weeks)
**Assets:** $0–15 (Midjourney for covers if desired)
**Infrastructure:** Zero (uses existing server)
**Total:** ~$15 max

---

## Timeline (Optimistic)

| Week | Deliverable | Status |
|---|---|---|
| 1 | Hi-Lo + Coin Flip MVP | **In Progress** |
| 2 | Limbo + Keno + Leaderboards | **Planned** |

Ship on **Day 14** with 2–4 games live.
