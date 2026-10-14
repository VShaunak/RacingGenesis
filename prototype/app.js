/**
 * Racing Genesis - Assignment 3 MVP Advanced Simulator (Windows 11 Edition v3.0)
 *
 * Technologies: Three.js, WebGL, Web Audio API, ES Modules.
 * Core Features:
 * - 3D In-Car Physical Digital Dashboard mounted on steering wheel (Gears 1-8, Speed, RPM, Laps, Shift Lights)
 * - Start/Finish Gantry & Checkered Line fixed perfectly horizontal across track width
 * - Smooth Vehicle Physics (Jerk-limited acceleration, progressive threshold braking, smooth bicycle steering, natural cornering tire scrub)
 * - Real-life F1 Performance (220+ mph straights, 0-60 in 2.4s, 5.0G peak braking)
 * - Microsoft Windows 11 Fluent style interface with collapsible left and right drawer panels
 * - Curvilinear aerodynamic real-life F1 bodywork (curved aerofoils, organic nosecone, contoured sidepods, Halo, shark fin)
 * - Clearly visible spinning wheels with rotating spokes, anodized center nuts, and Pirelli sidewall markings
 * - 60+ FPS zero-allocation physics loop
 */

import * as THREE from "./three.module.js";

// Unit conversions
const MS_TO_MPH = 2.23694;
const MPH_TO_MS = 1 / MS_TO_MPH;
const G_ACCEL = 9.81;

// DOM helper
const $ = (id) => document.getElementById(id);
const setElText = (id, txt) => {
  const el = $(id);
  if (el) el.textContent = txt;
};

// Pre-allocated scratch vectors for zero runtime GC allocations (Rock-solid 60+ FPS)
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _pPrev = new THREE.Vector3();
const _pCurr = new THREE.Vector3();
const _pNext = new THREE.Vector3();
const _crossVec = new THREE.Vector3();
const _lookAtPt = new THREE.Vector3();
const _currentCarPos = new THREE.Vector3();
const _targetTrajectoryPt = new THREE.Vector3();
const _trajectoryVec = new THREE.Vector3();
const _hPrev = new THREE.Vector3();
const _hNext = new THREE.Vector3();
const _camForwardVec = new THREE.Vector3();
const _scratchTangent = new THREE.Vector3();
const _scratchNormal = new THREE.Vector3();

/* ==========================================================================
   Procedural Textures (Self-Contained, Zero External Dependencies)
   ========================================================================== */

function createGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#26541e";
  ctx.fillRect(0, 0, 512, 512);

  // Mowing stripes
  const stripeWidth = 64;
  for (let x = 0; x < 512; x += stripeWidth * 2) {
    ctx.fillStyle = "#2e6624";
    ctx.fillRect(x, 0, stripeWidth, 512);
  }

  // Subtle organic blade noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.7));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.5));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(36, 36);
  return texture;
}

function createCheckeredFinishTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const rows = 4;
  const cols = 16;
  const sqW = 512 / cols;
  const sqH = 128 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#ffffff" : "#111418";
      ctx.fillRect(c * sqW, r * sqH, sqW, sqH);
    }
  }

  ctx.fillStyle = "#ffd200";
  ctx.fillRect(0, 0, 512, 4);
  ctx.fillRect(0, 124, 512, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function createGantryBannerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c1018";
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = "#0078d4";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 1012, 244);

  ctx.fillStyle = "#60cdff";
  ctx.font = "bold 32px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CIRCUIT DE RACING GENESIS", 512, 60);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 76px 'Segoe UI', sans-serif";
  ctx.fillText("START / FINISH", 512, 145);

  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 28px monospace";
  ctx.fillText("OFFICIAL FIA VERIFIED TIMING TRAP \u2022 SECTOR 1", 512, 210);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createWheelSidewallTexture(colorHex = "#ffd200") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 256, 256);

  // Outer dark tire rubber
  ctx.fillStyle = "#181a1e";
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.arc(128, 128, 70, 0, Math.PI * 2, true);
  ctx.fill();

  // Vibrant Pirelli sidewall color ring
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 102, 0, Math.PI * 2);
  ctx.stroke();

  // 4 High-contrast white tire brand marks at 90-degree quadrants
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const labels = ["P ZERO", "RG3", "P ZERO", "F1"];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(angle);
    ctx.translate(0, -102);
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/* ==========================================================================
   3D Procedural Spline Track with Perfectly Horizontal Start/Finish
   ========================================================================== */

class Track3D {
  constructor(scene) {
    this.scene = scene;
    this.app = null;
    this.activePathOffsets = null;
    this.lengthScale = 1.0;
    this.roadWidth = 12.0;
    this.curveStrength = 0.45;
    this.sampleCount = 360;
    this.samples = [];

    // Control anchor points
    this.controlAnchorCount = 10;
    this.controlPoints = [];
    this.handleObjects = [];
    this.handleMeshes = [];
    this.editHandlesVisible = false;

    // Groups
    this.trackGroup = new THREE.Group();
    this.handleGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.scene.add(this.handleGroup);

    this.roadMesh = null;
    this.curbMesh = null;
    this.racingLineMesh = null;
    this.brakingZoneMesh = null;
    this.denseStressMode = false;

    this.initControlPoints();
    this.build3DHandles();
    this.rebuildTrackFromPoints();
  }

  initControlPoints() {
    this.controlPoints = [];
    const baseRx = 88 * this.lengthScale;
    const baseRz = 48 * this.lengthScale;

    for (let i = 0; i < this.controlAnchorCount; i++) {
      const angle = (i / this.controlAnchorCount) * Math.PI * 2;
      const warp = Math.sin(angle * 2) * 0.22 * this.curveStrength;
      const x = Math.cos(angle) * baseRx * (1 + warp);
      const z = Math.sin(angle) * baseRz + Math.cos(angle * 2) * baseRz * 0.2 * this.curveStrength;
      this.controlPoints.push(new THREE.Vector3(x, 0.05, z));
    }
  }

  setParameters(scale, width, curve) {
    this.lengthScale = scale;
    this.roadWidth = width;
    this.curveStrength = curve;
    this.initControlPoints();
    this.updateAllHandleVisuals();
    this.rebuildTrackFromPoints();
  }

  loadF1Preset(presetKey) {
    const presets = {
      monza: {
        name: "Monza (Temple of Speed)",
        points: [
          new THREE.Vector3(-60, 0.05, 55),
          new THREE.Vector3(-10, 0.05, 55),
          new THREE.Vector3(45, 0.05, 55),
          new THREE.Vector3(80, 0.05, 48),
          new THREE.Vector3(95, 0.05, 20),
          new THREE.Vector3(90, 0.05, -20),
          new THREE.Vector3(65, 0.05, -42),
          new THREE.Vector3(25, 0.05, -58),
          new THREE.Vector3(-25, 0.05, -60),
          new THREE.Vector3(-65, 0.05, -50),
          new THREE.Vector3(-92, 0.05, -20),
          new THREE.Vector3(-92, 0.05, 22),
          new THREE.Vector3(-75, 0.05, 48),
        ],
      },
      silverstone: {
        name: "Silverstone (British GP)",
        points: [
          new THREE.Vector3(-55, 0.05, 50),
          new THREE.Vector3(-10, 0.05, 52),
          new THREE.Vector3(38, 0.05, 48),
          new THREE.Vector3(68, 0.05, 35),
          new THREE.Vector3(82, 0.05, 10),
          new THREE.Vector3(66, 0.05, -12),
          new THREE.Vector3(50, 0.05, -28),
          new THREE.Vector3(70, 0.05, -50),
          new THREE.Vector3(40, 0.05, -62),
          new THREE.Vector3(-15, 0.05, -60),
          new THREE.Vector3(-65, 0.05, -45),
          new THREE.Vector3(-85, 0.05, -15),
          new THREE.Vector3(-80, 0.05, 25),
        ],
      },
      spa: {
        name: "Spa-Francorchamps (Ardennes)",
        points: [
          new THREE.Vector3(-50, 0.05, 52),
          new THREE.Vector3(-5, 0.05, 52),
          new THREE.Vector3(35, 0.05, 52),
          new THREE.Vector3(60, 0.05, 46),
          new THREE.Vector3(85, 0.05, 30),
          new THREE.Vector3(95, 0.05, -5),
          new THREE.Vector3(75, 0.05, -35),
          new THREE.Vector3(45, 0.05, -55),
          new THREE.Vector3(-5, 0.05, -62),
          new THREE.Vector3(-55, 0.05, -52),
          new THREE.Vector3(-88, 0.05, -25),
          new THREE.Vector3(-95, 0.05, 10),
          new THREE.Vector3(-78, 0.05, 38),
        ],
      },
      monaco: {
        name: "Monaco (Monte Carlo)",
        points: [
          new THREE.Vector3(-45, 0.05, 45),
          new THREE.Vector3(-5, 0.05, 48),
          new THREE.Vector3(35, 0.05, 46),
          new THREE.Vector3(65, 0.05, 38),
          new THREE.Vector3(78, 0.05, 18),
          new THREE.Vector3(60, 0.05, 2),
          new THREE.Vector3(72, 0.05, -16),
          new THREE.Vector3(56, 0.05, -36),
          new THREE.Vector3(18, 0.05, -48),
          new THREE.Vector3(-25, 0.05, -52),
          new THREE.Vector3(-58, 0.05, -36),
          new THREE.Vector3(-72, 0.05, -12),
          new THREE.Vector3(-62, 0.05, 15),
          new THREE.Vector3(-68, 0.05, 32),
        ],
      },
      suzuka: {
        name: "Suzuka (Japanese GP)",
        points: [
          new THREE.Vector3(-55, 0.05, 48),
          new THREE.Vector3(-10, 0.05, 50),
          new THREE.Vector3(30, 0.05, 48),
          new THREE.Vector3(62, 0.05, 36),
          new THREE.Vector3(78, 0.05, 14),
          new THREE.Vector3(60, 0.05, -8),
          new THREE.Vector3(76, 0.05, -28),
          new THREE.Vector3(50, 0.05, -48),
          new THREE.Vector3(8, 0.05, -58),
          new THREE.Vector3(-38, 0.05, -52),
          new THREE.Vector3(-72, 0.05, -36),
          new THREE.Vector3(-88, 0.05, -10),
          new THREE.Vector3(-76, 0.05, 20),
        ],
      },
    };

    const preset = presets[presetKey] || presets.monza;
    this.controlPoints = preset.points.map(
      (p) => new THREE.Vector3(p.x * this.lengthScale, 0.05, p.z * this.lengthScale)
    );
    this.controlAnchorCount = this.controlPoints.length;
    this.build3DHandles();
    this.rebuildTrackFromPoints();

    if (this.app) {
      this.app.reset();
    }
  }

  randomize() {
    this.curveStrength = 0.35 + Math.random() * 0.4;
    $("curveSlider").value = this.curveStrength.toFixed(2);
    $("curveOut").value = this.curveStrength.toFixed(2);

    const baseRx = 88 * this.lengthScale;
    const baseRz = 48 * this.lengthScale;
    this.controlPoints = [];
    for (let i = 0; i < this.controlAnchorCount; i++) {
      const angle = (i / this.controlAnchorCount) * Math.PI * 2;
      const radialJitter = 1.0 + (Math.random() - 0.5) * 0.5 * this.curveStrength;
      const warp = Math.sin(angle * 2) * 0.25 * this.curveStrength;
      const x = Math.cos(angle) * baseRx * radialJitter * (1 + warp);
      const z = Math.sin(angle) * baseRz * radialJitter + Math.cos(angle * 2) * baseRz * 0.22 * this.curveStrength;
      this.controlPoints.push(new THREE.Vector3(x, 0.05, z));
    }
    this.updateAllHandleVisuals();
    this.rebuildTrackFromPoints();
  }

  setStressGeometry(dense) {
    this.denseStressMode = dense;
    this.sampleCount = dense ? 720 : 360;
    this.rebuildTrackFromPoints();
  }

  setHairpinStress() {
    this.curveStrength = 0.85;
    $("curveSlider").value = "0.85";
    $("curveOut").value = "0.85";
    const baseRx = 88 * this.lengthScale;
    const baseRz = 48 * this.lengthScale;
    this.controlPoints = [];
    for (let i = 0; i < this.controlAnchorCount; i++) {
      const angle = (i / this.controlAnchorCount) * Math.PI * 2;
      const zigzag = i % 2 === 0 ? 1.35 : 0.65;
      const x = Math.cos(angle) * baseRx * zigzag;
      const z = Math.sin(angle) * baseRz * (i % 3 === 0 ? 1.4 : 0.7);
      this.controlPoints.push(new THREE.Vector3(x, 0.05, z));
    }
    this.updateAllHandleVisuals();
    this.rebuildTrackFromPoints();
  }

  toggleEditHandles() {
    this.editHandlesVisible = !this.editHandlesVisible;
    this.handleGroup.visible = this.editHandlesVisible;
    const btn = $("btnEditHandles");
    if (btn) btn.classList.toggle("active", this.editHandlesVisible);
    const notice = $("handleNotice");
    if (notice) notice.classList.toggle("visible", this.editHandlesVisible);
  }

  scaleTrack(factor) {
    let cx = 0;
    let cz = 0;
    for (const p of this.controlPoints) {
      cx += p.x;
      cz += p.z;
    }
    cx /= this.controlPoints.length;
    cz /= this.controlPoints.length;

    for (const p of this.controlPoints) {
      p.x = cx + (p.x - cx) * factor;
      p.z = cz + (p.z - cz) * factor;
    }

    this.updateAllHandleVisuals();
    this.rebuildTrackFromPoints();
  }

