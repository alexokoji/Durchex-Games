import { useMemo, useState } from 'react';
import {
  Popover, Box, Typography, IconButton, Chip, Divider, Button, Badge,
  Tabs, Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import SecurityIcon from '@mui/icons-material/Security';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { motion } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { useNotifications, type NotificationKind as LiveKind, type AppNotification as LiveNotification } from '../../contexts/NotificationContext';

type DisplayKind = 'reward' | 'transaction' | 'system' | 'security' | 'promo' | 'announcement';

const KIND_META: Record<DisplayKind, { icon: React.ReactNode; color: string; label: string }> = {
  reward:       { icon: <EmojiEventsIcon sx={{ fontSize: 16 }} />, color: neonGold, label: 'Reward' },
  transaction:  { icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,   color: neonGreen, label: 'Transaction' },
  system:       { icon: <LocalFireDepartmentIcon sx={{ fontSize: 16 }} />, color: neonBlue, label: 'System' },
  security:     { icon: <SecurityIcon sx={{ fontSize: 16 }} />,    color: '#ff6b7a', label: 'Security' },
  promo:        { icon: <CardGiftcardIcon sx={{ fontSize: 16 }} />, color: '#a855f7', label: 'Promo' },
  announcement: { icon: <CardGiftcardIcon sx={{ fontSize: 16 }} />, color: '#ff9f43', label: 'News' },
};

function kindFromLive(k: LiveKind): DisplayKind {
  switch (k) {
    case 'deposit:completed':
    case 'withdraw:completed':
    case 'withdraw:queued':   return 'transaction';
    case 'deposit:failed':
    case 'withdraw:failed':   return 'security';
    case 'bet:settled':       return 'reward';
    case 'system':            return 'system';
    default:                  return 'system';
  }
}

function relativeTime(ms: number): string {
  const dt = Date.now() - ms;
  if (dt < 60_000) return 'just now';
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)}m ago`;
  if (dt < 86_400_000) return `${Math.floor(dt / 3_600_000)}h ago`;
  return `${Math.floor(dt / 86_400_000)}d ago`;
}

interface NotificationsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

interface DisplayItem {
  id: string;
  kind: DisplayKind;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

function toDisplay(n: LiveNotification): DisplayItem {
  return {
    id: n.id,
    kind: kindFromLive(n.kind),
    title: n.title,
    message: n.body ?? '',
    time: relativeTime(n.createdAt),
    read: n.read,
  };
}

export default function NotificationsMenu({ anchorEl, open, onClose }: NotificationsMenuProps) {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const items = useMemo(() => notifications.map(toDisplay), [notifications]);
  const visible = filter === 'unread' ? items.filter(i => !i.read) : items;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            background: darkCard,
            border: `1px solid ${darkBorder}`,
            borderRadius: 2,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.25, borderBottom: `1px solid ${darkBorder}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', position: 'relative', transform: 'none' } }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex' }}>
          <IconButton size="small" onClick={markAllRead} title="Mark all as read">
            <DoneAllIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" title="Notification settings">
            <SettingsIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <Tabs
        value={filter}
        onChange={(_, v) => setFilter(v)}
        sx={{ px: 1, borderBottom: `1px solid ${darkBorder}`, minHeight: 36 }}
      >
        <Tab value="all" label={`All (${items.length})`} sx={{ minHeight: 36, fontSize: '0.74rem' }} />
        <Tab value="unread" label={`Unread (${unreadCount})`} sx={{ minHeight: 36, fontSize: '0.74rem' }} />
      </Tabs>

      <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
        {visible.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsOffIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', fontWeight: 600 }}>
              You're all caught up
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
              No {filter === 'unread' ? 'unread ' : ''}notifications right now.
            </Typography>
          </Box>
        ) : (
          visible.map((n, i) => {
            const meta = KIND_META[n.kind];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Box
                  onClick={() => markRead(n.id)}
                  sx={{
                    position: 'relative',
                    display: 'flex', alignItems: 'flex-start', gap: 1.25,
                    px: 2, py: 1.5,
                    cursor: 'pointer',
                    borderBottom: i < visible.length - 1 ? `1px solid ${darkBorder}` : 'none',
                    background: n.read ? 'transparent' : alpha(meta.color, 0.05),
                    transition: 'all 0.15s',
                    '&:hover': { background: alpha(meta.color, 0.08) },
                  }}
                >
                  {!n.read && (
                    <Box
                      sx={{
                        position: 'absolute', left: 6, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 6, height: 6, borderRadius: '50%',
                        background: meta.color,
                        boxShadow: `0 0 8px ${meta.color}`,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 32, height: 32, flexShrink: 0,
                      borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: alpha(meta.color, 0.15),
                      color: meta.color,
                      border: `1px solid ${alpha(meta.color, 0.3)}`,
                    }}
                  >
                    {meta.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                      <Typography
                        sx={{ fontSize: '0.82rem', fontWeight: n.read ? 600 : 800, lineHeight: 1.2 }}
                      >
                        {n.title}
                      </Typography>
                      <Chip
                        label={meta.label}
                        size="small"
                        sx={{
                          height: 16, fontSize: '0.58rem', fontWeight: 700,
                          background: alpha(meta.color, 0.15),
                          color: meta.color,
                          border: `1px solid ${alpha(meta.color, 0.3)}`,
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.74rem',
                        color: n.read ? 'text.secondary' : 'text.primary',
                        lineHeight: 1.4, mb: 0.5,
                      }}
                    >
                      {n.message}
                    </Typography>
                    <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }}>
                      {n.time}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            );
          })
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 1 }}>
        <Button
          fullWidth
          size="small"
          onClick={onClose}
          sx={{
            color: neonGreen, fontWeight: 700, fontSize: '0.78rem',
            '&:hover': { background: alpha(neonGreen, 0.08) },
          }}
        >
          View all notifications
        </Button>
      </Box>
    </Popover>
  );
}
