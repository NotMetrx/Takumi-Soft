import * as THREE from 'three';

/**
 * Sistema Frugal de Partículas Físicas y Efectos del Laboratorio
 * Diseñado para correr a 60 FPS estables en PCs de bajos recursos (Chromebooks / GPUs integradas).
 */
export class LabSafetyFXSystem {
  group: THREE.Group;

  // 1. Ducha de Emergencia (Emergency Shower Waterfall)
  private showerPoints: THREE.Points;
  private showerPositions: Float32Array;
  private showerVelocities: Float32Array;
  private showerActive = false;
  private showerTimer = 0;

  // 2. Lavaojos (Eyewash Dual Spray)
  private eyewashPoints: THREE.Points;
  private eyewashPositions: Float32Array;
  private eyewashVelocities: Float32Array;
  private eyewashActive = false;
  private eyewashTimer = 0;

  // 3. Vapores de Reactor / Ebullición Química
  private vaporPoints: THREE.Points;
  private vaporPositions: Float32Array;
  private vaporActive = false;

  // 4. Nube Criogénica de CO2 del Extintor
  private co2Points: THREE.Points;
  private co2Positions: Float32Array;
  private co2Velocities: Float32Array;
  private co2Active = false;
  private co2Timer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'LabSafetyFXSystem';

    // 1. Ducha de Seguridad (60 gotas recicladas)
    const showerCount = 60;
    this.showerPositions = new Float32Array(showerCount * 3);
    this.showerVelocities = new Float32Array(showerCount * 3);
    const showerGeo = new THREE.BufferGeometry();
    showerGeo.setAttribute('position', new THREE.BufferAttribute(this.showerPositions, 3));

    const showerMat = new THREE.PointsMaterial({
      color: 0x67e8f9, // Cian agua cristalina
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.showerPoints = new THREE.Points(showerGeo, showerMat);
    this.showerPoints.visible = false;
    this.group.add(this.showerPoints);

    // 2. Lavaojos de Emergencia (35 gotas aireadas)
    const eyewashCount = 35;
    this.eyewashPositions = new Float32Array(eyewashCount * 3);
    this.eyewashVelocities = new Float32Array(eyewashCount * 3);
    const eyewashGeo = new THREE.BufferGeometry();
    eyewashGeo.setAttribute('position', new THREE.BufferAttribute(this.eyewashPositions, 3));

    const eyewashMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    this.eyewashPoints = new THREE.Points(eyewashGeo, eyewashMat);
    this.eyewashPoints.visible = false;
    this.group.add(this.eyewashPoints);

    // 3. Vapores de Ebullición Química (28 partículas de gas translúcido)
    const vaporCount = 28;
    this.vaporPositions = new Float32Array(vaporCount * 3);
    const vaporGeo = new THREE.BufferGeometry();
    vaporGeo.setAttribute('position', new THREE.BufferAttribute(this.vaporPositions, 3));

    const vaporMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 0.08,
      transparent: true,
      opacity: 0.35
    });
    this.vaporPoints = new THREE.Points(vaporGeo, vaporMat);
    this.vaporPoints.visible = false;
    this.group.add(this.vaporPoints);

    // 4. Extintor Nube Criogénica de CO2 (70 partículas a presión)
    const co2Count = 70;
    this.co2Positions = new Float32Array(co2Count * 3);
    this.co2Velocities = new Float32Array(co2Count * 3);
    const co2Geo = new THREE.BufferGeometry();
    co2Geo.setAttribute('position', new THREE.BufferAttribute(this.co2Positions, 3));

    const co2Mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.09,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.co2Points = new THREE.Points(co2Geo, co2Mat);
    this.co2Points.visible = false;
    this.group.add(this.co2Points);