  moveAnchor(index, newX, newZ) {
    if (!this.controlPoints[index]) return;
    this.controlPoints[index].x = newX;
    this.controlPoints[index].z = newZ;

    const h = this.handleObjects[index];
    if (h) {
      h.sphere.position.set(newX, 1.2, newZ);
      h.ring.position.set(newX, 0.04, newZ);
      const stemPos = h.stem.geometry.attributes.position.array;
      stemPos[0] = newX;
      stemPos[1] = 0.04;
      stemPos[2] = newZ;
      stemPos[3] = newX;
      stemPos[4] = 1.2;
      stemPos[5] = newZ;
      h.stem.geometry.attributes.position.needsUpdate = true;
      if (h.pickProxy) {
        h.pickProxy.position.set(newX, 1.2, newZ);
      }
    }

    this.rebuildTrackFromPoints();
  }

  highlightHandle(index, active, hover) {
    const h = this.handleObjects[index];
    if (!h) return;
    h.userData = h.userData || {};
    h.userData.active = active;
    h.userData.hover = hover;

    if (active) {
      h.sphere.material.color.setHex(0xffe600);
      h.sphere.material.emissive.setHex(0xffaa00);
      h.sphere.material.emissiveIntensity = 1.4;
      h.ring.material.color.setHex(0xffe600);
    } else if (hover) {
      h.sphere.material.color.setHex(0x00ffee);
      h.sphere.material.emissive.setHex(0x00ffee);
      h.sphere.material.emissiveIntensity = 1.0;
      h.ring.material.color.setHex(0x00ffee);
    } else {
      h.sphere.material.color.setHex(0x0078d4);
      h.sphere.material.emissive.setHex(0x004578);
      h.sphere.material.emissiveIntensity = 0.7;
      h.ring.material.color.setHex(0x0078d4);
    }
  }

  build3DHandles() {
    while (this.handleGroup.children.length > 0) {
      const child = this.handleGroup.children[0];
      this.handleGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.handleObjects = [];
    this.handleMeshes = [];

    const sphereGeom = new THREE.SphereGeometry(0.55, 24, 24);
    const ringGeom = new THREE.RingGeometry(0.65, 0.95, 32);

    for (let i = 0; i < this.controlAnchorCount; i++) {
      const p = this.controlPoints[i];

      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x0078d4,
        emissive: 0x004578,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.85,
      });

      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.set(p.x, 1.2, p.z);
      sphere.castShadow = true;
      sphere.userData = { anchorIndex: i, isHandle: true };
      this.handleGroup.add(sphere);

      const proxyGeom = new THREE.SphereGeometry(2.4, 8, 8);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const pickProxy = new THREE.Mesh(proxyGeom, proxyMat);
      pickProxy.position.set(p.x, 1.2, p.z);
      pickProxy.userData = { anchorIndex: i, isHandle: true };
      this.handleGroup.add(pickProxy);
      this.handleMeshes.push(pickProxy);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0078d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.04, p.z);
      this.handleGroup.add(ring);

      const stemGeom = new THREE.BufferGeometry();
      const stemPts = new Float32Array([p.x, 0.04, p.z, p.x, 1.2, p.z]);
      stemGeom.setAttribute("position", new THREE.BufferAttribute(stemPts, 3));
      const stemMat = new THREE.LineBasicMaterial({
        color: 0x0078d4,
        transparent: true,
        opacity: 0.75,
        linewidth: 2,
      });
      const stem = new THREE.Line(stemGeom, stemMat);
      this.handleGroup.add(stem);

      this.handleObjects.push({ sphere, ring, stem, pickProxy });
    }

    this.handleGroup.visible = this.editHandlesVisible;
  }

  updateAllHandleVisuals() {
    for (let i = 0; i < this.controlPoints.length; i++) {
      const p = this.controlPoints[i];
      const h = this.handleObjects[i];
      if (h) {
        h.sphere.position.set(p.x, 1.2, p.z);
        h.ring.position.set(p.x, 0.04, p.z);
        if (h.pickProxy) h.pickProxy.position.set(p.x, 1.2, p.z);
        const stemPos = h.stem.geometry.attributes.position.array;
        stemPos[0] = p.x;
        stemPos[1] = 0.04;
        stemPos[2] = p.z;
        stemPos[3] = p.x;
        stemPos[4] = 1.2;
        stemPos[5] = p.z;
        h.stem.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  updateHandleScales(camera) {
    if (!this.editHandlesVisible || !camera) return;
    const camPos = camera.position;
    for (let i = 0; i < this.handleObjects.length; i++) {
      const h = this.handleObjects[i];
      if (!h || !h.sphere) continue;
      const dist = camPos.distanceTo(h.sphere.position);
      const baseScale = Math.max(0.4, Math.min(2.4, dist * 0.007));
      const activeScale = h.userData && h.userData.hover ? 1.25 : (h.userData && h.userData.active ? 1.4 : 1.0);
      const finalScale = baseScale * activeScale;
      h.sphere.scale.setScalar(finalScale);
      h.ring.scale.setScalar(finalScale);
    }
  }

  rebuildTrackFromPoints() {
    while (this.trackGroup.children.length > 0) {
      const child = this.trackGroup.children[0];
      this.trackGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    this.curve = new THREE.CatmullRomCurve3(this.controlPoints, true, "centripetal", 0.5);

    this.samples = [];
    for (let i = 0; i < this.sampleCount; i++) {
      const t = i / this.sampleCount;
      const pos = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      this.samples.push({
        position: pos,
        tangent: tangent,
        normal: normal,
        curvature: 0,
        signedCurvature: 0,
      });
    }

    for (let i = 0; i < this.sampleCount; i++) {
      const curr = this.samples[i];
      const next = this.samples[(i + 1) % this.sampleCount];
      const t0 = curr.tangent;
      const t1 = next.tangent;
      const ds = curr.position.distanceTo(next.position) || 1;
      const cross = t0.x * t1.z - t0.z * t1.x;
      curr.signedCurvature = cross / ds;
      curr.curvature = Math.abs(cross) / ds;
    }

    this.totalLength = this.curve.getLength();

    // Geometric Shortest Path Base Racing Line:
    // Pure 0.0 offset on all straights (zero turning, zero swerving);
    // Smooth progressive inside apex clipping only through genuine corners.
    this.baseRacingLineOffsets = new Float32Array(this.sampleCount);
    const maxApexClip = 1.35; // Gentle, smooth apex clipping (no violent lateral diving)
    for (let i = 0; i < this.sampleCount; i++) {
      const curr = this.samples[i];
      if (curr.curvature > 0.009) {
        const t = Math.min(1.0, (curr.curvature - 0.009) / (0.022 - 0.009));
        const smooth = t * t * (3 - 2 * t);
        const turnDir = Math.sign(curr.signedCurvature);
        this.baseRacingLineOffsets[i] = turnDir * maxApexClip * smooth;
      } else {
        this.baseRacingLineOffsets[i] = 0.0; // PURE STRAIGHT
      }
    }

    // Anchor start/finish grid (offset = 0) so car starts dead straight
    const startMargin = Math.floor(this.sampleCount * 0.06);
    for (let i = 0; i < startMargin; i++) {
      const blend = i / startMargin;
      this.baseRacingLineOffsets[i] *= blend;
      this.baseRacingLineOffsets[this.sampleCount - 1 - i] *= blend;
    }
    this.baseRacingLineOffsets[0] = 0.0;

    for (let pass = 0; pass < 24; pass++) {
      const smoothed = new Float32Array(this.sampleCount);
      for (let i = 0; i < this.sampleCount; i++) {
        const prev = this.baseRacingLineOffsets[(i - 1 + this.sampleCount) % this.sampleCount];
        const curr = this.baseRacingLineOffsets[i];
        const next = this.baseRacingLineOffsets[(i + 1) % this.sampleCount];
        smoothed[i] = prev * 0.25 + curr * 0.5 + next * 0.25;
      }
      this.baseRacingLineOffsets = smoothed;
    }
    this.baseRacingLineOffsets[0] = 0.0;

    this.buildRoadMesh();
    this.buildCurbs();
    this.buildGravelTraps();
    this.buildGuardRails();
    this.buildStartGantry();
    this.buildOverlays();

    if (this.app && this.app.driverAI) {
      this.app.driverAI.startLap(this.app.currentLap || 1, this);
    }
  }

  updateRacingLineMesh(offsets) {
    if (!this.racingLineMesh || !offsets) return;
    this.activePathOffsets = offsets;
  }

  getLapOffset(progress) {
    if (!this.activePathOffsets || this.activePathOffsets.length === 0) {
      return this.getRacingLineOffset(progress);
    }
    const wrapped = ((progress % 1) + 1) % 1;
    const idxFloat = wrapped * this.sampleCount;
    const idx0 = Math.floor(idxFloat) % this.sampleCount;
    const idx1 = (idx0 + 1) % this.sampleCount;
    const frac = idxFloat - Math.floor(idxFloat);
    const smoothFrac = frac * frac * (3 - 2 * frac);
    return THREE.MathUtils.lerp(this.activePathOffsets[idx0], this.activePathOffsets[idx1], smoothFrac);
  }

  getPathPosition(progress, targetVec) {
    const wrapped = ((progress % 1) + 1) % 1;
    this.curve.getPointAt(wrapped, targetVec);
    const off = this.getLapOffset(wrapped);
    if (Math.abs(off) > 0.0001) {
      this.curve.getTangentAt(wrapped, _scratchTangent).normalize();
      _scratchNormal.set(-_scratchTangent.z, 0, _scratchTangent.x);
      targetVec.addScaledVector(_scratchNormal, off);
    }
    return targetVec;
  }

  getPathCurvature(progress) {
    const d = 0.015;
    this.getPathPosition(progress - d, _pPrev);
    this.getPathPosition(progress, _pCurr);
    this.getPathPosition(progress + d, _pNext);

    _vA.subVectors(_pCurr, _pPrev);
    _vB.subVectors(_pNext, _pCurr);

    const lenA = _vA.length();
    const lenB = _vB.length();
    if (lenA < 0.001 || lenB < 0.001) return 0.001;

    _crossVec.crossVectors(_vA, _vB);
    const crossLen = _crossVec.length();
    const lenC = _vC.subVectors(_pNext, _pPrev).length();
    if (lenC < 0.001) return 0.001;

    const kappa = (2 * crossLen) / (lenA * lenB * lenC);
    return Math.max(0.0006, Math.min(0.2, kappa));
  }

  getRacingLineOffset(progress) {
    if (!this.baseRacingLineOffsets || this.baseRacingLineOffsets.length === 0) return 0;
    const wrapped = ((progress % 1) + 1) % 1;
    const idxFloat = wrapped * this.sampleCount;
    const idx0 = Math.floor(idxFloat) % this.sampleCount;
    const idx1 = (idx0 + 1) % this.sampleCount;
    const frac = idxFloat - Math.floor(idxFloat);
    const smoothFrac = frac * frac * (3 - 2 * frac);
    return THREE.MathUtils.lerp(this.baseRacingLineOffsets[idx0], this.baseRacingLineOffsets[idx1], smoothFrac);
  }

  getTrajectoryHeading(progress) {
    const ds = 0.008; // Smooth ~10m baseline for stable, weighted chassis heading
    this.getPathPosition(progress - ds, _hPrev);
    this.getPathPosition(progress + ds, _hNext);
    _trajectoryVec.subVectors(_hNext, _hPrev);
    _trajectoryVec.y = 0;
    if (_trajectoryVec.lengthSq() < 1e-8) {
      const wrapped = ((progress % 1) + 1) % 1;
      this.curve.getTangentAt(wrapped, _scratchTangent);
      return Math.atan2(_scratchTangent.x, _scratchTangent.z);
    }
    _trajectoryVec.normalize();
    return Math.atan2(_trajectoryVec.x, _trajectoryVec.z);
  }

  buildRoadMesh() {
    const halfW = this.roadWidth / 2;
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= this.sampleCount; i++) {
      const s = this.samples[i % this.sampleCount];
      const left = s.position.clone().addScaledVector(s.normal, -halfW);
      const right = s.position.clone().addScaledVector(s.normal, halfW);

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      const vProg = (i / this.sampleCount) * 45;
      uvs.push(0, vProg);
      uvs.push(1, vProg);

      if (i < this.sampleCount) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.82,
      metalness: 0.12,
    });

    this.roadMesh = new THREE.Mesh(geom, roadMat);
    this.roadMesh.receiveShadow = true;
    this.trackGroup.add(this.roadMesh);

    // Subtle edge asphalt lines
    [-1, 1].forEach((offsetSide) => {
      const lineGeom = new THREE.BufferGeometry();
      const linePts = [];
      for (let i = 0; i <= this.sampleCount; i++) {
        const s = this.samples[i % this.sampleCount];
        const pt = s.position.clone().addScaledVector(s.normal, offsetSide * (halfW - 0.3));
        linePts.push(pt.x, pt.y + 0.02, pt.z);
      }
      lineGeom.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
      const edgeLine = new THREE.Line(lineGeom, lineMat);
      this.trackGroup.add(edgeLine);
    });
  }

  buildCurbs() {
    const halfW = this.roadWidth / 2;
    const curbW = 1.35;
    const curbH = 0.16;

    const buildCurbStrip = (side) => {
      const geom = new THREE.BufferGeometry();
      const vertices = [];
      const colors = [];
      const indices = [];

      for (let i = 0; i <= this.sampleCount; i++) {
        const s = this.samples[i % this.sampleCount];
        const inner = s.position.clone().addScaledVector(s.normal, side * halfW);
        const outer = s.position.clone().addScaledVector(s.normal, side * (halfW + curbW));

        inner.y += 0.02;
        outer.y += curbH;

        vertices.push(inner.x, inner.y, inner.z);
        vertices.push(outer.x, outer.y, outer.z);

        const isRed = Math.floor(i / 3) % 2 === 0;
        colors.push(isRed ? 0.95 : 0.95, isRed ? 0.12 : 0.95, isRed ? 0.18 : 0.95);
        colors.push(isRed ? 0.95 : 0.95, isRed ? 0.12 : 0.95, isRed ? 0.18 : 0.95);

        if (i < this.sampleCount) {
          const base = i * 2;
          indices.push(base, base + 1, base + 2);
          indices.push(base + 1, base + 3, base + 2);
        }
      }

      geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.receiveShadow = true;
      this.trackGroup.add(mesh);
    };

    buildCurbStrip(-1);
    buildCurbStrip(1);
  }

  buildGravelTraps() {
    const halfW = this.roadWidth / 2 + 1.4;
    const trapW = 6.5;

    for (let i = 0; i < this.sampleCount; i += 6) {
      const s = this.samples[i];
      if (s.curvature > 0.007) {
        const outsideSide = -Math.sign(s.signedCurvature) || 1;
        const center = s.position.clone().addScaledVector(s.normal, outsideSide * (halfW + trapW / 2));
        center.y = 0.03;

        const trapGeom = new THREE.PlaneGeometry(trapW, 10);
        const trapMat = new THREE.MeshStandardMaterial({ color: 0xc8a876, roughness: 0.95, metalness: 0.05 });
        const trap = new THREE.Mesh(trapGeom, trapMat);
        trap.rotation.x = -Math.PI / 2;
        trap.rotation.z = Math.atan2(s.tangent.x, s.tangent.z);
        trap.position.copy(center);
        trap.receiveShadow = true;
        this.trackGroup.add(trap);
      }
    }
  }

  buildGuardRails() {
    const halfW = this.roadWidth / 2 + 1.8;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.75, roughness: 0.35 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8a9ba8, metalness: 0.85, roughness: 0.25 });
    const step = this.denseStressMode ? 2 : 4;

    for (let i = 0; i < this.sampleCount; i += step) {
      const s = this.samples[i];
      if (s.curvature > 0.004 || this.denseStressMode) {
        [-1, 1].forEach((side) => {
          const postPos = s.position.clone().addScaledVector(s.normal, side * halfW);
          const postGeom = new THREE.BoxGeometry(0.22, 1.3, 0.22);
          const post = new THREE.Mesh(postGeom, postMat);
          post.position.copy(postPos);
          post.position.y += 0.65;
          post.castShadow = true;
          this.trackGroup.add(post);

          const railGeom = new THREE.BoxGeometry(0.08, 0.45, 5.0);
          const rail = new THREE.Mesh(railGeom, railMat);
          rail.position.copy(postPos);
          rail.position.y += 0.7;
          rail.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
          this.trackGroup.add(rail);
        });
      }
    }
  }

  buildStartGantry() {
    const s0 = this.samples[0];
    const halfW = this.roadWidth / 2 + 2.8;

    // Gantry Group perfectly aligned with track frame
    // Local X runs across track (along normal); Local Z runs along track (along tangent)
    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(s0.position);
    gantryGroup.rotation.y = Math.atan2(s0.tangent.x, s0.tangent.z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x222a36, metalness: 0.85, roughness: 0.25 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x364354, metalness: 0.9, roughness: 0.2 });

    // Left and Right Pillars (Spanning horizontally across track at X = -halfW and +halfW)
    const pillarGeom = new THREE.BoxGeometry(0.75, 8.5, 0.75);
    const leftPillar = new THREE.Mesh(pillarGeom, metalMat);
    leftPillar.position.set(-halfW, 4.25, 0);
    leftPillar.castShadow = true;
    gantryGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeom, metalMat);
    rightPillar.position.set(halfW, 4.25, 0);
    rightPillar.castShadow = true;
    gantryGroup.add(rightPillar);

    // Double Overhead Horizontal Beam spanning between pillars across X axis
    const beamLength = halfW * 2 + 1.2;
    const topBeamGeom = new THREE.BoxGeometry(beamLength, 0.85, 0.85);
    const topBeam = new THREE.Mesh(topBeamGeom, metalMat);
    topBeam.position.set(0, 8.1, 0);
    gantryGroup.add(topBeam);

    const lowerBeamGeom = new THREE.BoxGeometry(beamLength, 0.65, 0.65);
    const lowerBeam = new THREE.Mesh(lowerBeamGeom, trussMat);
    lowerBeam.position.set(0, 5.8, 0);
    gantryGroup.add(lowerBeam);

    // Diagonal truss braces
    for (let x = -halfW + 2; x < halfW - 1; x += 3.2) {
      const braceGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8);
      const brace = new THREE.Mesh(braceGeom, trussMat);
      brace.position.set(x, 6.95, 0);
      brace.rotation.z = Math.PI / 4;
      gantryGroup.add(brace);
    }

    // High-Tech Digital LED Timing Billboard across the gantry
    const bannerTex = createGantryBannerTexture();
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const bannerGeom = new THREE.BoxGeometry(Math.min(18, halfW * 1.7), 1.8, 0.2);
    const banner = new THREE.Mesh(bannerGeom, bannerMat);
    banner.position.set(0, 6.95, 0.15);
    gantryGroup.add(banner);

    // Official F1 5-Light Starting Light Gantry Pod
    const lightBoxMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.8, roughness: 0.3 });
    const redLightMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 1.6,
      roughness: 0.1,
    });

    const lightBoxGeom = new THREE.BoxGeometry(4.2, 0.7, 0.35);
    const lightBox = new THREE.Mesh(lightBoxGeom, lightBoxMat);
    lightBox.position.set(0, 5.2, -0.4);
    gantryGroup.add(lightBox);

    for (let k = -2; k <= 2; k++) {
      const ledGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 16);
      ledGeom.rotateX(Math.PI / 2);
      const topLed = new THREE.Mesh(ledGeom, redLightMat);
      topLed.position.set(k * 0.75, 5.35, -0.55);
      gantryGroup.add(topLed);

      const botLed = new THREE.Mesh(ledGeom, redLightMat);
      botLed.position.set(k * 0.75, 5.05, -0.55);
      gantryGroup.add(botLed);
    }

    // Checkered Finish Line (Fixed 100% horizontally across track width!)
    const finishGeom = new THREE.PlaneGeometry(this.roadWidth * 0.98, 2.4);
    const finishMat = new THREE.MeshBasicMaterial({
      map: createCheckeredFinishTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    });
    const finishMesh = new THREE.Mesh(finishGeom, finishMat);
    finishMesh.rotation.x = -Math.PI / 2;
    finishMesh.position.set(0, 0.035, 0); // Flat on track asphalt in local frame
    gantryGroup.add(finishMesh);

    // 6 Staggered Formula 1 Starting Grid Boxes on approach
    const gridBoxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let g = 1; g <= 6; g++) {
      const side = g % 2 === 1 ? -1 : 1;
      const boxLineGeom = new THREE.PlaneGeometry(2.4, 0.2);
      const boxLine = new THREE.Mesh(boxLineGeom, gridBoxMat);
      boxLine.rotation.x = -Math.PI / 2;
      boxLine.position.set(side * (this.roadWidth * 0.22), 0.032, -g * 7.5);
      gantryGroup.add(boxLine);
    }

    this.trackGroup.add(gantryGroup);
  }

  buildOverlays() {
    // Hidden Racing Line Ribbon (Per requirement: no line AI is following)
    const lineGeom = new THREE.BufferGeometry();
    const linePts = new Float32Array((this.sampleCount + 1) * 3);
    for (let i = 0; i <= this.sampleCount; i++) {
      const idx = i % this.sampleCount;
      const s = this.samples[idx];
      const off = (this.activePathOffsets && this.activePathOffsets[idx]) || (this.baseRacingLineOffsets ? this.baseRacingLineOffsets[idx] : 0);
      linePts[i * 3] = s.position.x + s.normal.x * off;
      linePts[i * 3 + 1] = s.position.y + 0.08;
      linePts[i * 3 + 2] = s.position.z + s.normal.z * off;
    }
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePts, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0078d4,
      linewidth: 2,
      transparent: true,
      opacity: 0.0,
      visible: false,
    });
    this.racingLineMesh = new THREE.Line(lineGeom, lineMat);
    this.racingLineMesh.visible = false;
    this.trackGroup.add(this.racingLineMesh);

    // Dynamic Braking Zone Arc
    const brakeGeom = new THREE.BufferGeometry();
    const brakePositions = new Float32Array(30 * 3);
    brakeGeom.setAttribute("position", new THREE.BufferAttribute(brakePositions, 3));
    const brakeMat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 4, transparent: true, opacity: 0.85 });
    this.brakingZoneMesh = new THREE.Line(brakeGeom, brakeMat);
    this.trackGroup.add(this.brakingZoneMesh);
  }

  updateBrakingZone(carProgress) {
    if (!this.brakingZoneMesh) return;
    const positions = this.brakingZoneMesh.geometry.attributes.position.array;
    const count = 30;
    const startProgress = carProgress + 0.03;
    const endProgress = carProgress + 0.11;

    for (let i = 0; i < count; i++) {
      const t = startProgress + (i / count) * (endProgress - startProgress);
      const s = this.getSampleAt(t);
      positions[i * 3] = s.position.x;
      positions[i * 3 + 1] = s.position.y + 0.12;
      positions[i * 3 + 2] = s.position.z;
    }
    this.brakingZoneMesh.geometry.attributes.position.needsUpdate = true;
  }

  getSampleAt(progress) {
    const wrapped = ((progress % 1) + 1) % 1;
    const idx = Math.floor(wrapped * this.sampleCount);
    return this.samples[idx] || this.samples[0];
  }
}

