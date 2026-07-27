import { useRef, useEffect, useState, useCallback } from 'react';
import SceneManager from '../engine/SceneManager.js';
import RoomBuilder from '../engine/RoomBuilder.js';
import PlayerController from '../engine/PlayerController.js';
import MarkerSystem from '../engine/MarkerSystem.js';
import HolographicInput from '../engine/HolographicInput.js';
import AudioEngine from '../engine/AudioEngine.js';
import HUD from './HUD.jsx';
import LoginModal from './LoginModal.jsx';

export default function PalaceView({ onExit, user, onUserChange }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const proximitySoundsRef = useRef(new Map());

  const [markerCount, setMarkerCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const savePalaceRef = useRef(null);
  const loadPalaceRef = useRef(null);

  const savePalace = useCallback((currentUser) => {
    if (!engineRef.current?.markerSystem || !currentUser) return;
    const markers = engineRef.current.markerSystem.markers.map(m => ({
      id: m.id,
      position: { x: m.position.x, y: m.position.y, z: m.position.z },
      heading: m.heading,
      body: m.body
    }));
    localStorage.setItem(`mp_palace_${currentUser.toLowerCase()}`, JSON.stringify(markers));
  }, []);

  const loadPalace = useCallback((currentUser) => {
    if (!engineRef.current || !currentUser) return;
    const { markerSystem, audio } = engineRef.current;
    
    proximitySoundsRef.current.forEach(sound => sound.dispose());
    proximitySoundsRef.current.clear();

    const dataStr = localStorage.getItem(`mp_palace_${currentUser.toLowerCase()}`);
    const markersData = dataStr ? JSON.parse(dataStr) : [];
    
    markerSystem.loadMarkers(markersData);
    setMarkerCount(markerSystem.markers.length);

    markerSystem.markers.forEach(marker => {
      const proximitySound = audio.createProximitySound();
      proximitySoundsRef.current.set(marker.id, proximitySound);
    });
  }, []);

  savePalaceRef.current = savePalace;
  loadPalaceRef.current = loadPalace;

  const requestLock = useCallback(() => {
    if (isLoginOpen) return;
    if (engineRef.current?.player) {
      engineRef.current.player.lock();
      engineRef.current.audio.start();
    }
  }, [isLoginOpen]);

  const handleLoginClick = useCallback(() => {
    if (engineRef.current?.player) {
      engineRef.current.player.unlock();
    }
    setIsLoginOpen(true);
  }, []);

  const handleLogoutClick = useCallback(() => {
    localStorage.removeItem('mp_logged_in_user');
    onUserChange(null);
    if (engineRef.current?.markerSystem) {
      // Clear current display markers
      engineRef.current.markerSystem.clearAllMarkers();
      proximitySoundsRef.current.forEach(sound => sound.dispose());
      proximitySoundsRef.current.clear();
      setMarkerCount(0);
    }
  }, [onUserChange]);

  const handleLoginSuccess = useCallback((username) => {
    localStorage.setItem('mp_logged_in_user', username);
    onUserChange(username);
    setIsLoginOpen(false);
    loadPalace(username);
    // Request lock again after successfully logging in
    setTimeout(() => {
      if (engineRef.current?.player) {
        engineRef.current.player.lock();
      }
    }, 100);
  }, [loadPalace]);

  const handleLoginClose = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sceneManager = new SceneManager(container);
    const roomBuilder = new RoomBuilder(sceneManager.scene);
    const surfaces = roomBuilder.build();
    const player = new PlayerController(sceneManager.camera, sceneManager.renderer.domElement, sceneManager.scene);
    const audio = new AudioEngine();
    const markerSystem = new MarkerSystem(sceneManager.scene, sceneManager.camera, sceneManager.renderer.domElement, audio);
    const holographicInput = new HolographicInput(sceneManager.scene, sceneManager.camera);

    markerSystem.setSurfaces(surfaces);
    markerSystem.setHolographicInput(holographicInput);

    engineRef.current = { sceneManager, roomBuilder, player, markerSystem, holographicInput, audio };

    // Set callbacks
    markerSystem.onEditMarker = (marker) => {
      setIsEditing(true);
      player.enabled = false;
      player.clearKeys();
      holographicInput.open(marker, marker.heading, marker.body);
    };

    holographicInput.onSave = (marker) => {
      markerSystem.updateMarkerLabel(marker);
      setIsEditing(false);
      player.clearKeys();
      player.enabled = true;
      
      // Auto-save changes if logged in
      const currentUser = localStorage.getItem('mp_logged_in_user');
      if (currentUser) {
        savePalaceRef.current(currentUser);
      } else {
        if (engineRef.current?.player?.isLocked) {
          engineRef.current.player.unlock();
        }
        setIsLoginOpen(true);
      }
    };

    holographicInput.onDelete = (marker) => {
      const idx = markerSystem.markers.indexOf(marker);
      if (idx !== -1) {
        sceneManager.scene.remove(marker.group);
        if (marker.label) {
          marker.label.material.map.dispose();
          marker.label.material.dispose();
        }
        marker.shell.geometry.dispose();
        marker.shell.material.dispose();
        marker.core.geometry.dispose();
        marker.core.material.dispose();
        markerSystem.markers.splice(idx, 1);
        setMarkerCount(markerSystem.markers.length);

        if (proximitySoundsRef.current.has(marker.id)) {
          proximitySoundsRef.current.get(marker.id).dispose();
          proximitySoundsRef.current.delete(marker.id);
        }

        const currentUser = localStorage.getItem('mp_logged_in_user');
        if (currentUser) {
          savePalaceRef.current(currentUser);
        }
      }
      setIsEditing(false);
      player.clearKeys();
      player.enabled = true;
    };

    const originalCreateMarker = markerSystem.createMarker.bind(markerSystem);
    markerSystem.createMarker = (position, normal) => {
      const marker = originalCreateMarker(position, normal);
      setMarkerCount(markerSystem.markers.length);

      const proximitySound = audio.createProximitySound();
      proximitySoundsRef.current.set(marker.id, proximitySound);

      const currentUser = localStorage.getItem('mp_logged_in_user');
      if (currentUser) {
        savePalaceRef.current(currentUser);
      }

      return marker;
    };

    sceneManager.addUpdateCallback(roomBuilder.getUpdateCallback());
    sceneManager.addUpdateCallback(player.getUpdateCallback());
    sceneManager.addUpdateCallback(markerSystem.getUpdateCallback());

    sceneManager.addUpdateCallback(() => {
      proximitySoundsRef.current.forEach((sound, id) => {
        const marker = markerSystem.markers.find(m => m.id === id);
        if (marker) {
          const dist = sceneManager.camera.position.distanceTo(marker.position);
          sound.update(dist);
        }
      });
    });

    const lockChangeHandler = () => {
      const locked = document.pointerLockElement === sceneManager.renderer.domElement;
      setIsLocked(locked);
    };
    document.addEventListener('pointerlockchange', lockChangeHandler);

    const escHandler = (e) => {
      if (e.key === 'Escape' && holographicInput.isOpen()) {
        holographicInput.close();
        setIsEditing(false);
        player.clearKeys();
        player.enabled = true;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', escHandler, true);

    const initialUser = localStorage.getItem('mp_logged_in_user');
    if (initialUser) {
      loadPalaceRef.current(initialUser);
    }

    return () => {
      document.removeEventListener('pointerlockchange', lockChangeHandler);
      document.removeEventListener('keydown', escHandler, true);

      proximitySoundsRef.current.forEach(sound => sound.dispose());
      proximitySoundsRef.current.clear();

      holographicInput.close();
      markerSystem.dispose();
      player.dispose();
      audio.dispose();
      sceneManager.dispose();

      engineRef.current = null;
    };
  }, []);

  return (
    <div className="palace">
      <div ref={containerRef} className="palace__canvas" />

      {isLocked && (
        <HUD 
          markerCount={markerCount} 
          isEditing={isEditing} 
          user={user}
          onLoginClick={handleLoginClick}
          onLogoutClick={handleLogoutClick}
        />
      )}

      {!isLocked && (
        <div className="palace__unlock-overlay" onClick={requestLock}>
          <span className="palace__unlock-text">Click to Enter the Void</span>
          <span className="palace__unlock-sub">Press ESC to release cursor</span>
        </div>
      )}

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={handleLoginClose} 
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
