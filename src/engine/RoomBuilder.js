import * as THREE from 'three';

export default class RoomBuilder {
  constructor(scene) {
    this.scene = scene;
    this.floatingCrystals = [];
    this.starfield = null;
    this.nebula = null;
    this.meshSurfaces = [];
  }

  build() {
    this.buildFloor();
    this.buildWalls();
    this.buildStarfield();
    this.buildFloatingCrystals();
    this.buildLighting();
    
    this.scene.fog = new THREE.Fog('#050510', 15, 80);
    return this.meshSurfaces;
  }

  buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0d0d2b',
      roughness: 0.3,
      metalness: 0.7
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    this.meshSurfaces.push(floorMesh);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(0,245,212,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(10, 10);

    const gridMat = new THREE.MeshBasicMaterial({
      map: gridTexture,
      transparent: true,
      depthWrite: false
    });
    const gridMesh = new THREE.Mesh(floorGeo, gridMat);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = 0.01;
    this.scene.add(gridMesh);
  }

  buildWalls() {
    const wallGeo = new THREE.PlaneGeometry(20, 12);
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: '#0a0a2e',
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: '#1a0a4e',
      transparent: true,
      opacity: 0.3
    });

    const positions = [
      { x: 0, z: -10, ry: 0 },
      { x: 0, z: 10, ry: Math.PI },
      { x: -10, z: 0, ry: Math.PI / 2 },
      { x: 10, z: 0, ry: -Math.PI / 2 }
    ];

    positions.forEach(pos => {
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(pos.x, 6, pos.z);
      wall.rotation.y = pos.ry;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.meshSurfaces.push(wall);

      const edgesGeo = new THREE.EdgesGeometry(wallGeo);
      const edges = new THREE.LineSegments(edgesGeo, edgeMat);
      edges.position.copy(wall.position);
      edges.rotation.copy(wall.rotation);
      this.scene.add(edges);
    });
  }

  buildStarfield() {
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = [];
    while (starsPos.length < 2000 * 3) {
      const x = (Math.random() - 0.5) * 300;
      const y = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      if (Math.abs(x) > 12 || Math.abs(z) > 12 || y < -2 || y > 14) {
        if (Math.sqrt(x * x + y * y + z * z) <= 150) {
          starsPos.push(x, y, z);
        }
      }
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });
    this.starfield = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.starfield);

    const palette = ['#00f5d4', '#b794f6', '#ffd700'];
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = [];
    const nebulaColors = [];
    const nebulaSizes = [];
    while (nebulaPos.length < 500 * 3) {
      const x = (Math.random() - 0.5) * 300;
      const y = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      if (Math.abs(x) > 12 || Math.abs(z) > 12 || y < -2 || y > 14) {
        if (Math.sqrt(x * x + y * y + z * z) <= 150) {
          nebulaPos.push(x, y, z);
          const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
          nebulaColors.push(color.r, color.g, color.b);
          nebulaSizes.push(0.3 + Math.random() * 0.3);
        }
      }
    }
    nebulaGeo.setAttribute('position', new THREE.Float32BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute('color', new THREE.Float32BufferAttribute(nebulaColors, 3));
    const nebulaMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6
    });
    this.nebula = new THREE.Points(nebulaGeo, nebulaMat);
    this.scene.add(this.nebula);
  }

  buildFloatingCrystals() {
    const palette = ['#00f5d4', '#b794f6', '#ffd700', '#ff6b9d'];
    for (let i = 0; i < 12; i++) {
      const radius = 0.3 + Math.random() * 0.5;
      const geo = new THREE.IcosahedronGeometry(radius);
      const color = palette[Math.floor(Math.random() * palette.length)];
      const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        iridescence: 1.0,
        iridescenceIOR: 1.5,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4
      });
      const mesh = new THREE.Mesh(geo, mat);
      
      let x, z;
      if (Math.random() > 0.5) {
        x = (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 20);
        z = (Math.random() - 0.5) * 40;
      } else {
        z = (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 20);
        x = (Math.random() - 0.5) * 40;
      }
      const y = -3 + Math.random() * 18;
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.floatingCrystals.push(mesh);
    }
  }

  buildLighting() {
    const ambient = new THREE.AmbientLight('#1a1a3e', 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight('#1a0a3e', '#050510', 0.4);
    this.scene.add(hemi);

    const mainLight = new THREE.PointLight('#4a3a8a', 15, 30, 2);
    mainLight.position.set(0, 10, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    this.scene.add(mainLight);

    const accentColors = ['#00f5d4', '#b794f6', '#ffd700', '#ff6b9d'];
    const accentPositions = [
      { x: 8, y: 3, z: 8 },
      { x: 8, y: 3, z: -8 },
      { x: -8, y: 3, z: 8 },
      { x: -8, y: 3, z: -8 }
    ];

    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(accentColors[i], 3, 15, 2);
      light.position.set(accentPositions[i].x, accentPositions[i].y, accentPositions[i].z);
      this.scene.add(light);
    }

    this.buildVoidGlow();
  }

  buildVoidGlow() {
    const glowColors = ['#0a1a4e', '#1a0a3e', '#0a2a3e', '#1a0a2e'];
    const glowPositions = [
      { x: 0, y: 6, z: -14, ry: 0 },
      { x: 0, y: 6, z: 14, ry: Math.PI },
      { x: -14, y: 6, z: 0, ry: Math.PI / 2 },
      { x: 14, y: 6, z: 0, ry: -Math.PI / 2 }
    ];

    glowPositions.forEach((pos, i) => {
      const glowGeo = new THREE.PlaneGeometry(30, 20);
      const glowMat = new THREE.MeshBasicMaterial({
        color: glowColors[i],
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(pos.x, pos.y, pos.z);
      glowMesh.rotation.y = pos.ry;
      this.scene.add(glowMesh);
    });

    const floorGlowGeo = new THREE.PlaneGeometry(24, 24);
    const floorGlowMat = new THREE.MeshBasicMaterial({
      color: '#0a0a3e',
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.y = -0.1;
    this.scene.add(floorGlow);
  }

  getUpdateCallback() {
    return (delta, elapsed) => {
      this.floatingCrystals.forEach((crystal, index) => {
        crystal.rotation.y += 0.2 * delta;
        crystal.rotation.x += 0.1 * delta;
        crystal.position.y += Math.sin(elapsed + index) * 0.003;
      });

      if (this.starfield) {
        this.starfield.rotation.y += 0.01 * delta;
      }
      if (this.nebula) {
        this.nebula.rotation.y += 0.01 * delta;
        this.nebula.material.opacity = 0.65 + Math.sin(elapsed * 0.5) * 0.25;
      }
    };
  }
}
