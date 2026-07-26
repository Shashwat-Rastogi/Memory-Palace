import * as THREE from 'three';

export default class PlayerController {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    
    this.camera.rotation.order = 'YXZ';
    
    this.yaw = 0;
    this.pitch = 0;
    this.position = new THREE.Vector3(0, 2, 0);
    this.camera.position.copy(this.position);
    
    this.moveSpeed = 4;
    this.sprintMultiplier = 2;
    this.sensitivity = 0.002;
    this.isLocked = false;
    this.enabled = true;
    
    this.keys = {};
    this.ripples = [];
    
    this.bounds = {
      minX: -9.5,
      maxX: 9.5,
      minZ: -9.5,
      maxZ: 9.5,
      minY: 0.5,
      maxY: 10
    };

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  onMouseMove(event) {
    if (!this.isLocked || !this.enabled) return;
    this.yaw -= event.movementX * this.sensitivity;
    this.pitch -= event.movementY * this.sensitivity;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
    
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  onKeyDown(event) {
    if (!this.enabled) return;
    this.keys[event.code] = true;
  }

  onKeyUp(event) {
    this.keys[event.code] = false;
  }

  clearKeys() {
    for (const key in this.keys) {
      this.keys[key] = false;
    }
  }

  createRipple(pos, normal) {
    const geo = new THREE.RingGeometry(0.1, 0.5, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: '#00f5d4',
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(normal));
    
    this.scene.add(mesh);
    this.ripples.push({ mesh, age: 0 });
  }

  getUpdateCallback() {
    return (delta) => {
      if (!this.isLocked || !this.enabled) return;

      const speed = this.moveSpeed * (this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? this.sprintMultiplier : 1) * delta;
      
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      
      const right = new THREE.Vector3(1, 0, 0);
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      
      const move = new THREE.Vector3();
      
      if (this.keys['KeyW']) move.add(forward);
      if (this.keys['KeyS']) move.sub(forward);
      if (this.keys['KeyA']) move.sub(right);
      if (this.keys['KeyD']) move.add(right);
      if (this.keys['Space']) move.y += 1;
      if (this.keys['ControlLeft'] || this.keys['ControlRight']) move.y -= 1;
      
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        const nextPos = this.position.clone().add(move);
        
        let ripplePos = null;
        let rippleNorm = null;

        if (nextPos.x < this.bounds.minX) {
          nextPos.x = this.bounds.minX;
          ripplePos = new THREE.Vector3(this.bounds.minX, nextPos.y, nextPos.z);
          rippleNorm = new THREE.Vector3(1, 0, 0);
        } else if (nextPos.x > this.bounds.maxX) {
          nextPos.x = this.bounds.maxX;
          ripplePos = new THREE.Vector3(this.bounds.maxX, nextPos.y, nextPos.z);
          rippleNorm = new THREE.Vector3(-1, 0, 0);
        }
        
        if (nextPos.z < this.bounds.minZ) {
          nextPos.z = this.bounds.minZ;
          ripplePos = new THREE.Vector3(nextPos.x, nextPos.y, this.bounds.minZ);
          rippleNorm = new THREE.Vector3(0, 0, 1);
        } else if (nextPos.z > this.bounds.maxZ) {
          nextPos.z = this.bounds.maxZ;
          ripplePos = new THREE.Vector3(nextPos.x, nextPos.y, this.bounds.maxZ);
          rippleNorm = new THREE.Vector3(0, 0, -1);
        }
        
        if (nextPos.y < this.bounds.minY) {
          nextPos.y = this.bounds.minY;
          ripplePos = new THREE.Vector3(nextPos.x, this.bounds.minY, nextPos.z);
          rippleNorm = new THREE.Vector3(0, 1, 0);
        } else if (nextPos.y > this.bounds.maxY) {
          nextPos.y = this.bounds.maxY;
          ripplePos = new THREE.Vector3(nextPos.x, this.bounds.maxY, nextPos.z);
          rippleNorm = new THREE.Vector3(0, -1, 0);
        }

        if (ripplePos && Math.random() < 0.1) {
          this.createRipple(ripplePos, rippleNorm);
        }

        this.position.copy(nextPos);
        this.camera.position.copy(this.position);
      }

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.age += delta;
        if (r.age > 0.6) {
          this.scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          r.mesh.material.dispose();
          this.ripples.splice(i, 1);
        } else {
          const progress = r.age / 0.6;
          const scale = 1 + progress * 2;
          r.mesh.scale.set(scale, scale, scale);
          r.mesh.material.opacity = 0.6 * (1 - progress);
        }
      }
    };
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }
}
