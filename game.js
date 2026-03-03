// ============================================================
// ピクセルモン育成ゲーム
// ============================================================

const bgCanvas = document.getElementById('bgCanvas');
const creatureCanvas = document.getElementById('creatureCanvas');
const fxCanvas = document.getElementById('fxCanvas');
const bgCtx = bgCanvas.getContext('2d');
const ctx = creatureCanvas.getContext('2d');
const fxCtx = fxCanvas.getContext('2d');

// ============================================================
// ドット絵データ (8x8 ピクセル, 各ステージ)
// 0=透明, 1=体色, 2=暗い体色, 3=白/目, 4=黒/瞳, 5=アクセント色
// ============================================================
const SPRITES = {
  egg: [
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,1,3,1,1,0,0],
    [0,1,1,1,1,1,0,0],
    [0,1,2,1,1,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  baby: [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,3,4,3,4,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,2,2,1,0,0],
    [0,1,0,1,1,0,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
  child: [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,3,4,3,4,1,1],
    [0,1,1,5,5,1,1,0],
    [0,0,1,2,2,1,0,0],
    [0,1,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,0],
    [0,0,0,0,0,0,0,0],
  ],
  adult: [
    [0,1,1,1,1,1,1,0],
    [1,1,5,1,1,5,1,1],
    [1,1,3,4,3,4,1,1],
    [1,1,1,5,5,1,1,1],
    [0,1,1,2,2,1,1,0],
    [0,1,0,1,1,0,1,0],
    [0,1,1,0,0,1,1,0],
    [0,1,0,0,0,0,1,0],
  ],
};

// ステージごとの色パレット
const PALETTES = {
  egg:   ['transparent','#b0d4ff','#7aabee','#ffffff','#222266','#ffdd66'],
  baby:  ['transparent','#ff9ec4','#e06090','#ffffff','#333300','#ffdd66'],
  child: ['transparent','#7de87d','#4aa84a','#ffffff','#223322','#ff6655'],
  adult: ['transparent','#a07de8','#7050c8','#ffffff','#220044','#ffdd33'],
};

// ============================================================
// ゲーム状態
// ============================================================
const STAGES = ['egg','baby','child','adult'];
const STAGE_NAMES = ['タマゴ','赤ちゃん','子供','おとな'];

const state = {
  stage: 0,
  hp: 100,
  hunger: 80,
  happy: 70,
  age: 0,        // 秒単位で加算
  sleeping: false,
  animFrame: 0,
  bobDir: 1,
  bobY: 0,
  particles: [],
  locked: false,  // アクション中ロック
};

// ============================================================
// アニメーション描画
// ============================================================
const SCALE = 4; // 8px * 4 = 32px キャラ
const SPRITE_PX = 8;

function drawBackground() {
  bgCtx.fillStyle = state.sleeping ? '#0a0a2a' : '#1a3050';
  bgCtx.fillRect(0, 0, 160, 120);

  // 地面
  bgCtx.fillStyle = state.sleeping ? '#0a1a30' : '#2a5080';
  bgCtx.fillRect(0, 90, 160, 30);

  // 星 or 太陽
  if (state.sleeping) {
    // 月
    bgCtx.fillStyle = '#ffffaa';
    bgCtx.beginPath();
    bgCtx.arc(130, 20, 8, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.fillStyle = '#1a3050';
    bgCtx.beginPath();
    bgCtx.arc(134, 18, 7, 0, Math.PI * 2);
    bgCtx.fill();
    // 星
    for (let i = 0; i < 12; i++) {
      bgCtx.fillStyle = `rgba(255,255,200,${0.4 + 0.6 * Math.random()})`;
      bgCtx.fillRect(
        5 + (i * 13) % 120,
        5 + Math.floor(i / 4) * 18,
        2, 2
      );
    }
  } else {
    // 太陽
    bgCtx.fillStyle = '#ffee44';
    bgCtx.beginPath();
    bgCtx.arc(130, 22, 10, 0, Math.PI * 2);
    bgCtx.fill();
    // 光線
    bgCtx.strokeStyle = '#ffee44';
    bgCtx.lineWidth = 1;
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      bgCtx.beginPath();
      bgCtx.moveTo(130 + Math.cos(angle) * 13, 22 + Math.sin(angle) * 13);
      bgCtx.lineTo(130 + Math.cos(angle) * 17, 22 + Math.sin(angle) * 17);
      bgCtx.stroke();
    }
  }
}

function drawSprite(spriteKey, paletteKey, x, y) {
  const sprite = SPRITES[spriteKey];
  const palette = PALETTES[paletteKey];
  for (let row = 0; row < SPRITE_PX; row++) {
    for (let col = 0; col < SPRITE_PX; col++) {
      const colorIdx = sprite[row][col];
      if (colorIdx === 0) continue;
      ctx.fillStyle = palette[colorIdx];
      ctx.fillRect(x + col * SCALE, y + row * SCALE, SCALE, SCALE);
    }
  }
}

function getCreatureX() { return (160 - SPRITE_PX * SCALE) / 2; }
function getCreatureY() { return 50 + state.bobY; }

function drawCreature() {
  ctx.clearRect(0, 0, 160, 120);
  const stageName = STAGES[state.stage];
  const paletteKey = stageName;
  drawSprite(stageName, paletteKey, getCreatureX(), getCreatureY());
}

// ============================================================
// パーティクルエフェクト
// ============================================================
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 3 - 1,
      life: 1.0,
      color,
      size: 2 + Math.random() * 2,
    });
  }
}

