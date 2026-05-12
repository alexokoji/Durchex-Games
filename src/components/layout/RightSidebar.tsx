import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Avatar, InputBase, IconButton, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SendIcon from '@mui/icons-material/Send';
import { neonGreen, neonBlue, neonGold, darkBorder, darkSurface } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi, getChatSocket, type ApiChatMessage } from '../../api/chat';

const COLORS = [neonGreen, neonBlue, neonGold, '#ff4757', '#a855f7', '#ff9f43'];
const USERS = [
  'Viper_X', 'CryptoBeast', 'LuckyDragon', 'Satoshi99', 'NeonWolf',
  'DiamondHands', 'WhaleAlert', 'GoldRush', 'MoonShot', 'NightOwl',
  'FlashCash', 'BetMaverick', 'BlazeQueen', 'AceHigh', 'Zenith77',
  'NovaStrike', 'IronVault', 'PixelFox', 'StormChaser', 'TripleX',
  'SilkRoad', 'Sundance', 'OracleEye', 'Reaper', 'Phantom_R',
];
const GAMES = ['Crash', 'Dice', 'Plinko', 'Slots', 'Roulette', 'Blackjack', 'Mines', 'Virtual Soccer', 'Horse Race'];
const SIM_MESSAGES = [
  'gg! just hit 10x 🔥',
  'who needs luck when you have skill',
  'LETS GOOO CRASH TO THE MOON 🚀',
  'Anyone else on plinko low risk?',
  'just lost everything lmao',
  'come join my baccarat table!',
  'cashed out at 12x, easy money 💸',
  'mines on 3 bombs is the way',
  'horse race coming up in 30s, who you got?',
  'real madrid vs barca incoming 👀',
  'finally hit the 7s line!',
  'dice over 95… let’s ride',
  'parlay loading: 5 legs all favs',
  'just turned 0.001 into 0.04 on plinko 😂',
  'banker side baccarat all night',
  'roulette 23 red, mark my words',
  'small stakes big dreams',
  'rng felt today, locking it in',
  'big up to whoever just hit 100x crash',
  'me: only 5 more spins. also me: 50 spins later',
  'virtual soccer goals before kickoff 💀',
  'cashback dropped on time, nice',
];

function randItem<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function randMult() { return (Math.random() * 19 + 1.1).toFixed(2) + 'x'; }
function randAmount() { return (Math.random() * 0.05).toFixed(5); }

interface ChatMsg { id: string; user: string; text: string; color: string; time: string; isReal: boolean }
interface WinMsg  { id: number; user: string; game: string; mult: string; amount: string; color: string }

// Stable per-username colour pick so the same chatter doesn't flicker colours.
const colourCache = new Map<string, string>();
function colourFor(name: string): string {
  const cached = colourCache.get(name);
  if (cached) return cached;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const c = COLORS[hash % COLORS.length];
  colourCache.set(name, c);
  return c;
}

function nowHHMM() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toChatMsg(m: ApiChatMessage): ChatMsg {
  const id = (m._id ?? m.id ?? `${m.username}-${m.createdAt}-${Math.random().toString(36).slice(2,5)}`) as string;
  return {
    id,
    user: m.username,
    text: m.text,
    color: colourFor(m.username),
    time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isReal: true,
  };
}