/* ==========================================================================
   3D Authentic Formula 1 Car with In-Cockpit Digital Dashboard & Spinning Wheels
   ========================================================================== */

class RaceCar3D {
  constructor(scene) {
    this.scene = scene;
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    this.wheelRollGroups = [];
    this.frontWheelSteerGroups = [];
    this.brakeLightMesh = null;
    this.chassisMesh = null;
    this.steeringWheelMesh = null;

    // Physical 3D In-Car Dashboard Canvas & Texture (Ultra-Sharp 1024x512)
    this.dashCanvas = document.createElement("canvas");
    this.dashCanvas.width = 1024;
    this.dashCanvas.height = 512;
    this.dashCtx = this.dashCanvas.getContext("2d");
    this.dashTexture = new THREE.CanvasTexture(this.dashCanvas);
    this.dashTexture.generateMipmaps = true;
    this.dashTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.dashTexture.magFilter = THREE.LinearFilter;
    this.dashTexture.anisotropy = 4;

    this.helmetMesh = null;
    this.visorMesh = null;

    this.buildModel();
  }

  buildModel() {
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.35, metalness: 0.85 });
    const liveryCyanMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.18, metalness: 0.85 });
    const haloTitaniumMat = new THREE.MeshStandardMaterial({ color: 0x242c38, roughness: 0.25, metalness: 0.95 });
    const darkAeroMat = new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.45, metalness: 0.7 });
    const brakeRotorMat = new THREE.MeshStandardMaterial({ color: 0x6e7884, metalness: 0.9, roughness: 0.2 });
    const brakeCaliperMat = new THREE.MeshStandardMaterial({ color: 0xff1744, metalness: 0.7, roughness: 0.3 });
    const rimAlloyMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.92, roughness: 0.18 });

    const chassisGroup = new THREE.Group();
    this.chassisMesh = chassisGroup;
    this.carGroup.add(chassisGroup);

    // 1. Authentic Open-Cockpit Monocoque Architecture (Hollow Cockpit Tub)
    // Rear engine cover & monocoque bulkhead (behind cockpit)
    const rearTubGeom = new THREE.BoxGeometry(1.25, 0.42, 1.55);
    const rearTub = new THREE.Mesh(rearTubGeom, liveryCyanMat);
    rearTub.position.set(0, 0.42, -0.825);
    rearTub.castShadow = true;
    chassisGroup.add(rearTub);

    // Sleek low-profile front nose bulkhead (narrow and low so road is wide open)
    const frontTubGeom = new THREE.BoxGeometry(0.46, 0.18, 1.3);
    const frontTub = new THREE.Mesh(frontTubGeom, liveryCyanMat);
    frontTub.position.set(0, 0.25, 1.25);
    frontTub.castShadow = true;
    chassisGroup.add(frontTub);

    // Left and right cockpit side bolsters (low-profile sleek rims)
    [-0.36, 0.36].forEach((sideX) => {
      const rimGeom = new THREE.BoxGeometry(0.12, 0.22, 0.65);
      const rimMesh = new THREE.Mesh(rimGeom, liveryCyanMat);
      rimMesh.position.set(sideX, 0.32, 0.26);
      chassisGroup.add(rimMesh);
    });

    // Cockpit interior floor tray (under driver seat)
    const floorGeom = new THREE.BoxGeometry(0.68, 0.06, 0.65);
    const floorMesh = new THREE.Mesh(floorGeom, darkAeroMat);
    floorMesh.position.set(0, 0.22, 0.26);
    chassisGroup.add(floorMesh);

    // Smooth Slanted Needle Nosecone
    const noseGeom = new THREE.ConeGeometry(0.38, 1.8, 20);
    const nose = new THREE.Mesh(noseGeom, liveryCyanMat);
    nose.rotation.x = Math.PI / 2 + 0.08;
    nose.position.set(0, 0.32, 2.45);
    nose.castShadow = true;
    chassisGroup.add(nose);

    // Nose Pylons
    [-0.16, 0.16].forEach((px) => {
      const pylonGeom = new THREE.BoxGeometry(0.06, 0.22, 0.35);
      const pylon = new THREE.Mesh(pylonGeom, darkAeroMat);
      pylon.position.set(px, 0.18, 2.85);
      chassisGroup.add(pylon);
    });

    // 2. High-Downforce Front Wing with Aerofoil Cascade
    const frontWingMainGeom = new THREE.BoxGeometry(2.35, 0.05, 0.65);
    const frontWingMain = new THREE.Mesh(frontWingMainGeom, darkAeroMat);
    frontWingMain.position.set(0, 0.15, 3.0);
    frontWingMain.castShadow = true;
    chassisGroup.add(frontWingMain);

    const frontUpperFlapGeom = new THREE.BoxGeometry(2.15, 0.04, 0.35);
    const frontUpperFlap = new THREE.Mesh(frontUpperFlapGeom, liveryCyanMat);
    frontUpperFlap.position.set(0, 0.22, 2.92);
    frontUpperFlap.rotation.x = 0.12;
    chassisGroup.add(frontUpperFlap);

    // Curved Front Endplates with Vortex Fins
    [-1.18, 1.18].forEach((ex) => {
      const frontEndplateGeom = new THREE.BoxGeometry(0.04, 0.42, 0.85);
      const frontEndplate = new THREE.Mesh(frontEndplateGeom, liveryCyanMat);
      frontEndplate.position.set(ex, 0.25, 3.0);
      chassisGroup.add(frontEndplate);
    });

    // 3. Titanium HALO Safety Structure
    const haloGroup = new THREE.Group();
    const haloStrutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.46, 12);
    const haloStrut = new THREE.Mesh(haloStrutGeom, haloTitaniumMat);
    haloStrut.position.set(0, 0.72, 0.65);
    haloStrut.rotation.x = -0.22;
    haloGroup.add(haloStrut);
    this.haloStrut = haloStrut;

    const haloLoopGeom = new THREE.TorusGeometry(0.38, 0.04, 12, 24, Math.PI);
    const haloLoop = new THREE.Mesh(haloLoopGeom, haloTitaniumMat);
    haloLoop.rotation.x = -Math.PI / 2 + 0.18;
    haloLoop.position.set(0, 0.88, 0.28);
    haloGroup.add(haloLoop);
    chassisGroup.add(haloGroup);

    // 4. Cockpit Seat Backrest (Ergonomic bucket seat back behind driver)
    const seatBackGeom = new THREE.BoxGeometry(0.48, 0.42, 0.08);
    const seatBack = new THREE.Mesh(seatBackGeom, darkAeroMat);
    seatBack.position.set(0, 0.46, -0.04);
    chassisGroup.add(seatBack);

    // Driver Helmet & Visor (References saved to hide during Cockpit 3D POV)
    const helmetGeom = new THREE.SphereGeometry(0.2, 20, 20);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffd200, roughness: 0.15, metalness: 0.85 });
    const helmet = new THREE.Mesh(helmetGeom, helmetMat);
    helmet.position.set(0, 0.76, 0.12);
    chassisGroup.add(helmet);
    this.helmetMesh = helmet;

    const visorGeom = new THREE.BoxGeometry(0.22, 0.08, 0.16);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111624, roughness: 0.05, metalness: 0.98 });
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 0.76, 0.22);
    chassisGroup.add(visor);
    this.visorMesh = visor;

    // Ergonomic F1 Butterfly Steering Wheel with Integrated LCD Digital Dashboard
    const steerWheelGroup = new THREE.Group();
    steerWheelGroup.position.set(0, 0.52, 0.42);
    steerWheelGroup.rotation.x = -0.18;

    const columnGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12);
    columnGeom.rotateX(Math.PI / 2);
    const steerColumn = new THREE.Mesh(columnGeom, carbonMat);
    steerColumn.position.set(0, -0.02, 0.07);
    steerWheelGroup.add(steerColumn);

    const wheelBodyGeom = new THREE.BoxGeometry(0.28, 0.13, 0.025);
    const wheelBody = new THREE.Mesh(wheelBodyGeom, carbonMat);
    steerWheelGroup.add(wheelBody);

    // Steering Wheel Integrated 3D LCD Display (Ferrari SF-24 / Mercedes W15 Style)
    const wheelScreenGeom = new THREE.PlaneGeometry(0.25, 0.12);
    wheelScreenGeom.rotateY(Math.PI);
    const wheelScreenMat = new THREE.MeshBasicMaterial({
      map: this.dashTexture,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    const wheelScreenMesh = new THREE.Mesh(wheelScreenGeom, wheelScreenMat);
    wheelScreenMesh.position.set(0, 0.015, -0.016);
    steerWheelGroup.add(wheelScreenMesh);
    this.steeringWheelMesh = steerWheelGroup;
    chassisGroup.add(steerWheelGroup);

    [-0.14, 0.14].forEach((gx) => {
      const gripGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.13, 12);
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.95, metalness: 0.05 });
      const grip = new THREE.Mesh(gripGeom, gripMat);
      grip.position.set(gx, 0, 0);
      steerWheelGroup.add(grip);
    });

    // Rotary Dials and DRS Buttons on the Steering Wheel
    const dialGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.015, 10);
    dialGeom.rotateX(Math.PI / 2);
    const dialMatYellow = new THREE.MeshBasicMaterial({ color: 0xffd200 });
    const dialMatRed = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const dialMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f2fe });

    const dialL = new THREE.Mesh(dialGeom, dialMatYellow);
    dialL.position.set(-0.06, -0.028, -0.015);
    steerWheelGroup.add(dialL);

    const dialR = new THREE.Mesh(dialGeom, dialMatCyan);
    dialR.position.set(0.06, -0.028, -0.015);
    steerWheelGroup.add(dialR);

    const btnDRS = new THREE.Mesh(dialGeom, dialMatRed);
    btnDRS.position.set(-0.09, 0.035, -0.015);
    steerWheelGroup.add(btnDRS);

    this.steeringWheelMesh = steerWheelGroup;
    chassisGroup.add(steerWheelGroup);

    // 5. Sculpted Sidepods with Downwash Channels
    [-1, 1].forEach((side) => {
      const sidepodGeom = new THREE.BoxGeometry(0.48, 0.38, 1.9);
      const sidepod = new THREE.Mesh(sidepodGeom, liveryCyanMat);
      sidepod.position.set(side * 0.76, 0.38, -0.2);
      sidepod.castShadow = true;
      chassisGroup.add(sidepod);

      const ductGeom = new THREE.BoxGeometry(0.42, 0.32, 0.12);
      const duct = new THREE.Mesh(ductGeom, darkAeroMat);
      duct.position.set(side * 0.76, 0.38, 0.76);
      chassisGroup.add(duct);

      const floorGeom = new THREE.BoxGeometry(0.55, 0.04, 2.6);
      const floor = new THREE.Mesh(floorGeom, darkAeroMat);
      floor.position.set(side * 0.88, 0.16, -0.2);
      chassisGroup.add(floor);
    });

    // 6. Overhead Engine Airbox & Aerodynamic Shark Fin
    const airboxGeom = new THREE.BoxGeometry(0.32, 0.32, 0.6);
    const airbox = new THREE.Mesh(airboxGeom, liveryCyanMat);
    airbox.position.set(0, 0.88, -0.22);
    chassisGroup.add(airbox);

    const sharkFinGeom = new THREE.BoxGeometry(0.04, 0.55, 1.4);
    const sharkFin = new THREE.Mesh(sharkFinGeom, liveryCyanMat);
    sharkFin.position.set(0, 0.86, -1.1);
    chassisGroup.add(sharkFin);

    // 7. Dual-Plane Contoured Rear Wing & DRS Pod
    const rearWingMainGeom = new THREE.BoxGeometry(1.95, 0.06, 0.65);
    const rearWingMain = new THREE.Mesh(rearWingMainGeom, liveryCyanMat);
    rearWingMain.position.set(0, 1.08, -2.15);
    rearWingMain.castShadow = true;
    chassisGroup.add(rearWingMain);

    const rearWingUpperGeom = new THREE.BoxGeometry(1.9, 0.04, 0.35);
    const rearWingUpper = new THREE.Mesh(rearWingUpperGeom, darkAeroMat);
    rearWingUpper.position.set(0, 1.2, -2.25);
    rearWingUpper.rotation.x = -0.16;
    chassisGroup.add(rearWingUpper);

    const drsPodGeom = new THREE.BoxGeometry(0.12, 0.14, 0.2);
    const drsPod = new THREE.Mesh(drsPodGeom, carbonMat);
    drsPod.position.set(0, 1.15, -2.15);
    chassisGroup.add(drsPod);

    [-0.98, 0.98].forEach((rx) => {
      const rearEndplateGeom = new THREE.BoxGeometry(0.04, 0.72, 0.95);
      const rearEndplate = new THREE.Mesh(rearEndplateGeom, darkAeroMat);
      rearEndplate.position.set(rx, 1.0, -2.15);
      chassisGroup.add(rearEndplate);
    });

    // 8. Functioning FIA Rain / Brake LED Light
    const lightGeom = new THREE.BoxGeometry(0.38, 0.18, 0.06);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0x550011,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });
    this.brakeLightMesh = new THREE.Mesh(lightGeom, lightMat);
    this.brakeLightMesh.position.set(0, 0.42, -2.18);
    chassisGroup.add(this.brakeLightMesh);

    // 9. Suspension Double-Wishbones
    const createWishbones = (x, y, z) => {
      const armGeom = new THREE.CylinderGeometry(0.02, 0.02, Math.abs(x) * 0.72, 8);
      armGeom.rotateZ(Math.PI / 2);

      const upperArm = new THREE.Mesh(armGeom, carbonMat);
      upperArm.position.set(x * 0.55, y + 0.12, z);
      chassisGroup.add(upperArm);

      const lowerArm = new THREE.Mesh(armGeom, carbonMat);
      lowerArm.position.set(x * 0.55, y - 0.08, z);
      chassisGroup.add(lowerArm);
    };

    createWishbones(-1.18, 0.38, 1.45);
    createWishbones(1.18, 0.38, 1.45);
    createWishbones(-1.22, 0.42, -1.45);
    createWishbones(1.22, 0.42, -1.45);

    // 10. Open-Wheel Assemblies with Visible Spinning
    const tireRadius = 0.38;
    const tireWidth = 0.34;
    const rimRadius = tireRadius * 0.62;
    const tireSidewallTex = createWheelSidewallTexture("#ffd200");

    const createWheel = (x, y, z, isFront) => {
      const hubGroup = new THREE.Group();
      hubGroup.position.set(x, y, z);

      // Static Brake Disc & Caliper
      const discGeom = new THREE.CylinderGeometry(rimRadius * 0.88, rimRadius * 0.88, 0.04, 16);
      discGeom.rotateZ(Math.PI / 2);
      const disc = new THREE.Mesh(discGeom, brakeRotorMat);
      hubGroup.add(disc);

      const caliperGeom = new THREE.BoxGeometry(0.06, 0.14, 0.16);
      const caliper = new THREE.Mesh(caliperGeom, brakeCaliperMat);
      caliper.position.set(x > 0 ? -0.04 : 0.04, 0.15, 0.08);
      hubGroup.add(caliper);

      // Wheel Roll Group (Rotates along X axis)
      const rollGroup = new THREE.Group();
      hubGroup.add(rollGroup);

      const tireGeom = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
      tireGeom.rotateZ(Math.PI / 2);
      const tireTreadMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.92, metalness: 0.08 });
      const tire = new THREE.Mesh(tireGeom, tireTreadMat);
      tire.castShadow = true;
      rollGroup.add(tire);

      // Pirelli Sidewall Face Disc
      const sidewallGeom = new THREE.CircleGeometry(tireRadius, 24);
      const sidewallMat = new THREE.MeshBasicMaterial({
        map: tireSidewallTex,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const outerSidewall = new THREE.Mesh(sidewallGeom, sidewallMat);
      outerSidewall.position.x = x > 0 ? tireWidth / 2 + 0.005 : -tireWidth / 2 - 0.005;
      outerSidewall.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      rollGroup.add(outerSidewall);

      // Lightweight 5-Spoke Rim Barrel
      const rimBarrelGeom = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 0.92, 20);
      rimBarrelGeom.rotateZ(Math.PI / 2);
      const rimBarrel = new THREE.Mesh(rimBarrelGeom, rimAlloyMat);
      rollGroup.add(rimBarrel);

      const spokeCount = 5;
      const spokeGroup = new THREE.Group();
      spokeGroup.position.x = x > 0 ? tireWidth * 0.42 : -tireWidth * 0.42;

      for (let s = 0; s < spokeCount; s++) {
        const spokeAngle = (s / spokeCount) * Math.PI * 2;
        const spokeGeom = new THREE.BoxGeometry(0.04, rimRadius * 0.82, 0.05);
        const spoke = new THREE.Mesh(spokeGeom, rimAlloyMat);
        spoke.position.set(0, (rimRadius * 0.42) * Math.cos(spokeAngle), (rimRadius * 0.42) * Math.sin(spokeAngle));
        spoke.rotation.x = spokeAngle;
        spokeGroup.add(spoke);
      }

      const nutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6);
      nutGeom.rotateZ(Math.PI / 2);
      const nutMat = new THREE.MeshStandardMaterial({
        color: x > 0 ? 0xff2233 : 0x0078d4,
        metalness: 0.95,
        roughness: 0.1,
      });
      const nut = new THREE.Mesh(nutGeom, nutMat);
      spokeGroup.add(nut);

      rollGroup.add(spokeGroup);

      if (isFront) {
        const steerGroup = new THREE.Group();
        steerGroup.position.set(x, y, z);
        hubGroup.position.set(0, 0, 0);
        steerGroup.add(hubGroup);
        this.carGroup.add(steerGroup);
        this.frontWheelSteerGroups.push(steerGroup);
        this.wheelRollGroups.push(rollGroup);
      } else {
        this.carGroup.add(hubGroup);
        this.wheelRollGroups.push(rollGroup);
      }
    };

    createWheel(-1.18, 0.38, 1.45, true);  // Front Left
    createWheel(1.18, 0.38, 1.45, true);   // Front Right
    createWheel(-1.22, 0.42, -1.45, false); // Rear Left
    createWheel(1.22, 0.42, -1.45, false);  // Rear Right
  }

  updateDashboard(speedMph, speedKmh, rpm, gear, throttle, brake, delta, lap, maxLaps, latG) {
    const ctx = this.dashCtx;
    if (!ctx) return;

    speedMph = Math.max(0, Math.round(speedMph || 0));
    speedKmh = Math.max(0, Math.round(speedKmh || (speedMph * 1.60934)));
    rpm = Math.max(4500, Math.min(13500, rpm || 4500));
    const gearStr = gear !== undefined && gear !== null ? `${gear}` : (speedMph < 1 ? "1" : "1");
    throttle = Math.max(0, Math.min(1.0, throttle || 0));
    brake = Math.max(0, Math.min(1.0, brake || 0));
    delta = typeof delta === "number" ? delta : 0;
    lap = lap || 1;
    maxLaps = maxLaps || 5;
    latG = Math.abs(latG || 0);

    // Throttle GPU canvas texture upload to 30 FPS to prevent render stalls
    const now = performance.now();
    if (this._lastDashUpdate && now - this._lastDashUpdate < 30) return;
    this._lastDashUpdate = now;

    // 1. Dark High-Contrast Carbon LCD Display Background (1024x512)
    ctx.fillStyle = "#04070d";
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle Carbon Weave Pattern Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // High-Tech Outer Display Border
    ctx.strokeStyle = "#00f2fe";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 1012, 500);

    // Corner Accents
    ctx.fillStyle = "#00f2fe";
    ctx.fillRect(6, 6, 24, 8);
    ctx.fillRect(6, 6, 8, 24);
    ctx.fillRect(994, 6, 24, 8);
    ctx.fillRect(1010, 6, 8, 24);
    ctx.fillRect(6, 498, 24, 8);
    ctx.fillRect(6, 482, 8, 24);
    ctx.fillRect(994, 498, 24, 8);
    ctx.fillRect(1010, 482, 8, 24);

    // 2. Top Shift Lights: 18 High-Intensity FIA LEDs
    const totalLeds = 18;
    const rpmMin = 5000;
    const rpmMax = 13200;
    const rpmFraction = Math.max(0, Math.min(1.0, (rpm - rpmMin) / (rpmMax - rpmMin)));
    const activeLeds = Math.floor(rpmFraction * totalLeds);
    const isRedlineFlashing = rpm >= 12800 && (Math.floor(now / 80) % 2 === 0);

    const ledW = 40;
    const ledH = 24;
    const ledGap = 9;
    const startX = (1024 - (totalLeds * ledW + (totalLeds - 1) * ledGap)) / 2;

    for (let i = 0; i < totalLeds; i++) {
      const lx = startX + i * (ledW + ledGap);
      const ly = 22;
      const isActive = i < activeLeds || isRedlineFlashing;

      let color = "#101826"; // Inactive LED slot
      let glow = null;

      if (isActive) {
        if (i < 6) {
          color = "#00e676"; // Green
          glow = "rgba(0, 230, 118, 0.9)";
        } else if (i < 12) {
          color = "#ff1744"; // Red
          glow = "rgba(255, 23, 68, 0.9)";
        } else {
          color = "#00f0ff"; // Electric Blue / Purple
          glow = "rgba(0, 240, 255, 0.95)";
        }
      }

      ctx.fillStyle = color;
      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 14;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.roundRect(lx, ly, ledW, ledH, 6);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 3. Top Status Row
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 15px 'Segoe UI', monospace";
    ctx.textAlign = "left";
    ctx.fillText("F1 TELEMETRY // GENESIS-26", 40, 72);

    ctx.textAlign = "center";
    ctx.fillStyle = "#00e676";
    ctx.fillText("ERS: HOTLAP [100%]", 512, 72);

    ctx.textAlign = "right";
    const drsActive = speedMph > 165;
    ctx.fillStyle = drsActive ? "#00f0ff" : "#8394ac";
    ctx.fillText(drsActive ? "DRS: OPEN" : "DRS: AVAIL", 984, 72);

    // Divider Line
    ctx.strokeStyle = "#1b283d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 84);
    ctx.lineTo(994, 84);
    ctx.stroke();

    // 4. Central Large Gear Box (Main Center Cluster)
    const gearBoxX = 392;
    const gearBoxY = 96;
    const gearBoxW = 240;
    const gearBoxH = 260;

    ctx.fillStyle = "#0a111e";
    ctx.beginPath();
    ctx.roundRect(gearBoxX, gearBoxY, gearBoxW, gearBoxH, 12);
    ctx.fill();

    ctx.strokeStyle = "#0078d4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(gearBoxX, gearBoxY, gearBoxW, gearBoxH, 12);
    ctx.stroke();

    ctx.fillStyle = "#60cdff";
    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GEAR", 512, gearBoxY + 36);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 160px 'Segoe UI', monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(gearStr, 512, gearBoxY + 145);
    ctx.textBaseline = "alphabetic";

    // 5. Left Sector: Speedometer & Unit Gauges
    const leftBoxX = 32;
    const leftBoxY = 96;
    const leftBoxW = 340;
    const leftBoxH = 260;

    ctx.fillStyle = "#0a111e";
    ctx.beginPath();
    ctx.roundRect(leftBoxX, leftBoxY, leftBoxW, leftBoxH, 12);
    ctx.fill();
    ctx.strokeStyle = "#1b283d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(leftBoxX, leftBoxY, leftBoxW, leftBoxH, 12);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    ctx.fillText("VEHICLE SPEED", leftBoxX + 24, leftBoxY + 38);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 92px 'Segoe UI', sans-serif";
    ctx.fillText(`${speedMph}`, leftBoxX + 24, leftBoxY + 135);

    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 28px 'Segoe UI', sans-serif";
    ctx.fillText("MPH", leftBoxX + 215, leftBoxY + 115);

    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 26px monospace";
    ctx.fillText(`${speedKmh} KM/H`, leftBoxX + 24, leftBoxY + 185);

    // Speed bar (up to 240 mph)
    const speedRatio = Math.min(1.0, speedMph / 235);
    ctx.fillStyle = "#162030";
    ctx.fillRect(leftBoxX + 24, leftBoxY + 210, 292, 16);
    ctx.fillStyle = "#0078d4";
    ctx.fillRect(leftBoxX + 24, leftBoxY + 210, 292 * speedRatio, 16);

    // 6. Right Sector: Engine RPM & Tachometer Bar
    const rightBoxX = 652;
    const rightBoxY = 96;
    const rightBoxW = 340;
    const rightBoxH = 260;

    ctx.fillStyle = "#0a111e";
    ctx.beginPath();
    ctx.roundRect(rightBoxX, rightBoxY, rightBoxW, rightBoxH, 12);
    ctx.fill();
    ctx.strokeStyle = "#1b283d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rightBoxX, rightBoxY, rightBoxW, rightBoxH, 12);
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    ctx.fillText("ENGINE RPM", rightBoxX + rightBoxW - 24, rightBoxY + 38);

    ctx.fillStyle = "#60cdff";
    ctx.font = "900 68px monospace";
    ctx.fillText(`${Math.round(rpm).toLocaleString()}`, rightBoxX + rightBoxW - 24, rightBoxY + 130);

    // Segmented RPM Bar
    const barX = rightBoxX + 24;
    const barY = rightBoxY + 200;
    const barW = 292;
    const barH = 24;

    ctx.fillStyle = "#162030";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const rpmBarW = Math.max(0, Math.min(barW, barW * rpmFraction));
    const rpmGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    rpmGrad.addColorStop(0, "#0078d4");
    rpmGrad.addColorStop(0.65, "#00e676");
    rpmGrad.addColorStop(0.85, "#ffb900");
    rpmGrad.addColorStop(1.0, "#ff1744");

    ctx.fillStyle = rpmGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, rpmBarW, barH, 4);
    ctx.fill();

    // 7. Bottom Telemetry Tray (Lap, Delta, Lateral G, Pedals)
    const botY = 372;
    const botH = 120;
    ctx.fillStyle = "#080d16";
    ctx.beginPath();
    ctx.roundRect(32, botY, 960, botH, 12);
    ctx.fill();
    ctx.strokeStyle = "#1b283d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(32, botY, 960, botH, 12);
    ctx.stroke();

    // Sub-col 1: Lap Counter
    ctx.textAlign = "left";
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 15px 'Segoe UI', sans-serif";
    ctx.fillText("CIRCUIT LAP", 56, botY + 36);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 44px 'Segoe UI', monospace";
    ctx.fillText(`${lap} / ${maxLaps}`, 56, botY + 88);

    // Sub-col 2: Live Delta vs Best
    ctx.textAlign = "center";
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 15px 'Segoe UI', sans-serif";
    ctx.fillText("DELTA VS BEST", 320, botY + 36);

    const deltaSign = delta <= 0 ? "-" : "+";
    ctx.fillStyle = delta <= 0 ? "#00e676" : "#ff3344";
    ctx.font = "900 44px monospace";
    ctx.fillText(`${deltaSign}${Math.abs(delta).toFixed(2)}s`, 320, botY + 88);

    // Sub-col 3: Lateral G Force
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 15px 'Segoe UI', sans-serif";
    ctx.fillText("CORNERING LOAD", 580, botY + 36);
    ctx.fillStyle = "#00f0ff";
    ctx.font = "900 44px monospace";
    ctx.fillText(`${latG.toFixed(2)} G`, 580, botY + 88);

    // Sub-col 4: Throttle & Brake Vertical Bars
    const pedX = 760;
    ctx.textAlign = "left";
    ctx.fillStyle = "#8394ac";
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillText("THR", pedX, botY + 30);
    ctx.fillText("BRK", pedX + 90, botY + 30);

    // Throttle Bar (Green)
    ctx.fillStyle = "#12241b";
    ctx.fillRect(pedX, botY + 42, 60, 56);
    ctx.fillStyle = "#00e676";
    const thrHeight = Math.round(throttle * 56);
    ctx.fillRect(pedX, botY + 42 + (56 - thrHeight), 60, thrHeight);

    // Brake Bar (Red)
    ctx.fillStyle = "#261317";
    ctx.fillRect(pedX + 90, botY + 42, 60, 56);
    ctx.fillStyle = "#ff1744";
    const brkHeight = Math.round(brake * 56);
    ctx.fillRect(pedX + 90, botY + 42 + (56 - brkHeight), 60, brkHeight);

    // Final Canvas Texture Upload Trigger
    this.dashTexture.needsUpdate = true;
  }

  updateVisuals(speed, steerAngle, isBraking, dt) {
    const spinRate = (speed / 0.38) * dt;
    this.wheelRollGroups.forEach((w) => {
      w.rotation.x += spinRate;
    });

    const steerSmooth = 1.0 - Math.exp(-22.0 * dt);
    this.frontWheelSteerGroups.forEach((g) => {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, steerAngle, steerSmooth);
    });

    if (this.steeringWheelMesh) {
      this.steeringWheelMesh.rotation.z = THREE.MathUtils.lerp(this.steeringWheelMesh.rotation.z, -steerAngle * 2.5, steerSmooth);
    }

    if (this.brakeLightMesh) {
      if (isBraking) {
        this.brakeLightMesh.material.color.setHex(0xff0022);
        this.brakeLightMesh.material.emissive.setHex(0xff0022);
        this.brakeLightMesh.material.emissiveIntensity = 2.4;
      } else {
        const pulse = (Math.sin(performance.now() * 0.012) + 1) * 0.5;
        this.brakeLightMesh.material.color.setHex(0xaa1122);
        this.brakeLightMesh.material.emissive.setHex(0x550011);
        this.brakeLightMesh.material.emissiveIntensity = 0.4 + pulse * 0.6;
      }
    }

    if (this.chassisMesh) {
      // High-downforce F1 suspension dynamics:
      // Nose dives under threshold braking, slight squat under full throttle
      const pitch = isBraking ? 0.014 : -Math.min(0.007, speed * 0.00008);
      // Realistic chassis roll outward against lateral acceleration (subtle 0.8° max, stable)
      const roll = steerAngle * 0.016;
      const smoothFactor = 1.0 - Math.exp(-12.0 * dt);
      this.chassisMesh.rotation.x = THREE.MathUtils.lerp(this.chassisMesh.rotation.x, pitch, smoothFactor);
      this.chassisMesh.rotation.z = THREE.MathUtils.lerp(this.chassisMesh.rotation.z, roll, smoothFactor);
    }
  }
}

