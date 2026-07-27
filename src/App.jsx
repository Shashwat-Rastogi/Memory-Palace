import { useState, useCallback } from 'react';
import LandingPage from './components/LandingPage.jsx';
import PalaceView from './components/PalaceView.jsx';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [user, setUser] = useState(() => localStorage.getItem('mp_logged_in_user') || null);

  const handleEnter = useCallback(() => {
    setScreen('palace');
  }, []);

  const handleExit = useCallback(() => {
    setScreen('landing');
  }, []);

  const handleUserChange = useCallback((newUser) => {
    setUser(newUser);
  }, []);

  return (
    <>
      {screen === 'landing' && (
        <LandingPage 
          onEnter={handleEnter} 
          user={user} 
          onUserChange={handleUserChange} 
        />
      )}
      {screen === 'palace' && (
        <PalaceView 
          onExit={handleExit} 
          user={user} 
          onUserChange={handleUserChange} 
        />
      )}
    </>
  );
}