    // Inicializar posiciones en reposo
    this.resetShowerParticles();
    this.resetEyewashParticles();
    this.resetVaporParticles();
    this.resetCO2Particles();
  }

  // --- DUCHA DE SEGURIDAD ---
  private resetShowerParticles() {
    const origin = new THREE.Vector3(-10.0, 2.32, 2.81); // Boca de la campana en esclusa SAS
    for (let i = 0; i < 60; i++) {
      const idx = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.16;
      this.showerPositions[idx] = origin.x + Math.cos(angle) * radius;
      this.showerPositions[idx + 1] = origin.y - Math.random() * 2.2;
      this.showerPositions[idx + 2] = origin.z + Math.sin(angle) * radius;

      this.showerVelocities[idx] = (Math.random() - 0.5) * 0.2;
      this.showerVelocities[idx + 1] = -(2.5 + Math.random() * 1.5); // Caída vertical
      this.showerVelocities[idx + 2] = (Math.random() - 0.5) * 0.2;
    }
  }

  triggerShower(durationSec = 6.0) {
    this.showerActive = true;
    this.showerTimer = durationSec;
    this.showerPoints.visible = true;
    this.resetShowerParticles();
  }

  // --- LAVAOJOS ---
  private resetEyewashParticles() {
    const origin = new THREE.Vector3(-10.0, 1.055, 2.97); // Boquillas del lavaojos en esclusa SAS
    for (let i = 0; i < 35; i++) {
      const idx = i * 3;
      const side = i % 2 === 0 ? -0.045 : 0.045;
      this.eyewashPositions[idx] = origin.x + side;
      this.eyewashPositions[idx + 1] = origin.y + Math.random() * 0.12;
      this.eyewashPositions[idx + 2] = origin.z;

      this.eyewashVelocities[idx] = -side * 0.6; // Convergen al centro
      this.eyewashVelocities[idx + 1] = 0.8 + Math.random() * 0.4; // Chorro hacia arriba
      this.eyewashVelocities[idx + 2] = (Math.random() - 0.5) * 0.15;
    }
  }

  triggerEyewash(durationSec = 5.0) {
    this.eyewashActive = true;
    this.eyewashTimer = durationSec;
    this.eyewashPoints.visible = true;
    this.resetEyewashParticles();
  }

  // --- VAPOR DEL REACTOR ---
  private resetVaporParticles() {
    for (let i = 0; i < 28; i++) {
      const idx = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.12;
      this.vaporPositions[idx] = Math.cos(angle) * radius;
      this.vaporPositions[idx + 1] = 0.25 + Math.random() * 0.45;
      this.vaporPositions[idx + 2] = Math.sin(angle) * radius;
    }
  }

  setReactorVapor(active: boolean, intensity = 1.0) {
    this.vaporActive = active;
    this.vaporPoints.visible = active;
    (this.vaporPoints.material as THREE.PointsMaterial).opacity = Math.min(0.55, 0.2 + intensity * 0.35);
  }

  // --- EXTINTOR CO2 ---
  private resetCO2Particles() {
    const nozzlePos = new THREE.Vector3(-8.1, 1.09, 0.9);
    for (let i = 0; i < 70; i++) {
      const idx = i * 3;
      this.co2Positions[idx] = nozzlePos.x;
      this.co2Positions[idx + 1] = nozzlePos.y;
      this.co2Positions[idx + 2] = nozzlePos.z;

      // Disparo cónico hacia el interior del laboratorio (+X)
      this.co2Velocities[idx] = 4.2 + Math.random() * 2.0;
      this.co2Velocities[idx + 1] = (Math.random() - 0.5) * 0.8;
      this.co2Velocities[idx + 2] = (Math.random() - 0.5) * 1.6;
    }
  }

  triggerExtinguisherDischarge(durationSec = 2.2) {
    this.co2Active = true;
    this.co2Timer = durationSec;
    this.co2Points.visible = true;
    this.resetCO2Particles();
  }

  /**
   * Bucle físico de simulación de partículas con reciclamiento contiguo O(1)
   */
  update(dt: number) {
    // 1. Actualizar Ducha
    if (this.showerActive) {
      this.showerTimer -= dt;
      if (this.showerTimer <= 0) {
        this.showerActive = false;
        this.showerPoints.visible = false;
      } else {
        const topY = 2.32;
        const originX = -10.0;
        const originZ = 2.81;
        for (let i = 0; i < 60; i++) {
          const idx = i * 3;
          this.showerPositions[idx + 1] += this.showerVelocities[idx + 1] * dt;
          this.showerPositions[idx] += this.showerVelocities[idx] * dt;
          this.showerPositions[idx + 2] += this.showerVelocities[idx + 2] * dt;

          // Si toca el suelo (Y <= 0.02), reciclar arriba
          if (this.showerPositions[idx + 1] <= 0.02) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.18;
            this.showerPositions[idx] = originX + Math.cos(angle) * radius;
            this.showerPositions[idx + 1] = topY;
            this.showerPositions[idx + 2] = originZ + Math.sin(angle) * radius;
          }
        }
        (this.showerPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 2. Actualizar Lavaojos
    if (this.eyewashActive) {
      this.eyewashTimer -= dt;
      if (this.eyewashTimer <= 0) {
        this.eyewashActive = false;
        this.eyewashPoints.visible = false;
      } else {
        const originX = -10.0;
        const originY = 1.055;
        const originZ = 2.97;
        for (let i = 0; i < 35; i++) {
          const idx = i * 3;
          this.eyewashVelocities[idx + 1] -= 3.8 * dt; // Gravedad
          this.eyewashPositions[idx] += this.eyewashVelocities[idx] * dt;
          this.eyewashPositions[idx + 1] += this.eyewashVelocities[idx + 1] * dt;
          this.eyewashPositions[idx + 2] += this.eyewashVelocities[idx + 2] * dt;

          if (this.eyewashPositions[idx + 1] < originY) {
            const side = i % 2 === 0 ? -0.045 : 0.045;
            this.eyewashPositions[idx] = originX + side;
            this.eyewashPositions[idx + 1] = originY;
            this.eyewashPositions[idx + 2] = originZ;
            this.eyewashVelocities[idx] = -side * 0.7;
            this.eyewashVelocities[idx + 1] = 0.8 + Math.random() * 0.4;
          }
        }
        (this.eyewashPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // 3. Actualizar Vapor del Reactor
    if (this.vaporActive) {
      for (let i = 0; i < 28; i++) {
        const idx = i * 3;
        this.vaporPositions[idx + 1] += 0.35 * dt; // Ascenso térmico
        this.vaporPositions[idx] += Math.sin(this.vaporPositions[idx + 1] * 8 + i) * 0.003;

        if (this.vaporPositions[idx + 1] > 0.85) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.12;
          this.vaporPositions[idx] = Math.cos(angle) * radius;
          this.vaporPositions[idx + 1] = 0.22;
          this.vaporPositions[idx + 2] = Math.sin(angle) * radius;
        }
      }
      (this.vaporPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // 4. Actualizar CO2 Extintor
    if (this.co2Active) {
      this.co2Timer -= dt;
      if (this.co2Timer <= 0) {
        this.co2Active = false;
        this.co2Points.visible = false;
      } else {
        const nozzleX = -8.1;
        const nozzleY = 1.09;
        const nozzleZ = 0.9;
        for (let i = 0; i < 70; i++) {
          const idx = i * 3;
          this.co2Positions[idx] += this.co2Velocities[idx] * dt;
          this.co2Positions[idx + 1] += this.co2Velocities[idx + 1] * dt;
          this.co2Positions[idx + 2] += this.co2Velocities[idx + 2] * dt;

          if (this.co2Positions[idx] > -4.5) {
            this.co2Positions[idx] = nozzleX;
            this.co2Positions[idx + 1] = nozzleY;
            this.co2Positions[idx + 2] = nozzleZ;
          }
        }
        (this.co2Points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }
  }
}