/* ==========================================================================
   3D Camera Manager (Chase, Cockpit POV behind 3D Dash, TV, Orbit)
   ========================================================================== */

class CameraManager3D {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.mode = "chase";

    this.currentPos = new THREE.Vector3(0, 10, -20);
    this.currentLookAt = new THREE.Vector3(0, 0, 0);

    this.desiredPos = new THREE.Vector3();
    this.desiredLookAt = new THREE.Vector3();
    this.hoodPos = new THREE.Vector3();
    this.lookPos = new THREE.Vector3();

    this.orbitDistance = 145;
    this.orbitTheta = 0;
    this.orbitPhi = Math.PI / 4;
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.locked = false;

    this.cameraYaw = 0; // Filtered camera yaw for rock-solid stability in turns
    this.cameraInitialized = false;

    this.bindEvents();
  }

  setMode(mode) {
    this.mode = mode;
  }

  bindEvents() {
    this.domElement.addEventListener("mousedown", (e) => {
      if (this.mode === "orbit" && !this.locked) {
        this.isDragging = true;
        this.prevMouse.x = e.clientX;
        this.prevMouse.y = e.clientY;
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isDragging && this.mode === "orbit" && !this.locked) {
        const dx = e.clientX - this.prevMouse.x;
        const dy = e.clientY - this.prevMouse.y;
        this.prevMouse.x = e.clientX;
        this.prevMouse.y = e.clientY;

        this.orbitTheta -= dx * 0.006;
        this.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2.1, this.orbitPhi - dy * 0.006));
      }
    });

    this.domElement.addEventListener("wheel", (e) => {
      if (this.mode === "orbit" && !this.locked) {
        this.orbitDistance = Math.max(30, Math.min(260, this.orbitDistance + e.deltaY * 0.08));
      }
    });
  }

  update(carGroup, forwardDir, speed, dt) {
    const carPos = carGroup.position;

    if (this.mode === "chase") {
      const chaseOffsetDist = 10.5;
      const chaseHeight = 3.6;

      const carYaw = Math.atan2(forwardDir.x, forwardDir.z);
      if (!this.cameraInitialized) {
        this.cameraYaw = carYaw;
        this.currentPos.set(
          carPos.x - Math.sin(this.cameraYaw) * chaseOffsetDist,
          carPos.y + chaseHeight,
          carPos.z - Math.cos(this.cameraYaw) * chaseOffsetDist
        );
        this.currentLookAt.copy(carPos);
        this.currentLookAt.y += 1.25;
        this.cameraInitialized = true;
      }

      // Smooth camera yaw trailing behind car (gentle, cinematic, rock-solid stable in turns)
      let dYaw = carYaw - this.cameraYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      const yawSmooth = 1.0 - Math.exp(-4.2 * dt);
      this.cameraYaw += dYaw * THREE.MathUtils.clamp(yawSmooth, 0, 1);

      this.desiredPos.set(
        carPos.x - Math.sin(this.cameraYaw) * chaseOffsetDist,
        carPos.y + chaseHeight,
        carPos.z - Math.cos(this.cameraYaw) * chaseOffsetDist
      );

      const posSmooth = 1.0 - Math.exp(-7.5 * dt);
      this.currentPos.lerp(this.desiredPos, posSmooth);

      // Look directly at the car's cockpit center - car stays rock-solid centered on screen
      this.desiredLookAt.copy(carPos);
      this.desiredLookAt.y += 1.25;
      const lookSmooth = 1.0 - Math.exp(-12.0 * dt);
      this.currentLookAt.lerp(this.desiredLookAt, lookSmooth);

      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

      const targetFOV = 50 + (speed * MS_TO_MPH) * 0.06;
      const newFOV = THREE.MathUtils.lerp(this.camera.fov, Math.min(65, targetFOV), 0.08);
      if (Math.abs(newFOV - this.camera.fov) > 0.04) {
        this.camera.fov = newFOV;
        this.camera.updateProjectionMatrix();
      }

    } else if (this.mode === "hood") {
      // Cockpit POV: driver eye positioned inside the cockpit, looking directly past the
      // animated steering wheel with its integrated digital dashboard, and down the race track ahead.
      carGroup.updateMatrixWorld(true);
      const localEye = new THREE.Vector3(0, 0.74, 0.12);
      const localLook = new THREE.Vector3(0, 0.36, 18.0);

      this.hoodPos.copy(localEye).applyMatrix4(carGroup.matrixWorld);
      this.lookPos.copy(localLook).applyMatrix4(carGroup.matrixWorld);

      this.camera.position.copy(this.hoodPos);
      this.camera.lookAt(this.lookPos);
      if (this.camera.fov !== 72) {
        this.camera.fov = 72;
        this.camera.updateProjectionMatrix();
      }

    } else if (this.mode === "orbit") {
      const x = Math.sin(this.orbitTheta) * Math.cos(this.orbitPhi) * this.orbitDistance;
      const z = Math.cos(this.orbitTheta) * Math.cos(this.orbitPhi) * this.orbitDistance;
      const y = Math.sin(this.orbitPhi) * this.orbitDistance;

      this.camera.position.set(x, y, z);
      this.camera.lookAt(0, 0, 0);
      this.camera.fov = 50;
      this.camera.updateProjectionMatrix();
    }
  }
}

