/**
 * Goddess Durga Maa - Cinematic Devotional Particle Experience
 * Authentic Paint Sketch Drawing & Devotional WebGL Particle Engine (60 FPS)
 * 62,000 Particles • Real-time Sacred Sketch Generation • Sacred Harmonics
 */

(function () {
  'use strict';

  const CFG = window.DURGA_PARTICLE_CONFIG || {};
  const CENTER = [0.5, 0.519]; // Center of circular flame wall

  const CONFIG = {
    drawingDuration: 5.8,    // Seconds for artist sketch drawing generation
    swirlDuration: 4.5,      // Seconds for cosmic vortex convergence
    sparkCount: 180,         // Rising embers
    aspectRatio: 9 / 16
  };

  // --- DOM Elements ---
  const stageWrapper = document.getElementById('stage-wrapper');
  const glCanvas = document.getElementById('particle-canvas');
  const auraCanvas = document.getElementById('aura-canvas');
  const sketchCanvas = document.getElementById('sketch-canvas');
  const embersCanvas = document.getElementById('embers-canvas');
  const hudOverlay = document.getElementById('hud-overlay');

  const modeBtn = document.getElementById('mode-btn');
  const replayBtn = document.getElementById('replay-btn');
  const soundBtn = document.getElementById('sound-btn');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const glowToggleBtn = document.getElementById('glow-toggle-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // --- WebGL Context ---
  const gl = glCanvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  });

  const auraCtx = auraCanvas ? auraCanvas.getContext('2d') : null;
  const sketchCtx = sketchCanvas ? sketchCanvas.getContext('2d') : null;
  const embersCtx = embersCanvas ? embersCanvas.getContext('2d') : null;

  if (!gl) {
    alert('WebGL is required for particle rendering.');
    return;
  }

  // --- State Variables ---
  // Mode: 1 = Authentic Paint Sketch Drawing Mode (Default), 0 = Cosmic Swirl Vortex Mode
  let currentMode = 1;
  let animationTime = 0;
  let animStartTime = performance.now();
  let isFormed = false;
  let glowEnabled = true;
  let audioPlaying = false;
  let audioCtx = null;
  let droneGain = null;

  // 3D Parallax Tilt
  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;

  // Touch Shockwave Ripple
  const shockwave = { x: CENTER[0], y: CENTER[1], radius: -1.0, intensity: 0.0 };

  // Auto-hide HUD (Pure Icons, Zero Words)
  let hudHideTimer = null;
  function resetHudTimer() {
    hudOverlay.classList.remove('auto-hidden');
    clearTimeout(hudHideTimer);
    hudHideTimer = setTimeout(() => {
      hudOverlay.classList.add('auto-hidden');
    }, 3200);
  }

  window.addEventListener('mousemove', resetHudTimer);
  window.addEventListener('touchstart', resetHudTimer, { passive: true });
  resetHudTimer();

  // --- Particle Data Decoding & Sketch Timeline Assignment ---
  const totalCount = CFG.totalCount || 62000;
  const fireCount = CFG.fireCount || 32000;
  const silCount = CFG.silCount || 16000;
  const rimCount = CFG.rimCount || 14000;

  let particleCount = 0;
  let startPosArray, targetPosArray, colorArray, metaArray, drawInfoArray;

  function decodeParticles() {
    if (!CFG.base64Data) return;

    const binaryStr = atob(CFG.base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const dataView = new DataView(bytes.buffer);
    const stride = 10;
    particleCount = Math.floor(len / stride);

    startPosArray = new Float32Array(particleCount * 3);
    targetPosArray = new Float32Array(particleCount * 2);
    colorArray = new Float32Array(particleCount * 3);
    metaArray = new Float32Array(particleCount * 3);
    drawInfoArray = new Float32Array(particleCount * 4);

    let offset = 0;
    for (let i = 0; i < particleCount; i++) {
      const nx = dataView.getUint16(offset, true) / 65535.0;
      const ny = dataView.getUint16(offset + 2, true) / 65535.0;
      const r = dataView.getUint8(offset + 4) / 255.0;
      const g = dataView.getUint8(offset + 5) / 255.0;
      const b = dataView.getUint8(offset + 6) / 255.0;
      const ptype = dataView.getUint8(offset + 7);
      const sizeScale = dataView.getUint8(offset + 8) / 255.0;
      const phase = (dataView.getUint8(offset + 9) / 255.0) * Math.PI * 2.0;

      offset += stride;

      // 1. Cosmic Swirl 3D Spherical Scatter (for Mode 0)
      const theta = Math.random() * Math.PI * 2.0;
      const phi = (Math.random() - 0.5) * Math.PI;
      const radius = 1.2 + Math.random() * 2.2;
      const sx = Math.cos(phi) * Math.cos(theta) * radius + CENTER[0];
      const sy = Math.sin(phi) * radius + CENTER[1];
      const sz = Math.cos(phi) * Math.sin(theta) * radius;

      startPosArray[i * 3] = sx;
      startPosArray[i * 3 + 1] = sy;
      startPosArray[i * 3 + 2] = sz;

      targetPosArray[i * 2] = nx;
      targetPosArray[i * 2 + 1] = ny;

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;

      metaArray[i * 3] = ptype;
      metaArray[i * 3 + 1] = sizeScale;
      metaArray[i * 3 + 2] = phase;

      // 2. Authentic Artist Drawing Sequence Timeline (for Mode 1)
      let dt = 0;
      let strokeAngle = phase;
      let strokeLen = 0.020 + (phase / (Math.PI * 2.0)) * 0.025;

      if (ptype === 1) {
        // --- PHASE 1: RIM & SACRED CONTOURS (0.02 to 0.42) ---
        // An artist sketches the outlines first: Crown -> Face -> Weapons -> Torso -> Lion -> Pedestal
        const yNorm = Math.max(0, Math.min(1, (ny - 0.31) / 0.63));
        const distCenter = Math.abs(nx - 0.52);

        if (ny < 0.40) {
          // Crown (Mukut) & Trishul apex
          dt = 0.02 + yNorm * 0.16 + (Math.sin(phase) * 0.015);
        } else if (ny < 0.48 && distCenter < 0.12) {
          // Divine Face, Eyes, Tilak
          dt = 0.11 + ((ny - 0.40) / 0.08) * 0.08 + (Math.sin(phase) * 0.012);
        } else if (distCenter >= 0.12 && ny < 0.65) {
          // 10 Divine Arms & Weapons radiating outward
          dt = 0.19 + ((ny - 0.35) / 0.30) * 0.10 + (Math.sin(phase) * 0.02);
        } else if (ny < 0.66) {
          // Royal Torso & Sacred Sari
          dt = 0.29 + ((ny - 0.46) / 0.20) * 0.05 + (Math.sin(phase) * 0.015);
        } else if (ny < 0.82) {
          // Lion Head, Mane & Roaring Jaws
          dt = 0.34 + ((ny - 0.60) / 0.22) * 0.06 + (Math.sin(phase) * 0.018);
        } else {
          // Lion Paws & Lotus Pedestal
          dt = 0.40 + ((ny - 0.80) / 0.18) * 0.04 + (Math.sin(phase) * 0.012);
        }
      } else if (ptype === 0) {
        // --- PHASE 2: SILHOUETTE SHADING & CHARCOAL STIPPLE (0.30 to 0.68) ---
        // Artist adds depth and volume with charcoal hatching and stippling
        const yNorm = Math.max(0, Math.min(1, (ny - 0.31) / 0.69));
        dt = 0.30 + yNorm * 0.36 + (Math.sin(phase) * 0.025);
      } else {
        // --- PHASE 3: SACRED FLAME MANDALA (0.58 to 0.94) ---
        // Artist sweeps sweeping circular brushstrokes painting the circular flame halo
        const dx = nx - CENTER[0];
        const dy = ny - CENTER[1];
        const angle = Math.atan2(dy, dx);
        let sweep = Math.abs(angle + Math.PI / 2.0);
        if (sweep > Math.PI) sweep = Math.PI * 2.0 - sweep;
        const normSweep = sweep / Math.PI; // 0 at top halo apex, 1 at bottom base
        dt = 0.58 + normSweep * 0.34 + (Math.sin(phase) * 0.02);
        strokeAngle = angle + (phase > Math.PI ? Math.PI / 2.0 : -Math.PI / 2.0);
      }

      dt = Math.max(0.01, Math.min(0.96, dt));
      drawInfoArray[i * 4] = dt;
      drawInfoArray[i * 4 + 1] = Math.cos(strokeAngle) * strokeLen;
      drawInfoArray[i * 4 + 2] = Math.sin(strokeAngle) * strokeLen;
      drawInfoArray[i * 4 + 3] = strokeLen;
    }
  }

  decodeParticles();

  // --- WebGL Shaders (Paint Sketch & Particle Dual Engine) ---
  const vertexShaderSource = `
    precision highp float;
    
    attribute vec3 a_startPos;
    attribute vec2 a_targetPos;
    attribute vec3 a_color;
    attribute vec3 a_meta;
    attribute vec4 a_drawInfo; // [drawTime, strokeDx, strokeDy, strokeLen]

    uniform float u_time;
    uniform float u_progress;
    uniform vec2 u_center;
    uniform vec2 u_mouseTilt;
    uniform vec4 u_shockwave;
    uniform float u_dpr;
    uniform float u_mode; // 1.0 = Paint Sketch Drawing, 0.0 = Cosmic Swirl

    varying vec4 v_color;
    varying float v_type;
    varying float v_sketchT;

    float easeOutCubic(float t) {
      return 1.0 - pow(1.0 - t, 3.0);
    }

    void main() {
      float ptype = a_meta.x;
      float sizeScale = a_meta.y;
      float phase = a_meta.z;
      v_type = ptype;

      vec2 center = u_center;
      vec2 currentPos;
      float currentZ = 0.0;
      float strokeFlash = 0.0;
      float sketchT = 1.0;

      if (u_mode > 0.5) {
        // ==========================================
        // 🎨 AUTHENTIC PAINT SKETCH DRAWING ENGINE
        // ==========================================
        float dt = a_drawInfo.x;
        float strokeDuration = 0.045; // Energetic drawing stroke flick duration

        if (u_progress < dt) {
          // Particle has not been drawn yet: invisible off-screen
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          v_color = vec4(0.0);
          v_sketchT = 0.0;
          return;
        }

        sketchT = clamp((u_progress - dt) / strokeDuration, 0.0, 1.0);
        float easedStroke = easeOutCubic(sketchT);

        // Dynamic stroke arrival: particle is struck onto paper with an artist's pencil flick
        vec2 strokeOffset = a_drawInfo.yz * (1.0 - easedStroke);
        currentPos = a_targetPos - strokeOffset;

        // Fresh wet ink / molten gold strike flash:
        strokeFlash = sin(sketchT * 3.14159) * 1.6;

        // Once sketch is finished (u_progress > 0.93), divine living breathing awakens:
        if (u_progress > 0.93) {
          float formedWeight = smoothstep(0.93, 1.0, u_progress);
          float breath = sin(u_time * 1.1 + phase * 0.2) * 0.0028;
          currentPos += (currentPos - center) * breath * formedWeight;

          if (ptype > 1.5) {
            float flameLick = sin(u_time * 4.2 + phase * 6.5) * 0.007;
            vec2 radialDir = normalize(currentPos - center);
            currentPos += radialDir * flameLick * formedWeight;
          } else if (ptype > 0.5) {
            float rimJitter = sin(u_time * 6.0 + phase * 8.0) * 0.0009;
            currentPos += vec2(rimJitter) * formedWeight;
          }
        }

        // Divine Touch Shockwave Ripple
        if (u_shockwave.z > 0.0 && u_progress > 0.88) {
          vec2 toWave = currentPos - u_shockwave.xy;
          toWave.y *= 16.0 / 9.0;
          float d = length(toWave);
          float waveDist = abs(d - u_shockwave.z);
          if (waveDist < 0.14) {
            float waveForce = exp(-pow(waveDist / 0.05, 2.0)) * u_shockwave.w;
            currentPos += normalize(currentPos - u_shockwave.xy) * waveForce * 0.035;
          }
        }

      } else {
        // ==========================================
        // ✨ ORIGINAL COSMIC SWIRL VORTEX ENGINE
        // ==========================================
        float delay = mod(phase * 0.28, 0.22);
        float t = clamp((u_progress - delay) / (1.0 - 0.22), 0.0, 1.0);
        float easedT = easeOutCubic(t);

        vec2 toTarget = a_targetPos - center;
        float swirlAngle = (1.0 - easedT) * 4.8 * (sin(phase) > 0.0 ? 1.0 : -0.75);
        float cosA = cos(swirlAngle);
        float sinA = sin(swirlAngle);
        mat2 rot = mat2(cosA, -sinA, sinA, cosA);
        vec2 swirledTarget = center + rot * toTarget * mix(1.8, 1.0, easedT);

        currentPos = mix(a_startPos.xy, swirledTarget, easedT);
        currentZ = mix(a_startPos.z, 0.0, easedT);

        if (easedT > 0.82) {
          float formedWeight = smoothstep(0.82, 1.0, easedT);
          float breath = sin(u_time * 1.1 + phase * 0.2) * 0.0035;
          currentPos += (currentPos - center) * breath * formedWeight;

          if (ptype > 1.5) {
            float flameLick = sin(u_time * 4.2 + phase * 6.5) * 0.008;
            vec2 radialDir = normalize(currentPos - center);
            currentPos += radialDir * flameLick * formedWeight;
          } else if (ptype > 0.5) {
            float rimJitter = sin(u_time * 6.0 + phase * 8.0) * 0.0012;
            currentPos += vec2(rimJitter) * formedWeight;
          }

          if (u_shockwave.z > 0.0) {
            vec2 toWave = currentPos - u_shockwave.xy;
            toWave.y *= 16.0 / 9.0;
            float d = length(toWave);
            float waveDist = abs(d - u_shockwave.z);
            if (waveDist < 0.14) {
              float waveForce = exp(-pow(waveDist / 0.05, 2.0)) * u_shockwave.w;
              currentPos += normalize(currentPos - u_shockwave.xy) * waveForce * 0.038;
            }
          }
        }
      }

      // 3D Parallax Tilt
      vec2 parallax = u_mouseTilt * 0.016;
      currentPos += parallax;

      // NDC Transformation [-1, 1]
      vec2 ndc;
      ndc.x = (currentPos.x - 0.5) * 2.0;
      ndc.y = (0.5 - currentPos.y) * 2.0;
      gl_Position = vec4(ndc, currentZ * 0.08, 1.0);

      // Particle Size Scaling
      float baseSize = 2.6 * u_dpr * sizeScale;
      if (u_mode > 0.5) {
        if (ptype > 1.5) {
          float fireFlicker = 0.90 + 0.30 * sin(u_time * 5.2 + phase * 9.0);
          gl_PointSize = baseSize * (1.35 + strokeFlash * 0.7) * fireFlicker;
        } else if (ptype > 0.5) {
          float rimTwinkle = 0.92 + 0.30 * sin(u_time * 7.5 + phase * 12.0);
          gl_PointSize = baseSize * (1.25 + strokeFlash * 0.8) * rimTwinkle;
        } else {
          gl_PointSize = baseSize * (1.25 + strokeFlash * 0.5);
        }
      } else {
        if (ptype > 1.5) {
          float fireFlicker = 0.88 + 0.32 * sin(u_time * 5.2 + phase * 9.0);
          gl_PointSize = baseSize * 1.6 * fireFlicker;
        } else if (ptype > 0.5) {
          float rimTwinkle = 0.9 + 0.35 * sin(u_time * 7.5 + phase * 12.0);
          gl_PointSize = baseSize * 1.25 * rimTwinkle;
        } else {
          gl_PointSize = baseSize * 1.35;
        }
        float easedT = easeOutCubic(u_progress);
        gl_PointSize *= mix(1.7, 1.0, easedT);
      }

      // Color & Alpha Computation
      vec3 finalCol = a_color;
      float alpha = 1.0;

      if (u_mode > 0.5) {
        // --- PAINT SKETCH COLOR PALETTE ---
        if (ptype > 1.5) {
          // Warm glowing fiery tempera brushstrokes
          float pulse = sin(u_time * 3.2 + phase * 4.5);
          finalCol.r = clamp(finalCol.r + pulse * 0.07, 0.0, 1.0);
          finalCol.g = clamp(finalCol.g + pulse * 0.05, 0.0, 1.0);
          finalCol = mix(finalCol, vec3(1.0, 0.96, 0.70), strokeFlash * 0.55);
          alpha = 0.95;
        } else if (ptype > 0.5) {
          // Molten 24K gold leaf pencil & metallic drafting ink
          float shimmer = 0.95 + 0.25 * sin(u_time * 6.5 + phase * 14.0);
          vec3 gold = vec3(1.0, 0.88, 0.40) * shimmer;
          finalCol = mix(gold, vec3(1.0, 0.98, 0.85), strokeFlash * 0.7);
          alpha = 1.0;
        } else {
          // Charcoal bronze stipple with wet ink touch gloss
          alpha = 0.98;
          if (strokeFlash > 0.1) {
            finalCol = mix(finalCol, vec3(0.35, 0.25, 0.15), strokeFlash * 0.5);
          }
        }
      } else {
        // --- COSMIC SWIRL COLOR PALETTE ---
        float easedT = easeOutCubic(u_progress);
        if (easedT > 0.78) {
          if (ptype > 1.5) {
            float pulse = sin(u_time * 3.2 + phase * 4.5);
            finalCol.r = clamp(finalCol.r + pulse * 0.07, 0.0, 1.0);
            finalCol.g = clamp(finalCol.g + pulse * 0.05, 0.0, 1.0);
            alpha = 0.95;
          } else if (ptype > 0.5) {
            float shimmer = 0.95 + 0.25 * sin(u_time * 6.5 + phase * 14.0);
            finalCol = vec3(1.0, 0.88, 0.40) * shimmer;
            alpha = 1.0;
          } else {
            alpha = 0.98;
          }
        } else {
          finalCol = mix(vec3(1.0, 0.72, 0.30), finalCol, easedT);
          alpha = mix(0.75, 1.0, easedT);
        }
      }

      v_color = vec4(finalCol, alpha);
      v_sketchT = sketchT;
    }
  `;

  const fragmentShaderSource = `
    precision highp float;
    
    varying vec4 v_color;
    varying float v_type;
    varying float v_sketchT;

    void main() {
      vec2 coord = (gl_PointCoord - vec2(0.5)) * 2.0;
      float dist = length(coord);
      if (dist > 1.0) discard;

      float ptype = v_type;

      // Authentic hand-drawn paper tooth and stipple irregularity
      float angle = atan(coord.y, coord.x);
      float grain = sin(angle * 6.0) * 0.05 + cos(angle * 11.0) * 0.03;
      float stippleDist = dist + grain;

      if (ptype < 0.5) {
        // SILHOUETTE PARTICLES: Charcoal & Indian Sumi-e Ink Stipple
        float edge = smoothstep(1.0, 0.68, stippleDist);
        float charcoalCore = 0.88 + 0.12 * exp(-dist * 3.0);
        gl_FragColor = vec4(v_color.rgb * charcoalCore, v_color.a * edge);
      } else if (ptype < 1.5) {
        // RIM PARTICLES: 24K Gold Leaf & Metallic Drafting Ink
        float core = exp(-dist * 4.4);
        float halo = pow(clamp(1.0 - dist, 0.0, 1.0), 1.8);
        float intensity = mix(halo, core, 0.65);
        vec3 goldRgb = v_color.rgb + vec3(core * 0.55, core * 0.45, core * 0.18);
        gl_FragColor = vec4(goldRgb, intensity * v_color.a);
      } else {
        // FIRE PARTICLES: Incandescent Gouache & Tempera Flame Flecks
        float core = exp(-dist * 4.0);
        float glow = pow(clamp(1.0 - dist, 0.0, 1.0), 1.5);
        float intensity = mix(glow, core, 0.52);
        vec3 flameRgb = v_color.rgb + vec3(core * 0.45, core * 0.35, core * 0.12);
        gl_FragColor = vec4(flameRgb, intensity * v_color.a);
      }
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  const locStartPos = gl.getAttribLocation(program, 'a_startPos');
  const locTargetPos = gl.getAttribLocation(program, 'a_targetPos');
  const locColor = gl.getAttribLocation(program, 'a_color');
  const locMeta = gl.getAttribLocation(program, 'a_meta');
  const locDrawInfo = gl.getAttribLocation(program, 'a_drawInfo');

  const uTimeLoc = gl.getUniformLocation(program, 'u_time');
  const uProgressLoc = gl.getUniformLocation(program, 'u_progress');
  const uCenterLoc = gl.getUniformLocation(program, 'u_center');
  const uMouseTiltLoc = gl.getUniformLocation(program, 'u_mouseTilt');
  const uShockwaveLoc = gl.getUniformLocation(program, 'u_shockwave');
  const uDprLoc = gl.getUniformLocation(program, 'u_dpr');
  const uModeLoc = gl.getUniformLocation(program, 'u_mode');

  function initBuffer(data, loc, size) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return buf;
  }

  if (particleCount > 0) {
    initBuffer(startPosArray, locStartPos, 3);
    initBuffer(targetPosArray, locTargetPos, 2);
    initBuffer(colorArray, locColor, 3);
    initBuffer(metaArray, locMeta, 3);
    initBuffer(drawInfoArray, locDrawInfo, 4);
  }

  gl.enable(gl.BLEND);

  // --- Dynamic Sketch Stylus Sparks & Cross-Hatch Lines ---
  const sketchSparks = [];
  const MAX_SPARKS = 35;

  function addStylusSpark(x, y, vx, vy, color) {
    if (sketchSparks.length > MAX_SPARKS) sketchSparks.shift();
    sketchSparks.push({
      x, y,
      vx: vx + (Math.random() - 0.5) * 50,
      vy: vy + (Math.random() - 0.5) * 50,
      life: 0,
      maxLife: 0.22 + Math.random() * 0.22,
      size: 1.5 + Math.random() * 2.5,
      color: color || [255, 220, 100]
    });
  }

  // Smooth parametric trajectory of the artist's stylus
  function getStylusPos(p) {
    if (p < 0.11) {
      // Crown & Trishul top
      const t = p / 0.11;
      return [0.51 + Math.sin(t * Math.PI * 4.0) * 0.05, 0.31 + Math.cos(t * Math.PI * 3.0) * 0.04];
    } else if (p < 0.19) {
      // Divine Face, Eyes, Tilak
      const t = (p - 0.11) / 0.08;
      return [0.50 + Math.sin(t * Math.PI * 5.0) * 0.035, 0.41 + t * 0.05 + Math.sin(t * Math.PI * 6.0) * 0.02];
    } else if (p < 0.29) {
      // 10 Divine Arms & Weapons
      const t = (p - 0.19) / 0.10;
      const side = Math.sin(t * Math.PI * 7.0) > 0 ? 1 : -1;
      const xSpread = 0.50 + side * (0.16 + Math.sin(t * Math.PI * 3.0) * 0.14);
      const ySpread = 0.40 + t * 0.20 + Math.cos(t * Math.PI * 4.0) * 0.04;
      return [xSpread, ySpread];
    } else if (p < 0.34) {
      // Royal Torso & Sacred Garments
      const t = (p - 0.29) / 0.05;
      return [0.50 + Math.sin(t * Math.PI * 6.0) * 0.04, 0.53 + t * 0.10];
    } else if (p < 0.40) {
      // Lion Head, Mane & Roaring Jaws
      const t = (p - 0.34) / 0.06;
      return [0.44 + Math.sin(t * Math.PI * 5.0) * 0.07, 0.65 + t * 0.11];
    } else if (p < 0.44) {
      // Lotus Pedestal Foundation
      const t = (p - 0.40) / 0.04;
      return [0.50 + Math.sin(t * Math.PI * 4.0) * 0.22, 0.88 + Math.cos(t * Math.PI * 3.0) * 0.03];
    } else if (p < 0.60) {
      // Silhouette Hatching & Stipples
      const t = (p - 0.44) / 0.16;
      return [0.50 + Math.sin(t * Math.PI * 12.0) * 0.12, 0.38 + t * 0.46];
    } else {
      // Circular Flame Mandala (Dual sweep around center)
      const t = (p - 0.60) / 0.34;
      const angle = -Math.PI / 2.0 + t * Math.PI;
      const r = 0.35;
      return [CENTER[0] + Math.cos(angle) * r * (9 / 16), CENTER[1] + Math.sin(angle) * r];
    }
  }

  function renderSketchOverlay(width, height, dt, time, progress) {
    if (!sketchCtx) return;
    sketchCtx.clearRect(0, 0, width, height);

    if (currentMode !== 1 || progress >= 0.98) return;

    const [sxNorm, syNorm] = getStylusPos(progress);
    const sx = sxNorm * width;
    const sy = syNorm * height;

    if (Math.random() < 0.7) {
      addStylusSpark(sx, sy, 0, 0, progress > 0.60 ? [255, 140, 20] : [255, 230, 110]);
    }

    if (progress < 0.60) {
      // --- GOLDEN DRAFTING STYLUS NIB ---
      const nibPulse = 1.0 + 0.25 * Math.sin(time * 25.0);
      const nibRadius = 5.5 * nibPulse;

      const grad = sketchCtx.createRadialGradient(sx, sy, 0, sx, sy, nibRadius * 3.5);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(255, 225, 90, 0.85)');
      grad.addColorStop(0.6, 'rgba(255, 160, 20, 0.35)');
      grad.addColorStop(1, 'rgba(255, 100, 0, 0)');

      sketchCtx.fillStyle = grad;
      sketchCtx.beginPath();
      sketchCtx.arc(sx, sy, nibRadius * 3.5, 0, Math.PI * 2);
      sketchCtx.fill();

      // Sharp white stylus core
      sketchCtx.fillStyle = '#ffffff';
      sketchCtx.beginPath();
      sketchCtx.arc(sx, sy, 2.0, 0, Math.PI * 2);
      sketchCtx.fill();

      // Dynamic sketch hatch strokes around active nib
      sketchCtx.strokeStyle = 'rgba(255, 215, 80, 0.40)';
      sketchCtx.lineWidth = 1.2;
      for (let j = 0; j < 3; j++) {
        const hAngle = (time * 16.0 + j * 2.1);
        const len = 10 + Math.sin(j * 4.0) * 5;
        sketchCtx.beginPath();
        sketchCtx.moveTo(sx - Math.cos(hAngle) * len, sy - Math.sin(hAngle) * len);
        sketchCtx.lineTo(sx + Math.cos(hAngle) * len, sy + Math.sin(hAngle) * len);
        sketchCtx.stroke();
      }

    } else {
      // --- DUAL FLAME MANDALA BRUSH NIBS ---
      const tSweep = (progress - 0.60) / 0.34;
      const angle = -Math.PI / 2.0 + tSweep * Math.PI;
      const r = 0.35;

      const nib1X = (CENTER[0] + Math.cos(angle) * r * (9 / 16)) * width;
      const nib1Y = (CENTER[1] + Math.sin(angle) * r) * height;

      const nib2X = (CENTER[0] - Math.cos(angle) * r * (9 / 16)) * width;
      const nib2Y = (CENTER[1] + Math.sin(angle) * r) * height;

      [ [nib1X, nib1Y], [nib2X, nib2Y] ].forEach(([nx, ny]) => {
        const flameGrad = sketchCtx.createRadialGradient(nx, ny, 0, nx, ny, 22);
        flameGrad.addColorStop(0, 'rgba(255, 255, 210, 0.95)');
        flameGrad.addColorStop(0.35, 'rgba(255, 170, 20, 0.70)');
        flameGrad.addColorStop(0.7, 'rgba(220, 50, 0, 0.25)');
        flameGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        sketchCtx.fillStyle = flameGrad;
        sketchCtx.beginPath();
        sketchCtx.arc(nx, ny, 22, 0, Math.PI * 2);
        sketchCtx.fill();

        if (Math.random() < 0.6) {
          addStylusSpark(nx, ny, 0, 0, [255, 150, 30]);
        }
      });
    }

    // Update & draw stylus micro sparks
    for (let i = sketchSparks.length - 1; i >= 0; i--) {
      const sp = sketchSparks[i];
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sketchSparks.splice(i, 1);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      const spAlpha = 1.0 - (sp.life / sp.maxLife);
      sketchCtx.fillStyle = `rgba(${sp.color[0]}, ${sp.color[1]}, ${sp.color[2]}, ${spAlpha})`;
      sketchCtx.beginPath();
      sketchCtx.arc(sp.x, sp.y, sp.size * spAlpha, 0, Math.PI * 2);
      sketchCtx.fill();
    }
  }

  // --- Floating Rising Embers & Sparks ---
  class EmberParticle {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      const angle = Math.random() * Math.PI * 2.0;
      const r = 0.20 + Math.random() * 0.35;
      this.x = CENTER[0] + Math.cos(angle) * r;
      this.y = (initial ? Math.random() * 0.85 + 0.1 : 0.65 + Math.random() * 0.3);

      this.vx = (Math.random() - 0.5) * 0.025;
      this.vy = -(0.05 + Math.random() * 0.12);

      this.size = 1.2 + Math.random() * 2.4;
      this.life = initial ? Math.random() : 0.0;
      this.maxLife = 2.4 + Math.random() * 3.2;
      this.seed = Math.random() * 100.0;

      const colRand = Math.random();
      if (colRand > 0.55) {
        this.color = [255, 235, 160];
      } else if (colRand > 0.25) {
        this.color = [255, 145, 20];
      } else {
        this.color = [230, 55, 10];
      }
    }
    update(dt, time) {
      this.life += dt;
      if (this.life >= this.maxLife) {
        this.reset();
        return;
      }
      const curl = Math.sin(time * 3.0 + this.seed + this.y * 10.0) * 0.06;
      this.x += (this.vx + curl) * dt;
      this.y += this.vy * dt;
      this.currentSize = this.size * (1.0 - (this.life / this.maxLife) * 0.4);
    }
    draw(ctx, width, height) {
      const progress = this.life / this.maxLife;
      let alpha = progress < 0.12 ? (progress / 0.12) : Math.pow(1.0 - progress, 1.4);
      alpha *= 0.75 + 0.25 * Math.sin(this.seed + this.life * 15.0);

      const px = this.x * width;
      const py = this.y * height;
      const r = this.currentSize;

      const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 2.4);
      grad.addColorStop(0, `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${this.color[0]}, ${this.color[1]}, 0, ${alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const embers = [];
  for (let i = 0; i < CONFIG.sparkCount; i++) {
    embers.push(new EmberParticle());
  }

  // --- Volumetric Fiery Background Aura ---
  function renderAura(width, height, time, progress) {
    if (!auraCtx) return;
    auraCtx.clearRect(0, 0, width, height);
    if (!glowEnabled || progress < 0.20) return;

    const auraIntensity = Math.min(1.0, (progress - 0.20) / 0.80);
    const cx = width * CENTER[0];
    const cy = height * CENTER[1];
    const baseRadius = width * 0.50;

    const pulse = 1.0 + 0.035 * Math.sin(time * 1.05);
    const radius = baseRadius * pulse;

    const grad = auraCtx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
    grad.addColorStop(0, `rgba(255, 215, 65, ${0.45 * auraIntensity})`);
    grad.addColorStop(0.35, `rgba(255, 135, 20, ${0.30 * auraIntensity})`);
    grad.addColorStop(0.7, `rgba(210, 50, 0, ${0.14 * auraIntensity})`);
    grad.addColorStop(0.92, `rgba(80, 10, 0, ${0.04 * auraIntensity})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    auraCtx.fillStyle = grad;
    auraCtx.fillRect(0, 0, width, height);

    // Divine Crown Back-Halo (Prabhavali)
    const crownX = width * CENTER[0];
    const crownY = height * (CENTER[1] - 0.085);
    const crownRadius = baseRadius * 0.35;
    const crownGrad = auraCtx.createRadialGradient(crownX, crownY, 0, crownX, crownY, crownRadius);
    crownGrad.addColorStop(0, `rgba(255, 245, 160, ${0.55 * auraIntensity})`);
    crownGrad.addColorStop(0.4, `rgba(255, 160, 20, ${0.28 * auraIntensity})`);
    crownGrad.addColorStop(0.8, `rgba(220, 60, 0, ${0.08 * auraIntensity})`);
    crownGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    auraCtx.fillStyle = crownGrad;
    auraCtx.beginPath();
    auraCtx.arc(crownX, crownY, crownRadius, 0, Math.PI * 2);
    auraCtx.fill();
  }

  // --- Resize Handler ---
  let stageWidth = 0;
  let stageHeight = 0;
  let dpr = 1;

  function resize() {
    const rect = stageWrapper.getBoundingClientRect();
    stageWidth = Math.floor(rect.width);
    stageHeight = Math.floor(rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2.0);

    glCanvas.width = stageWidth * dpr;
    glCanvas.height = stageHeight * dpr;
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    if (auraCanvas && auraCtx) {
      auraCanvas.width = stageWidth * dpr;
      auraCanvas.height = stageHeight * dpr;
      auraCtx.scale(dpr, dpr);
    }

    if (sketchCanvas && sketchCtx) {
      sketchCanvas.width = stageWidth * dpr;
      sketchCanvas.height = stageHeight * dpr;
      sketchCtx.scale(dpr, dpr);
    }

    if (embersCanvas && embersCtx) {
      embersCanvas.width = stageWidth * dpr;
      embersCanvas.height = stageHeight * dpr;
      embersCtx.scale(dpr, dpr);
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // --- Sacred Devotional Audio Synthesizer ---
  function initSacredAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();
    droneGain = audioCtx.createGain();
    droneGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    droneGain.connect(audioCtx.destination);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, audioCtx.currentTime);
    filter.connect(droneGain);

    const baseFreq = 136.1;
    const harmonics = [
      { mult: 0.5, gain: 0.38, type: 'sine' },
      { mult: 1.0, gain: 0.48, type: 'sine' },
      { mult: 1.4983, gain: 0.32, type: 'sine' },
      { mult: 2.0, gain: 0.24, type: 'triangle' },
      { mult: 3.0, gain: 0.14, type: 'sine' },
      { mult: 4.0, gain: 0.07, type: 'sine' }
    ];

    harmonics.forEach(h => {
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();

      osc.type = h.type;
      osc.frequency.setValueAtTime(baseFreq * h.mult, audioCtx.currentTime);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 7, audioCtx.currentTime);

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(0.1 + Math.random() * 0.08, audioCtx.currentTime);
      lfoGain.gain.setValueAtTime(h.gain * 0.28, audioCtx.currentTime);
      lfo.connect(lfoGain.gain);
      lfo.start();

      oscGain.gain.setValueAtTime(h.gain, audioCtx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
    });
  }

  function toggleAudio() {
    if (!audioCtx) initSacredAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    audioPlaying = !audioPlaying;

    if (audioPlaying) {
      droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
      droneGain.gain.setValueAtTime(droneGain.gain.value, audioCtx.currentTime);
      droneGain.gain.exponentialRampToValueAtTime(0.42, audioCtx.currentTime + 2.0);
      soundBtn.classList.add('active');
      soundIconOn.style.display = 'block';
      soundIconOff.style.display = 'none';
    } else {
      droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
      droneGain.gain.setValueAtTime(droneGain.gain.value, audioCtx.currentTime);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
      soundBtn.classList.remove('active');
      soundIconOn.style.display = 'none';
      soundIconOff.style.display = 'block';
    }
  }

  soundBtn.addEventListener('click', toggleAudio);

  // --- Interactive Handlers ---
  function updatePointer(clientX, clientY) {
    const rect = stageWrapper.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    targetMouseX = (nx - 0.5) * 2.0;
    targetMouseY = (ny - 0.5) * 2.0;
  }

  stageWrapper.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY));
  stageWrapper.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) updatePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  stageWrapper.addEventListener('mouseleave', () => {
    targetMouseX = 0;
    targetMouseY = 0;
  });

  function triggerPulse(clientX, clientY) {
    const rect = stageWrapper.getBoundingClientRect();
    shockwave.x = (clientX - rect.left) / rect.width;
    shockwave.y = (clientY - rect.top) / rect.height;
    shockwave.radius = 0.0;
    shockwave.intensity = 1.0;

    if (audioCtx && audioPlaying) {
      const chime = audioCtx.createOscillator();
      const chimeGain = audioCtx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(544.4, audioCtx.currentTime);
      chimeGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      chimeGain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.6);
      chime.connect(chimeGain);
      chimeGain.connect(audioCtx.destination);
      chime.start();
      chime.stop(audioCtx.currentTime + 1.7);
    }
  }

  stageWrapper.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    triggerPulse(e.clientX, e.clientY);
  });

  stageWrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('button')) return;
    if (e.touches.length > 0) triggerPulse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  function restartAnimation() {
    animStartTime = performance.now();
    isFormed = false;
    shockwave.radius = -1.0;
    shockwave.intensity = 0.0;
    sketchSparks.length = 0;
    resetHudTimer();
  }

  replayBtn.addEventListener('click', restartAnimation);

  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      currentMode = currentMode === 1 ? 0 : 1;
      modeBtn.classList.toggle('active', currentMode === 1);
      restartAnimation();
    });
  }

  glowToggleBtn.addEventListener('click', () => {
    glowEnabled = !glowEnabled;
    glowToggleBtn.classList.toggle('active', glowEnabled);
    if (!glowEnabled && auraCanvas && auraCtx) {
      auraCtx.clearRect(0, 0, auraCanvas.width, auraCanvas.height);
    }
  });

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  });

  // --- Main Animation Loop (60 FPS) ---
  let lastFrameTime = performance.now();
  animStartTime = performance.now();

  function render(now) {
    requestAnimationFrame(render);

    const dt = Math.min((now - lastFrameTime) / 1000.0, 0.05);
    lastFrameTime = now;
    animationTime += dt;

    const currentDuration = currentMode === 1 ? CONFIG.drawingDuration : CONFIG.swirlDuration;
    const elapsed = (now - animStartTime) / 1000.0;
    const progress = Math.min(1.0, elapsed / currentDuration);

    if (progress >= 1.0 && !isFormed) {
      isFormed = true;
      shockwave.x = CENTER[0];
      shockwave.y = CENTER[1];
      shockwave.radius = 0.0;
      shockwave.intensity = 0.9;
    }

    // Parallax smoothing
    currentMouseX += (targetMouseX - currentMouseX) * 0.06;
    currentMouseY += (targetMouseY - currentMouseY) * 0.06;

    // Shockwave ripple
    if (shockwave.radius >= 0.0) {
      shockwave.radius += dt * 0.85;
      shockwave.intensity = Math.max(0.0, shockwave.intensity - dt * 0.95);
      if (shockwave.radius > 1.2 || shockwave.intensity <= 0.0) {
        shockwave.radius = -1.0;
        shockwave.intensity = 0.0;
      }
    }

    // 1. VOLUMETRIC FIERY AURA
    renderAura(stageWidth, stageHeight, animationTime, progress);

    // 2. MULTI-PASS WEBGL PARTICLE DRAWING RENDERING
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (particleCount > 0) {
      gl.useProgram(program);

      gl.uniform1f(uTimeLoc, animationTime);
      gl.uniform1f(uProgressLoc, progress);
      gl.uniform2f(uCenterLoc, CENTER[0], CENTER[1]);
      gl.uniform2f(uMouseTiltLoc, currentMouseX, currentMouseY);
      gl.uniform4f(uShockwaveLoc, shockwave.x, shockwave.y, shockwave.radius, shockwave.intensity);
      gl.uniform1f(uDprLoc, dpr);
      gl.uniform1f(uModeLoc, currentMode);

      // --- PASS 1: FIRE PARTICLES (Indices 0 to fireCount) ---
      // Additive blending creates brilliant incandescent blazing wall of flames
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, fireCount);

      // --- PASS 2: SILHOUETTE PARTICLES (Indices fireCount to fireCount + silCount) ---
      // Alpha occluding blending renders dark charcoal bronze silhouette solid against the flames!
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, fireCount, silCount);

      // --- PASS 3: RIM HIGHLIGHT PARTICLES (Indices fireCount + silCount to end) ---
      // Additive blending renders brilliant golden ornaments, crown, trident, and lion highlights!
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.drawArrays(gl.POINTS, fireCount + silCount, rimCount);
    }

    // 3. DYNAMIC ARTIST SKETCH STYLUS & PENCIL CROSS-HATCH OVERLAY
    renderSketchOverlay(stageWidth, stageHeight, dt, animationTime, progress);

    // 4. FLOATING EMBERS & PHYSICAL SPARKS
    if (embersCtx) {
      embersCtx.clearRect(0, 0, stageWidth, stageHeight);
      if (progress > 0.28) {
        for (let i = 0; i < embers.length; i++) {
          embers[i].update(dt, animationTime);
          embers[i].draw(embersCtx, stageWidth, stageHeight);
        }
      }
    }
  }

  requestAnimationFrame(render);
})();
