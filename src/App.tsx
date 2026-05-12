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
import MinesGame from './pages/MinesGame';
import ProfilePage from './pages/ProfilePage';
import BetHistoryPage from './pages/BetHistoryPage';
import RewardsPage from './pages/RewardsPage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VirtualSportsbook from './virtual-sports/VirtualSportsbook';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { BetSlipProvider } from './virtual-sports/core/BetSlipContext';
import AuthModal from './components/auth/AuthModal';
import InstallAppPrompt from './components/layout/InstallAppPrompt';

function GlobalAuthModal() {
  const { authPromptOpen, closeAuthPrompt } = useAuth();
  return (
    <AuthModal open={authPromptOpen} onClose={closeAuthPrompt} />
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
        <WalletProvider>
          <BetSlipProvider>
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
                <Route path="/virtual"          element={<VirtualSportsbook />} />
                <Route path="/virtual/:sport"   element={<VirtualSportsbook />} />
                <Route path="/soccer"      element={<VirtualSportsbook initialSport="soccer" />} />
                <Route path="/basketball"  element={<VirtualSportsbook initialSport="basketball" />} />
                <Route path="/hockey"      element={<VirtualSportsbook initialSport="hockey" />} />
                <Route path="/horserace"   element={<VirtualSportsbook initialSport="horseracing" />} />
                <Route path="/horse-race"  element={<VirtualSportsbook initialSport="horseracing" />} />
                <Route path="/mines" element={<MinesGame />} />
                <Route path="/profile"     element={<ProfilePage />} />
                <Route path="/bet-history" element={<BetHistoryPage />} />
                <Route path="/rewards"     element={<RewardsPage />} />
                <Route path="/security"    element={<SecurityPage />} />
                <Route path="/settings"    element={<SettingsPage />} />
                <Route path="/auth/callback"   element={<OAuthCallbackPage />} />
                <Route path="/verify-email"    element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password"  element={<ResetPasswordPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </MainLayout>
            <GlobalAuthModal />
            <InstallAppPrompt />
          </BrowserRouter>
          </BetSlipProvider>
        </WalletProvider>
        </NotificationProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