/* ==========================================================================
   F1 8-Speed Seamless Shift Transmission & RPM Model
   ========================================================================== */

function computeF1Transmission(speedMph) {
  const gearRatios = [
    { gear: 1, min: 0, max: 58 },
    { gear: 2, min: 52, max: 88 },
    { gear: 3, min: 82, max: 118 },
    { gear: 4, min: 112, max: 146 },
    { gear: 5, min: 142, max: 172 },
    { gear: 6, min: 168, max: 195 },
    { gear: 7, min: 190, max: 212 },
    { gear: 8, min: 208, max: 235 },
  ];

  let currentGear = 1;
  for (const g of gearRatios) {
    if (speedMph >= g.min) {
      currentGear = g.gear;
    }
  }

  const gInfo = gearRatios[currentGear - 1];
  const gearFraction = Math.max(0, Math.min(1.0, (speedMph - gInfo.min) / Math.max(1, gInfo.max - gInfo.min)));

  const idleRPM = 4500;
  const maxRPM = 13200;
  const targetRPM = idleRPM + gearFraction * (maxRPM - idleRPM);

  return {
    gear: speedMph < 1 ? 1 : currentGear,
    gearDisplay: speedMph < 1 ? "1" : `${currentGear}`,
    rpm: targetRPM,
    gearFraction: gearFraction,
  };
}