export default function RightSidebar() {
  const auth = useAuth();
  const [tab, setTab] = useState<'chat' | 'wins'>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [wins, setWins] = useState<WinMsg[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const appendMessage = useCallback((m: ChatMsg) => {
    setMessages(prev => {
      if (prev.some(p => p.id === m.id)) return prev;
      return [...prev.slice(-60), m];
    });
  }, []);

  // Fetch initial chat history.
  useEffect(() => {
    let cancelled = false;
    chatApi.history('global', 30).then(({ messages: rows }) => {
      if (cancelled) return;
      setMessages(rows.map(toChatMsg));
    }).catch(() => { /* offline / first-run server — fine, simulated ambient fills in */ });
    return () => { cancelled = true; };
  }, []);

  // Open & manage the Socket.IO connection.
  useEffect(() => {
    const socket = getChatSocket();
    function onConnect()    { setConnected(true);  socket.emit('chat:join', 'global'); }
    function onDisconnect() { setConnected(false); }
    function onMessage(m: ApiChatMessage) { appendMessage(toChatMsg(m)); }

    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onMessage);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:message', onMessage);
      socket.emit('chat:leave', 'global');
    };
  }, [appendMessage]);

  // Re-attach auth on the same socket whenever sign-in state changes.
  useEffect(() => {
    const socket = getChatSocket();
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }, [auth.isAuthenticated]);

  // Ambient simulation — only fires if no real message has landed in a while.
  // Generates chatter to keep the room feeling alive on a quiet night.
  useEffect(() => {
    const interval = setInterval(() => {
      const lastRealMs = messages.filter(m => m.isReal).slice(-1)[0];
      const idleMs = lastRealMs ? Date.now() - new Date(lastRealMs.time).getTime() : Infinity;
      // Inject ambient roughly every 4s when quiet, never if a real message arrived recently.
      if (idleMs > 30_000) {
        const user = randItem(USERS);
        appendMessage({
          id: `sim-${idRef.current++}`,
          user, text: randItem(SIM_MESSAGES),
          color: colourFor(user),
          time: nowHHMM(),
          isReal: false,
        });
      }
      // Big-wins stream is still simulated until we add the real feed.
      const newWin: WinMsg = {
        id: idRef.current++,
        user: randItem(USERS), game: randItem(GAMES),
        mult: randMult(), amount: randAmount(),
        color: randItem(COLORS),
      };
      setWins(prev => [newWin, ...prev.slice(0, 19)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages, appendMessage]);

  // Auto-scroll the chat container only (not the page).
  useEffect(() => {
    if (tab !== 'chat') return;
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, tab]);

  function send() {
    const text = input.trim();
    if (!text) return;
    if (!auth.isAuthenticated) { auth.openAuthPrompt(); return; }
    if (!connected) return;
    const socket = getChatSocket();
    socket.emit('chat:send', { channel: 'global', text });
    setInput('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

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
        <>
          <Box ref={chatScrollRef} sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', opacity: msg.isReal ? 1 : 0.78 }}>
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
          </Box>

          {/* Composer */}
          <Box sx={{ p: 1, borderTop: `1px solid ${darkBorder}`, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              flex: 1, display: 'flex', alignItems: 'center',
              px: 1, py: 0.4, background: alpha('#fff', 0.03), borderRadius: 1.5,
              border: `1px solid ${darkBorder}`,
            }}>
              <InputBase
                placeholder={auth.isAuthenticated ? 'Say something…' : 'Sign in to chat'}
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 280))}
                onKeyDown={onKeyDown}
                onFocus={() => { if (!auth.isAuthenticated) auth.openAuthPrompt(); }}
                disabled={!auth.isAuthenticated}
                sx={{ flex: 1, fontSize: '0.78rem' }}
              />
            </Box>
            <IconButton
              size="small"
              onClick={send}
              disabled={!auth.isAuthenticated || !input.trim() || !connected}
              sx={{ color: neonGreen }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </>
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

      {/* Online indicator */}
      <Box
        sx={{
          px: 2, py: 1.25, borderTop: `1px solid ${darkBorder}`,
          display: 'flex', alignItems: 'center', gap: 1,
        }}
      >
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? neonGreen : 'text.disabled',
          boxShadow: connected ? `0 0 8px ${neonGreen}` : 'none',
        }} />
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          {connected ? 'Connected' : 'Reconnecting…'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          label="Global"
          size="small"
          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, background: alpha(neonBlue, 0.12), color: neonBlue }}
        />
      </Box>
    </Box>
  );
}
