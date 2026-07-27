import * as THREE from 'three';

export default class MarkerSystem {
  constructor(scene, camera, domElement, audioEngine = null) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.audioEngine = audioEngine;
    
    this.raycaster = new THREE.Raycaster();
    this.markers = [];
    this.surfaces = [];
    this.minDistance = 1.5;
    
    this.hoveredMarker = null;
    this.holographicInput = null;
    this.onEditMarker = null;

    this.onClick = this.onClick.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    
    this.domElement.addEventListener('click', this.onClick);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('contextmenu', this.onContextMenu);
  }

  setSurfaces(meshArray) {
    this.surfaces = meshArray;
  }

  setHolographicInput(input) {
    this.holographicInput = input;
  }

  createTextLabel(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 18;
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    
    const padding = 10;
    canvas.width = Math.max(textWidth + padding * 2, 40);
    canvas.height = fontSize + padding * 2;

    ctx.fillStyle = 'rgba(5, 5, 20, 0.55)';
    const r = 6;
    const w = canvas.width;
    const h = canvas.height;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 245, 212, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 245, 212, 0.85)';
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(material);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(aspect * 0.25, 0.25, 1);

    return sprite;
  }

  updateMarkerLabel(marker) {
    if (marker.label) {
      marker.group.remove(marker.label);
      marker.label.material.map.dispose();
      marker.label.material.dispose();
      marker.label = null;
    }

    if (marker.heading && marker.heading.trim()) {
      const label = this.createTextLabel(marker.heading);
      label.position.set(0, 0.45, 0);
      marker.group.add(label);
      marker.label = label;
    }
  }

  createMarker(position, normal) {
    let pos = position.clone();
    for (let i = 0; i < this.markers.length; i++) {
      const dist = pos.distanceTo(this.markers[i].position);
      if (dist < this.minDistance) {
        const dir = new THREE.Vector3().subVectors(pos, this.markers[i].position).normalize();
        if (dir.lengthSq() === 0) dir.set(0, 1, 0);
        pos.add(dir.multiplyScalar(this.minDistance - dist));
      }
    }

    const group = new THREE.Group();
    
    const shellGeo = new THREE.IcosahedronGeometry(0.25, 1);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: '#00f5d4',
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.5,
      iridescence: 1.0,
      iridescenceIOR: 1.3,
      transparent: true,
      opacity: 0.7,
      emissive: '#00f5d4',
      emissiveIntensity: 0.2
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    group.add(shell);

    const coreGeo = new THREE.SphereGeometry(0.08);
    const coreMat = new THREE.MeshBasicMaterial({
      color: '#00f5d4',
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const light = new THREE.PointLight('#00f5d4', 2, 5, 2);
    group.add(light);

    pos.add(normal.clone().multiplyScalar(0.35));
    group.position.copy(pos);

    this.scene.add(group);

    const marker = {
      id: Date.now() + Math.random().toString(36).substring(7),
      position: pos,
      heading: '',
      body: '',
      group: group,
      shell: shell,
      core: core,
      light: light,
      label: null
    };

    this.markers.push(marker);
    return marker;
  }

  onClick(event) {
    if (document.pointerLockElement !== this.domElement) return;

    if (this.holographicInput && this.holographicInput.isOpen()) {
      this.holographicInput.onClick(event);
      return;
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    if (this.markers.length > 0) {
      const markerMeshes = this.markers.map(m => m.shell);
      const markerHits = this.raycaster.intersectObjects(markerMeshes);
      if (markerHits.length > 0) return;
    }

    const hits = this.raycaster.intersectObjects(this.surfaces);
    if (hits.length > 0) {
      this.createMarker(hits[0].point, hits[0].face.normal);
      if (this.audioEngine) {
        this.audioEngine.playPlaceSound();
      }
    }
  }

  onContextMenu(event) {
    event.preventDefault();
  }

  onMouseDown(event) {
    if (event.button !== 2) return;
    event.preventDefault();
    if (document.pointerLockElement !== this.domElement) return;
    
    if (this.holographicInput && this.holographicInput.isOpen()) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const markerMeshes = this.markers.map(m => m.shell);
    const hits = this.raycaster.intersectObjects(markerMeshes);
    
    if (hits.length > 0) {
      const shellMesh = hits[0].object;
      const marker = this.markers.find(m => m.shell === shellMesh);
      if (marker && this.onEditMarker) {
        this.onEditMarker(marker);
      }
    }
  }

  getUpdateCallback() {
    return (delta, elapsed) => {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const markerMeshes = this.markers.map(m => m.shell);
      const hits = this.raycaster.intersectObjects(markerMeshes);
      
      const currentHover = hits.length > 0 ? this.markers.find(m => m.shell === hits[0].object) : null;
      
      this.hoveredMarker = currentHover;

      this.markers.forEach((marker, index) => {
        const isHovered = marker === this.hoveredMarker;
        
        const targetScale = isHovered ? 1.3 : (0.95 + 0.05 * Math.sin(elapsed * 2 + marker.id.length % 10));
        marker.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);
        
        marker.shell.material.emissiveIntensity = THREE.MathUtils.lerp(marker.shell.material.emissiveIntensity, isHovered ? 0.6 : 0.2, delta * 10);
        marker.core.material.opacity = 0.5 + 0.4 * Math.sin(elapsed * 4 + index);
      });
    };
  }

  clearAllMarkers() {
    this.markers.forEach(marker => {
      if (marker.label) {
        marker.label.material.map.dispose();
        marker.label.material.dispose();
      }
      marker.shell.geometry.dispose();
      marker.shell.material.dispose();
      marker.core.geometry.dispose();
      marker.core.material.dispose();
      this.scene.remove(marker.group);
    });
    this.markers = [];
  }

  loadMarkers(markersData) {
    this.clearAllMarkers();
    if (!markersData) return;

    markersData.forEach(data => {
      const group = new THREE.Group();
      
      const shellGeo = new THREE.IcosahedronGeometry(0.25, 1);
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: '#00f5d4',
        roughness: 0.15,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 0.5,
        ior: 1.5,
        iridescence: 1.0,
        iridescenceIOR: 1.3,
        transparent: true,
        opacity: 0.7,
        emissive: '#00f5d4',
        emissiveIntensity: 0.2
      });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      group.add(shell);

      const coreGeo = new THREE.SphereGeometry(0.08);
      const coreMat = new THREE.MeshBasicMaterial({
        color: '#00f5d4',
        transparent: true,
        opacity: 0.9
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      const light = new THREE.PointLight('#00f5d4', 2, 5, 2);
      group.add(light);

      const pos = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
      group.position.copy(pos);

      this.scene.add(group);

      const marker = {
        id: data.id || (Date.now() + Math.random().toString(36).substring(7)),
        position: pos,
        heading: data.heading || '',
        body: data.body || '',
        group: group,
        shell: shell,
        core: core,
        light: light,
        label: null
      };

      this.markers.push(marker);
      this.updateMarkerLabel(marker);
    });
  }

  dispose() {
    this.domElement.removeEventListener('click', this.onClick);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('contextmenu', this.onContextMenu);
    this.clearAllMarkers();
  }
}