/* ==========================================================================
   Realistic Web Audio Racing Engine Sound with 8-Speed Gearbox Simulation
   ========================================================================== */

class RacingEngineSound {
  constructor() {
    this.ctx = null;
    this.enabled = false;

    this.masterGain = null;
    this.filterNode = null;
    this.distortionNode = null;

    this.osc1 = null;
    this.osc2 = null;
    this.osc3 = null;
    this.turboOsc = null;
    this.turboGain = null;

    this.rpm = 4500;
    this.gear = 1;
    this.isBraking = false;
  }

  createDistortionCurve(amount = 22) {
    const k = amount;
    const n = 512;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  toggle() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.distortionNode = this.ctx.createWaveShaper();
      this.distortionNode.curve = this.createDistortionCurve(18);
      this.distortionNode.oversample = "4x";

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "bandpass";
      this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.filterNode.connect(this.distortionNode);
      this.distortionNode.connect(this.masterGain);

      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = "triangle";
      this.osc1.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = "sawtooth";
      this.osc2.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.osc3 = this.ctx.createOscillator();
      this.osc3.type = "sine";
      this.osc3.frequency.setValueAtTime(420, this.ctx.currentTime);

      const oscGain1 = this.ctx.createGain();
      oscGain1.gain.value = 0.65;
      const oscGain2 = this.ctx.createGain();
      oscGain2.gain.value = 0.35;
      const oscGain3 = this.ctx.createGain();
      oscGain3.gain.value = 0.20;

      this.osc1.connect(oscGain1).connect(this.filterNode);
      this.osc2.connect(oscGain2).connect(this.filterNode);
      this.osc3.connect(oscGain3).connect(this.filterNode);

      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = "sine";
      this.turboOsc.frequency.setValueAtTime(2800, this.ctx.currentTime);

      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.masterGain);

      this.osc1.start();
      this.osc2.start();
      this.osc3.start();
      this.turboOsc.start();

      this.enabled = true;
    } else {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.enabled = !this.enabled;
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.08 : 0.0, this.ctx.currentTime, 0.05);
    }
    return this.enabled;
  }

  update(speedMph, isBraking = false, throttle = 0.8, rpm = 4500, gear = 1) {
    this.rpm = rpm;
    this.gear = gear;
    this.isBraking = isBraking;

    if (!this.ctx || !this.enabled) return;

    const maxRPM = 13200;
    const baseFreq = Math.max(85, this.rpm * 0.048);
    const now = this.ctx.currentTime;

    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.03);
    this.osc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.03);
    this.osc3.frequency.setTargetAtTime(baseFreq * 3.0, now, 0.03);

    const filterFreq = 650 + (this.rpm / maxRPM) * 2200;
    this.filterNode.frequency.setTargetAtTime(filterFreq, now, 0.04);

    const turboFreq = 2600 + (this.rpm / maxRPM) * 3200;
    this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.05);
    this.turboGain.gain.setTargetAtTime(isBraking ? 0.005 : 0.02 + throttle * 0.015, now, 0.05);
  }
}

/* ==========================================================================
   Heuristic NPC AI Driver Optimizer
   ========================================================================== */

class HeuristicNPCDriver {
  constructor() {
    this.reset();
  }

  reset() {
    this.lapNumber = 1;
    this.bestLapTime = Infinity;
    this.bestLapNumber = null;
    this.bestParams = null;
    this.bestPathOffsets = null;
    this.currentPathOffsets = null;
    this.history = [];
    this.explorationTemp = 0.35;

    this.currentParams = {
      name: "Attempt #1 - Baseline Recon",
      pathStyle: "Geometric Mid-Apex Arc",
      phaseBadge: "Reconnaissance",
      desc: "Establishing circuit limits on user track; classic out-in-out line maximizing corner radius.",
      brakeOffsetMeters: 0.0,
      apexCarryFactor: 0.98,
      trailBrakeBlend: 0.95,
      exitThrottleAggression: 0.95,
      brakeBar: "50%",
      apexBar: "50%",
      throttleBar: "60%",
    };
  }

  generateLapPath(lap, track) {
    const N = track.sampleCount;
    const usableHalfWidth = Math.max(1.8, (track.roadWidth / 2) - 1.8);
    const offsets = new Float32Array(N);

    // Dynamic racing line strategies:
    // ALL strategies maintain a STRICT ZERO OFFSET on all straights (no turns on straight roads)!
    // They optimize apex clipping depth and entry arc through actual corners.
    let strategyName = "Optimal Inside Apex (Shortest Path)";
    let phaseBadge = "Inside Apex";
    let apexWeight = 1.0;

    if (lap === 1) {
      strategyName = "Geometric Shortest Path (Baseline)";
      phaseBadge = "Inside Apex";
      apexWeight = 0.88;
    } else if (lap === 2) {
      strategyName = "Deep Late-Apex Strategy";
      phaseBadge = "Late Apex";
      apexWeight = 0.95;
    } else if (lap === 3) {
      strategyName = "Geometric Maximum Radius";
      phaseBadge = "Max Arc";
      apexWeight = 0.82;
    } else {
      strategyName = `Heuristic Convergence (Lap ${lap})`;
      phaseBadge = "Optimized Line";
      apexWeight = 0.90;
    }

    this.currentParams.pathStyle = strategyName;
    this.currentParams.name = strategyName;
    this.currentParams.phaseBadge = phaseBadge;

    for (let i = 0; i < N; i++) {
      const curr = track.samples[i];
      // Corner detection: Curvature must exceed 0.009 (radius < 110m).
      // On ALL straightaways (curvature <= 0.009), offset is STRICTLY 0.0!
      if (curr.curvature > 0.009) {
        const t = Math.min(1.0, (curr.curvature - 0.009) / (0.022 - 0.009));
        const smooth = t * t * (3 - 2 * t);
        const turnDir = Math.sign(curr.signedCurvature);
        const maxApexClip = 1.45 * apexWeight; // Gentle, smooth clipping without lateral jerk
        offsets[i] = turnDir * maxApexClip * smooth;
      } else {
        offsets[i] = 0.0; // PURE STRAIGHT LINE (ZERO TURNS ON STRAIGHTS)
      }
    }

    // Anchor start/finish grid (offset = 0) so car starts dead straight
    const startZone = Math.floor(N * 0.06);
    for (let i = 0; i < startZone; i++) {
      const blend = i / startZone;
      offsets[i] *= blend;
      offsets[(N - 1 - i)] *= blend;
    }
    offsets[0] = 0.0;

    // Smooth transitions between corners and straights
    let smoothed = new Float32Array(offsets);
    for (let pass = 0; pass < 24; pass++) {
      const temp = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const prev = smoothed[(i - 1 + N) % N];
        const curr = smoothed[i];
        const next = smoothed[(i + 1) % N];
        temp[i] = prev * 0.25 + curr * 0.5 + next * 0.25;
      }
      smoothed = temp;
    }
    smoothed[0] = 0.0;

    this.currentPathOffsets = smoothed;
    track.activePathOffsets = smoothed;
    track.updateRacingLineMesh(smoothed);
    return smoothed;
  }

  startLap(lap, track) {
    this.lapNumber = lap;
    if (track) {
      this.generateLapPath(lap, track);
    }
  }

  evaluateLap(lapTime) {
    const isPB = lapTime < this.bestLapTime;
    const delta = this.bestLapTime === Infinity ? 0 : (lapTime - this.bestLapTime);

    const record = {
      lap: this.lapNumber,
      time: lapTime,
      delta: delta,
      isPB: isPB,
      strategy: this.currentParams.pathStyle || this.currentParams.name,
      action: this.currentParams.phaseBadge,
      clean: true,
      params: { ...this.currentParams },
    };

    this.history.push(record);

    if (isPB) {
      this.bestLapTime = lapTime;
      this.bestLapNumber = this.lapNumber;
      this.bestParams = { ...this.currentParams };
      if (this.currentPathOffsets) {
        this.bestPathOffsets = new Float32Array(this.currentPathOffsets);
      }
      this.explorationTemp = Math.max(0.08, this.explorationTemp * 0.90);
    }

    return record;
  }
}

/* ==========================================================================
   Main Application Orchestrator for Assignment 3 (Windows 11 Edition)
   ========================================================================== */

class RacingGenesisApp {
  constructor() {
    this.container = $("webgl-container") || document.body;

    // 1. Realistic Three.js Daylight Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82bcee);
    this.scene.fog = new THREE.FogExp2(0xcce2f5, 0.0016);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 950);
    this.camera.position.set(0, 15, -30);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // 2. Setup Lighting & Terrain
    this.setupLighting();
    this.setupRealisticWorld();

    // 3. Track, Car with In-Car 3D Dashboard, Camera & Audio
    this.track = new Track3D(this.scene);
    this.track.app = this;
    this.car = new RaceCar3D(this.scene);
    this.cameraManager = new CameraManager3D(this.camera, this.renderer.domElement);
    this.audio = new RacingEngineSound();

    // 4. Raycasting & Handle Dragging
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.activeHandleIndex = null;
    this.isDraggingHandle = false;
    this.hoveredHandleIndex = null;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.groundHit = new THREE.Vector3();

    // 5. Physics & AI Driver State
    this.driverAI = new HeuristicNPCDriver();
    this.driverAI.startLap(1, this.track);
    this.state = "READY";
    this.progress = 0;
    this.currentLap = 1;
    this.lapTime = 0;
    this.speed = 0; // m/s
    this.lateralG = 0;
    this.targetSpeed = 0;
    this.steerAngle = 0;
    this.tireGrip = 1.15;
    this.totalLaps = 5;
    this.timeScale = 1;
    this.aiState = "IDLE";
    this.records = [];
    this.fastestRecord = null;
    this.throttleLevel = 0;
    this.brakeLevel = 0;
    this.currentAccel = 0; // Continuous jerk-limited acceleration
    this.currentRPM = 4500;
    this.currentGear = 1;