function updateParticles() {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.03;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function drawParticles() {
  fxCtx.clearRect(0, 0, 160, 120);
  for (const p of state.particles) {
    fxCtx.globalAlpha = p.life;
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(p.x, p.y, p.size, p.size);
  }
  fxCtx.globalAlpha = 1;
}

// ============================================================
// ステータスUI更新
// ============================================================
function updateUI() {
  document.getElementById('hp-bar').style.width = state.hp + '%';
  document.getElementById('hunger-bar').style.width = state.hunger + '%';
  document.getElementById('happy-bar').style.width = state.happy + '%';

  const days = Math.floor(state.age / 60);
  document.getElementById('creature-name').textContent = getCreatureName();
  document.getElementById('creature-stage').textContent = 'ステージ: ' + STAGE_NAMES[state.stage];
  document.getElementById('creature-age').textContent = '年齢: ' + days + '日';
}

function getCreatureName() {
  const names = ['タマゴ','ちびもん','もんきち','もんスター'];
  return names[state.stage];
}

function setMessage(msg) {
  document.getElementById('message-box').textContent = msg;
}

// ============================================================
// ゲームロジック (毎秒)
// ============================================================
function gameTick() {
  if (state.hp <= 0) return;

  state.age++;

  if (!state.sleeping) {
    state.hunger = Math.max(0, state.hunger - 0.5);
    state.happy  = Math.max(0, state.happy  - 0.2);
  } else {
    state.hp     = Math.min(100, state.hp + 1);
    state.hunger = Math.max(0, state.hunger - 0.2);
  }

  if (state.hunger < 20) {
    state.hp = Math.max(0, state.hp - 1);
    if (Math.random() < 0.1) setMessage('お腹がすいてるよ〜！');
  }
  if (state.happy < 20) {
    if (Math.random() < 0.08) setMessage('つまんないな〜...');
  }

  // 進化チェック
  const ageInDays = state.age / 60;
  if (state.stage === 0 && ageInDays >= 0.5) evolve(1, 'たまごから生まれたよ！');
  if (state.stage === 1 && ageInDays >= 2)   evolve(2, '子供に進化したよ！');
  if (state.stage === 2 && ageInDays >= 5)   evolve(3, 'おとなに進化したよ！ 強くなったね！');

  updateUI();
}

function evolve(toStage, msg) {
  if (state.stage >= toStage) return;
  state.stage = toStage;
  setMessage(msg);
  const cx = 80, cy = 60;
  for (let i = 0; i < 5; i++) {
    spawnParticles(cx, cy, '#ffdd33', 6);
    spawnParticles(cx, cy, '#ff6655', 4);
  }
}

// ============================================================
// ボタンアクション
// ============================================================
function lockButtons(ms) {
  state.locked = true;
  document.querySelectorAll('.btn').forEach(b => b.disabled = true);
  setTimeout(() => {
    state.locked = false;
    document.querySelectorAll('.btn').forEach(b => b.disabled = false);
  }, ms);
}

document.getElementById('btn-feed').addEventListener('click', () => {
  if (state.locked || state.sleeping) return;
  state.hunger = Math.min(100, state.hunger + 30);
  setMessage('もぐもぐ... おいしい！');
  spawnParticles(80, 60, '#f5a623', 10);
  lockButtons(600);
  updateUI();
});

document.getElementById('btn-play').addEventListener('click', () => {
  if (state.locked || state.sleeping) return;
  state.happy = Math.min(100, state.happy + 25);
  state.hunger = Math.max(0, state.hunger - 5);
  setMessage('わーい！たのしい！');
  spawnParticles(80, 60, '#4ade80', 12);
  lockButtons(800);
  updateUI();
});

document.getElementById('btn-sleep').addEventListener('click', () => {
  if (state.locked) return;
  state.sleeping = !state.sleeping;
  if (state.sleeping) {
    setMessage('zzz... おやすみ〜');
    document.getElementById('btn-sleep').textContent = '☀️ おきる';
  } else {
    setMessage('おはよう！元気いっぱい！');
    document.getElementById('btn-sleep').textContent = '💤 ねる';
  }
});

document.getElementById('btn-train').addEventListener('click', () => {
  if (state.locked || state.sleeping || state.stage < 1) return;
  state.hp     = Math.min(100, state.hp + 10);
  state.hunger = Math.max(0, state.hunger - 15);
  setMessage('よーし！きたえるぞ！');
  spawnParticles(80, 60, '#e94560', 14);
  lockButtons(1000);
  updateUI();
});

// ============================================================
// メインループ
// ============================================================
let lastTime = 0;
let tickAccum = 0;

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  tickAccum += dt;

  // ボブアニメーション
  state.bobY += state.bobDir * 0.3;
  if (state.bobY > 3)  state.bobDir = -1;
  if (state.bobY < -3) state.bobDir = 1;

  // 毎秒ゲームティック
  if (tickAccum >= 1000) {
    tickAccum -= 1000;
    gameTick();
  }

  updateParticles();

  // 描画
  drawBackground();
  drawCreature();
  drawParticles();

  requestAnimationFrame(gameLoop);
}

// ============================================================
// 起動
// ============================================================
updateUI();
setMessage('育てていくよ！ご飯やあそびでそだてよう！');
requestAnimationFrame(gameLoop);
