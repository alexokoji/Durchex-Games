import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Button,
  Tabs, Tab, IconButton, TextField, Chip, MenuItem, Select, Alert,
  CircularProgress, FormControl, InputLabel,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import type { FlwPaymentOption, WithdrawMethod } from '../../api/payments';
import { CRYPTO, FIAT, formatMoney, type CryptoCurrency } from '../../utils/currency';

const DEPOSIT_METHODS: { id: FlwPaymentOption; label: string; channels: string }[] = [
  { id: 'card',                 label: 'Card',              channels: 'Visa, Mastercard, Amex' },
  { id: 'banktransfer',         label: 'Bank Transfer',     channels: 'Local bank' },
  { id: 'crypto',               label: 'Crypto',            channels: 'BTC, USDT, USDC via Flutterwave' },
  { id: 'mobilemoneyghana',     label: 'MoMo · Ghana',      channels: 'MTN, Vodafone, AirtelTigo' },
  { id: 'mobilemoneyrwanda',    label: 'MoMo · Rwanda',     channels: 'MTN' },
  { id: 'mobilemoneyuganda',    label: 'MoMo · Uganda',     channels: 'MTN, Airtel' },
  { id: 'mobilemoneyzambia',    label: 'MoMo · Zambia',     channels: 'MTN, Airtel, Zamtel' },
  { id: 'mobilemoneytanzania',  label: 'MoMo · Tanzania',   channels: 'Tigo, Vodacom' },
  { id: 'mpesa',                label: 'M-Pesa',            channels: 'Kenya' },
  { id: 'ussd',                 label: 'USSD',              channels: 'Nigeria' },
];

const WITHDRAW_METHODS: { id: WithdrawMethod; label: string; sub: string }[] = [
  { id: 'bank',        label: 'Bank Transfer',  sub: 'Pay out to a local bank account' },
  { id: 'mobilemoney', label: 'Mobile Money',   sub: 'MTN, Vodafone, M-Pesa…' },
  { id: 'crypto',      label: 'Crypto',         sub: 'BTC / USDT / USDC — manual review' },
];

/** Nigerian banks — label shown to the user, code sent to the API. */
const NG_BANKS: { name: string; code: string }[] = [
  { name: 'Access Bank',          code: '044' },
  { name: 'Access Bank (Diamond)', code: '063' },
  { name: 'Citibank Nigeria',     code: '023' },
  { name: 'Ecobank Nigeria',      code: '050' },
  { name: 'Fidelity Bank',        code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank',        code: '030' },
  { name: 'Keystone Bank',        code: '082' },
  { name: 'Kuda Bank',            code: '090267' },
  { name: 'Moniepoint Microfinance Bank', code: '50515' },
  { name: 'OPay (One Finance)',   code: '100004' },
  { name: 'PalmPay',              code: '100033' },
  { name: 'Polaris Bank',         code: '076' },
  { name: 'Providus Bank',        code: '101' },
  { name: 'Stanbic IBTC Bank',    code: '221' },
  { name: 'Standard Chartered',   code: '068' },
  { name: 'Sterling Bank',        code: '232' },
  { name: 'Titan Trust Bank',     code: '102' },
  { name: 'UBA (United Bank for Africa)', code: '033' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Unity Bank',           code: '215' },
  { name: 'VFD Microfinance Bank', code: '566' },
  { name: 'Wema Bank',            code: '035' },
  { name: 'Zenith Bank',          code: '057' },
];

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WalletModal({ open, onClose }: WalletModalProps) {
  const wallet = useWallet();
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 3, maxWidth: 560 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Wallet</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {isAuthenticated
              ? `Balance: ${formatMoney(wallet.balance, wallet.currency)}`
              : 'Sign in to deposit or withdraw.'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: `1px solid ${darkBorder}` }}
      >
        <Tab label={`Deposit · ${wallet.currency}`} value="deposit"  sx={{ fontWeight: 800 }} />
        <Tab label="Withdraw"                        value="withdraw" sx={{ fontWeight: 800 }} />
      </Tabs>

      <DialogContent sx={{ pt: 2.5 }}>
        {!isAuthenticated ? (
          <Alert severity="info" sx={{ fontSize: '0.85rem' }}>Please sign in or create an account first.</Alert>
        ) : tab === 'deposit'
            ? <DepositFiatPanel   onClose={onClose} />
            : <WithdrawPanel      onClose={onClose} />}
        <Box sx={{ display: 'none' }}>{user?.email}</Box>
      </DialogContent>
    </Dialog>
  );
}

// ─── Fiat deposit ────────────────────────────────────────────────────────

