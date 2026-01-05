// Optimized Electromagnetic Induction Simulator with External Force
// Performance improvements: dirty flags, circular buffer, throttling
// CORRECTED VERSION - Fixed circular dependency and physics issues

(function() {
  'use strict';

  // DOM Elements - cached for performance
  const canvas = document.getElementById('viz');
  const ctx = canvas.getContext('2d');
  const graphCanvas = document.getElementById('graph');
  const graphCtx = graphCanvas.getContext('2d');
  const statusEl = document.getElementById('status');

  const areaSlider = document.getElementById('area');
  const turnsSlider = document.getElementById('turns');
  const fieldSlider = document.getElementById('field');
  const resSlider = document.getElementById('res');
  const velocitySlider = document.getElementById('velocity');
  const autoMotionBtn = document.getElementById('autoMotion');
  const resetBtn = document.getElementById('reset');
  
  // NEW: External Force Slider
  const externalForceSlider = document.getElementById('externalForce');
  const externalForceVal = document.getElementById('externalForceVal');

  const areaVal = document.getElementById('areaVal');
  const turnsVal = document.getElementById('turnsVal');
  const fieldVal = document.getElementById('fieldVal');
  const resVal = document.getElementById('resVal');
  const velocityVal = document.getElementById('velocityVal');
  const fluxRateEl = document.getElementById('fluxRate');
  const emfEl = document.getElementById('emf');
  const IEl = document.getElementById('I');
  const FEl = document.getElementById('F');
  // ...
  // 注意：這裡直接抓取你在 HTML 定義的 ID
  // 你的 HTML 中 ID 是 'extForceDisplay' 和 'netForceDisplay'，請確保這裡一致
  const externalForceEl = document.getElementById('extForceDisplay'); 
  const netForceEl = document.getElementById('netForceDisplay');

  // State Variables
  let coilX = 80;
  let coilY = canvas.height / 2;
  let isDragging = false;
  let dragStartX = 0;
  let autoMotionActive = false;
  let lastCoilX = coilX;
  let currentAnimationTime = 0;
  let currentLang = 'en';
  
  // CORRECTED: Velocity state (for acceleration/deceleration)
  let currentVelocity = 0; // Actual velocity of the object
  let acceleration = 0; // Current acceleration
  const mass = 0.5; // Mass of coil/conductor for F = ma calculation
  
  // Canvas bounds
  const CANVAS_MIN_X = 20;
  let CANVAS_MAX_X = 0; // Will be set after canvas setup
  
  // High DPI support
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Language translations
  const translations = {
    en: {
      physicsPrinciple: '<strong>📚 Key Physics Principles:</strong><br><strong>Faraday\'s Law:</strong> A change in magnetic flux generates an <strong>Induced EMF</strong>. Only if the circuit is closed, this EMF drives an <strong>Induced Current</strong>.<br><strong>Lenz\'s Law:</strong> The <strong>Induced Current</strong> interacts with the magnetic field to create a physical <strong>Force</strong>. This force always <strong>opposes the motion</strong> (No Current → No Force).',
      headerTitle: '⚡ Electromagnetic Induction Simulator',
      headerSubtitle: 'Realistic Coil with Draggable Motion Control & External Force',
      visualization: 'Real-Time Visualization',
      coilLoops: 'Coil Loops',
      magneticField: 'Magnetic Field',
      opposingForce: 'Opposing Force (Lenz\'s Law)',
      inducedCurrent: 'Induced Current',
      controls: 'Controls',
      coilArea: 'Coil Area',
      numberOfTurns: 'Number of Turns',
      magneticFieldB: 'Magnetic Field (B)',
      resistance: 'Resistance',
      velocity: 'Velocity',
      externalForce: 'External Force',
      autoMotion: '▶ AUTO MOTION',
      pause: '⏸ PAUSE',
      reset: '↺ RESET',
      switchToConductor: '🔄 Switch to Straight Conductor',
      switchToCoil: '🔄 Switch to Coil',
      dragHint: '💡 <strong>Drag the coil</strong> along the canvas to move it manually. Watch how force appears only at field boundaries!',
      fluxRate: 'dΦ/dt',
      inducedEMF: 'Induced EMF',
      current: 'Current',
      force: 'Lenz Force',
      externalForceLabel: 'External Force',
      netForceLabel: 'Net Force',
      emfTop: 'EMF (Top)',
      emfBottom: 'EMF (Bottom)',
      graphTitle: '📊 Force vs Position',
      statusOutside: '⏸ {object} is <strong>completely outside</strong> field: <strong>NO flux change → NO force</strong>',
      statusInside: '✓ {object} <strong>completely inside</strong> uniform field: <strong>Φ constant → NO force</strong>',
      statusEntering: '⚡ {object} <strong>ENTERING</strong> field: <strong>Flux increasing → Force opposes motion</strong>',
      statusExiting: '⚡ {object} <strong>EXITING</strong> field: <strong>Flux decreasing → Force opposes motion</strong>',
       // NEW: Conductor specific statuses
      conductorStatusOutside: '⏸ Conductor is completely outside field: NO flux change → <strong>NO induced emf</strong>',
      conductorStatusEntering: '⚡ Conductor ENTERING field: Flux increasing → <strong>Induced emf</strong>',
      // 使用你要求的詳細解釋
      conductorStatusInside: '✓ Conductor completely inside uniform field: Φ constant → <strong>NO MORE extra induced emf</strong>, but the original induced emf will keep the upper side of the rod positively charged and the lower side negatively charged.',
      conductorStatusExiting: '⚡ Conductor EXITING field: Flux decreasing → <strong>Induced emf</strong>',
      coil: 'Coil',
      conductor: 'Conductor',
      magneticFieldLabel: 'MAGNETIC FIELD (into page)',
      forceLabel: 'F (Lenz)',
      velocityLabel: 'v={value} m/s',
      graphXAxis: 'Position (px)',
      graphYAxis: 'Force (N)',
      motionSlowing: '🔴 Slowing down (F_Lenz > F_external)',
      motionConstant: '🟡 Constant velocity (F_Lenz ≈ F_external)',
      motionConstantZero: '🟡 Constant velocity (F_Lenz = F_external = 0)', // NEW
      motionAccelerating: '🟢 Accelerating (F_external > F_Lenz)',
      motionAcceleratingSimple: '🟢 Accelerating (F_external > 0)' // NEW

    },
    zh: {
      physicsPrinciple: '<strong>📚 關鍵物理原理：</strong><br><strong>法拉第定律：</strong>磁通量的變化產生<strong>感應電動勢 (EMF)</strong>。只有在電路閉合時，此電動勢才會驅動<strong>感應電流</strong>。<br><strong>楞次定律：</strong>此<strong>感應電流</strong>與磁場相互作用產生物理上的<strong>磁力</strong>。這個力總是<strong>抵抗運動方向</strong>（若無電流 → 則無磁力）。',
      headerTitle: '⚡ 電磁感應模擬器',
      headerSubtitle: '可拖動線圈的真實模擬及外力',
      visualization: '即時視覺化',
      coilLoops: '線圈迴路',
      magneticField: '磁場',
      opposingForce: '反向力（楞次定律）',
      inducedCurrent: '感應電流',
      controls: '控制項',
      coilArea: '線圈面積',
      numberOfTurns: '匝數',
      magneticFieldB: '磁場 (B)',
      resistance: '電阻',
      velocity: '速度',
      externalForce: '外部力',
      autoMotion: '▶ 自動運動',
      pause: '⏸ 暫停',
      reset: '↺ 重置',
      switchToConductor: '🔄 切換至直導體',
      switchToCoil: '🔄 切換至線圈',
      dragHint: '💡 <strong>拖動線圈</strong>可手動移動。觀察力只在磁場邊界出現！',
      fluxRate: 'dΦ/dt',
      inducedEMF: '感應電動勢',
      current: '電流',
      force: '楞次力',
      externalForceLabel: '外部力',
      netForceLabel: '合力',
      emfTop: '電動勢（上）',
      emfBottom: '電動勢（下）',
      graphTitle: '📊 力 vs 位置',
      statusOutside: '⏸ {object} <strong>完全在磁場外</strong>：<strong>無磁通量變化 → 無力</strong>',
      statusInside: '✓ {object} <strong>完全在均勻磁場內</strong>：<strong>Φ 恆定 → 無力</strong>',
      statusEntering: '⚡ {object} <strong>進入</strong>磁場：<strong>磁通量增加 → 力與運動方向相反</strong>',
      statusExiting: '⚡ {object} <strong>離開</strong>磁場：<strong>磁通量減少 → 力與運動方向相反</strong>',
      conductorStatusOutside: '⏸ 導體完全在磁場外：無磁通量變化 → <strong>無感應電動勢</strong>',
      conductorStatusEntering: '⚡ 導體進入磁場：磁通量增加 → <strong>產生感應電動勢</strong>',
      conductorStatusInside: '✓ 導體完全在均勻磁場內：Φ 恆定 → <strong>無額外感應電動勢</strong>，但電荷分離使導體上端保持帶正電，下端保持帶負電。',
      conductorStatusExiting: '⚡ 導體離開磁場：磁通量減少 → <strong>產生感應電動勢</strong>',
      coil: '線圈',
      conductor: '導體',
      magneticFieldLabel: '磁場（指入頁面）',
      forceLabel: 'F（楞次）',
      velocityLabel: 'v={value} 米/秒',
      graphXAxis: '位置（像素）',
      graphYAxis: '力（牛頓）',
      motionSlowing: '🔴 減速中 (F_楞次 > F_外部)',
      motionConstant: '🟡 勻速 (F_楞次 ≈ F_外部)',
      motionConstantZero: '🟡 等速運動 (F_楞次 = F_外部 = 0)', // NEW
      motionAccelerating: '🟢 加速中 (F_外部 > F_楞次)',
      motionAcceleratingSimple: '🟢 加速中 (F_外部 > 0)' // NEW
    }
  };
  
  // Setup canvas for high DPI
  function setupCanvas() {
    const baseWidth = parseInt(canvas.getAttribute('width')) || 1000;
    const baseHeight = parseInt(canvas.getAttribute('height')) || 550;
    
    canvas.width = baseWidth * devicePixelRatio;
    canvas.height = baseHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    canvas.style.width = baseWidth + 'px';
    canvas.style.height = baseHeight + 'px';
    
    // Set max X position based on canvas width
    CANVAS_MAX_X = baseWidth - 20;
    
    const graphRect = graphCanvas.getBoundingClientRect();
    graphCanvas.width = graphRect.width * devicePixelRatio;
    graphCanvas.height = graphRect.height * devicePixelRatio;
    graphCtx.scale(devicePixelRatio, devicePixelRatio);
    graphCanvas.style.width = graphRect.width + 'px';
    graphCanvas.style.height = graphRect.height + 'px';
  }
  
  setupCanvas();
  
  const fieldX = 300;
  const fieldWidth = 220;
  const fieldX_end = fieldX + fieldWidth;

  let coilWidth = 80;
  const coilHeight = 120;
  
  let mode = 'coil';
  const modeToggleBtn = document.getElementById('modeToggle');

  const maxDataPoints = 100;
  
  // Circular buffer for history
  class CircularBuffer {
    constructor(size) {
      this.size = size;
      this.buffer = new Array(size);
      this.index = 0;
      this.count = 0;
    }
    
    push(value) {
      this.buffer[this.index] = value;
      this.index = (this.index + 1) % this.size;
      if (this.count < this.size) this.count++;
    }
    
    getArray() {
      if (this.count < this.size) {
        return this.buffer.slice(0, this.count);
      }
      return [...this.buffer.slice(this.index), ...this.buffer.slice(0, this.index)];
    }
    
    clear() {
      this.index = 0;
      this.count = 0;
    }
  }

  const positionHistory = new CircularBuffer(maxDataPoints);
  const forceHistory = new CircularBuffer(maxDataPoints);

  let needsRedraw = true;
  let needsGraphRedraw = true;
  let lastPhysicsState = null;

  function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function updateCoilDimensions() {
    const area = parseFloat(areaSlider.value);
    const scale = 1.5;
    const calculatedWidth = Math.sqrt(area * scale) * 60;
    coilWidth = Math.min(calculatedWidth, fieldWidth * 0.9);
  }
  
  // CORRECTED: Physics Functions - Use slider velocity, not currentVelocity
  function getFluxState(x) {
    if (mode === 'conductor') {
      const conductorWidth = 25;
      const left = x - conductorWidth / 2;
      const right = x + conductorWidth / 2;
      
      if (right <= fieldX) {
        return { state: 'outside', fluxChangeRate: 0 };
      } else if (left >= fieldX_end) {
        return { state: 'outside', fluxChangeRate: 0 };
      }
      
      if (left >= fieldX && right <= fieldX_end) {
        return { state: 'inside', fluxChangeRate: 0 };
      }
      
      // CORRECTED: Use slider velocity for physics calculation
      const velocity = currentVelocity;
      
      if (left < fieldX && right > fieldX && right <= fieldX_end) {
        const B = parseFloat(fieldSlider.value);
        const overlapLength = right - fieldX;
        const fluxChangeRate = B * velocity * overlapLength * 0.1;
        return { state: 'entering', fluxChangeRate };
      }
      
      if (left >= fieldX && left < fieldX_end && right > fieldX_end) {
        const B = parseFloat(fieldSlider.value);
        const overlapLength = fieldX_end - left;
        const fluxChangeRate = -B * velocity * overlapLength * 0.1;
        return { state: 'exiting', fluxChangeRate };
      }
      
      return { state: 'outside', fluxChangeRate: 0 };
    }
    
    updateCoilDimensions();
    const left = x - coilWidth / 2;
    const right = x + coilWidth / 2;

    if (right < fieldX || left > fieldX_end) {
      return { state: 'outside', fluxChangeRate: 0 };
    }

    if (left >= fieldX && right <= fieldX_end) {
      return { state: 'inside', fluxChangeRate: 0 };
    }

    const B = parseFloat(fieldSlider.value);
    const N = parseInt(turnsSlider.value);
    const A = parseFloat(areaSlider.value);
    // CORRECTED: Use slider velocity for physics calculation
    const velocity = currentVelocity;
    const fluxChangeRate = N * B * A * velocity * 0.1;

    if (right >= fieldX && right <= fieldX_end && left < fieldX) {
      return { state: 'entering', fluxChangeRate };
    } else if (left <= fieldX_end && left >= fieldX && right > fieldX_end) {
      return { state: 'exiting', fluxChangeRate };
    }

    return { state: 'outside', fluxChangeRate: 0 };
  }

  // CORRECTED: Force calculation with proper direction handling
  function computePhysics() {
    // ✓ NEW: Define epsilon threshold for floating-point noise  
    const EPS = 0.015;  // Threshold: catch all residual velocities below 0.015 m/s  
    const B = parseFloat(fieldSlider.value);
    const R = parseInt(resSlider.value);
    const externalForce = parseFloat(externalForceSlider.value);

    const fluxState = getFluxState(coilX);
  
    // ✓ NEW: STRICT ZERO ENFORCEMENT - If velocity is near zero, all induced quantities are zero
    if (Math.abs(currentVelocity) <= EPS) {
      return { 
        dPhiDt: 0, 
        emf: 0, 
        I: 0, 
        lenzForce: 0,
        externalForce,
        netForce: externalForce,  // Only external force acts when v ≈ 0
        acceleration: externalForce / mass,
        state: fluxState.state 
      };
    }
    
    const dPhiDt = fluxState.fluxChangeRate;
    const emf = dPhiDt;
    // 修正：直導體視為開路 (I=0)，線圈視為閉路 (I=emf/R)
    const I = mode === 'conductor' ? 0 : emf / R;
    
    // CORRECTED: Use same velocity threshold as EMF calculation
    // Force should be zero when velocity is negligible
    let lenzForce = 0;

    // Only calculate Lenz force if velocity is significant AND current is significant
    // Use SAME threshold as induced current display (0.0001)
    if (Math.abs(currentVelocity) > 0.01 && Math.abs(I) > 0.0001) {
      if (mode === 'conductor') {
        lenzForce = (B * Math.abs(I) * 0.1);
      } else {
        const N = parseInt(turnsSlider.value);
        const A = parseFloat(areaSlider.value);
        lenzForce = (N * B * A * Math.abs(I));
      }
    } else {
      lenzForce = 0;
    }    

    // CORRECTED: Lenz force always opposes motion direction
    const lenzForceMagnitude = lenzForce;
    const velocityDirection = currentVelocity >= 0 ? 1 : -1;
    const lenzForceVector = -lenzForceMagnitude * velocityDirection; // Opposes motion
    
    // Net force calculation (external force to right, Lenz force opposes)
    const netForce = externalForce + lenzForceVector;
    
    // Acceleration: a = F_net / m
    acceleration = netForce / mass;
    
    // ✓ NEW: Clamp all near-zero values to exact zero to prevent floating-point noise
    const clampValue = (v) => Math.abs(v) < EPS ? 0 : v;

    return { 
      dPhiDt: clampValue(dPhiDt), 
      emf: clampValue(emf), 
      I: clampValue(I), 
      lenzForce: clampValue(lenzForceMagnitude),
      externalForce,
      netForce: clampValue(netForce),
      acceleration: clampValue(acceleration),
      state: fluxState.state 
    };
  }

   function updateStatusMessage(physics) {
    const t = translations[currentLang] || translations.en;
    
    // 1. 計算運動狀態描述 (這部分主要給線圈模式用)
    const extF = parseFloat(document.getElementById('externalForce').value);
    const lenzF = physics.lenzForce; 
    const netF = extF - lenzF;       
    let motionStatus = '';
    const zeroThreshold = 0.01;

    // 計算 motionStatus 的邏輯保持不變 (為了線圈模式)
    if (physics.state === 'inside' || physics.state === 'outside') {
      if (extF < zeroThreshold) {
        motionStatus = t.motionConstantZero; 
      } else {
        motionStatus = t.motionAcceleratingSimple;
      }
    } else {
      if (extF < zeroThreshold) {
          motionStatus = t.motionSlowing;
      } else if (Math.abs(netF) < 0.1) {
         motionStatus = t.motionConstant;
      } else if (netF > 0) {
         motionStatus = t.motionAccelerating;
      } else {
         motionStatus = t.motionSlowing;
      }
    }

    // --- Conductor Mode (導體模式) ---
    // 這裡進行了大幅修改，改用專屬翻譯，並且不再顯示 motionStatus
    if (mode === 'conductor') {
      let msg = '';
      if (physics.state === 'outside') {
        msg = t.conductorStatusOutside;
      } else if (physics.state === 'entering') {
        msg = t.conductorStatusEntering;
      } else if (physics.state === 'inside') {
        msg = t.conductorStatusInside;
      } else if (physics.state === 'exiting') {
        msg = t.conductorStatusExiting;
      }
      
      // 注意：這裡只顯示 msg，不再加上 motionStatus
      statusEl.innerHTML = msg;
      
      // 根據狀態設定樣式 (進入/離開時高亮)
      if (physics.state === 'entering' || physics.state === 'exiting') {
        statusEl.className = 'status-box active';
      } else {
        statusEl.className = 'status-box';
      }
      return; 
    }

    // --- Coil Mode (線圈模式 - 保持不變) ---
    const objectName = t.coil;
    const messages = {
      'outside': t.statusOutside.replace('{object}', objectName),
      'inside': t.statusInside.replace('{object}', objectName),
      'entering': t.statusEntering.replace('{object}', objectName),
      'exiting': t.statusExiting.replace('{object}', objectName)
    };

    let baseMessage = messages[physics.state] || '';
    
    statusEl.innerHTML = baseMessage + '<br>' + motionStatus;
    
    if (physics.state === 'entering' || physics.state === 'exiting') {
      statusEl.className = 'status-box active';
    } else {
      statusEl.className = 'status-box';
    }
  }

  function updateDisplays() {
    const p = computePhysics();
    
    // ✓ DEBUG: Log velocity and current to browser console
    console.log('currentVelocity:', currentVelocity, 'I:', p.I);
    
    const stateChanged = !lastPhysicsState ||
      Math.abs(p.dPhiDt - lastPhysicsState.dPhiDt) > 0.001 ||
      Math.abs(p.lenzForce - lastPhysicsState.lenzForce) > 0.001 ||
      Math.abs(p.externalForce - lastPhysicsState.externalForce) > 0.001 ||
      p.state !== lastPhysicsState.state;

    if (stateChanged) {
      fluxRateEl.innerHTML = p.dPhiDt.toFixed(3) + '<span class="stat-unit"> Wb/s</span>';
      
      // --- CHANGED START --- 
      // Determine which value to show based on mode
      let displayEmf = p.emf;
      if (mode === 'conductor') {
          // For conductor, show magnitude only (positive), 
          // because the +/- is already handled by the Top/Bottom values
          displayEmf = Math.abs(p.emf); 
      }
      
      emfEl.innerHTML = displayEmf.toFixed(3) + '<span class="stat-unit"> V</span>';
      // --- CHANGED END ---

      IEl.innerHTML = p.I.toFixed(4) + '<span class="stat-unit"> A</span>';
      FEl.innerHTML = p.lenzForce.toFixed(3) + '<span class="stat-unit"> N</span>';
      externalForceEl.innerHTML = p.externalForce.toFixed(3) + '<span class="stat-unit"> N</span>';
      netForceEl.innerHTML = p.netForce.toFixed(3) + '<span class="stat-unit"> N</span>';

      if (p.lenzForce < 0.001) {
        FEl.parentElement.classList.add('zero');
      } else {
        FEl.parentElement.classList.remove('zero');
      }

      updateStatusMessage(p);
      lastPhysicsState = p;
    }

    if (Math.abs(coilX - lastCoilX) > 0.5) {
      positionHistory.push(coilX);
      forceHistory.push(p.lenzForce);
      lastCoilX = coilX;
      needsGraphRedraw = true;
    }
  }

  // CORRECTED: Update velocity based on acceleration (only during auto motion)
  function updateVelocity(deltaTime) {
    const p = computePhysics();
    
    // Update velocity: v = v0 + a*t
    currentVelocity += p.acceleration * deltaTime;

    // ✓ NEW: Clamp velocity to exact zero if it's very small  
    const velocityEPS = 0.02;  // Threshold for velocity  
    if (Math.abs(currentVelocity) < velocityEPS) {  
      currentVelocity = 0;  
    }  
    
    // Prevent velocity from becoming negative (object stops)  
    if (currentVelocity < 0) {  
      currentVelocity = 0;  
    }  
    
    // Prevent velocity from becoming negative (object stops)
    if (currentVelocity < 0) {
      currentVelocity = 0;
    }
    
    // Update position based on actual velocity
    coilX += currentVelocity * deltaTime * 100; // Scale factor for visualization
    
    // Boundary checking - prevent coil from leaving canvas and stop if it hits edge
    const prevCoilX = coilX;
    coilX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X, coilX));
    
    // If coil hit the boundary, stop it completely
    if (coilX !== prevCoilX && (coilX === CANVAS_MIN_X || coilX === CANVAS_MAX_X)) {
      currentVelocity = 0;
      autoMotionActive = false;
      const t = translations[currentLang] || translations.en;
      autoMotionBtn.textContent = t.autoMotion;
    }
    
    // Update slider to reflect new velocity
    velocitySlider.value = currentVelocity.toFixed(1);
    velocityVal.textContent = currentVelocity.toFixed(1);    
  }

  // Drawing Functions
  function drawScene() {
    if (mode === 'conductor') {
      drawConductorScene();
      return;
    }
    
    if (!needsRedraw && !autoMotionActive && !isDragging) return;
    
    const canvasWidth = canvas.width / devicePixelRatio;
    const canvasHeight = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;

    const centerY = canvasHeight / 2;

    const fieldTop = 20;
    const fieldBottom = canvasHeight - 20;
    const fieldHeight = fieldBottom - fieldTop;
    
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(fieldX, fieldTop, fieldWidth, fieldHeight);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(fieldX, fieldTop, fieldWidth, fieldHeight);

    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 4;
    
    const gridRows = Math.floor(fieldHeight / 60);
    const gridCols = 6;
    const cellWidth = fieldWidth / gridCols;
    const cellHeight = fieldHeight / gridRows;
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = fieldX + col * cellWidth + cellWidth / 2;
        const y = fieldTop + row * cellHeight + cellHeight / 2;
        
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 10);
        ctx.lineTo(x + 10, y + 10);
        ctx.moveTo(x + 10, y - 10);
        ctx.lineTo(x - 10, y + 10);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const t = translations[currentLang] || translations.en;
    const labelText = t.magneticFieldLabel;
    const labelMetrics = ctx.measureText(labelText);
    const labelX = fieldX + fieldWidth / 2;
    const labelY = fieldTop + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(labelX - labelMetrics.width / 2 - 5, labelY - 2, labelMetrics.width + 10, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, labelX, labelY);

    const turns = parseInt(turnsSlider.value);
    const baseWidth = coilWidth;
    const baseHeight = coilHeight;
    const spacing = 3;
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';

    for (let i = 0; i < turns; i++) {
      const offset = i * spacing;
      const width = baseWidth - offset * 2;
      const height = baseHeight - offset * 2;
      const x = coilX - width / 2;
      const y = coilY - height / 2;
      
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
      
      if (i < turns - 1) {
        ctx.fillRect(x, y, width, height);
      }
    }

    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(coilX - baseWidth / 2, coilY - baseHeight / 2, baseWidth, baseHeight);
    ctx.setLineDash([]);
    
    const coilBaseWidth = baseWidth;
    const coilBaseHeight = baseHeight;

    ctx.fillStyle = '#6366f1';
    ctx.font = 'italic bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cornerOffset = 8;
    ctx.fillText('A', coilX - coilWidth / 2 - cornerOffset, coilY - coilHeight / 2 - cornerOffset);
    ctx.fillText('B', coilX + coilWidth / 2 + cornerOffset, coilY - coilHeight / 2 - cornerOffset);
    ctx.fillText('C', coilX + coilWidth / 2 + cornerOffset, coilY + coilHeight / 2 + cornerOffset);
    ctx.fillText('D', coilX - coilWidth / 2 - cornerOffset, coilY + coilHeight / 2 + cornerOffset);

    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`N=${turns}`, coilX, coilY + coilHeight / 2 + 25);

    const p = computePhysics();

    // Velocity arrow - only show if velocity > 0  
    if (currentVelocity > 0.01 && (autoMotionActive || Math.abs(coilX - lastCoilX) > 0.1)) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      const arrowLength = 30 + currentVelocity * 10;
      ctx.beginPath();
      ctx.moveTo(coilX + coilBaseWidth / 2 + 10, coilY);
      ctx.lineTo(coilX + coilBaseWidth / 2 + 10 + arrowLength, coilY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(coilX + coilBaseWidth / 2 + 10 + arrowLength, coilY);
      ctx.lineTo(coilX + coilBaseWidth / 2 + 10 + arrowLength - 8, coilY - 5);
      ctx.lineTo(coilX + coilBaseWidth / 2 + 10 + arrowLength - 8, coilY + 5);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t.velocityLabel.replace('{value}', currentVelocity.toFixed(1)), coilX + coilBaseWidth / 2 + 10 + arrowLength / 2, coilY - 15);
    }

    // External Force arrow (pointing right)
    const externalForce = parseFloat(externalForceSlider.value);
    if (externalForce > 0.001) {
      const forceScale = Math.max(externalForce * 50, 20);
      const arrowEndX = coilX + coilBaseWidth / 2 + 10 + forceScale;
      
      ctx.strokeStyle = '#48c6ec';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(coilX + coilBaseWidth / 2 + 10, coilY + 30);
      ctx.lineTo(arrowEndX, coilY + 30);
      ctx.stroke();

      ctx.fillStyle = '#48c6ec';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, coilY + 30);
      ctx.lineTo(arrowEndX - 12, coilY + 30 - 8);
      ctx.lineTo(arrowEndX - 12, coilY + 30 + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#48c6ec';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t.externalForceLabel + ': ' + externalForce.toFixed(2) + 'N', (coilX + coilBaseWidth / 2 + 10 + arrowEndX) / 2, coilY + 50);
    }

    // Get flux state for current animation
    const fluxState = getFluxState(coilX);

    // Induced current visualization (orange animated arrows)
    if (p.I > 0) {
      const currentIntensity = Math.min(p.I * 2, 1);
      const spacing = 3;

      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle = '#f59e0b';
      ctx.lineWidth = 5;

      const arrowsPerLoop = Math.max(1, Math.ceil(4 / Math.max(turns, 1)));

      for (let i = 0; i < turns; i++) {
        const offset = i * spacing;
        const width = coilBaseWidth - offset * 2;
        const height = coilBaseHeight - offset * 2;
        const loopLeft = coilX - width / 2;
        const loopRight = coilX + width / 2;
        const loopTop = coilY - height / 2;
        const loopBottom = coilY + height / 2;

        const perimeter = 2 * (width + height);

        for (let arrowIdx = 0; arrowIdx < arrowsPerLoop; arrowIdx++) {
          const phaseOffset = (arrowIdx * perimeter) / arrowsPerLoop;
          let rawArrowOffset = (currentAnimationTime * 40 + i * (perimeter / turns) + phaseOffset) % perimeter;

          let arrowX, arrowY, arrowAngle;
          let isAnticlockwise = false;

          let currentMovementOffset = rawArrowOffset;

          if (fluxState.state === 'entering') {
            currentMovementOffset = perimeter - rawArrowOffset;
            isAnticlockwise = true;
          }

          if (currentMovementOffset < width) {
            arrowX = loopLeft + currentMovementOffset;
            arrowY = loopTop;
            arrowAngle = isAnticlockwise ? 0 : Math.PI;
          } else if (currentMovementOffset < width + height) {
            arrowX = loopRight;
            arrowY = loopTop + (currentMovementOffset - width);
            arrowAngle = isAnticlockwise ? Math.PI / 2 : -Math.PI / 2;
          } else if (currentMovementOffset < 2 * width + height) {
            arrowX = loopRight - (currentMovementOffset - width - height);
            arrowY = loopBottom;
            arrowAngle = isAnticlockwise ? Math.PI : 0;
          } else {
            arrowX = loopLeft;
            arrowY = loopBottom - (currentMovementOffset - 2 * width - height);
            arrowAngle = isAnticlockwise ? -Math.PI / 2 : Math.PI / 2;
          }

          const arrowSize = Math.max(15, 18 * currentIntensity);
          ctx.save();
          ctx.translate(arrowX, arrowY);
          ctx.rotate(arrowAngle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(arrowSize, -arrowSize / 2);
          ctx.lineTo(arrowSize, arrowSize / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Lenz Force arrow (pointing left, opposes motion)
    if (p.lenzForce > 0.0001) {
      const minScale = 30;
      const forceScale = Math.max(p.lenzForce * 2, 0.1);
      const scale = Math.max(minScale, Math.min(forceScale * 50, 80));
      
      const arrowStartX = coilX - coilBaseWidth / 2 - 15;
      const arrowEndX = arrowStartX - scale;
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, coilY);
      ctx.lineTo(arrowEndX, coilY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, coilY);
      ctx.lineTo(arrowEndX + 12, coilY - 8);
      ctx.lineTo(arrowEndX + 12, coilY + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const labelX = (arrowStartX + arrowEndX) / 2;
      ctx.fillText(t.forceLabel, labelX, coilY - 20);
    }

    needsRedraw = false;
  }

  function drawGraph() {
    if (!needsGraphRedraw) return;
    
    graphCtx.clearRect(0, 0, graphCanvas.width / devicePixelRatio, graphCanvas.height / devicePixelRatio);

    const graphWidth = graphCanvas.width / devicePixelRatio;
    const graphHeight = graphCanvas.height / devicePixelRatio;
    
    graphCtx.strokeStyle = '#e5e7eb';
    graphCtx.lineWidth = 1;
    graphCtx.beginPath();
    graphCtx.moveTo(50, graphHeight - 30);
    graphCtx.lineTo(graphWidth - 20, graphHeight - 30);
    graphCtx.moveTo(50, graphHeight - 30);
    graphCtx.lineTo(50, 20);
    graphCtx.stroke();
    
    const t = translations[currentLang] || translations.en;
    graphCtx.fillStyle = '#6b7280';
    graphCtx.font = '12px Arial';
    graphCtx.textAlign = 'center';
    graphCtx.fillText(t.graphXAxis, graphWidth / 2, graphHeight - 5);
    
    graphCtx.save();
    graphCtx.translate(15, graphHeight / 2);
    graphCtx.rotate(-Math.PI / 2);
    graphCtx.textAlign = 'center';
    graphCtx.fillText(t.graphYAxis, 0, 0);
    graphCtx.restore();

    const positions = positionHistory.getArray();
    const forces = forceHistory.getArray();
    const len = positions.length;
    
    if (len === 0) {
      needsGraphRedraw = false;
      return;
    }

    const maxF = Math.max(...forces, 1);
    graphCtx.strokeStyle = '#10b981';
    graphCtx.lineWidth = 2;
    graphCtx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = 50 + (i / Math.max(len - 1, 1)) * (graphWidth - 70);
      const y = graphHeight - 30 - (forces[i] / maxF) * (graphHeight - 50);
      if (i === 0) graphCtx.moveTo(x, y);
      else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
    
    needsGraphRedraw = false;
  }

  const throttledUpdate = throttle(() => {
    needsRedraw = true;
    updateDisplays();
  }, 16);

  // Event Listeners
  areaSlider.addEventListener('input', () => {
    areaVal.textContent = parseFloat(areaSlider.value).toFixed(2);
    throttledUpdate();
  });

  turnsSlider.addEventListener('input', () => {
    turnsVal.textContent = turnsSlider.value;
    throttledUpdate();
  });

  fieldSlider.addEventListener('input', () => {
    fieldVal.textContent = parseFloat(fieldSlider.value).toFixed(1);
    throttledUpdate();
  });

  resSlider.addEventListener('input', () => {
    resVal.textContent = resSlider.value;
    throttledUpdate();
  });

  velocitySlider.addEventListener('input', () => {
    const sliderValue = parseFloat(velocitySlider.value);
    velocityVal.textContent = sliderValue.toFixed(1);
    
    // Only update currentVelocity if not in auto motion (user is adjusting slider manually)
    if (!autoMotionActive) {
      currentVelocity = sliderValue;
    }
    
    throttledUpdate();
  });  

  // External Force slider listener
  externalForceSlider.addEventListener('input', () => {
    externalForceVal.textContent = parseFloat(externalForceSlider.value).toFixed(1);
    needsRedraw = true;
    updateDisplays();
  });

  autoMotionBtn.addEventListener('click', () => {
    autoMotionActive = !autoMotionActive;
    const t = translations[currentLang] || translations.en;
    autoMotionBtn.textContent = autoMotionActive ? t.pause : t.autoMotion;
    
    // CORRECTED: Set initial velocity from slider when starting auto motion
    if (autoMotionActive) {
      currentVelocity = parseFloat(velocitySlider.value);
    }
    
    needsRedraw = true;
    resumeAnimation();
  });  

  resetBtn.addEventListener('click', () => {
    autoMotionActive = false;
    coilX = 80;
    lastCoilX = coilX;
    currentVelocity = 0;
    positionHistory.clear();
    forceHistory.clear();
    autoMotionBtn.textContent = '▶ AUTO MOTION';
    velocitySlider.value = 0;
    velocityVal.textContent = '0.0';
    needsRedraw = true;
    needsGraphRedraw = true;
    lastPhysicsState = null;
    updateDisplays();
    drawScene();
    drawGraph();
  });

  // Drag functionality
  function getCanvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) * (canvas.width / devicePixelRatio / rect.width);
  }
  
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = getCanvasMousePos(e);
    currentVelocity = 0;
    needsRedraw = true;
    resumeAnimation();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const currentX = getCanvasMousePos(e);
      const delta = currentX - dragStartX;
      
      // CORRECTED: Calculate velocity from mouse movement
      const timeDelta = 0.016; // ~60fps
      currentVelocity = (delta / timeDelta) * 0.01; // Scale appropriately
      
      coilX += delta;
      coilX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X, coilX));
      
      dragStartX = currentX;
      autoMotionActive = false;
      const t = translations[currentLang] || translations.en;
      autoMotionBtn.textContent = t.autoMotion;
      needsRedraw = true;
    }
  });  

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // Animation loop
  let animationFrameId = null;
  let lastTime = 0;
  
  function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (autoMotionActive) {
      updateVelocity(deltaTime);
      needsRedraw = true;
    }

    currentAnimationTime += deltaTime;
    if (computePhysics().I > 0.0001) {
      needsRedraw = true;
    }

    updateDisplays();
    
    if (needsRedraw || autoMotionActive || isDragging) {
      drawScene();
    }
    
    if (needsGraphRedraw) {
      drawGraph();
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  // Initialize
  updateDisplays();
  drawScene();
  drawGraph();
  
  animationFrameId = requestAnimationFrame(animate);
  
  function resumeAnimation() {
    if (!animationFrameId) {
      needsRedraw = true;
      lastTime = 0;
      animate(performance.now());
    }
  }
  
  // Mode toggle functionality
  const areaGroup = document.getElementById('areaGroup');
  const turnsGroup = document.getElementById('turnsGroup');
  const currentCard = document.getElementById('currentCard');
  const emfTopCard = document.getElementById('emfTopCard');
  const emfBottomCard = document.getElementById('emfBottomCard');
  const emfTopEl = document.getElementById('emfTop');
  const emfBottomEl = document.getElementById('emfBottom');

  // --- NEW: Get references to the cards we want to hide ---
  // --- 記得在上方宣告處加入這行抓取新 ID ---
  const lenzForceCard = document.getElementById('lenzForceCard'); 
  const extForceCard = document.getElementById('extForceCard');
  const netForceCard = document.getElementById('netForceCard');
  
  modeToggleBtn.addEventListener('click', () => {
    mode = mode === 'coil' ? 'conductor' : 'coil';
    const t = translations[currentLang] || translations.en;
    
    if (mode === 'conductor') {
      modeToggleBtn.textContent = t.switchToCoil;
      areaGroup.style.display = 'none';
      turnsGroup.style.display = 'none';
      currentCard.style.display = 'none';
      
      // --- 隱藏所有與「力」相關的卡片 ---
      if (lenzForceCard) lenzForceCard.style.display = 'none'; // 隱藏 Force (Lenz)
      if (extForceCard) extForceCard.style.display = 'none';   // 隱藏 External Force
      if (netForceCard) netForceCard.style.display = 'none';   // 隱藏 Net Force

      emfTopCard.style.display = 'block';
      emfBottomCard.style.display = 'block';
    } else {
      modeToggleBtn.textContent = t.switchToConductor;
      areaGroup.style.display = 'block';
      turnsGroup.style.display = 'block';
      currentCard.style.display = 'block';
      
      // --- 恢復顯示所有卡片 ---
      if (lenzForceCard) lenzForceCard.style.display = 'block';
      if (extForceCard) extForceCard.style.display = 'block';
      if (netForceCard) netForceCard.style.display = 'block';

      emfTopCard.style.display = 'none';
      emfBottomCard.style.display = 'none';
    }
    
    needsRedraw = true;
    updateDisplays();
    drawScene();
  });
  
  function drawConductorScene() {
    if (!needsRedraw && !autoMotionActive && !isDragging) return;
    
    const canvasWidth = canvas.width / devicePixelRatio;
    const canvasHeight = canvas.height / devicePixelRatio;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;

    const centerY = canvasHeight / 2;

    const fieldTop = 0;
    const fieldBottom = canvasHeight;
    const fieldHeight = fieldBottom - fieldTop;
    
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(fieldX, fieldTop, fieldWidth, fieldHeight);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(fieldX, fieldTop, fieldWidth, fieldHeight);

    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 3;
    const gridRows = Math.floor(fieldHeight / 60);
    const gridCols = 6;
    const cellWidth = fieldWidth / gridCols;
    const cellHeight = fieldHeight / gridRows;
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = fieldX + col * cellWidth + cellWidth / 2;
        const y = fieldTop + row * cellHeight + cellHeight / 2;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 10);
        ctx.lineTo(x + 10, y + 10);
        ctx.moveTo(x + 10, y - 10);
        ctx.lineTo(x - 10, y + 10);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const t = translations[currentLang] || translations.en;
    const labelText = t.magneticFieldLabel;
    const labelMetrics = ctx.measureText(labelText);
    const labelX = fieldX + fieldWidth / 2;
    const labelY = fieldTop + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(labelX - labelMetrics.width / 2 - 5, labelY - 2, labelMetrics.width + 10, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, labelX, labelY);

    const conductorWidth = 25;
    const conductorHeight = 220;
    const conductorLeft = coilX - conductorWidth / 2;
    const conductorTop = centerY - conductorHeight / 2;
    
    const gradient = ctx.createLinearGradient(conductorLeft, conductorTop, conductorLeft + conductorWidth, conductorTop);
    gradient.addColorStop(0, '#818cf8');
    gradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = gradient;
    ctx.fillRect(conductorLeft, conductorTop, conductorWidth, conductorHeight);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 3;
    ctx.strokeRect(conductorLeft, conductorTop, conductorWidth, conductorHeight);
    
    const p = computePhysics();
    const conductorRight = coilX + conductorWidth / 2;
    const externalForce = parseFloat(externalForceSlider.value);
    
    // CORRECTED: EMF calculation using Motional EMF direction (Right-Hand Rule)
    let emfTop = 0;
    let emfBottom = 0;
    
    const fluxState = getFluxState(coilX);
    const currentPhysics = computePhysics();

    // Only show EMF potential difference when conductor is inside or interacting with field
    if (fluxState.state !== 'outside') {
        // Use magnitude to avoid confusion with Lenz's law sign convention
        const totalInducedEmfMagnitude = Math.abs(currentPhysics.emf); 
        
        // Right-Hand Rule: v(Right) x B(In) = Force(Up) -> Top is Positive
        if (currentVelocity > 0) {
            emfTop = totalInducedEmfMagnitude / 2;
            emfBottom = -totalInducedEmfMagnitude / 2;
        } 
        // If moving Left: v(Left) x B(In) = Force(Down) -> Top is Negative
        else if (currentVelocity < 0) {
            emfTop = -totalInducedEmfMagnitude / 2;
            emfBottom = totalInducedEmfMagnitude / 2;
        }
    } else {
        emfTop = 0;
        emfBottom = 0;
    }
    
    // --- 修正後的邏輯 ---
    // 只有當速度大於 0 且 不在磁場外 (即 Entering, Inside, Exiting) 時才顯示電荷
    const shouldShowCharges = Math.abs(currentVelocity) > 0.01 && fluxState.state !== 'outside';
    
    if (shouldShowCharges) {  
        ctx.fillStyle = '#ef4444';  
        ctx.font = 'bold 28px Arial';  
        ctx.textAlign = 'center';  
        ctx.textBaseline = 'middle';  
        
        const topChargeY = conductorTop + 20;  
        ctx.beginPath();  
        ctx.arc(coilX, topChargeY, 18, 0, Math.PI * 2);  
        ctx.fillStyle = '#fee2e2';  
        ctx.fill();  
        ctx.strokeStyle = '#ef4444';  
        ctx.lineWidth = 3;  
        ctx.stroke();  
        
        ctx.fillStyle = '#dc2626';  
        ctx.lineWidth = 4;  
        ctx.beginPath();  
        ctx.moveTo(coilX - 10, topChargeY);  
        ctx.lineTo(coilX + 10, topChargeY);  
        ctx.moveTo(coilX, topChargeY - 10);  
        ctx.lineTo(coilX, topChargeY + 10);  
        ctx.stroke();  
        
        const bottomChargeY = conductorTop + conductorHeight - 20;  
        ctx.beginPath();  
        ctx.arc(coilX, bottomChargeY, 18, 0, Math.PI * 2);  
        ctx.fillStyle = '#e0e7ff';  
        ctx.fill();  
        ctx.strokeStyle = '#6366f1';  
        ctx.lineWidth = 3;  
        ctx.stroke();  
        
        ctx.fillStyle = '#4f46e5';  
        ctx.lineWidth = 4;  
        ctx.beginPath();  
        ctx.moveTo(coilX - 10, bottomChargeY);  
        ctx.lineTo(coilX + 10, bottomChargeY);  
        ctx.stroke();  
    }  
    
    // Velocity arrow - only show if velocity > 0  
    if (currentVelocity > 0.01 && (autoMotionActive || Math.abs(coilX - lastCoilX) > 0.1)) {  
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      const arrowLength = 30 + currentVelocity * 10;
      ctx.beginPath();
      ctx.moveTo(coilX + conductorWidth / 2 + 10, centerY);
      ctx.lineTo(coilX + conductorWidth / 2 + 10 + arrowLength, centerY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(coilX + conductorWidth / 2 + 10 + arrowLength, centerY);
      ctx.lineTo(coilX + conductorWidth / 2 + 10 + arrowLength - 8, centerY - 5);
      ctx.lineTo(coilX + conductorWidth / 2 + 10 + arrowLength - 8, centerY + 5);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t.velocityLabel.replace('{value}', currentVelocity.toFixed(1)), coilX + conductorWidth / 2 + 10 + arrowLength / 2, centerY - 15);
    }

    // External Force arrow for conductor
    if (externalForce > 0.001) {
      const forceScale = Math.max(externalForce * 50, 20);
      const arrowEndX = coilX + conductorWidth / 2 + 10 + forceScale;
      
      ctx.strokeStyle = '#48c6ec';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(coilX + conductorWidth / 2 + 10, centerY + 30);
      ctx.lineTo(arrowEndX, centerY + 30);
      ctx.stroke();

      ctx.fillStyle = '#48c6ec';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, centerY + 30);
      ctx.lineTo(arrowEndX - 12, centerY + 30 - 8);
      ctx.lineTo(arrowEndX - 12, centerY + 30 + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#48c6ec';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t.externalForceLabel + ': ' + externalForce.toFixed(2) + 'N', (coilX + conductorWidth / 2 + 10 + arrowEndX) / 2, centerY + 50);
    }
    
    // 修正：完全依賴計算出的 p.lenzForce。如果它是 0 (如直導體模式)，就不畫箭頭。
    if (p.lenzForce > 0.0001) {
      const minScale = 30;
      const forceScale = Math.max(p.lenzForce * 2, 0.1);
      const scale = Math.max(minScale, Math.min(forceScale * 50, 80));
      
      const arrowStartX = coilX - conductorWidth / 2 - 15;
      const arrowEndX = arrowStartX - scale;
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, centerY);
      ctx.lineTo(arrowEndX, centerY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, centerY);
      ctx.lineTo(arrowEndX + 12, centerY - 8);
      ctx.lineTo(arrowEndX + 12, centerY + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const labelX = (arrowStartX + arrowEndX) / 2;
      ctx.fillText(t.forceLabel, labelX, centerY - 20);
    }
    
    emfTopEl.innerHTML = emfTop.toFixed(3) + ' <span class="stat-unit">V</span>';
    emfBottomEl.innerHTML = emfBottom.toFixed(3) + ' <span class="stat-unit">V</span>';
    
    needsRedraw = false;
  }
  
  [areaSlider, turnsSlider, fieldSlider, resSlider, velocitySlider, externalForceSlider].forEach(slider => {
    slider.addEventListener('input', resumeAnimation);
  });
  
  // Language toggle functionality
  const langToggleBtn = document.getElementById('langToggle');
  const physicsPrincipleEl = document.getElementById('physicsPrinciple');
  
  function updateLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    document.querySelector('.header h1').textContent = t.headerTitle;
    document.querySelector('.header p').textContent = t.headerSubtitle;
    
    physicsPrincipleEl.innerHTML = t.physicsPrinciple;
    
    langToggleBtn.textContent = lang === 'en' ? '中文' : 'English';
    
    const cardTitles = document.querySelectorAll('.card-title');
    if (cardTitles[0]) {
      cardTitles[0].innerHTML = '<span>🎯</span> ' + t.visualization;
    }
    
    const legendItems = document.querySelectorAll('.legend-item span');
    if (legendItems.length >= 4) {
      legendItems[0].textContent = t.coilLoops;
      legendItems[1].textContent = t.magneticField;
      legendItems[2].textContent = t.opposingForce;
      legendItems[3].textContent = t.inducedCurrent;
    }
    
    if (cardTitles[1]) {
      cardTitles[1].innerHTML = '<span>⚙️</span> ' + t.controls;
    }
    
    // 修正：使用精確的 ID 查找，而非依賴 DOM 順序，解決標籤錯位問題
    const setLabel = (inputId, text) => {
      const input = document.getElementById(inputId);
      if (input) {
        // 尋找該 input 所在的容器 (.control-label) 中的第一個 span
        const container = input.closest('.control-label') || input.parentElement;
        const labelSpan = container ? container.querySelector('span') : null;
        if (labelSpan) labelSpan.textContent = text;
      }
    };

    setLabel('area', t.coilArea);
    setLabel('turns', t.numberOfTurns);
    setLabel('field', t.magneticFieldB);
    setLabel('res', t.resistance);
    setLabel('velocity', t.velocity);
    setLabel('externalForce', t.externalForce);

    
    const autoMotionBtnText = document.getElementById('autoMotion');
    if (autoMotionBtnText) {
      if (autoMotionActive) {
        autoMotionBtnText.textContent = t.pause;
      } else {
        autoMotionBtnText.textContent = t.autoMotion;
      }
    }
    
    const resetBtnText = document.getElementById('reset');
    if (resetBtnText) {
      resetBtnText.textContent = t.reset;
    }
    
    const modeToggleBtnText = document.getElementById('modeToggle');
    if (modeToggleBtnText) {
      if (mode === 'conductor') {
        modeToggleBtnText.textContent = t.switchToCoil;
      } else {
        modeToggleBtnText.textContent = t.switchToConductor;
      }
    }
    
    const hintEl = document.querySelector('.hint');
    if (hintEl) {
      hintEl.innerHTML = t.dragHint;
    }
    
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 4) {
      statLabels[0].textContent = t.fluxRate;
      statLabels[1].textContent = t.inducedEMF;
      statLabels[2].textContent = t.current;
      statLabels[3].textContent = t.force;
      if (statLabels[4]) statLabels[4].textContent = t.externalForceLabel;
      if (statLabels[5]) statLabels[5].textContent = t.netForceLabel;
      if (statLabels[6]) statLabels[6].textContent = t.emfTop;
      if (statLabels[7]) statLabels[7].textContent = t.emfBottom;
    }
    
    const graphCardTitle = document.querySelector('.graph-card-title');
    if (graphCardTitle) {
      graphCardTitle.textContent = t.graphTitle;
    }
    
    needsRedraw = true;
    needsGraphRedraw = true;
    updateDisplays();
    const currentPhysics = computePhysics();
    updateStatusMessage(currentPhysics);
    drawGraph();
  }
  
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'en' ? 'zh' : 'en';
      updateLanguage(newLang);
    });
  }
  
})();
