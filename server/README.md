# DUCHEXiGAMES — Backend

Express + Mongoose API for the DUCHEXiGAMES casino + virtual sports frontend.
Handles authentication (email/password + Google + Apple), wallet (deposits, withdrawals, bets),
Flutterwave checkout & payouts (cards / bank transfer / mobile money / USSD / crypto),
and a Socket.IO live chat.

## Quick start

```bash
cd server
cp .env.example .env       # fill in values — see below
npm install
npm run dev                # http://localhost:4000/api/health
```

Production build:

```bash
npm run build
npm start
```

## Required environment

The bare minimum to boot in dev:

| Var | Notes |
| --- | --- |
| `MONGO_URI` | Local `mongodb://localhost:27017/duchexigames` or an Atlas URI. |
| `JWT_SECRET` | Any random 64-char string for dev; rotate before prod. |
| `CLIENT_URL` | `http://localhost:5173` for Vite dev. Used for OAuth redirect and email links. |
| `CORS_ORIGINS` | Comma-separated origins the API will accept. |

Everything else is optional in dev — the server boots and feature-gates itself based on what's present (e.g., `/api/auth/google` returns 503 until Google creds are set, `sendMail` logs to console until SMTP is configured).

### Flutterwave

| Var | Where it comes from |
| --- | --- |
| `FLUTTERWAVE_PUBLIC_KEY` | Dashboard → Settings → API Keys |
| `FLUTTERWAVE_SECRET_KEY` | Same — keep this **secret-only**, never ship to frontend. |
| `FLUTTERWAVE_WEBHOOK_HASH` | Dashboard → Settings → Webhooks → "Secret Hash" |
| `FLUTTERWAVE_REDIRECT_URL` | Where the user lands after paying (frontend route). |

On the Flutterwave dashboard, point the webhook URL to:
`<PUBLIC_URL>/api/payments/flutterwave/webhook`

The handler verifies the `verif-hash` header against `FLUTTERWAVE_WEBHOOK_HASH`,
re-verifies the transaction via `GET /transactions/:id/verify`, and only then credits the user.

Payment methods exposed: `card`, `banktransfer`, `mobilemoneyghana`, `mobilemoneyrwanda`,
`mobilemoneyuganda`, `mobilemoneyzambia`, `mpesa`, `ussd`, `crypto` (BTC / USDT / USDC via Flutterwave's crypto product).

### Google OAuth

1. Google Cloud Console → OAuth consent screen.
2. Create OAuth client id (type "Web application").
3. Authorized redirect URI: `<PUBLIC_URL>/api/auth/google/callback`.
4. Put the id + secret in `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

### Apple OAuth

1. developer.apple.com → Certificates, Identifiers & Profiles.
2. Create a Services ID (this is your `APPLE_CLIENT_ID`).
3. Create a Sign-in-with-Apple key — note the `APPLE_KEY_ID` and download the `.p8`.
4. Note your `APPLE_TEAM_ID` (top-right of the developer portal).
5. Put the `.p8` somewhere outside the repo and set `APPLE_PRIVATE_KEY_PATH` to its absolute path.
6. Configure the return URL in the Services ID config: `<PUBLIC_URL>/api/auth/apple/callback`.

### SMTP (email verification + password reset)

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Without them the server logs the email contents to stdout instead — useful for local dev.

## API surface

Health:
- `GET  /api/health`

Auth:
- `POST /api/auth/register`              `{ email, username, password } → { user, accessToken, refreshToken }`
- `POST /api/auth/login`                 `{ email, password }`
- `POST /api/auth/refresh`               `{ refreshToken }`
- `GET  /api/auth/me`                    *(bearer)*  → `{ user }`
- `POST /api/auth/logout`                *(bearer)*
- `POST /api/auth/verify-email`          `{ email, token }`
- `POST /api/auth/resend-verification`   *(bearer)*
- `POST /api/auth/forgot-password`       `{ email }`        (always 200)
- `POST /api/auth/reset-password`        `{ email, token, newPassword }`
- `GET  /api/auth/google`                 → 302 Google
- `GET  /api/auth/google/callback`        → 302 `${CLIENT_URL}/auth/callback#access=…&refresh=…`
- `GET  /api/auth/apple`                  → 302 Apple
- `POST /api/auth/apple/callback`         → 302 same fragment as Google

Wallet:
- `GET  /api/wallet`                     *(bearer)*  → `{ balanceBtc, totalWageredBtc, … }`
- `GET  /api/wallet/transactions`        *(bearer)*

Bets:
- `POST /api/bets`                       *(bearer)*  `{ gameId, gameName, stake, details?, selections? }`
- `POST /api/bets/:id/settle`            *(bearer)*  `{ won, payout, multiplier?, details? }`
- `GET  /api/bets/history`               *(bearer)*
- `GET  /api/bets/pending`               *(bearer)*

Payments:
- `POST /api/payments/deposit/init`      *(bearer)*  `{ amount, currency, paymentOptions?, phone? }`
                                                     → `{ paymentLink, reference }`
- `POST /api/payments/withdraw`          *(bearer)*  `{ amountBtc, method, accountBank?, accountNumber?, beneficiaryName?, currency?, cryptoNetwork?, cryptoAddress? }`
- `POST /api/payments/flutterwave/webhook`           (Flutterwave only — protected by `verif-hash`)

Chat:
- `GET  /api/chat/history?channel=global&limit=50`
- Socket.IO at `/socket.io` — events:
  - `chat:join` (channel)
  - `chat:leave` (channel)
  - `chat:send` (`{ channel, text }`) — server emits `chat:message` to `chat:<channel>` room
  - `chat:error` (`{ code }`)

## Atomicity & money safety

- `placeBetAtomic` uses a conditional `findOneAndUpdate` so the balance check + debit happens in one operation — no race window.
- `settleBetAtomic` reads the Bet, rejects double-settlement, then credits with a separate `$inc` on the user.
- All withdrawals debit on creation and the transaction is marked `pending`; the actual Flutterwave transfer is initiated next. If the transfer fails the debit is refunded.
- Deposit credits only happen when the webhook arrives AND a re-verify against Flutterwave's `/transactions/:id/verify` matches the amount and `status === 'successful'`.

## TODO before going live

- [ ] **Provably-fair settlement.** Right now `/api/bets/:id/settle` trusts the client's `won/payout`. Replace with a server-derived outcome (seed reveal pattern). Marked clearly in `src/routes/bets.ts`.
- [ ] **Refresh-token revocation list** (Redis) — currently logout is client-side only.
- [ ] **KYC / withdrawal limits per tier**.
- [ ] **Audit log** for adjustments / admin actions.
- [ ] **Tests** — Jest + supertest for HTTP, integration tests for the wallet.
- [ ] **Live FX provider** — `fiatToBtc` / `btcToFiat` currently use a static table; replace with CoinGecko or Flutterwave's `/rates`.