    // Performance FPS Meter
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();

    // 6. Connect UI & Windows 11 Panel Drawer Controls
    this.bindUI();

    // Initial HUD & Dashboard Render
    this.updateHUD();

    // 7. Start Animation Loop (Target 90 FPS High-Refresh Engine)
    this.targetFPS = 90;
    this.startAnimationLoop();
  }

  setupLighting() {
    const ambient = new THREE.HemisphereLight(0xd8eeff, 0x486444, 0.95);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffbf2, 1.45);
    sun.position.set(80, 110, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 320;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
  }

  setupRealisticWorld() {
    const grassTex = createGrassTexture();
    const groundGeom = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92, metalness: 0.05 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const skyGeom = new THREE.SphereGeometry(650, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x82bcee, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(skyDome);

    // Distant Mountain Ridges
    const mountainCount = 36;
    const mountainRadius = 480;
    for (let m = 0; m < mountainCount; m++) {
      const angle = (m / mountainCount) * Math.PI * 2;
      const height = 45 + (Math.sin(m * 2.5) + 1) * 35;
      const mGeom = new THREE.ConeGeometry(55, height, 6);
      const mMat = new THREE.MeshStandardMaterial({ color: 0x4a5e44, roughness: 0.95 });
      const mountain = new THREE.Mesh(mGeom, mMat);
      mountain.position.set(Math.cos(angle) * mountainRadius, height * 0.45, Math.sin(angle) * mountainRadius);
      this.scene.add(mountain);
    }

    // Distant Parkland Pine Trees (Safely placed beyond track perimeter at R >= 150m)
    const treeRingCount = 28;
    const treeRingRadius = 175;
    const foilMat = new THREE.MeshStandardMaterial({ color: 0x1f5424, roughness: 0.85 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a321c, roughness: 0.9 });
    const trunkGeom = new THREE.CylinderGeometry(0.45, 0.65, 4.5, 8);
    const coneGeom = new THREE.ConeGeometry(3.5, 5.0, 8);

    for (let t = 0; t < treeRingCount; t++) {
      const angle = (t / treeRingCount) * Math.PI * 2 + Math.sin(t * 3) * 0.15;
      const rad = treeRingRadius + Math.cos(t * 4) * 25;
      const tx = Math.cos(angle) * rad;
      const tz = Math.sin(angle) * rad;

      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = 2.25;
      treeGroup.add(trunk);

      for (let f = 0; f < 3; f++) {
        const cone = new THREE.Mesh(coneGeom, foilMat);
        cone.scale.setScalar(1.0 - f * 0.22);
        cone.position.y = 4.8 + f * 2.8;
        treeGroup.add(cone);
      }

      this.scene.add(treeGroup);
    }
  }

  bindUI() {
    // Windows 11 Drawer Panel Open/Close Toggles
    const leftPanel = $("leftPanel");
    const rightPanel = $("rightPanel");
    const btnToggleLeft = $("btnToggleLeft");
    const btnToggleRight = $("btnToggleRight");
    const btnCloseLeft = $("btnCloseLeft");
    const btnCloseRight = $("btnCloseRight");

    const togglePanel = (panel, btn) => {
      if (!panel) return;
      panel.classList.toggle("collapsed");
      const isCollapsed = panel.classList.contains("collapsed");
      if (btn) btn.classList.toggle("active", !isCollapsed);
    };

    if (btnToggleLeft) btnToggleLeft.addEventListener("click", () => togglePanel(leftPanel, btnToggleLeft));
    if (btnToggleRight) btnToggleRight.addEventListener("click", () => togglePanel(rightPanel, btnToggleRight));
    if (btnCloseLeft) btnCloseLeft.addEventListener("click", () => togglePanel(leftPanel, btnToggleLeft));
    if (btnCloseRight) btnCloseRight.addEventListener("click", () => togglePanel(rightPanel, btnToggleRight));

    // Keyboard Shortcuts: [ to toggle Track Editor, ] to toggle Telemetry
    window.addEventListener("keydown", (e) => {
      if (e.key === "[") togglePanel(leftPanel, btnToggleLeft);
      if (e.key === "]") togglePanel(rightPanel, btnToggleRight);
    });

    // Camera Switcher
    document.querySelectorAll(".cam-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".cam-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.cameraManager.setMode(btn.dataset.cam);
      });
    });

    // Sliders
    const syncOut = () => {
      $("scaleOut").value = `${Number($("scaleSlider").value).toFixed(2)}x`;
      $("widthOut").value = `${$("widthSlider").value} m`;
      $("curveOut").value = Number($("curveSlider").value).toFixed(2);
      $("gripOut").value = Number($("gripSlider").value).toFixed(2);
    };

    ["scaleSlider", "widthSlider", "curveSlider", "gripSlider"].forEach((id) => {
      $(id).addEventListener("input", syncOut);
    });

    $("btnRebuild").addEventListener("click", () => {
      this.track.setParameters(
        Number($("scaleSlider").value),
        Number($("widthSlider").value),
        Number($("curveSlider").value)
      );
      this.tireGrip = Number($("gripSlider").value);
      this.reset();
    });

    // F1 Circuit Presets
    document.querySelectorAll(".f1-preset-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".f1-preset-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.track.loadF1Preset(btn.dataset.preset);
        this.reset();
      });
    });

    $("btnRandomize").addEventListener("click", () => {
      this.track.randomize();
      this.reset();
    });

    $("btnEditHandles").addEventListener("click", () => {
      this.track.toggleEditHandles();
      if (this.track.editHandlesVisible && this.cameraManager.mode === "chase") {
        document.querySelectorAll(".cam-btn").forEach((b) => b.classList.remove("active"));
        const orbitBtn = document.querySelector('.cam-btn[data-cam="orbit"]');
        if (orbitBtn) orbitBtn.classList.add("active");
        this.cameraManager.setMode("orbit");
      }
    });

    // Stress testing buttons
    let isDense = false;
    $("btnStressGeom").addEventListener("click", () => {
      isDense = !isDense;
      this.track.setStressGeometry(isDense);
      $("btnStressGeom").classList.toggle("btn-primary", isDense);
      $("btnStressGeom").textContent = isDense ? "Dense Stress: ON" : "Dense Geometry Stress";
      this.reset();
    });

    $("btnStressCurve").addEventListener("click", () => {
      this.track.setHairpinStress();
      this.reset();
    });

    const lapInput = $("lapInput");
    if (lapInput) {
      lapInput.value = this.totalLaps;
      const handleLapCommit = () => {
        let clean = String(lapInput.value).replace(/[^0-9]/g, "");
        let val = parseInt(clean, 10);
        if (isNaN(val) || val < 1) val = 1;
        lapInput.value = val;
        this.totalLaps = val;
        if (this.state === "COMPLETE" && this.currentLap <= this.totalLaps) {
          this.state = "READY";
          setElText("simStateText", "READY");
        }
        this.updateHUD();
      };
      lapInput.addEventListener("change", handleLapCommit);
      lapInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
        if (e.target.value !== "") {
          let val = parseInt(e.target.value, 10);
          if (val >= 1) {
            this.totalLaps = val;
            this.updateHUD();
          }
        }
      });
    }

    $("speedSelect").addEventListener("change", (e) => {
      this.timeScale = Number(e.target.value);
    });

    $("btnStart").addEventListener("click", () => this.start());
    $("btnPause").addEventListener("click", () => this.pause());
    $("btnReset").addEventListener("click", () => this.reset());

    $("btnAudio").addEventListener("click", () => {
      const on = this.audio.toggle();
      $("btnAudio").textContent = on ? "🔊 Audio: ON" : "🔊 Audio: OFF";
      $("btnAudio").classList.toggle("win11-primary-btn", on);
    });

    this.setupHandleInteractions();

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    syncOut();
    this.updateHUD();
  }

  setupHandleInteractions() {
    const getPointerCoords = (clientX, clientY) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      if (!this.track.editHandlesVisible) return;
      const coords = getPointerCoords(e.clientX, e.clientY);
      this.mouse.set(coords.x, coords.y);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersects = this.raycaster.intersectObjects(this.track.handleMeshes, false);
      if (intersects.length > 0) {
        const handle = intersects[0].object;
        this.activeHandleIndex = handle.userData.anchorIndex;
        this.isDraggingHandle = true;
        this.cameraManager.locked = true;
        try {
          this.renderer.domElement.setPointerCapture(e.pointerId);
        } catch (_) {}
        this.track.highlightHandle(this.activeHandleIndex, true, false);
        this.renderer.domElement.style.cursor = "grabbing";
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.renderer.domElement.addEventListener("pointermove", (e) => {
      const coords = getPointerCoords(e.clientX, e.clientY);
      this.mouse.set(coords.x, coords.y);

      if (this.isDraggingHandle && this.activeHandleIndex !== null) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.raycaster.ray.intersectPlane(this.groundPlane, this.groundHit)) {
          this.track.moveAnchor(this.activeHandleIndex, this.groundHit.x, this.groundHit.z);
          if (this.state === "READY") {
            const startS = this.track.samples[0];
            this.car.carGroup.position.copy(startS.position);
            this.car.carGroup.rotation.y = Math.atan2(startS.tangent.x, startS.tangent.z);
          }
        }
        this.renderer.domElement.style.cursor = "grabbing";
      } else if (this.track.editHandlesVisible) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.track.handleMeshes, false);
        if (intersects.length > 0) {
          const idx = intersects[0].object.userData.anchorIndex;
          if (this.hoveredHandleIndex !== idx) {
            if (this.hoveredHandleIndex !== null) {
              this.track.highlightHandle(this.hoveredHandleIndex, false, false);
            }
            this.hoveredHandleIndex = idx;
            this.track.highlightHandle(idx, false, true);
          }
          this.renderer.domElement.style.cursor = "grab";
        } else {
          if (this.hoveredHandleIndex !== null) {
            this.track.highlightHandle(this.hoveredHandleIndex, false, false);
            this.hoveredHandleIndex = null;
          }
          this.renderer.domElement.style.cursor = "default";
        }
      }
    });

    const releaseHandleDrag = (e) => {
      if (this.isDraggingHandle) {
        try {
          if (e && e.pointerId) this.renderer.domElement.releasePointerCapture(e.pointerId);
        } catch (_) {}
        if (this.activeHandleIndex !== null) {
          this.track.highlightHandle(this.activeHandleIndex, false, false);
        }
        this.isDraggingHandle = false;
        this.activeHandleIndex = null;
        this.cameraManager.locked = false;
        this.renderer.domElement.style.cursor = "default";
        this.reset();
      }
    };

    this.renderer.domElement.addEventListener("pointerup", releaseHandleDrag);
    this.renderer.domElement.addEventListener("pointercancel", releaseHandleDrag);
  }

  start() {
    if (this.state === "COMPLETE") this.reset();
    this.state = "RUNNING";
    setElText("simStateText", "RUNNING");
  }

  pause() {
    if (this.state === "RUNNING") {
      this.state = "PAUSED";
      setElText("simStateText", "PAUSED");
    }
  }

  reset() {
    this.state = "READY";
    this.progress = 0;
    this.currentLap = 1;
    this.lapTime = 0;
    this.speed = 0;
    this.lateralG = 0;
    this.targetSpeed = 0;
    this.steerAngle = 0;
    this.throttleLevel = 0;
    this.brakeLevel = 0;
    this.currentAccel = 0;
    this.aiState = "IDLE";
    this.records = [];
    this.fastestRecord = null;
    this.driverAI.reset();
    this.driverAI.startLap(1, this.track);

    if (this.car && this.track) {
      this.track.getPathPosition(0, this.car.carGroup.position);
      this.car.carGroup.rotation.y = this.track.getTrajectoryHeading(0);
    }

    setElText("simStateText", "READY");
    const deltaVal = $("liveDeltaVal");
    if (deltaVal) {
      deltaVal.textContent = "PROBING";
      deltaVal.className = "delta-val";
    }
    this.updateHUD();
  }

  updatePhysics(dtWall) {
    if (this.state !== "RUNNING") return;

    // Direct synchronous frame-rate independent physics integration (Zero lag/stutter)
    const dt = Math.min(dtWall, 0.04) * this.timeScale;
    this.stepPhysics(dt);
  }

  stepPhysics(dt) {
    const params = this.driverAI.currentParams;
    const currSample = this.track.getSampleAt(this.progress);
    const trackLength = this.track.totalLength || (520 * this.track.lengthScale);

    // 1. Authentic F1 Aerodynamic Downforce:
    // Generates massive 4.5G - 5.2G cornering grip at high speeds
    const speedRatio = this.speed / 26.0;
    const downforceFactor = 1.0 + Math.min(4.4, speedRatio * speedRatio * 0.52);
    const aeroGrip = Math.min(54.0, this.tireGrip * G_ACCEL * downforceFactor);

    // 2. Curvature Lookahead & Target Apex Speed:
    const lookaheadSec = 1.4; // 1.4s preview distance
    const lookaheadMeters = Math.max(32.0, this.speed * lookaheadSec);
    const lookaheadFraction = Math.min(0.18, lookaheadMeters / trackLength);
    const previewProgress = (this.progress + lookaheadFraction) % 1;

    const upcomingCurvature = this.track.getPathCurvature(previewProgress);
    const currPathCurvature = this.track.getPathCurvature(this.progress);

    // Safe apex speed from centripetal physics: v = sqrt(aeroGrip / kappa)
    const rawApexSpeed = Math.sqrt(aeroGrip / Math.max(0.0007, upcomingCurvature)) * (params.apexCarryFactor || 1.0);
    const minSafeSpeed = 48 * MPH_TO_MS; // 48 mph hairpins
    const maxStraightSpeed = 228 * MPH_TO_MS; // 228 mph (367 km/h) authentic F1 top speed
    this.targetSpeed = Math.max(minSafeSpeed, Math.min(maxStraightSpeed, rawApexSpeed));

    // 3. Lateral Acceleration & Kamm Friction Circle
    const currLatG = (this.speed * this.speed * currPathCurvature) / G_ACCEL;
    this.lateralG = currLatG;
    const latAccelMs = currLatG * G_ACCEL;
    const longGripBudget = Math.sqrt(Math.max(0, aeroGrip * aeroGrip - latAccelMs * latAccelMs));

    // Natural tire scrub only bleeds speed when heavily loaded laterally in turns
    const tireScrubDecel = Math.max(0, (currLatG - 2.0)) * 2.2 * (this.speed / (this.speed + 8.0));

    // 4. Exact Kinematic Braking Point Calculation:
    // How many meters needed to brake down to targetSpeed at 4.2G deceleration?
    const stoppingDecel = 42.0; // 4.2G carbon brake deceleration
    const speedDeltaSq = (this.speed * this.speed) - (this.targetSpeed * this.targetSpeed);
    const requiredBrakingDist = speedDeltaSq > 0 ? speedDeltaSq / (2 * stoppingDecel) : 0;
    const distToApex = lookaheadFraction * trackLength;

    let targetAccel = 0;

    if (requiredBrakingDist > 0 && distToApex <= requiredBrakingDist + 8.0) {
      // THRESHOLD BRAKING: Arrived at braking point! Maximum stopping power
      const reqDecel = speedDeltaSq / Math.max(4.0, 2 * distToApex);
      const decel = Math.min(50.0, Math.max(20.0, reqDecel)); // Up to 5.0G peak braking
      targetAccel = -decel;
      this.aiState = "THRESHOLD BRAKING";
      this.brakeLevel = Math.min(1.0, decel / 42.0);
      this.throttleLevel = 0.0;
      const bWarn = $("brakingWarning");
      if (bWarn) bWarn.classList.add("visible");
    } else if (currPathCurvature > 0.0045) {
      // MID-CORNER APEX: Balance throttle and carry high corner speed
      this.aiState = "APEX SPEED SETTLE";
      targetAccel = (this.speed < this.targetSpeed ? 8.0 : -2.0) - tireScrubDecel;
      this.brakeLevel = 0.0;
      this.throttleLevel = 0.70;
      const bWarn = $("brakingWarning");
      if (bWarn) bWarn.classList.remove("visible");
    } else {
      // FULL THROTTLE STRAIGHT: F1 rocket acceleration (1000+ HP hybrid power)
      this.aiState = "FULL THROTTLE STRAIGHT";
      const f1PunchAccel = Math.min(28.0, longGripBudget) * (params.exitThrottleAggression || 1.0);
      // Ferocious continuous acceleration all the way to 220+ mph
      targetAccel = f1PunchAccel * Math.max(0.26, 1.0 - Math.pow(this.speed / maxStraightSpeed, 1.15));
      this.brakeLevel = 0.0;
      this.throttleLevel = 1.0;
      const bWarn = $("brakingWarning");
      if (bWarn) bWarn.classList.remove("visible");
    }

    // 5. Responsive Jerk-Limited Acceleration
    const maxJerk = 110.0; // Responsive F1 throttle & brake bite (m/s^3)
    const maxAccelChange = maxJerk * dt;
    this.currentAccel += THREE.MathUtils.clamp(targetAccel - this.currentAccel, -maxAccelChange, maxAccelChange);

    // 6. Velocity Integration (0-60 in 2.2s, reaches 220+ mph on straights)
    this.speed = Math.max(0, Math.min(maxStraightSpeed, this.speed + this.currentAccel * dt));

    // 7. Authentic F1 Steering Model (Dead-straight on straights, smooth Ackermann turn in corners)
    const lookaheadDs = 0.012; // Preview ~7 meters ahead of the front wing for smooth anticipatory steering
    const hCurr = this.track.getTrajectoryHeading(this.progress);
    const hAhead = this.track.getTrajectoryHeading(this.progress + lookaheadDs);
    let dHeading = hAhead - hCurr;
    while (dHeading > Math.PI) dHeading -= Math.PI * 2;
    while (dHeading < -Math.PI) dHeading += Math.PI * 2;

    const lookaheadDist = Math.max(1.0, lookaheadDs * trackLength);
    const pathCurvature = dHeading / lookaheadDist;
    const wheelbase = 3.6; // F1 wheelbase in meters
    const desiredSteer = THREE.MathUtils.clamp(Math.atan2(wheelbase * pathCurvature, 1.0), -0.38, 0.38);
    const steerRate = 1.0 - Math.exp(-7.0 * dt);
    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, desiredSteer, steerRate);

    // Track progression
    const deltaProgress = (this.speed * dt) / trackLength;
    this.progress += deltaProgress;
    this.lapTime += dt;

    if (this.progress >= 1.0) {
      this.completeLap();
    }
  }

  completeLap() {
    const record = this.driverAI.evaluateLap(this.lapTime);
    this.records.push(record);

    if (record.isPB) {
      this.fastestRecord = record;
    }

    if (this.currentLap >= this.totalLaps) {
      this.state = "COMPLETE";
      this.aiState = "COMPLETE";
      setElText("simStateText", "COMPLETE");
    } else {
      this.currentLap += 1;
      this.progress -= 1.0;
      this.lapTime = 0;
      this.driverAI.startLap(this.currentLap, this.track);
    }

    this.updateHUD();
  }

  updateHUD() {
    const speedMph = Math.round(this.speed * MS_TO_MPH);
    const speedKmh = Math.round(this.speed * 3.6);

    // Compute F1 Transmission & RPM continuously (independent of audio state)
    const trans = computeF1Transmission(speedMph);
    this.currentGear = trans.gear;
    this.currentRPM = THREE.MathUtils.lerp(this.currentRPM || 4500, trans.rpm, 0.22);

    // Standard sidebar HUD
    const spdEl = $("speedDisplay");
    if (spdEl) spdEl.textContent = speedMph;
    const latEl = $("lateralGDisplay");
    if (latEl) latEl.textContent = `${this.lateralG.toFixed(2)} G`;
    const tgtEl = $("targetSpeedDisplay");
    if (tgtEl) tgtEl.textContent = `${Math.round(this.targetSpeed * MS_TO_MPH)} mph`;
    const lapEl = $("lapTimeDisplay");
    if (lapEl) lapEl.textContent = `${this.lapTime.toFixed(2)} s`;
    const cntEl = $("lapCountDisplay");
    if (cntEl) cntEl.textContent = `Lap ${Math.min(this.currentLap, this.totalLaps)} of ${this.totalLaps}`;
    const aiEl = $("aiStateDisplay");
    if (aiEl) aiEl.textContent = this.aiState;

    // Update 3D In-Car Fixed Steering Wheel Dashboard (Unconditionally active)
    let delta = 0;
    if (this.driverAI.bestLapTime !== Infinity && this.progress > 0.03 && this.state === "RUNNING") {
      const expectedTimeAtProgress = this.driverAI.bestLapTime * this.progress;
      delta = this.lapTime - expectedTimeAtProgress;
    }

    if (this.car) {
      this.car.updateDashboard(
        speedMph,
        speedKmh,
        this.currentRPM,
        this.currentGear,
        this.throttleLevel,
        this.brakeLevel,
        delta,
        this.currentLap,
        this.totalLaps,
        this.lateralG
      );
    }



    // Vehicle Telemetry Meters (Essentials Only)
    const brakeMeter = $("brakeMeter");
    if (brakeMeter) brakeMeter.style.width = `${Math.round(this.brakeLevel * 100)}%`;
    const apexMeter = $("apexMeter");
    if (apexMeter) apexMeter.style.width = `${Math.min(100, Math.round((this.lateralG / (this.tireGrip * 3.8)) * 100))}%`;
    const throttleMeter = $("throttleMeter");
    if (throttleMeter) throttleMeter.style.width = `${Math.round(this.throttleLevel * 100)}%`;

    if (this.fastestRecord) {
      setElText("fastestLapTag", `Best: ${this.fastestRecord.time.toFixed(2)}s (Lap ${this.fastestRecord.lap})`);
    } else {
      setElText("fastestLapTag", "Best: --");
    }

    // Live Delta Indicator
    const deltaVal = $("liveDeltaVal");
    if (deltaVal) {
      if (this.driverAI.bestLapTime !== Infinity && this.progress > 0.03 && this.state === "RUNNING") {
        const expectedTimeAtProgress = this.driverAI.bestLapTime * this.progress;
        const liveDelta = this.lapTime - expectedTimeAtProgress;
        const sign = liveDelta <= 0 ? "-" : "+";
        const deltaText = `${sign}${Math.abs(liveDelta).toFixed(2)}s`;
        deltaVal.textContent = deltaText;
        deltaVal.className = liveDelta <= 0 ? "delta-val green" : "delta-val red";
      } else if (this.state === "COMPLETE") {
        const resText = this.fastestRecord ? this.fastestRecord.time.toFixed(2) + "s" : "--";
        deltaVal.textContent = `OPTIMIZED: ${resText}`;
        deltaVal.className = "delta-val green";
      } else {
        deltaVal.textContent = "PROBING";
        deltaVal.className = "delta-val";
      }
    }

    const tbody = $("lapTableBody");
    if (tbody) {
      if (this.records.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="3">Awaiting first flying lap...</td></tr>`;
      } else {
        tbody.innerHTML = this.records
          .map(
            (r) => `
          <tr class="${r.isPB ? "fastest-row" : ""}">
            <td>Lap ${r.lap}${r.isPB ? ' <span class="pb-flag">&#9733;</span>' : ""}</td>
            <td><strong>${r.time.toFixed(2)}s</strong></td>
            <td class="${r.lap === 1 ? "" : r.delta <= 0 ? "cyan" : "amber"}">
              ${r.lap === 1 ? "Baseline" : (r.delta <= 0 ? "-" : "+") + Math.abs(r.delta).toFixed(2) + "s"}
            </td>
          </tr>
        `
          )
          .join("");
      }
    }
  }

  updateFPS() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 250) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      const fpsEl = $("fpsDisplay");
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  startAnimationLoop() {
    this.targetFPS = 90;
    this.minFrameIntervalMs = 1000 / (this.targetFPS + 1); // ~10.98ms minimum frame pacing
    this.lastFrameTime = performance.now();
    this.lastStepTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      if (elapsed < this.minFrameIntervalMs) return;

      const dt = Math.min((now - this.lastStepTime) / 1000, 0.033);
      this.lastFrameTime = now;
      this.lastStepTime = now;

      this.stepFrame(dt);
    };

    // V-Sync alignment for displays (90Hz, 120Hz, 144Hz+)
    const rAFLoop = () => {
      this.rafId = requestAnimationFrame(rAFLoop);
      tick();
    };
    this.rafId = requestAnimationFrame(rAFLoop);

    // High frequency interval timer to achieve 90 FPS even on standard 60Hz displays
    this.intervalId = setInterval(() => {
      tick();
    }, 11);
  }

  animate() {
    this.stepFrame(1 / 90);
  }

  stepFrame(dt) {
    // 1. Update Physics
    this.updatePhysics(dt);

    // 2. Position Car along continuous 3D spline
    this.track.getPathPosition(this.progress, this.car.carGroup.position);

    // 3. Orient Car along trajectory vector (smooth, seamless heading)
    const targetHeading = this.track.getTrajectoryHeading(this.progress);
    if (this.state === "READY") {
      this.car.carGroup.rotation.y = targetHeading;
    } else {
      let dRot = targetHeading - this.car.carGroup.rotation.y;
      while (dRot > Math.PI) dRot -= Math.PI * 2;
      while (dRot < -Math.PI) dRot += Math.PI * 2;
      // Realistic chassis yaw rotational inertia (smooth, composed turn-in, zero jerking)
      const blend = 1.0 - Math.exp(-8.5 * dt);
      this.car.carGroup.rotation.y += dRot * THREE.MathUtils.clamp(blend, 0, 1);
    }

    // 4. Update Car Wheel and Chassis Visuals
    const isBraking = this.aiState.includes("BRAKING");
    this.car.updateVisuals(this.speed, this.steerAngle, isBraking, dt);

    // 5. Update Braking Zone Overlay
    this.track.updateBrakingZone(this.progress);

    // 6. Update Handle Scales
    this.track.updateHandleScales(this.camera);

    // 7. Update Camera (Chase camera locks directly behind car's actual forward chassis heading)
    this.car.carGroup.getWorldDirection(_camForwardVec);
    this.cameraManager.update(this.car.carGroup, _camForwardVec, this.speed, dt);

    // Driver helmet & Halo central pillar visibility: hide in Cockpit 3D POV so track and road ahead are completely unobstructed
    const isCockpit = (this.cameraManager.mode === "hood");
    if (this.car.helmetMesh) {
      this.car.helmetMesh.visible = !isCockpit;
      this.car.visorMesh.visible = !isCockpit;
    }
    if (this.car.haloStrut) {
      this.car.haloStrut.visible = !isCockpit;
    }

    // 8. Update Audio Synthesizer (in sync with live RPM and Gear)
    if (this.audio) {
      const speedMph = this.speed * MS_TO_MPH;
      this.audio.update(speedMph, isBraking, this.throttleLevel, this.currentRPM, this.currentGear);
    }

    // 9. Update HUD Telemetry & In-Car 3D Dashboard (Every single frame unconditionally)
    this.updateHUD();

    // 10. Update FPS Counter
    this.updateFPS();

    // 11. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

function launchApp() {
  try {
    console.log("Mounting Racing Genesis Assignment 3 MVP Simulator (Windows 11 Edition)...");
    window.racingApp = new RacingGenesisApp();
    console.log("Assignment 3 MVP Simulator mounted successfully!");
  } catch (err) {
    console.error("Critical error starting Assignment 3 simulator:", err);
    const banner = document.getElementById("aiStateDisplay");
    if (banner) banner.textContent = "ERROR: " + err.message;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", launchApp);
} else {
  launchApp();
}
