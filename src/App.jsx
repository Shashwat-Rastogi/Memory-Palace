import { useState, useCallback } from 'react';
import LandingPage from './components/LandingPage.jsx';
import PalaceView from './components/PalaceView.jsx';

export default function App() {
  const [screen, setScreen] = useState('landing');

  const handleEnter = useCallback(() => {
    setScreen('palace');
  }, []);

  const handleExit = useCallback(() => {
    setScreen('landing');
  }, []);

  return (
    <>
      {screen === 'landing' && <LandingPage onEnter={handleEnter} />}
      {screen === 'palace' && <PalaceView onExit={handleExit} />}
    </>
  );
}
