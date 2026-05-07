import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import theme from './theme';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import CrashGame from './pages/CrashGame';
import DiceGame from './pages/DiceGame';
import PlinkoGame from './pages/PlinkoGame';
import BaccaratGame from './pages/BaccaratGame';
import BlackjackGame from './pages/BlackjackGame';
import RouletteGame from './pages/RouletteGame';
import SlotsGame from './pages/SlotsGame';
import VIPPage from './pages/VIPPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/crash" element={<CrashGame />} />
            <Route path="/dice" element={<DiceGame />} />
            <Route path="/plinko" element={<PlinkoGame />} />
            <Route path="/blackjack" element={<BlackjackGame />} />
            <Route path="/baccarat" element={<BaccaratGame />} />
            <Route path="/roulette" element={<RouletteGame />} />
            <Route path="/slots" element={<SlotsGame />} />
            <Route path="/vip" element={<VIPPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
