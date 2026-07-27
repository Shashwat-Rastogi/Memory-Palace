export default function HUD({ markerCount, isEditing, user, onLoginClick, onLogoutClick }) {
  return (
    <div className="hud">
      <div className="hud__crosshair">
        <div className="hud__crosshair-dot" />
      </div>

      <div className="hud__top-bar">
        <div className="hud__marker-count">
          <div className="hud__marker-icon" />
          <span>{markerCount} {markerCount === 1 ? 'node' : 'nodes'}</span>
        </div>

        <div className="hud__auth-status">
          {user ? (
            <div className="hud__user-badge">
              <span className="hud__user-name">{user.toUpperCase()}</span>
              <button className="hud__auth-btn logout" onClick={onLogoutClick}>LOGOUT</button>
            </div>
          ) : (
            <button className="hud__auth-btn login" onClick={onLoginClick}>SYNC PROFILE</button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="hud__edit-mode">EDITING NODE</div>
      )}

      <div className="hud__controls">
        <span className="hud__control-item"><kbd>WASD</kbd> move</span>
        <span className="hud__control-item"><kbd>Mouse</kbd> look</span>
        <span className="hud__control-item"><kbd>L-Click</kbd> place node</span>
        <span className="hud__control-item"><kbd>R-Click</kbd> edit node</span>
        <span className="hud__control-item"><kbd>Space</kbd>/<kbd>Ctrl</kbd> fly</span>
        <span className="hud__control-item"><kbd>Shift</kbd> sprint</span>
        <span className="hud__control-item"><kbd>Esc</kbd> unlock</span>
      </div>
    </div>
  );
}