function DepositFiatPanel({ onClose }: { onClose: () => void }) {
  const wallet = useWallet();
  const fiatMeta = FIAT[wallet.currency];
  const [amount, setAmount] = useState<string>(String(fiatMeta.defaultStake * 10));
  const [method, setMethod] = useState<FlwPaymentOption>('card');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const supported = fiatMeta.flutterwaveSupported;

  async function submit() {
    setBusy(true);
    setError(null);
    setPaymentLink(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      setBusy(false);
      return;
    }
    const r = await wallet.initDeposit({
      amount: amt,
      paymentOptions: [method],
      phone: phone || undefined,
    });
    if (!r) {
      setError(wallet.lastError ?? 'Deposit initialization failed.');
      setBusy(false);
      return;
    }
    setPaymentLink(r.paymentLink);
    setBusy(false);
  }

  if (!supported) {
    return (
      <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
        Flutterwave doesn't directly support {fiatMeta.name} yet. Switch to the <strong>Crypto Deposit</strong> tab
        and top up via BTC, USDT or USDC instead.
      </Alert>
    );
  }

  if (paymentLink) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 1 }}>
        <Alert severity="success" sx={{ fontSize: '0.82rem' }}>
          We've prepared your secure checkout. Click below to complete payment.
        </Alert>
        <Button
          fullWidth variant="contained" endIcon={<OpenInNewIcon />}
          onClick={() => { window.open(paymentLink, '_blank', 'noopener,noreferrer'); }}
          sx={{ py: 1.2, fontWeight: 900, background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000' }}
        >
          Open secure checkout
        </Button>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          Balance updates automatically the moment the payment confirms.
        </Typography>
        <Button onClick={onClose} sx={{ fontSize: '0.78rem' }}>Close</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          label={`Amount (${wallet.currency})`}
          type="number"
          fullWidth size="small"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <Chip
          label={`= ${formatMoney(parseFloat(amount || '0') * fiatMeta.usdPerUnit, 'USD', { compact: true })} USD`}
          size="small"
          sx={{ background: alpha(neonGold, 0.1), color: neonGold, fontWeight: 700, height: 32 }}
        />
      </Box>

      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', mt: 0.5 }}>
        PAYMENT METHOD
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
        {DEPOSIT_METHODS.map(m => {
          const active = method === m.id;
          return (
            <Box
              key={m.id}
              onClick={() => setMethod(m.id)}
              sx={{
                p: 1, borderRadius: 1.5, cursor: 'pointer',
                border: `1px solid ${active ? alpha(neonGreen, 0.55) : darkBorder}`,
                background: active ? alpha(neonGreen, 0.08) : alpha('#fff', 0.025),
                '&:hover': { borderColor: alpha(neonGreen, 0.45) },
              }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: active ? neonGreen : 'text.primary' }}>
                {m.label}
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>{m.channels}</Typography>
            </Box>
          );
        })}
      </Box>

      {(method.startsWith('mobilemoney') || method === 'mpesa') && (
        <TextField
          label="Phone number"
          size="small" fullWidth
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g., +233 50 123 4567"
        />
      )}

      {method === 'crypto' && (
        <Alert severity="info" icon={false} sx={{ fontSize: '0.78rem', py: 0.5 }}>
          <strong>Pay in BTC, USDT, or USDC.</strong> Flutterwave's secure checkout
          converts the crypto and credits {wallet.currency} to your balance the moment
          it confirms on-chain — no wallet addresses to copy.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{error}</Alert>}

      <Button
        onClick={submit}
        disabled={busy}
        fullWidth variant="contained"
        sx={{ py: 1.15, fontWeight: 900, background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000' }}
      >
        {busy
          ? <CircularProgress size={18} color="inherit" />
          : `Deposit ${amount || 0} ${wallet.currency}`}
      </Button>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', textAlign: 'center' }}>
        Powered by Flutterwave · 256-bit SSL · funds credit on confirmation
      </Typography>
    </Box>
  );
}

// ─── Withdraw ────────────────────────────────────────────────────────────

function WithdrawPanel({ onClose }: { onClose: () => void }) {
  const wallet = useWallet();
  const [method, setMethod] = useState<WithdrawMethod>('bank');
  // Fiat fields
  const [amountFiat, setAmountFiat] = useState<string>(String(FIAT[wallet.currency].defaultStake * 5));
  const [accountBank, setAccountBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  // Crypto fields
  const [coin, setCoin] = useState<CryptoCurrency>('BTC');
  const [amountCrypto, setAmountCrypto] = useState<string>('0.001');
  const [cryptoNetwork, setCryptoNetwork] = useState('BTC');
  const [cryptoAddress, setCryptoAddress] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isCrypto = method === 'crypto';
  const fiatBal  = wallet.balance;
  const coinBal  = (wallet.cryptoBalances[coin] ?? 0);

  async function submit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    if (isCrypto) {
      const amt = parseFloat(amountCrypto);
      if (!Number.isFinite(amt) || amt <= 0) { setError('Enter a valid amount.'); setBusy(false); return; }
      if (amt > coinBal) { setError(`Not enough ${coin}.`); setBusy(false); return; }
      if (!cryptoAddress.trim()) { setError('Crypto address required.'); setBusy(false); return; }
      const ok = await wallet.requestWithdrawal({
        amount: amt, method: 'crypto',
        cryptoCurrency: coin, cryptoNetwork, cryptoAddress: cryptoAddress.trim(),
      });
      setBusy(false);
      if (ok) setSuccess('Crypto withdrawal queued — approval within 4 hours.');
      else setError(wallet.lastError ?? 'Withdrawal failed.');
      return;
    }

    const amt = parseFloat(amountFiat);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Enter a valid amount.'); setBusy(false); return; }
    if (amt > fiatBal) { setError('Insufficient balance.'); setBusy(false); return; }
    if (!accountBank.trim() || !accountNumber.trim() || !beneficiaryName.trim()) {
      setError('Bank name, account number, and beneficiary name are required.');
      setBusy(false); return;
    }
    const ok = await wallet.requestWithdrawal({
      amount: amt, method,
      accountBank: accountBank.trim(),
      accountNumber: accountNumber.trim(),
      beneficiaryName: beneficiaryName.trim(),
    });
    setBusy(false);
    if (ok) setSuccess(`Withdrawal queued — typically arrives in 30 minutes (${wallet.currency}).`);
    else setError(wallet.lastError ?? 'Withdrawal failed.');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {WITHDRAW_METHODS.map(m => {
          const active = method === m.id;
          return (
            <Box
              key={m.id}
              onClick={() => setMethod(m.id)}
              sx={{
                p: 1, borderRadius: 1.5, cursor: 'pointer',
                border: `1px solid ${active ? alpha(neonBlue, 0.55) : darkBorder}`,
                background: active ? alpha(neonBlue, 0.08) : alpha('#fff', 0.025),
              }}
            >
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: active ? neonBlue : 'text.primary' }}>
                {m.label}
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>{m.sub}</Typography>
            </Box>
          );
        })}
      </Box>

      {isCrypto ? (
        <>
          <FormControl size="small" fullWidth>
            <InputLabel>Crypto</InputLabel>
            <Select label="Crypto" value={coin} onChange={e => setCoin(e.target.value as CryptoCurrency)}>
              <MenuItem value="BTC">Bitcoin (BTC)</MenuItem>
              <MenuItem value="USDT">Tether (USDT)</MenuItem>
              <MenuItem value="USDC">USD Coin (USDC)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={`Amount (${coin})`}
            type="number" size="small" fullWidth
            value={amountCrypto}
            onChange={e => setAmountCrypto(e.target.value)}
            helperText={`Available: ${coinBal.toFixed(CRYPTO[coin].decimals)} ${coin}`}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Network</InputLabel>
            <Select label="Network" value={cryptoNetwork} onChange={e => setCryptoNetwork(e.target.value)}>
              <MenuItem value="BTC">Bitcoin (BTC)</MenuItem>
              <MenuItem value="USDT-ERC20">USDT — ERC-20 (Ethereum)</MenuItem>
              <MenuItem value="USDT-TRC20">USDT — TRC-20 (Tron)</MenuItem>
              <MenuItem value="USDC-ERC20">USDC — ERC-20 (Ethereum)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Destination address" size="small" fullWidth
            value={cryptoAddress} onChange={e => setCryptoAddress(e.target.value)}
            placeholder="bc1q…  |  0x…  |  T…"
          />
        </>
      ) : (
        <>
          <TextField
            label={`Amount (${wallet.currency})`}
            type="number" size="small" fullWidth
            value={amountFiat}
            onChange={e => setAmountFiat(e.target.value)}
            helperText={`Available: ${formatMoney(fiatBal, wallet.currency)}`}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>Bank name</InputLabel>
            <Select
              label="Bank name"
              value={accountBank}
              onChange={e => setAccountBank(e.target.value)}
              displayEmpty
            >
              {NG_BANKS.map(b => (
                <MenuItem key={b.code} value={b.code}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Account number" size="small" fullWidth value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          <TextField label="Beneficiary name" size="small" fullWidth value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)} />
        </>
      )}

      {error   && <Alert severity="error"   sx={{ fontSize: '0.78rem' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ fontSize: '0.78rem' }}>{success}</Alert>}

      <Button
        onClick={submit}
        disabled={busy}
        fullWidth variant="contained"
        sx={{ py: 1.15, fontWeight: 900, background: `linear-gradient(135deg, ${neonBlue}, #00a8cc)`, color: '#000' }}
      >
        {busy ? <CircularProgress size={18} color="inherit" /> : 'Withdraw'}
      </Button>

      {success && <Button onClick={onClose} sx={{ fontSize: '0.78rem' }}>Close</Button>}
    </Box>
  );
}
