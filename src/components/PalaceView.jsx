import { useRef, useEffect, useState, useCallback } from 'react';
import SceneManager from '../engine/SceneManager.js';
import RoomBuilder from '../engine/RoomBuilder.js';
import PlayerController from '../engine/PlayerController.js';
import MarkerSystem from '../engine/MarkerSystem.js';
import HolographicInput from '../engine/HolographicInput.js';
import AudioEngine from '../engine/AudioEngine.js';
import HUD from './HUD.jsx';

export default function PalaceView({ onExit }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [markerCount, setMarkerCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const requestLock = useCallback(() => {
    if (engineRef.current?.player) {
      engineRef.current.player.lock();
      engineRef.current.audio.start();
    }
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

    const proximitySounds = new Map();

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

        if (proximitySounds.has(marker.id)) {
          proximitySounds.get(marker.id).dispose();
          proximitySounds.delete(marker.id);
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
      proximitySounds.set(marker.id, proximitySound);

      return marker;
    };

    sceneManager.addUpdateCallback(roomBuilder.getUpdateCallback());
    sceneManager.addUpdateCallback(player.getUpdateCallback());
    sceneManager.addUpdateCallback(markerSystem.getUpdateCallback());

    sceneManager.addUpdateCallback(() => {
      proximitySounds.forEach((sound, id) => {
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

    engineRef.current = { sceneManager, roomBuilder, player, markerSystem, holographicInput, audio };

    return () => {
      document.removeEventListener('pointerlockchange', lockChangeHandler);
      document.removeEventListener('keydown', escHandler, true);

      proximitySounds.forEach(sound => sound.dispose());
      proximitySounds.clear();

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

      {isLocked && <HUD markerCount={markerCount} isEditing={isEditing} />}

      {!isLocked && (
        <div className="palace__unlock-overlay" onClick={requestLock}>
          <span className="palace__unlock-text">Click to Enter the Void</span>
          <span className="palace__unlock-sub">Press ESC to release cursor</span>
        </div>
      )}
    </div>
  );
}
