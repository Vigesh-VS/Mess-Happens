import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { firebaseConfigured } from './firebase/config';
import { SetupRequired } from './pages/SetupRequired';
import { LoadingScreen } from './components/ui/LoadingScreen';

// Loaded lazily so a missing .env.local shows setup help instead of a Firebase crash.
const App = lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {firebaseConfigured ? (
      <Suspense fallback={<LoadingScreen />}>
        <App />
      </Suspense>
    ) : (
      <SetupRequired />
    )}
  </StrictMode>,
);
