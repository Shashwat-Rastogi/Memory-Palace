import { useState } from 'react';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('mp_users') || '{}');

    if (isSignUp) {
      if (users[username.toLowerCase()]) {
        setError('Username already exists.');
        return;
      }
      users[username.toLowerCase()] = { username, password };
      localStorage.setItem('mp_users', JSON.stringify(users));
      onSuccess(username);
    } else {
      const existingUser = users[username.toLowerCase()];
      if (!existingUser || existingUser.password !== password) {
        setError('Invalid username or password.');
        return;
      }
      onSuccess(username);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal__close" onClick={onClose}>&times;</button>
        
        <div className="login-modal__tabs">
          <button 
            type="button"
            className={`login-modal__tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(false); setError(''); }}
          >
            Login
          </button>
          <button 
            type="button"
            className={`login-modal__tab ${isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(true); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <form className="login-modal__form" onSubmit={handleSubmit}>
          <h2 className="login-modal__title">
            {isSignUp ? 'CREATE QUANTUM NODE' : 'SYNC QUANTUM NODE'}
          </h2>
          <p className="login-modal__subtitle">
            {isSignUp 
              ? 'Register a profile to save your custom memory locations.' 
              : 'Authenticate to restore and sync your memory palaces.'}
          </p>

          {error && <div className="login-modal__error">{error}</div>}

          <div className="login-modal__field">
            <label className="login-modal__label">USERNAME</label>
            <input 
              type="text" 
              className="login-modal__input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Architect"
              autoFocus
            />
          </div>

          <div className="login-modal__field">
            <label className="login-modal__label">ACCESS KEY</label>
            <input 
              type="password" 
              className="login-modal__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="login-modal__submit">
            {isSignUp ? 'REGISTER PROFILE' : 'ACCESS PALACE'}
          </button>
        </form>
      </div>
    </div>
  );
}
