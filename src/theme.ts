import { createTheme, alpha } from '@mui/material/styles';

export const neonGreen = '#00ff88';
export const neonBlue = '#00d4ff';
export const neonGold = '#ffd700';
export const darkBg = '#0a0c10';
export const darkSurface = '#111318';
export const darkCard = '#161b25';
export const darkBorder = '#1e2635';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: neonGreen,
      light: '#4fffaa',
      dark: '#00cc6a',
      contrastText: '#000',
    },
    secondary: {
      main: neonBlue,
      light: '#4de9ff',
      dark: '#00a8cc',
      contrastText: '#000',
    },
    error: {
      main: '#ff4757',
      light: '#ff6b7a',
      dark: '#cc3244',
    },
    warning: {
      main: neonGold,
      light: '#ffe44d',
      dark: '#ccac00',
    },
    success: {
      main: neonGreen,
      light: '#4fffaa',
      dark: '#00cc6a',
    },
    background: {
      default: darkBg,
      paper: darkCard,
    },
    text: {
      primary: '#e8eaf0',
      secondary: '#7b8ba0',
      disabled: '#3d4a5c',
    },
    divider: darkBorder,
    action: {
      hover: alpha(neonGreen, 0.08),
      selected: alpha(neonGreen, 0.12),
      active: neonGreen,
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.8rem', fontWeight: 700 },
    h4: { fontSize: '1.4rem', fontWeight: 700 },
    h5: { fontSize: '1.1rem', fontWeight: 600 },
    h6: { fontSize: '0.95rem', fontWeight: 600 },
    body1: { fontSize: '0.9rem' },
    body2: { fontSize: '0.8rem' },
    button: { fontWeight: 700, letterSpacing: '0.05em', textTransform: 'none' },
    caption: { fontSize: '0.72rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        body: {
          backgroundColor: darkBg,
          color: '#e8eaf0',
          scrollbarWidth: 'thin',
          scrollbarColor: `${darkBorder} transparent`,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: darkBorder, borderRadius: '3px' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          letterSpacing: '0.05em',
          transition: 'all 0.2s ease',
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            background: `linear-gradient(135deg, ${neonGreen} 0%, #00cc6a 100%)`,
            color: '#000',
            boxShadow: `0 0 20px ${alpha(neonGreen, 0.4)}`,
            '&:hover': {
              boxShadow: `0 0 30px ${alpha(neonGreen, 0.6)}`,
              transform: 'translateY(-1px)',
            },
          },
          '&.MuiButton-containedSecondary': {
            background: `linear-gradient(135deg, ${neonBlue} 0%, #00a8cc 100%)`,
            color: '#000',
            boxShadow: `0 0 20px ${alpha(neonBlue, 0.4)}`,
            '&:hover': {
              boxShadow: `0 0 30px ${alpha(neonBlue, 0.6)}`,
            },
          },
        },
        outlined: {
          '&.MuiButton-outlinedPrimary': {
            borderColor: alpha(neonGreen, 0.5),
            color: neonGreen,
            '&:hover': {
              borderColor: neonGreen,
              background: alpha(neonGreen, 0.08),
              boxShadow: `0 0 15px ${alpha(neonGreen, 0.2)}`,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: darkSurface,
          border: `1px solid ${darkBorder}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.72rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: darkBorder,
        },
        bar: {
          borderRadius: 4,
          background: `linear-gradient(90deg, ${neonGreen}, ${neonBlue})`,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: neonGreen },
        thumb: {
          boxShadow: `0 0 10px ${alpha(neonGreen, 0.5)}`,
          '&:hover': { boxShadow: `0 0 15px ${alpha(neonGreen, 0.7)}` },
        },
        track: {
          background: `linear-gradient(90deg, ${neonGreen}, ${neonBlue})`,
          border: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: alpha('#fff', 0.03),
            '& fieldset': { borderColor: darkBorder },
            '&:hover fieldset': { borderColor: alpha(neonGreen, 0.4) },
            '&.Mui-focused fieldset': {
              borderColor: neonGreen,
              boxShadow: `0 0 0 2px ${alpha(neonGreen, 0.15)}`,
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.82rem',
          minHeight: 44,
          '&.Mui-selected': { color: neonGreen },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          background: `linear-gradient(90deg, ${neonGreen}, ${neonBlue})`,
          height: 2,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: darkCard,
          border: `1px solid ${darkBorder}`,
          fontSize: '0.78rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 20,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(neonGreen, 0.08),
            color: neonGreen,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': { backgroundColor: alpha(neonGreen, 0.06) },
          '&.Mui-selected': {
            backgroundColor: alpha(neonGreen, 0.12),
            '&:hover': { backgroundColor: alpha(neonGreen, 0.16) },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: darkBorder },
      },
    },
  },
});

export default theme;
