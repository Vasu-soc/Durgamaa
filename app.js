/**
 * Goddess Durga Maa - Cinematic Devotional Particle Experience
 * Original WebGL Particle Engine (60 FPS)
 * 62,000 Particles • Multi-Pass Occlusion & Glow • Sacred Harmonics
 */

(function () {
  'use strict';

  const CFG = window.DURGA_PARTICLE_CONFIG || {};
  const CENTER = [0.5, 0.519]; // Center of circular flame wall

  const CONFIG = {
    convergeDuration: 4.5,   // Seconds for cosmic stardust swirl to converge
    sparkCount: 200,         // Rising embers
    aspectRatio: 9 / 16
  };

  // --- DOM Elements ---
  const stageWrapper = document.getElementById('stage-wrapper');
  const glCanvas = document.getElementById('particle-canvas');
  const auraCanvas = document.getElementById('aura-canvas');
  const embersCanvas = document.getElementById('embers-canvas');
  const hudOverlay = document.getElementById('hud-overlay');

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

  const auraCtx = auraCanvas.getContext('2d');
  const embersCtx = embersCanvas.getContext('2d');

  if (!gl) {
    alert('WebGL is required for particle rendering.');
    return;
  }

  // --- State Variables ---
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
    }, 3000);
  }

  window.addEventListener('mousemove', resetHudTimer);
  window.addEventListener('touchstart', resetHudTimer, { passive: true });
  resetHudTimer();

  // --- Particle Data Decoding (Contiguous 3-Pass Sections) ---
  const totalCount = CFG.totalCount || 62000;
  const fireCount = CFG.fireCount || 32000;
  const silCount = CFG.silCount || 16000;
  const rimCount = CFG.rimCount || 14000;

  let particleCount = 0;
  let startPosArray, targetPosArray, colorArray, metaArray;

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

      // 3D Spherical Cosmic Scatter (Particles stream inwards like celestial comets)
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
    }
  }

  decodeParticles();

  // --- WebGL Shaders ---
  const vertexShaderSource = `
    precision highp float;
    
    attribute vec3 a_startPos;
    attribute vec2 a_targetPos;
    attribute vec3 a_color;
    attribute vec3 a_meta;

    uniform float u_time;
    uniform float u_progress;
    uniform vec2 u_center;
    uniform vec2 u_mouseTilt;
    uniform vec4 u_shockwave;
    uniform float u_dpr;

    varying vec4 v_color;
    varying float v_type;

    float easeOutCubic(float t) {
      return 1.0 - pow(1.0 - t, 3.0);
    }

    void main() {
      float ptype = a_meta.x;
      float sizeScale = a_meta.y;
      float phase = a_meta.z;
      v_type = ptype;

      // Individual particle delay for organic river-like arrival
      float delay = mod(phase * 0.28, 0.22);
      float t = clamp((u_progress - delay) / (1.0 - 0.22), 0.0, 1.0);
      float easedT = easeOutCubic(t);

      vec2 center = u_center;
      vec2 toTarget = a_targetPos - center;
      
      // Cosmic spiral vortex during convergence
      float swirlAngle = (1.0 - easedT) * 4.8 * (sin(phase) > 0.0 ? 1.0 : -0.75);
      float cosA = cos(swirlAngle);
      float sinA = sin(swirlAngle);
      mat2 rot = mat2(cosA, -sinA, sinA, cosA);
      vec2 swirledTarget = center + rot * toTarget * mix(1.8, 1.0, easedT);

      vec2 currentPos = mix(a_startPos.xy, swirledTarget, easedT);
      float currentZ = mix(a_startPos.z, 0.0, easedT);

      // Living animation once converged
      if (easedT > 0.82) {
        float formedWeight = smoothstep(0.82, 1.0, easedT);
        
        // Organic divine breathing
        float breath = sin(u_time * 1.1 + phase * 0.2) * 0.0035;
        currentPos += (currentPos - center) * breath * formedWeight;

        // Dancing flame tongues along circular boundary
        if (ptype > 1.5) {
          float flameLick = sin(u_time * 4.2 + phase * 6.5) * 0.008;
          vec2 radialDir = normalize(currentPos - center);
          currentPos += radialDir * flameLick * formedWeight;
        } else if (ptype > 0.5) {
          // Rim stardust shimmer
          float rimJitter = sin(u_time * 6.0 + phase * 8.0) * 0.0012;
          currentPos += vec2(rimJitter) * formedWeight;
        }

        // Divine Touch Shockwave
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

      // Parallax 3D tilt
      vec2 parallax = u_mouseTilt * (0.016 + (1.0 - easedT) * 0.04);
      currentPos += parallax;

      // Convert to Normalized Device Coordinates [-1, 1]
      vec2 ndc;
      ndc.x = (currentPos.x - 0.5) * 2.0;
      ndc.y = (0.5 - currentPos.y) * 2.0;

      gl_Position = vec4(ndc, currentZ * 0.08, 1.0);

      // Particle Size Scaling
      float baseSize = 2.6 * u_dpr * sizeScale;
      if (ptype > 1.5) {
        // Fire orbs: flickering larger glow
        float fireFlicker = 0.88 + 0.32 * sin(u_time * 5.2 + phase * 9.0);
        gl_PointSize = baseSize * 1.6 * fireFlicker;
      } else if (ptype > 0.5) {
        // Rim stardust: fine, razor-sharp diamonds
        float rimTwinkle = 0.9 + 0.35 * sin(u_time * 7.5 + phase * 12.0);
        gl_PointSize = baseSize * 1.25 * rimTwinkle;
      } else {
        // Silhouette: solid dense dots
        gl_PointSize = baseSize * 1.35;
      }

      gl_PointSize *= mix(1.7, 1.0, easedT);

      // Color computation
      vec3 finalCol = a_color;
      float alpha = 1.0;

      if (easedT > 0.78) {
        if (ptype > 1.5) {
          // Warm glowing fire: pulsing amber & orange
          float pulse = sin(u_time * 3.2 + phase * 4.5);
          finalCol.r = clamp(finalCol.r + pulse * 0.07, 0.0, 1.0);
          finalCol.g = clamp(finalCol.g + pulse * 0.05, 0.0, 1.0);
          alpha = 0.95;
        } else if (ptype > 0.5) {
          // Incandescent molten gold for rim highlights
          float shimmer = 0.95 + 0.25 * sin(u_time * 6.5 + phase * 14.0);
          finalCol = vec3(1.0, 0.88, 0.40) * shimmer;
          alpha = 1.0;
        } else {
          // Deep dark bronze silhouette (solid occlusion)
          alpha = 0.98;
        }
      } else {
        // During flight, all particles shimmer warmly
        finalCol = mix(vec3(1.0, 0.72, 0.30), finalCol, easedT);
        alpha = mix(0.75, 1.0, easedT);
      }

      v_color = vec4(finalCol, alpha);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;
    
    varying vec4 v_color;
    varying float v_type;

    void main() {
      vec2 coord = (gl_PointCoord - vec2(0.5)) * 2.0;
      float dist = length(coord);
      if (dist > 1.0) discard;

      float ptype = v_type;

      if (ptype < 0.5) {
        // SILHOUETTE PARTICLES: Solid circular disk with smooth edge
        float edge = smoothstep(1.0, 0.75, dist);
        gl_FragColor = vec4(v_color.rgb, v_color.a * edge);
      } else {
        // FIRE & RIM PARTICLES: Glowing incandescent Gaussian core
        float core = exp(-dist * 4.2);
        float glow = pow(1.0 - dist, 1.5);
        float intensity = mix(glow, core, 0.55);

        vec3 rgb = v_color.rgb;
        if (ptype > 1.5) {
          rgb += vec3(core * 0.45, core * 0.35, core * 0.12);
        } else {
          rgb += vec3(core * 0.65, core * 0.55, core * 0.25);
        }

        gl_FragColor = vec4(rgb, intensity * v_color.a);
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

  const uTimeLoc = gl.getUniformLocation(program, 'u_time');
  const uProgressLoc = gl.getUniformLocation(program, 'u_progress');
  const uCenterLoc = gl.getUniformLocation(program, 'u_center');
  const uMouseTiltLoc = gl.getUniformLocation(program, 'u_mouseTilt');
  const uShockwaveLoc = gl.getUniformLocation(program, 'u_shockwave');
  const uDprLoc = gl.getUniformLocation(program, 'u_dpr');

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
  }

  gl.enable(gl.BLEND);

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

  // --- Volumetric Fiery Background Aura (Centered on Flame Wall) ---
  function renderAura(width, height, time, progress) {
    auraCtx.clearRect(0, 0, width, height);
    if (!glowEnabled || progress < 0.15) return;

    const auraIntensity = Math.min(1.0, (progress - 0.15) / 0.85);
    const cx = width * CENTER[0];
    const cy = height * CENTER[1];
    const baseRadius = width * 0.50;

    const pulse = 1.0 + 0.035 * Math.sin(time * 1.05);
    const radius = baseRadius * pulse;

    // Smooth volumetric circular flame ring aura
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

    auraCanvas.width = stageWidth * dpr;
    auraCanvas.height = stageHeight * dpr;
    auraCtx.scale(dpr, dpr);

    embersCanvas.width = stageWidth * dpr;
    embersCanvas.height = stageHeight * dpr;
    embersCtx.scale(dpr, dpr);
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
    resetHudTimer();
  }

  replayBtn.addEventListener('click', restartAnimation);

  glowToggleBtn.addEventListener('click', () => {
    glowEnabled = !glowEnabled;
    glowToggleBtn.classList.toggle('active', glowEnabled);
    if (!glowEnabled) {
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

    const elapsed = (now - animStartTime) / 1000.0;
    const progress = Math.min(1.0, elapsed / CONFIG.convergeDuration);

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

    // 2. MULTI-PASS WEBGL PARTICLE RENDERING
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

      // --- PASS 1: FIRE PARTICLES (Indices 0 to fireCount) ---
      // Additive blending creates brilliant incandescent blazing wall of flames
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.drawArrays(gl.POINTS, 0, fireCount);

      // --- PASS 2: SILHOUETTE PARTICLES (Indices fireCount to fireCount + silCount) ---
      // Alpha occluding blending renders dark bronze silhouette solid against the flames!
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, fireCount, silCount);

      // --- PASS 3: RIM HIGHLIGHT PARTICLES (Indices fireCount + silCount to end) ---
      // Additive blending renders brilliant golden ornaments, crown, trident, and lion highlights!
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.drawArrays(gl.POINTS, fireCount + silCount, rimCount);
    }

    // 3. FLOATING EMBERS & PHYSICAL SPARKS
    embersCtx.clearRect(0, 0, stageWidth, stageHeight);
    if (progress > 0.22) {
      for (let i = 0; i < embers.length; i++) {
        embers[i].update(dt, animationTime);
        embers[i].draw(embersCtx, stageWidth, stageHeight);
      }
    }
  }

  requestAnimationFrame(render);
})();
