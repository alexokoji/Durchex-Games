import { useRef, useState, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import {
  Dialog, DialogContent, Box, Typography, Button, IconButton,
  CircularProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { BetTicket } from '../core/types';
import type { FiatCurrency } from '../../utils/currency';
import { formatMoney } from '../../utils/currency';
import { neonGreen, neonGold, darkBorder, darkBg } from '../../theme';

interface WinSlipModalProps {
  ticket: BetTicket;
  currency: FiatCurrency;
  open: boolean;
  onClose: () => void;
}

/** Convert /assets/logo.png to a data-URL so html-to-image can embed it. */
function useLogoDataUrl() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 40;
      canvas.height = img.naturalHeight || 40;
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.drawImage(img, 0, 0); setDataUrl(canvas.toDataURL('image/png')); }
    };
    img.onerror = () => setDataUrl(null);
    img.src = '/assets/logo.png';
  }, []);
  return dataUrl;
}

export default function WinSlipModal({ ticket, currency, open, onClose }: WinSlipModalProps) {
  const slipRef  = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const logoUrl  = useLogoDataUrl();

  const resultMap = new Map(
    (ticket.selectionResults ?? []).map(r => [r.selectionId, r]),
  );

  const payout  = ticket.settledPayout ?? 0;
  const profit  = payout - ticket.totalStake;

  // For multi/system, multiply all legs. For a single split across legs, sum odds.
  const totalOdds = ticket.mode === 'multi'
    ? ticket.selections.reduce((p, s) => p * s.odds, 1)
    : ticket.selections.length === 1
      ? ticket.selections[0].odds
      : ticket.selections.reduce((p, s) => p * s.odds, 1);

  const modeName = ticket.mode === 'system'
    ? `System ${ticket.systemK}/${ticket.selections.length}`
    : ticket.mode === 'multi'
      ? `${ticket.selections.length}-Leg Accumulator`
      : 'Single Bet';

  const settledTime = ticket.settledAt
    ? new Date(ticket.settledAt).toLocaleString([], {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString([], {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  const capture = useCallback(async (): Promise<string | null> => {
    if (!slipRef.current) return null;
    // Give the DOM one frame to stabilise before snapshotting.
    await new Promise(r => setTimeout(r, 80));
    return toPng(slipRef.current, {
      // pixelRatio 3 on a 320 px-wide element → 960 px output: compact card
      // but text is rendered at 3× density so it looks crisp on any display.
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: darkBg,
      // Lock the capture to the element's natural (constrained) dimensions.
      height: slipRef.current.scrollHeight,
      width:  slipRef.current.scrollWidth,
    });
  }, []);

  async function handleDownload() {
    setBusy(true);
    try {
      const png = await capture();
      if (!png) return;
      const a = document.createElement('a');
      a.download = `win-slip-${ticket.id.slice(0, 8)}.png`;
      a.href = png;
      a.click();
    } finally { setBusy(false); }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const png = await capture();
      if (!png) return;
      const blob  = await (await fetch(png)).blob();
      const file  = new File([blob], 'win-slip.png', { type: 'image/png' });
      const title = `I won ${formatMoney(payout, currency)} on DURCHEXiGAMES! 🏆`;

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: 'Check out my win slip!' });
      } else {
        // Fallback — download the image.
        const a = document.createElement('a');
        a.download = `win-slip-${ticket.id.slice(0, 8)}.png`;
        a.href = png;
        a.click();
      }
    } finally { setBusy(false); }
  }

  /* ─── Slip colour tokens (used inside the captured box) ─── */
  const G  = neonGreen;               // #00ff88
  const Au = neonGold;                // #ffd700

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: '#0d1117',
          border: `1px solid ${alpha(Au, 0.35)}`,
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, borderBottom: `1px solid ${darkBorder}`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon sx={{ fontSize: 18, color: Au }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: Au }}>
            Win Slip
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 2 }}>

        {/* ── Capturable slip ─────────────────────────────────────────────── */}
        <Box
          ref={slipRef}
          style={{
            // Fixed 320 px width → output PNG is 960 px wide at 3× pixelRatio.
            // Centred in the dialog so it still looks good on screen.
            width: 320,
            margin: '0 auto',
            background: 'linear-gradient(160deg, #0a0c10 0%, #0d1520 100%)',
            borderRadius: 12,
            overflow: 'hidden',
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          {/* ── Header band ── */}
          <Box style={{
            background: `linear-gradient(90deg, rgba(255,215,0,0.12), rgba(0,255,136,0.06))`,
            borderBottom: `1px solid rgba(255,215,0,0.18)`,
            padding: '9px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {/* Logo */}
            {logoUrl ? (
              <img src={logoUrl} width={36} height={36} alt="logo"
                style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }} />
            ) : (
              <Box style={{
                width: 36, height: 36, borderRadius: 18,
                background: 'rgba(255,215,0,0.15)',
                flexShrink: 0,
              }} />
            )}
            {/* Brand */}
            <Box style={{ flex: 1 }}>
              <Typography style={{ fontWeight: 900, fontSize: 15, color: '#fff', lineHeight: 1.15, margin: 0 }}>
                DURCHEXiGAMES
              </Typography>
              <Typography style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', margin: 0 }}>
                VIRTUAL SPORTS BETTING
              </Typography>
            </Box>
            {/* WINNER badge */}
            <Box style={{
              padding: '3px 9px', borderRadius: 6,
              background: 'rgba(255,215,0,0.14)',
              border: '1px solid rgba(255,215,0,0.35)',
            }}>
              <Typography style={{ fontSize: 9, color: Au, fontWeight: 800, letterSpacing: '0.08em', margin: 0 }}>
                WINNER
              </Typography>
            </Box>
          </Box>

          {/* ── Trophy + payout ── */}
          <Box style={{
            padding: '14px 13px 10px',
            textAlign: 'center',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.07) 0%, transparent 65%)',
          }}>
            {/* Trophy icon rendered as text emoji for reliable capture */}
            <Typography style={{
              fontSize: 32, lineHeight: 1, margin: '0 0 3px',
            }}>
              🏆
            </Typography>
            <Typography style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.5)', marginBottom: 2, marginTop: 0,
            }}>
              YOU WON
            </Typography>
            <Typography style={{
              fontSize: 30, fontWeight: 900, color: G,
              filter: `drop-shadow(0 0 12px ${G})`,
              fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, margin: 0,
            }}>
              {formatMoney(payout, currency)}
            </Typography>
            {profit > 0 && (
              <Typography style={{
                fontSize: 10, color: 'rgba(0,255,136,0.65)', fontWeight: 700,
                marginTop: 2, marginBottom: 0,
              }}>
                +{formatMoney(profit, currency)} profit
              </Typography>
            )}
            <Typography style={{
              fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 6, marginBottom: 0,
            }}>
              {modeName} · {settledTime}
            </Typography>
          </Box>

          {/* ── Divider with total odds pill (multi/system) ── */}
          {ticket.mode !== 'single' && (
            <Box style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 13px 7px',
            }}>
              <Box style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <Box style={{
                padding: '2px 10px', borderRadius: 10,
                background: 'rgba(255,215,0,0.1)',
                border: '1px solid rgba(255,215,0,0.22)',
              }}>
                <Typography style={{
                  fontSize: 10, color: Au, fontWeight: 800, margin: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {totalOdds.toFixed(2)}× odds
                </Typography>
              </Box>
              <Box style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </Box>
          )}

          {/* ── Selections list ── */}
          <Box style={{ padding: '0 10px 10px' }}>
            {ticket.selections.map((s, i) => {
              const res   = resultMap.get(s.id);
              const win   = res?.result === 'win';
              const loss  = res?.result === 'loss';
              const score = res?.finalScore;
              const selColor = win ? G : loss ? '#ff6b7a' : Au;

              return (
                <Box key={s.id}>
                  {i > 0 && (
                    <Box style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                  )}
                  <Box style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {/* Result icon */}
                    <Box style={{ paddingTop: 3, flexShrink: 0 }}>
                      <Typography style={{
                        fontSize: 13, lineHeight: 1, margin: 0,
                        color: selColor,
                      }}>
                        {win ? '✓' : loss ? '✗' : '○'}
                      </Typography>
                    </Box>

                    {/* Match + pick info */}
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Typography style={{
                        fontSize: 9, color: 'rgba(255,255,255,0.35)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        margin: '0 0 2px',
                      }}>
                        {s.sport} · {s.marketLabel}
                      </Typography>
                      <Typography style={{
                        fontSize: 12, fontWeight: 700, color: '#fff',
                        margin: '0 0 2px', lineHeight: 1.25,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {s.homeTeam} vs {s.awayTeam}
                      </Typography>
                      <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Typography style={{
                          fontSize: 11, fontWeight: 700, color: selColor, margin: 0,
                        }}>
                          {s.optionLabel}
                        </Typography>
                        {score && (
                          <Typography style={{
                            fontSize: 10, color: 'rgba(255,255,255,0.4)',
                            fontVariantNumeric: 'tabular-nums', margin: 0,
                          }}>
                            ({score.home}–{score.away})
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Odds badge */}
                    <Box style={{
                      padding: '3px 8px', borderRadius: 5, flexShrink: 0,
                      background: 'rgba(255,215,0,0.09)',
                      border: '1px solid rgba(255,215,0,0.2)',
                    }}>
                      <Typography style={{
                        fontSize: 11, fontWeight: 900, color: Au,
                        fontVariantNumeric: 'tabular-nums', margin: 0,
                      }}>
                        {s.odds.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* ── Footer — stake / odds / payout ── */}
          <Box style={{
            borderTop: '1px solid rgba(255,215,0,0.12)',
            background: 'rgba(255,215,0,0.03)',
            padding: '8px 13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}>
            <Box>
              <Typography style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 2px' }}>
                STAKE
              </Typography>
              <Typography style={{
                fontSize: 14, fontWeight: 800, color: '#fff',
                fontVariantNumeric: 'tabular-nums', margin: 0,
              }}>
                {formatMoney(ticket.totalStake, currency)}
              </Typography>
            </Box>

            {ticket.mode !== 'single' && ticket.selections.length > 1 && (
              <Box style={{ textAlign: 'center' }}>
                <Typography style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 2px' }}>
                  TOTAL ODDS
                </Typography>
                <Typography style={{
                  fontSize: 14, fontWeight: 800, color: Au,
                  fontVariantNumeric: 'tabular-nums', margin: 0,
                }}>
                  {totalOdds.toFixed(2)}
                </Typography>
              </Box>
            )}

            <Box style={{ textAlign: 'right' }}>
              <Typography style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', margin: '0 0 2px' }}>
                TOTAL PAYOUT
              </Typography>
              <Typography style={{
                fontSize: 14, fontWeight: 900, color: G,
                fontVariantNumeric: 'tabular-nums', margin: 0,
              }}>
                {formatMoney(payout, currency)}
              </Typography>
            </Box>
          </Box>

          {/* ── Watermark strip ── */}
          <Box style={{
            padding: '5px 0',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.35)',
            borderTop: '1px solid rgba(255,255,255,0.03)',
          }}>
            <Typography style={{
              fontSize: 8, color: 'rgba(255,255,255,0.15)',
              letterSpacing: '0.12em', margin: 0,
            }}>
              DURCHEXiGAMES · PLAY RESPONSIBLY
            </Typography>
          </Box>
        </Box>
        {/* end capturable slip */}

        {/* ── Action buttons ── */}
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={busy ? <CircularProgress size={14} sx={{ color: G }} /> : <DownloadIcon />}
            onClick={handleDownload}
            disabled={busy}
            sx={{
              borderColor: alpha(G, 0.4),
              color: G,
              fontWeight: 700,
              '&:hover': { borderColor: G, background: alpha(G, 0.07) },
              '&.Mui-disabled': { color: 'text.disabled', borderColor: darkBorder },
            }}
          >
            Save Image
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={busy ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <ShareIcon />}
            onClick={handleShare}
            disabled={busy}
            sx={{
              background: `linear-gradient(135deg, ${Au}, #cc8800)`,
              color: '#000',
              fontWeight: 800,
              boxShadow: `0 0 16px ${alpha(Au, 0.35)}`,
              '&:hover': { boxShadow: `0 0 24px ${alpha(Au, 0.55)}` },
              '&.Mui-disabled': { background: alpha('#fff', 0.06), color: 'text.disabled' },
            }}
          >
            Share
          </Button>
        </Box>

        <Typography sx={{ mt: 1, fontSize: '0.65rem', color: 'text.disabled', textAlign: 'center' }}>
          {typeof navigator.canShare === 'function'
            ? 'Share directly to WhatsApp, Twitter, and more'
            : 'Save the image and share it anywhere'}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
