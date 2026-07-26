import * as THREE from 'three';

export default class HolographicInput {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.activePanel = null;
    this.activeMarker = null;
    this.heading = '';
    this.body = '';
    this.activeField = 'heading';
    this.cursorVisible = true;
    this.cursorInterval = null;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 320;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.raycaster = new THREE.Raycaster();

    this.onSave = null;
    this.onDelete = null;
    
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  isOpen() {
    return this.activePanel !== null;
  }

  open(marker, existingHeading, existingBody) {
    if (this.isOpen()) this.close();

    this.activeMarker = marker;
    this.heading = existingHeading || '';
    this.body = existingBody || '';
    this.activeField = this.heading ? 'body' : 'heading';
    
    const geo = new THREE.PlaneGeometry(2.4, 1.5);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    
    this.activePanel = new THREE.Mesh(geo, mat);
    this.activePanel.renderOrder = 999;
    
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.activePanel.position.copy(this.camera.position).add(dir.multiplyScalar(2));
    this.activePanel.position.y += 0.3;
    this.activePanel.lookAt(this.camera.position);
    
    this.scene.add(this.activePanel);
    
    this.cursorInterval = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.render();
    }, 500);
    
    document.addEventListener('keydown', this.onKeyDown);
    this.render();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    
    this.ctx.fillStyle = 'rgba(8, 8, 32, 0.94)';
    this.ctx.fillRect(0, 0, w, h);
    
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#00f5d4';
    this.ctx.strokeStyle = '#00f5d4';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, w - 2, h - 2);
    this.ctx.shadowBlur = 0;
    
    this.ctx.fillStyle = '#b794f6';
    this.ctx.font = 'bold 13px sans-serif';
    this.ctx.fillText('MEMORY NODE', 20, 24);

    this.ctx.beginPath();
    this.ctx.moveTo(20, 34);
    this.ctx.lineTo(w - 20, 34);
    this.ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    const headingActive = this.activeField === 'heading';
    const bodyActive = this.activeField === 'body';

    this.ctx.fillStyle = headingActive ? 'rgba(0, 245, 212, 0.08)' : 'transparent';
    this.ctx.fillRect(14, 40, w - 28, 36);
    this.ctx.strokeStyle = headingActive ? '#00f5d4' : 'rgba(0, 245, 212, 0.15)';
    this.ctx.lineWidth = headingActive ? 1.5 : 0.5;
    this.ctx.strokeRect(14, 40, w - 28, 36);

    this.ctx.fillStyle = 'rgba(0, 245, 212, 0.5)';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('HEADING', 22, 52);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    let headingDisplay = this.heading;
    if (headingActive && this.cursorVisible) headingDisplay += '|';
    if (!this.heading && !headingActive) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
      headingDisplay = 'Enter a title...';
    }
    this.ctx.fillText(headingDisplay, 22, 70, w - 44);

    this.ctx.fillStyle = bodyActive ? 'rgba(183, 148, 246, 0.06)' : 'transparent';
    this.ctx.fillRect(14, 84, w - 28, 130);
    this.ctx.strokeStyle = bodyActive ? '#b794f6' : 'rgba(183, 148, 246, 0.12)';
    this.ctx.lineWidth = bodyActive ? 1.5 : 0.5;
    this.ctx.strokeRect(14, 84, w - 28, 130);

    this.ctx.fillStyle = 'rgba(183, 148, 246, 0.5)';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('MEMORY', 22, 96);

    this.ctx.fillStyle = '#e0e0e0';
    this.ctx.font = '14px sans-serif';
    
    const maxWidth = w - 50;
    let textToRender = this.body;
    if (!this.body && !bodyActive) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
      textToRender = 'Describe your memory...';
    }
    
    const chars = textToRender.split('');
    let line = '';
    let y = 114;
    
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, 22, y);
        line = chars[i];
        y += 20;
        if (y > 200) break;
      } else {
        line = testLine;
      }
    }
    
    if (bodyActive && this.cursorVisible) line += '|';
    this.ctx.fillText(line, 22, y);

    this.ctx.fillStyle = 'rgba(0, 245, 212, 0.9)';
    this.roundRect(20, h - 50, 90, 32, 4);
    this.ctx.fill();
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 13px sans-serif';
    this.ctx.fillText('SAVE', 46, h - 30);
    
    this.ctx.fillStyle = 'rgba(255, 107, 157, 0.9)';
    this.roundRect(126, h - 50, 90, 32, 4);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('DELETE', 146, h - 30);

    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('ENTER next  \u00b7  TAB switch  \u00b7  ESC cancel', 240, h - 30);
    
    this.texture.needsUpdate = true;
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  onKeyDown(event) {
    if (!this.isOpen()) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'Enter') {
      if (this.activeField === 'heading') {
        this.activeField = 'body';
        this.render();
      } else {
        this.save();
      }
    } else if (event.key === 'Tab') {
      this.activeField = this.activeField === 'heading' ? 'body' : 'heading';
      this.render();
    } else if (event.key === 'Backspace') {
      if (this.activeField === 'heading') {
        this.heading = this.heading.slice(0, -1);
      } else {
        this.body = this.body.slice(0, -1);
      }
      this.render();
    } else if (event.key.length === 1) {
      if (this.activeField === 'heading') {
        this.heading += event.key;
      } else {
        this.body += event.key;
      }
      this.render();
    }
  }

  onClick(event) {
    if (!this.isOpen()) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObject(this.activePanel);
    
    if (hits.length > 0) {
      const uv = hits[0].uv;
      const x = uv.x * this.canvas.width;
      const y = (1 - uv.y) * this.canvas.height;
      
      if (y >= 40 && y <= 76) {
        this.activeField = 'heading';
        this.render();
      } else if (y >= 84 && y <= 214) {
        this.activeField = 'body';
        this.render();
      } else if (y >= this.canvas.height - 50 && y <= this.canvas.height - 18) {
        if (x >= 20 && x <= 110) {
          this.save();
        } else if (x >= 126 && x <= 216) {
          this.delete();
        }
      }
    }
  }

  save() {
    if (this.activeMarker) {
      this.activeMarker.heading = this.heading;
      this.activeMarker.body = this.body;
      if (this.onSave) this.onSave(this.activeMarker);
    }
    this.close();
  }

  delete() {
    if (this.activeMarker && this.onDelete) {
      this.onDelete(this.activeMarker);
    }
    this.close();
  }

  close() {
    if (!this.isOpen()) return;
    
    this.scene.remove(this.activePanel);
    this.activePanel.geometry.dispose();
    this.activePanel.material.dispose();
    
    clearInterval(this.cursorInterval);
    document.removeEventListener('keydown', this.onKeyDown);
    
    this.activePanel = null;
    this.activeMarker = null;
    this.heading = '';
    this.body = '';
  }
}
