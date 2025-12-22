// Optimized Electromagnetic Induction Simulator
// Performance improvements: dirty flags, circular buffer, throttling

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

  const areaVal = document.getElementById('areaVal');
  const turnsVal = document.getElementById('turnsVal');
  const fieldVal = document.getElementById('fieldVal');
  const resVal = document.getElementById('resVal');
  const velocityVal = document.getElementById('velocityVal');
  const fluxRateEl = document.getElementById('fluxRate');
  const emfEl = document.getElementById('emf');
  const IEl = document.getElementById('I');
  const FEl = document.getElementById('F');

  // State Variables
  let coilX = 80;
  let coilY = canvas.height / 2;
  let isDragging = false;
  let dragStartX = 0;
  let autoMotionActive = false;
  let lastCoilX = coilX;
  let currentAnimationTime = 0; // For current animation
  let currentLang = 'en'; // Language state
  
  // High DPI support
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Language translations - defined early so it's available everywhere
  const translations = {
    en: {
      physicsPrinciple: '<strong>📚 Key Physics Principles:</strong><br><strong>Faraday\'s Law:</strong> Force only appears when magnetic flux through the coil <strong>changes</strong>. Inside a uniform field → constant flux → <strong>NO force</strong>.<br><strong>Lenz\'s Law:</strong> The induced current creates a magnetic field that <strong>opposes the change causing it</strong>. This is why the force always opposes the motion when entering or exiting the field.',
      headerTitle: '⚡ Electromagnetic Induction Simulator',
      headerSubtitle: 'Realistic Coil with Draggable Motion Control',
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
      autoMotion: '▶ AUTO MOTION',
      pause: '⏸ PAUSE',
      reset: '↺ RESET',
      switchToConductor: '🔄 Switch to Straight Conductor',
      switchToCoil: '🔄 Switch to Coil',
      dragHint: '💡 <strong>Drag the coil</strong> along the canvas to move it manually. Watch how force appears only at field boundaries!',
      fluxRate: 'dΦ/dt',
      inducedEMF: 'Induced EMF',
      current: 'Current',
      force: 'Force',
      emfTop: 'EMF (Top)',
      emfBottom: 'EMF (Bottom)',
      graphTitle: '📊 Force vs Position',
      statusOutside: '⏸ {object} is <strong>completely outside</strong> field: <strong>NO flux change → NO force</strong>',
      statusInside: '✓ {object} <strong>completely inside</strong> uniform field: <strong>Φ constant → NO force</strong>',
      statusEntering: '⚡ {object} <strong>ENTERING</strong> field: <strong>Flux increasing → Force opposes motion</strong>',
      statusExiting: '⚡ {object} <strong>EXITING</strong> field: <strong>Flux decreasing → Force opposes motion</strong>',
      coil: 'Coil',
      conductor: 'Conductor',
      magneticFieldLabel: 'MAGNETIC FIELD (into page)',
      forceLabel: 'F (Lenz)',
      velocityLabel: 'v={value} m/s',
      graphXAxis: 'Position (px)',
      graphYAxis: 'Force (N)'
    },
    zh: {
      physicsPrinciple: '<strong>📚 關鍵物理原理：</strong><br><strong>法拉第定律：</strong>只有當通過線圈的磁通量<strong>改變</strong>時才會產生力。在均勻磁場內 → 磁通量恆定 → <strong>無力</strong>。<br><strong>楞次定律：</strong>感生電流（或電動勢）<strong>總是與產生它的變化抗衡，或傾向與這個變化抗衡。</strong>。這就是為什麼進入或離開磁場時，力總是與運動方向相反。',
      headerTitle: '⚡ 電磁感應模擬器',
      headerSubtitle: '可拖動線圈的真實模擬',
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
      autoMotion: '▶ 自動運動',
      pause: '⏸ 暫停',
      reset: '↺ 重置',
      switchToConductor: '🔄 切換至直導體',
      switchToCoil: '🔄 切換至線圈',
      dragHint: '💡 <strong>拖動線圈</strong>可手動移動。觀察力只在磁場邊界出現！',
      fluxRate: 'dΦ/dt',
      inducedEMF: '感應電動勢',
      current: '電流',
      force: '力',
      emfTop: '電動勢（上）',
      emfBottom: '電動勢（下）',
      graphTitle: '📊 力 vs 位置',
      statusOutside: '⏸ {object} <strong>完全在磁場外</strong>：<strong>無磁通量變化 → 無力</strong>',
      statusInside: '✓ {object} <strong>完全在均勻磁場內</strong>：<strong>Φ 恆定 → 無力</strong>',
      statusEntering: '⚡ {object} <strong>進入</strong>磁場：<strong>磁通量增加 → 力與運動方向相反</strong>',
      statusExiting: '⚡ {object} <strong>離開</strong>磁場：<strong>磁通量減少 → 力與運動方向相反</strong>',
      coil: '線圈',
      conductor: '導體',
      magneticFieldLabel: '磁場（指入頁面）',
      forceLabel: 'F（楞次）',
      velocityLabel: 'v={value} 米/秒',
      graphXAxis: '位置（像素）',
      graphYAxis: '力（牛頓）'
    }
  };
  
  // Setup canvas for high DPI - use HTML attributes as base, not CSS size
  function setupCanvas() {
    // Use the HTML width/height attributes as the base size
    const baseWidth = parseInt(canvas.getAttribute('width')) || 1000;
    const baseHeight = parseInt(canvas.getAttribute('height')) || 550;
    
    canvas.width = baseWidth * devicePixelRatio;
    canvas.height = baseHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    canvas.style.width = baseWidth + 'px';
    canvas.style.height = baseHeight + 'px';
    
    const graphRect = graphCanvas.getBoundingClientRect();
    graphCanvas.width = graphRect.width * devicePixelRatio;
    graphCanvas.height = graphRect.height * devicePixelRatio;
    graphCtx.scale(devicePixelRatio, devicePixelRatio);
    graphCanvas.style.width = graphRect.width + 'px';
    graphCanvas.style.height = graphRect.height + 'px';
  }
  
  setupCanvas();
  
  const fieldX = 500;
  const fieldWidth = 220;
  const fieldX_end = fieldX + fieldWidth;

  let coilWidth = 80; // Will be calculated from area
  const coilHeight = 120;
  
  // Mode: 'coil' or 'conductor'
  let mode = 'coil';
  const modeToggleBtn = document.getElementById('modeToggle');

  // Performance optimizations
  const maxDataPoints = 100;
  
  // Circular buffer for history (O(1) instead of O(n) with shift())
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

  // Dirty flags for conditional rendering
  let needsRedraw = true;
  let needsGraphRedraw = true;
  let lastPhysicsState = null;

  // Throttle function for slider updates
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

  // Calculate coil dimensions from area
  function updateCoilDimensions() {
    const area = parseFloat(areaSlider.value);
    // Calculate width from area (assuming height is fixed proportionally)
    // Area = width * height, so width = area / (height/scale)
    const scale = 1.5; // Scale factor for visualization
    const calculatedWidth = Math.sqrt(area * scale) * 60; // Convert to pixels
    
    // Limit coil width to not exceed field width
    coilWidth = Math.min(calculatedWidth, fieldWidth * 0.9);
  }
  
  // Physics Functions
  function getFluxState(x) {
    if (mode === 'conductor') {
      // For conductor mode, use conductor dimensions
      const conductorWidth = 25;
      const left = x - conductorWidth / 2;
      const right = x + conductorWidth / 2;
      
      // Completely outside field - no force
      if (right <= fieldX) {
        return { state: 'outside', fluxChangeRate: 0 };
      } else if (left >= fieldX_end) {
        return { state: 'outside', fluxChangeRate: 0 };
      }
      
      // Fully inside field - no flux change, no force
      if (left >= fieldX && right <= fieldX_end) {
        return { state: 'inside', fluxChangeRate: 0 };
      }
      
      // Entering field (left edge is outside, right edge is inside)
      if (left < fieldX && right > fieldX && right <= fieldX_end) {
        const velocity = parseFloat(velocitySlider.value);
        const B = parseFloat(fieldSlider.value);
        const overlapLength = right - fieldX; // Length of conductor inside field
        const fluxChangeRate = B * velocity * overlapLength * 0.1; // Flux change rate
        return { state: 'entering', fluxChangeRate };
      }
      
      // Exiting field (left edge is inside, right edge is outside)
      if (left >= fieldX && left < fieldX_end && right > fieldX_end) {
        const velocity = parseFloat(velocitySlider.value);
        const B = parseFloat(fieldSlider.value);
        const overlapLength = fieldX_end - left; // Length of conductor still in field
        const fluxChangeRate = -B * velocity * overlapLength * 0.1; // Negative for exiting
        return { state: 'exiting', fluxChangeRate };
      }
      
      // Default to outside if somehow none of the above match
      return { state: 'outside', fluxChangeRate: 0 };
    }
    
    // For coil mode, use coil dimensions
    updateCoilDimensions(); // Update dimensions based on area
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
    const velocity = parseFloat(velocitySlider.value);
    // Convert velocity from m/s to pixels per frame (assuming ~60fps)
    const velocityPxPerFrame = velocity * 0.1; // Scale factor for visualization
    const fluxChangeRate = N * B * A * velocity * 0.1;

    if (right >= fieldX && right <= fieldX_end && left < fieldX) {
      return { state: 'entering', fluxChangeRate };
    } else if (left <= fieldX_end && left >= fieldX && right > fieldX_end) {
      return { state: 'exiting', fluxChangeRate };
    }

    return { state: 'outside', fluxChangeRate: 0 };
  }

  function computePhysics() {
    const B = parseFloat(fieldSlider.value);
    const R = parseInt(resSlider.value);

    const fluxState = getFluxState(coilX);
    const dPhiDt = fluxState.fluxChangeRate;
    const emf = dPhiDt;
    const I = emf / R;
    
    let F = 0;
    if (mode === 'conductor') {
      // For conductor, force is proportional to current and field
      // Force exists when there's flux change (entering or exiting)
      F = Math.abs(dPhiDt) > 0.001 ? (B * Math.abs(I) * 0.1) : 0;
    } else {
      // For coil, use original formula
      const N = parseInt(turnsSlider.value);
      const A = parseFloat(areaSlider.value);
      // Force exists when there's flux change (entering or exiting)
      F = Math.abs(dPhiDt) > 0.001 ? (N * B * A * Math.abs(I)) : 0;
    }

    return { dPhiDt, emf, I, F, state: fluxState.state };
  }

  function updateStatusMessage(physics) {
    const t = translations[currentLang] || translations.en;
    const objectName = mode === 'conductor' ? t.conductor : t.coil;
    const messages = {
      'outside': t.statusOutside.replace('{object}', objectName),
      'inside': t.statusInside.replace('{object}', objectName),
      'entering': t.statusEntering.replace('{object}', objectName),
      'exiting': t.statusExiting.replace('{object}', objectName)
    };
    statusEl.innerHTML = messages[physics.state] || '';
    statusEl.className = (physics.F > 0.001) ? 'status-box active' : 'status-box';
  }

  function updateDisplays() {
    const p = computePhysics();
    
    // Only update if values changed significantly
    const stateChanged = !lastPhysicsState || 
      Math.abs(p.dPhiDt - lastPhysicsState.dPhiDt) > 0.001 ||
      Math.abs(p.F - lastPhysicsState.F) > 0.001 ||
      p.state !== lastPhysicsState.state;

    if (stateChanged) {
      fluxRateEl.innerHTML = p.dPhiDt.toFixed(3) + '<span class="stat-unit"> Wb/s</span>';
      emfEl.innerHTML = p.emf.toFixed(3) + '<span class="stat-unit"> V</span>';
      IEl.innerHTML = p.I.toFixed(4) + '<span class="stat-unit"> A</span>';
      FEl.innerHTML = p.F.toFixed(3) + '<span class="stat-unit"> N</span>';

      if (p.F < 0.001) {
        FEl.parentElement.classList.add('zero');
      } else {
        FEl.parentElement.classList.remove('zero');
      }

      updateStatusMessage(p);
      lastPhysicsState = p;
    }

    // Update history only if position changed
    if (Math.abs(coilX - lastCoilX) > 0.5) {
      positionHistory.push(coilX);
      forceHistory.push(p.F);
      lastCoilX = coilX;
      needsGraphRedraw = true;
    }
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

    // Field region - ensure it's fully visible with strong contrast
    // Make field extend fully across canvas height
    const fieldTop = 20; // Start near top of canvas
    const fieldBottom = canvasHeight - 20; // End near bottom of canvas
    const fieldHeight = fieldBottom - fieldTop;
    
    // Stronger background fill for visibility
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(fieldX, fieldTop, fieldWidth, fieldHeight);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(fieldX, fieldTop, fieldWidth, fieldHeight);

    // Magnetic field direction indicators (X for into page) - spaced out like photo 3
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 4;
    
    // Draw X symbols (into page) in a spaced grid pattern - smaller and more spaced
    const gridRows = Math.floor(fieldHeight / 60); // More spacing between rows
    const gridCols = 6; // Fewer columns for more spacing
    const cellWidth = fieldWidth / gridCols;
    const cellHeight = fieldHeight / gridRows;
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = fieldX + col * cellWidth + cellWidth / 2;
        const y = fieldTop + row * cellHeight + cellHeight / 2;
        
        // Draw X (cross) for field into page - smaller size
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 10);
        ctx.lineTo(x + 10, y + 10);
        ctx.moveTo(x + 10, y - 10);
        ctx.lineTo(x - 10, y + 10);
        ctx.stroke();
      }
    }

    // Field label - positioned inside field at top with better visibility
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Add background for better text visibility
    const t = translations[currentLang] || translations.en;
    const labelText = t.magneticFieldLabel;
    const labelMetrics = ctx.measureText(labelText);
    const labelX = fieldX + fieldWidth / 2;
    const labelY = fieldTop + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(labelX - labelMetrics.width / 2 - 5, labelY - 2, labelMetrics.width + 10, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, labelX, labelY);

    // Draw coil as concentric/stacked loops (spiral pattern)
    const turns = parseInt(turnsSlider.value);
    const baseWidth = coilWidth;
    const baseHeight = coilHeight;
    const spacing = 3; // Spacing between loops
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';

    // Draw each turn as a concentric rectangular loop
    for (let i = 0; i < turns; i++) {
      const offset = i * spacing;
      const width = baseWidth - offset * 2;
      const height = baseHeight - offset * 2;
      const x = coilX - width / 2;
      const y = coilY - height / 2;
      
      // Draw rectangular loop
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
      
      // Light fill for depth
      if (i < turns - 1) {
        ctx.fillRect(x, y, width, height);
      }
    }

    // Coil outline (dashed) - outer boundary
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(coilX - baseWidth / 2, coilY - baseHeight / 2, baseWidth, baseHeight);
    ctx.setLineDash([]);
    
    // Store baseWidth and baseHeight for use in current visualization
    const coilBaseWidth = baseWidth;
    const coilBaseHeight = baseHeight;

    // Corner labels (A, B, C, D) with italic font
    ctx.fillStyle = '#6366f1';
    ctx.font = 'italic bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cornerOffset = 8;
    ctx.fillText('A', coilX - coilWidth / 2 - cornerOffset, coilY - coilHeight / 2 - cornerOffset);
    ctx.fillText('B', coilX + coilWidth / 2 + cornerOffset, coilY - coilHeight / 2 - cornerOffset);
    ctx.fillText('C', coilX + coilWidth / 2 + cornerOffset, coilY + coilHeight / 2 + cornerOffset);
    ctx.fillText('D', coilX - coilWidth / 2 - cornerOffset, coilY + coilHeight / 2 + cornerOffset);

    // Coil label
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`N=${turns}`, coilX, coilY + coilHeight / 2 + 25);

    const p = computePhysics();

      // Velocity arrow (always show when moving, or when auto motion is active)
      const velocity = parseFloat(velocitySlider.value);
      if (autoMotionActive || Math.abs(coilX - lastCoilX) > 0.1) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        const arrowLength = 30 + velocity * 10;
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
        
        // Velocity label
        const t = translations[currentLang] || translations.en;
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t.velocityLabel.replace('{value}', velocity.toFixed(1)), coilX + coilBaseWidth / 2 + 10 + arrowLength / 2, coilY - 15);
    }

    // Induced current visualization (orange animated arrows) - visible even with few turns
    if (p.I > 0.0001) {
      const currentIntensity = Math.min(p.I * 2, 1);
      const spacing = 3;
      
      // Draw orange animated arrows on each loop - ensure visibility for all turn counts
      ctx.strokeStyle = '#f59e0b'; // Orange color
      ctx.fillStyle = '#f59e0b';
      ctx.lineWidth = 5; // Thicker for visibility
      
      // For few turns, draw multiple arrows per loop to make it more visible
      const arrowsPerLoop = Math.max(1, Math.ceil(4 / Math.max(turns, 1))); // More arrows when fewer turns
      
      for (let i = 0; i < turns; i++) {
        const offset = i * spacing;
        const width = coilBaseWidth - offset * 2;
        const height = coilBaseHeight - offset * 2;
        const loopLeft = coilX - width / 2;
        const loopRight = coilX + width / 2;
        const loopTop = coilY - height / 2;
        const loopBottom = coilY + height / 2;
        
        // Perimeter of this loop
        const perimeter = 2 * (width + height);
        
        // Draw multiple arrows per loop for better visibility
        for (let arrowIdx = 0; arrowIdx < arrowsPerLoop; arrowIdx++) {
          // Animate arrow position around the loop
          const phaseOffset = (arrowIdx * perimeter) / arrowsPerLoop;
          const arrowOffset = (currentAnimationTime * 40 + i * (perimeter / turns) + phaseOffset) % perimeter;
          
          let arrowX, arrowY, arrowAngle;
          
           // Calculate position on rectangular path (counter-clockwise: A→D→C→B→A)
           if (arrowOffset < width) {
             // Top edge (right to left) - A to D
             arrowX = loopRight - arrowOffset;
             arrowY = loopTop;
             arrowAngle = Math.PI; // Left
           } else if (arrowOffset < width + height) {
             // Left edge (top to bottom) - D to C
             arrowX = loopLeft;
             arrowY = loopTop + (arrowOffset - width);
             arrowAngle = Math.PI / 2; // Down
           } else if (arrowOffset < 2 * width + height) {
             // Bottom edge (left to right) - C to B
             arrowX = loopLeft + (arrowOffset - width - height);
             arrowY = loopBottom;
             arrowAngle = 0; // Right
           } else {
             // Right edge (bottom to top) - B to A
             arrowX = loopRight;
             arrowY = loopBottom - (arrowOffset - 2 * width - height);
             arrowAngle = -Math.PI / 2; // Up
           }
          
          // Draw animated arrow - larger for better visibility
          const arrowSize = Math.max(15, 18 * currentIntensity); // Minimum size for visibility
          ctx.save();
          ctx.translate(arrowX, arrowY);
          ctx.rotate(arrowAngle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-arrowSize, -arrowSize / 2);
          ctx.lineTo(-arrowSize, arrowSize / 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Force - make it more visible even when small
    // Direction: always points LEFT (opposes rightward motion, whether entering or exiting)
    if (p.F > 0.0001) {
      // Minimum visible scale to ensure it's always noticeable
      const minScale = 30; // Minimum arrow length
      const forceScale = Math.max(p.F * 2, 0.1); // Scale factor
      const scale = Math.max(minScale, Math.min(forceScale * 50, 80));
      
      // Force always opposes motion (rightward), so always points left
      const arrowStartX = coilX - coilBaseWidth / 2 - 15;
      const arrowEndX = arrowStartX - scale;
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6; // Thicker line
      ctx.beginPath();
      ctx.moveTo(arrowStartX, coilY);
      ctx.lineTo(arrowEndX, coilY);
      ctx.stroke();

      // Larger arrowhead pointing left
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, coilY);
      ctx.lineTo(arrowEndX + 12, coilY - 8);
      ctx.lineTo(arrowEndX + 12, coilY + 8);
      ctx.closePath();
      ctx.fill();

      // Larger, more visible label
      const t = translations[currentLang] || translations.en;
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
    
    // Add axis labels
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

  // Throttled update function for sliders
  const throttledUpdate = throttle(() => {
    needsRedraw = true;
    updateDisplays();
  }, 16); // ~60fps

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
    velocityVal.textContent = parseFloat(velocitySlider.value).toFixed(1);
    throttledUpdate();
  });

  autoMotionBtn.addEventListener('click', () => {
    autoMotionActive = !autoMotionActive;
    const t = translations[currentLang] || translations.en;
    autoMotionBtn.textContent = autoMotionActive ? t.pause : t.autoMotion;
    needsRedraw = true;
    resumeAnimation(); // Ensure animation continues
  });

  resetBtn.addEventListener('click', () => {
    autoMotionActive = false;
    coilX = 80;
    lastCoilX = coilX;
    positionHistory.clear();
    forceHistory.clear();
    autoMotionBtn.textContent = '▶ AUTO MOTION';
    needsRedraw = true;
    needsGraphRedraw = true;
    lastPhysicsState = null;
    updateDisplays();
    drawScene();
    drawGraph();
  });

  // Drag functionality with high DPI support
  function getCanvasMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) * (canvas.width / devicePixelRatio / rect.width);
  }
  
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = getCanvasMousePos(e);
    needsRedraw = true;
    resumeAnimation(); // Ensure animation continues during drag
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const currentX = getCanvasMousePos(e);
      const delta = currentX - dragStartX;
      coilX += delta;
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

  // Also handle mouseleave to stop dragging if mouse leaves canvas
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // Optimized animation loop - always runs but only updates when needed
  let animationFrameId = null;
  let lastTime = 0;
  
  function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;

    if (autoMotionActive) {
      const velocity = parseFloat(velocitySlider.value);
      // Move coil based on velocity (pixels per second)
      coilX += velocity * 60 * deltaTime; // 60 pixels per m/s at 60fps
      if (coilX > (canvas.width / devicePixelRatio) + 50) {
        coilX = -50;
      }
      needsRedraw = true;
    }

    // Always update current animation time for smooth current visualization
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

    // Always continue animation to keep current visualization smooth
    animationFrameId = requestAnimationFrame(animate);
  }

  // Initialize
  updateDisplays();
  drawScene();
  drawGraph();
  
  // Start animation loop
  animationFrameId = requestAnimationFrame(animate);
  
  // Resume animation on user interaction
  function resumeAnimation() {
    if (!animationFrameId) {
      needsRedraw = true;
      lastTime = 0; // Reset time for smooth animation
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
  
  modeToggleBtn.addEventListener('click', () => {
    mode = mode === 'coil' ? 'conductor' : 'coil';
    const t = translations[currentLang] || translations.en;
    
    if (mode === 'conductor') {
      modeToggleBtn.textContent = t.switchToCoil;
      areaGroup.style.display = 'none';
      turnsGroup.style.display = 'none';
      currentCard.style.display = 'none';
      emfTopCard.style.display = 'block';
      emfBottomCard.style.display = 'block';
    } else {
      modeToggleBtn.textContent = t.switchToConductor;
      areaGroup.style.display = 'block';
      turnsGroup.style.display = 'block';
      currentCard.style.display = 'block';
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

    // Field region - ensure it's fully visible with strong contrast
    // Make field extend fully across canvas height
    const fieldTop = 0; // Start at top of canvas
    const fieldBottom = canvasHeight; // End at bottom of canvas
    const fieldHeight = fieldBottom - fieldTop;
    
    // Stronger background fill for visibility
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(fieldX, fieldTop, fieldWidth, fieldHeight);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(fieldX, fieldTop, fieldWidth, fieldHeight);

    // Magnetic field X symbols - smaller and more spaced
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = 3;
    const gridRows = Math.floor(fieldHeight / 60); // More spacing between rows
    const gridCols = 6; // Fewer columns for more spacing
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

    // Field label - positioned inside field at top with better visibility
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Add background for better text visibility
    const t = translations[currentLang] || translations.en;
    const labelText = t.magneticFieldLabel;
    const labelMetrics = ctx.measureText(labelText);
    const labelX = fieldX + fieldWidth / 2;
    const labelY = fieldTop + 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(labelX - labelMetrics.width / 2 - 5, labelY - 2, labelMetrics.width + 10, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, labelX, labelY);

    // Draw straight conductor (vertical bar) - clearer design
    const conductorWidth = 25;
    const conductorHeight = 220;
    const conductorLeft = coilX - conductorWidth / 2;
    const conductorTop = centerY - conductorHeight / 2;
    
    // Conductor with gradient effect
    const gradient = ctx.createLinearGradient(conductorLeft, conductorTop, conductorLeft + conductorWidth, conductorTop);
    gradient.addColorStop(0, '#818cf8');
    gradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = gradient;
    ctx.fillRect(conductorLeft, conductorTop, conductorWidth, conductorHeight);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 3;
    ctx.strokeRect(conductorLeft, conductorTop, conductorWidth, conductorHeight);
    
    // Removed CONDUCTOR label as requested
    
    // Calculate EMF for top and bottom
    const p = computePhysics();
    const conductorRight = coilX + conductorWidth / 2;
    const velocity = parseFloat(velocitySlider.value);
    const B = parseFloat(fieldSlider.value);
    
    let emfTop = 0;
    let emfBottom = 0;
    
    // Check if conductor is in field (any part overlapping)
    const conductorInField = conductorRight > fieldX && conductorLeft < fieldX_end;
    
    if (conductorInField) {
      // EMF = B * v * L (for straight conductor)
      const L = conductorHeight / 2; // Length of each half
      emfTop = B * velocity * L * 0.1; // Top half
      emfBottom = B * velocity * L * 0.1; // Bottom half
    }
    
    // Show EMF distribution with +/- charges INSIDE the conductor (top and bottom)
    if (emfTop > 0.001 || emfBottom > 0.001) {
      // Top: positive charge - inside conductor at top
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw circle background for + sign inside conductor at top
      const topChargeY = conductorTop + 20; // Inside conductor, near top
      ctx.beginPath();
      ctx.arc(coilX, topChargeY, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#fee2e2';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw + sign
      ctx.fillStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(coilX - 10, topChargeY);
      ctx.lineTo(coilX + 10, topChargeY);
      ctx.moveTo(coilX, topChargeY - 10);
      ctx.lineTo(coilX, topChargeY + 10);
      ctx.stroke();
      
      // Bottom: negative charge - inside conductor at bottom
      ctx.fillStyle = '#6366f1';
      
      // Draw circle background for - sign inside conductor at bottom
      const bottomChargeY = conductorTop + conductorHeight - 20; // Inside conductor, near bottom
      ctx.beginPath();
      ctx.arc(coilX, bottomChargeY, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#e0e7ff';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw - sign
      ctx.fillStyle = '#4f46e5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(coilX - 10, bottomChargeY);
      ctx.lineTo(coilX + 10, bottomChargeY);
      ctx.stroke();
    }
    
    // Velocity arrow
    if (autoMotionActive || Math.abs(coilX - lastCoilX) > 0.1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      const arrowLength = 30 + velocity * 10;
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
    }
    
    // Force (Lenz) arrow - show when entering or exiting
    // Direction: always points LEFT (opposes rightward motion, whether entering or exiting)
    if (p.F > 0.0001) {
      // Minimum visible scale to ensure it's always noticeable
      const minScale = 30; // Minimum arrow length
      const forceScale = Math.max(p.F * 2, 0.1); // Scale factor
      const scale = Math.max(minScale, Math.min(forceScale * 50, 80));
      
      // Force always opposes motion (rightward), so always points left
      const arrowStartX = coilX - conductorWidth / 2 - 15;
      const arrowEndX = arrowStartX - scale;
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6; // Thicker line
      ctx.beginPath();
      ctx.moveTo(arrowStartX, centerY);
      ctx.lineTo(arrowEndX, centerY);
      ctx.stroke();

      // Larger arrowhead pointing left
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(arrowEndX, centerY);
      ctx.lineTo(arrowEndX + 12, centerY - 8);
      ctx.lineTo(arrowEndX + 12, centerY + 8);
      ctx.closePath();
      ctx.fill();

      // Larger, more visible label
      const t = translations[currentLang] || translations.en;
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const labelX = (arrowStartX + arrowEndX) / 2;
      ctx.fillText(t.forceLabel, labelX, centerY - 20);
    }
    
    // Update EMF displays
    emfTopEl.innerHTML = emfTop.toFixed(3) + ' <span class="stat-unit">V</span>';
    emfBottomEl.innerHTML = emfBottom.toFixed(3) + ' <span class="stat-unit">V</span>';
    
    needsRedraw = false;
  }
  
  // Resume on any slider change
  [areaSlider, turnsSlider, fieldSlider, resSlider, velocitySlider].forEach(slider => {
    slider.addEventListener('input', resumeAnimation);
  });
  
  // Language toggle functionality
  const langToggleBtn = document.getElementById('langToggle');
  const physicsPrincipleEl = document.getElementById('physicsPrinciple');
  
  function updateLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Update header
    document.querySelector('.header h1').textContent = t.headerTitle;
    document.querySelector('.header p').textContent = t.headerSubtitle;
    
    // Update physics principle
    physicsPrincipleEl.innerHTML = t.physicsPrinciple;
    
    // Update button text
    langToggleBtn.textContent = lang === 'en' ? '中文' : 'English';
    
    // Update visualization title
    document.querySelector('.card-title span').nextSibling.textContent = ' ' + t.visualization;
    
    // Update legend
    const legendItems = document.querySelectorAll('.legend-item span');
    legendItems[0].textContent = t.coilLoops;
    legendItems[1].textContent = t.magneticField;
    legendItems[2].textContent = t.opposingForce;
    legendItems[3].textContent = t.inducedCurrent;
    
    // Update controls title
    const controlsTitle = document.querySelectorAll('.card-title')[1];
    controlsTitle.querySelector('span').nextSibling.textContent = ' ' + t.controls;
    
    // Update control labels - select only the first span (label) in each control-label, not the value span
    const controlLabelElements = document.querySelectorAll('.control-label');
    if (controlLabelElements.length >= 5) {
      controlLabelElements[0].querySelector('span:first-child').textContent = t.coilArea;
      controlLabelElements[1].querySelector('span:first-child').textContent = t.numberOfTurns;
      controlLabelElements[2].querySelector('span:first-child').textContent = t.magneticFieldB;
      controlLabelElements[3].querySelector('span:first-child').textContent = t.resistance;
      controlLabelElements[4].querySelector('span:first-child').textContent = t.velocity;
    }
    
    // Update buttons
    const autoMotionBtn = document.getElementById('autoMotion');
    if (autoMotionActive) {
      autoMotionBtn.textContent = t.pause;
    } else {
      autoMotionBtn.textContent = t.autoMotion;
    }
    document.getElementById('reset').textContent = t.reset;
    const modeToggleBtn = document.getElementById('modeToggle');
    if (mode === 'conductor') {
      modeToggleBtn.textContent = t.switchToCoil;
    } else {
      modeToggleBtn.textContent = t.switchToConductor;
    }
    
    // Update hint
    document.querySelector('.hint').innerHTML = t.dragHint;
    
    // Update stat labels
    const statLabels = document.querySelectorAll('.stat-label');
    statLabels[0].textContent = t.fluxRate;
    statLabels[1].textContent = t.inducedEMF;
    statLabels[2].textContent = t.current;
    statLabels[3].textContent = t.force;
    if (statLabels[4]) statLabels[4].textContent = t.emfTop;
    if (statLabels[5]) statLabels[5].textContent = t.emfBottom;
    
    // Update graph title
    document.querySelector('.graph-card-title').textContent = t.graphTitle;
    
     // Update status message immediately (force update even if state hasn't changed)
     needsRedraw = true;
     needsGraphRedraw = true; // Redraw graph to update axis labels
     updateDisplays();
     // Force status message update with current physics state
     const currentPhysics = computePhysics();
     updateStatusMessage(currentPhysics);
     drawGraph(); // Redraw graph immediately to update axis labels
   }
  
  langToggleBtn.addEventListener('click', () => {
    const newLang = currentLang === 'en' ? 'zh' : 'en';
    updateLanguage(newLang);
  });
  
})();
