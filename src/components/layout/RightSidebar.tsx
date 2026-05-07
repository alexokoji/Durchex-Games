import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { neonGreen, neonBlue, neonGold, darkBorder, darkSurface } from '../../theme';

const COLORS = [neonGreen, neonBlue, neonGold, '#ff4757', '#a855f7', '#ff9f43'];

const USERS = ['Viper_X', 'CryptoBeast', 'LuckyDragon', 'Satoshi99', 'NeonWolf', 'DiamondHands', 'WhaleAlert', 'GoldRush'];
const GAMES = ['Crash', 'Dice', 'Plinko', 'Slots', 'Roulette', 'Blackjack'];
const MESSAGES = [
  'gg! just hit 10x 🔥',
  'who needs luck when you have skill',
  'LETS GOOO CRASH TO THE MOON',
  'Anyone else playing plinko?',
  'just lost everything lmao',
  'come join my table!',
  'this crash game is insane',
  'wagered 1 BTC tonight, no regrets',
];

function randItem<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function randMult() { return (Math.random() * 19 + 1.1).toFixed(2) + 'x'; }
function randAmount() { return (Math.random() * 0.05).toFixed(5); }

interface ChatMsg { id: number; user: string; text: string; color: string; time: string }
interface WinMsg { id: number; user: string; game: string; mult: string; amount: string; color: string }

export default function RightSidebar() {
  const [tab, setTab] = useState<'chat' | 'wins'>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [wins, setWins] = useState<WinMsg[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const initial: ChatMsg[] = Array.from({ length: 8 }, () => ({
      id: idRef.current++,
      user: randItem(USERS),
      text: randItem(MESSAGES),
      color: randItem(COLORS),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
    setMessages(initial);

    const winInitial: WinMsg[] = Array.from({ length: 6 }, () => ({
      id: idRef.current++,
      user: randItem(USERS),
      game: randItem(GAMES),
      mult: randMult(),
      amount: randAmount(),
      color: randItem(COLORS),
    }));
    setWins(winInitial);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newMsg: ChatMsg = {
        id: idRef.current++,
        user: randItem(USERS),
        text: randItem(MESSAGES),
        color: randItem(COLORS),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev.slice(-30), newMsg]);

      const newWin: WinMsg = {
        id: idRef.current++,
        user: randItem(USERS),
        game: randItem(GAMES),
        mult: randMult(),
        amount: randAmount(),
        color: randItem(COLORS),
      };
      setWins(prev => [newWin, ...prev.slice(0, 19)]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        display: { xs: 'none', xl: 'flex' },
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: 64,
        background: darkSurface,
        borderLeft: `1px solid ${darkBorder}`,
        overflow: 'hidden',
      }}
    >
      {/* Tabs */}
      <Box sx={{ display: 'flex', borderBottom: `1px solid ${darkBorder}` }}>
        {(['chat', 'wins'] as const).map((t) => (
          <Box
            key={t}
            onClick={() => setTab(t)}
            sx={{
              flex: 1, py: 1.2, textAlign: 'center', cursor: 'pointer',
              borderBottom: tab === t ? `2px solid ${neonGreen}` : '2px solid transparent',
              transition: 'all 0.2s',
              '&:hover': { background: alpha(neonGreen, 0.05) },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              {t === 'chat' ? <ChatBubbleIcon sx={{ fontSize: 14 }} /> : <EmojiEventsIcon sx={{ fontSize: 14 }} />}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700, fontSize: '0.75rem',
                  color: tab === t ? neonGreen : 'text.secondary',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}
              >
                {t === 'chat' ? 'Live Chat' : 'Big Wins'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {tab === 'chat' ? (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Avatar
                    sx={{
                      width: 24, height: 24, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                      background: `linear-gradient(135deg, ${msg.color}, ${alpha(msg.color, 0.5)})`,
                    }}
                  >
                    {msg.user[0]}
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: msg.color }}>
                        {msg.user}
                      </Typography>
                      <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                        {msg.time}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.3 }}>
                      {msg.text}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          <AnimatePresence initial={false}>
            {wins.map((win) => (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1, borderRadius: 2, mb: 0.5,
                    background: alpha(win.color, 0.06),
                    border: `1px solid ${alpha(win.color, 0.15)}`,
                    transition: 'all 0.2s',
                    '&:hover': { background: alpha(win.color, 0.1) },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700,
                      background: `linear-gradient(135deg, ${win.color}, ${alpha(win.color, 0.5)})`,
                    }}
                  >
                    {win.user[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }} noWrap>
                      {win.user}
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                      {win.game}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: win.color }}>
                      {win.mult}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                      {win.amount} BTC
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}

      {/* Online count */}
      <Box
        sx={{
          px: 2, py: 1.5, borderTop: `1px solid ${darkBorder}`,
          display: 'flex', alignItems: 'center', gap: 1,
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: neonGreen, boxShadow: `0 0 8px ${neonGreen}` }} />
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          <strong style={{ color: neonGreen }}>4,821</strong> online now
        </Typography>
      </Box>
    </Box>
  );
}
