const ASSETS = {
  bg: 'assets/bg/IMG_0896.png',
  tsubuo: ['assets/characters/tsubuo1.png', 'assets/characters/tsubuo2.png'],
  black: ['assets/characters/black1.png', 'assets/characters/black2.png'],
  blackDefeat: 'assets/characters/black_defeat.png',
  sounds: {
    bgm: 'assets/sounds/8-bit_Aggressive1.mp3',
    boss: 'assets/sounds/kiki.mp3',
    defeat: 'assets/sounds/defeat.mp3',
    countdown: 'assets/sounds/countdown.mp3',
    decide: 'assets/sounds/kettei.mp3',
    tap: 'assets/sounds/don.mp3',
    warning: 'assets/sounds/warning.mp3',
    kiran: 'assets/sounds/kira-n.mp3',
    drumroll: 'assets/sounds/doramroru.mp3',
    fanfare: 'assets/sounds/jaja-n.mp3',
  }
};

const GAME_SECONDS = 30;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const screens = {
  title: document.getElementById('titleScreen'),
  countdown: document.getElementById('countdownScreen'),
  result: document.getElementById('resultScreen'),
};
const hud = document.getElementById('gameHud');
const messageLayer = document.getElementById('messageLayer');
const scoreText = document.getElementById('scoreText');
const timeText = document.getElementById('timeText');
const finalScore = document.getElementById('finalScore');
const rankText = document.getElementById('rankText');
const soundBtn = document.getElementById('soundBtn');
const secretArea = document.getElementById('secretArea');
const unlockedArea = document.getElementById('unlockedArea');
const hardBtn = document.getElementById('hardBtn');
const backToTitleBtn = document.getElementById('backToTitleBtn');
const bestScoreText = document.getElementById('bestScoreText');
const newRecordText = document.getElementById('newRecordText');

let W = 0, H = 0, DPR = 1;
let images = { bg: null, tsubuo: [], black: [], blackDefeat: null, custom: null };
let audio = {};
let soundOn = true;
let unlocked = false;
let hardMode = false;
let state = 'title';
let score = 0;
let maxCombo = 0;
let combo = 0;
let timeLeft = GAME_SECONDS;
let gameStartMs = 0;
let lastMs = 0;
let spawnTimer = 0;
let targets = [];
let neonOffset = 0;
let blackEventDone = false;
let blackEventActive = false;
let blackTarget = null;
let lastTapSoundMs = 0;
let demoTarget = null;
let effects = [];

function worldYOffset() {
  return -H * 0.08;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function makeAudio(src, loop = false, volume = 0.7) {
  const a = new Audio(src);
  a.loop = loop;
  a.volume = volume;
  a.preload = 'auto';
  return a;
}

async function init() {
  resize();
  window.addEventListener('resize', resize);
  images.bg = await loadImage(ASSETS.bg);
  images.tsubuo = (await Promise.all(ASSETS.tsubuo.map(loadImage))).filter(Boolean);
  images.black = (await Promise.all(ASSETS.black.map(loadImage))).filter(Boolean);
  images.blackDefeat = await loadImage(ASSETS.blackDefeat);

  audio = {
    bgm: makeAudio(ASSETS.sounds.bgm, true, 0.38),
    boss: makeAudio(ASSETS.sounds.boss, true, 0.5),
    defeat: makeAudio(ASSETS.sounds.defeat, false, 0.9),
    countdown: makeAudio(ASSETS.sounds.countdown, false, 0.9),
    decide: makeAudio(ASSETS.sounds.decide, false, 0.75),
    tap: makeAudio(ASSETS.sounds.tap, false, 0.65),
    warning: makeAudio(ASSETS.sounds.warning, false, 0.9),
    kiran: makeAudio(ASSETS.sounds.kiran, false, 0.85),
    drumroll: makeAudio(ASSETS.sounds.drumroll, false, 0.8),
    fanfare: makeAudio(ASSETS.sounds.fanfare, false, 0.85),
  };

  bindUI();
  showOnly('title');
  requestAnimationFrame(loop);
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);

  const rect = document.getElementById('app').getBoundingClientRect();

  W = rect.width;
  H = rect.height;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function bindUI() {
  document.getElementById('startBtn').onclick = () => startCountdown();
  document.getElementById('retryBtn').onclick = () => startCountdown();
  document.getElementById('homeBtn').onclick = () => showTitle();
  document.getElementById('secretBtn').onclick = () => {
  play('decide');
  secretArea.classList.remove('hidden');
};

document.getElementById('closeSecretBtn').onclick = () => {
  play('decide');
  secretArea.classList.add('hidden');
};

secretArea.addEventListener('click', (e) => {
  if (e.target === secretArea) {
    secretArea.classList.add('hidden');
  }
});
document.getElementById('unlockBtn').onclick = async () => {
  const v = document.getElementById('secretInput').value.trim();
  const msg = document.getElementById('secretMessage');

  if (!v) {
    msg.textContent = '合言葉を入れてね！';
    play('decide');
    return;
  }

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: v })
    });

    const data = await res.json();

    if (data.ok) {
  unlocked = true;
  localStorage.setItem('premiumUnlocked', 'true');
      document.getElementById('noteLink').textContent =
  'つぶおのnote';

  play('decide');
  msg.textContent = '解放したよ！';
  unlockedArea.classList.remove('hidden');
  secretArea.classList.add('hidden');
  showMessage('合言葉OK！', 1100);
} else {
      msg.textContent = '合言葉がちがうよ！';
      play('decide');
    }
  } catch {
    msg.textContent = '通信エラーだよ！';
  }
};
  soundBtn.onclick = () => {
    soundOn = !soundOn;
    soundBtn.textContent = `効果音：${soundOn ? 'ON' : 'OFF'}`;
    if (soundOn) play('decide'); else stopAllAudio();
  };
  hardBtn.onclick = () => {
  hardMode = !hardMode;
  localStorage.setItem('hardMode', String(hardMode));
  hardBtn.textContent = `高難易度：${hardMode ? 'ON' : 'OFF'}`;
  play('decide');
};
document.getElementById('imageInput').onchange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const nameEl = document.getElementById('selectedFileName');
  if (nameEl) {
    nameEl.textContent = `選択中：${file.name}`;
  }

  const url = URL.createObjectURL(file);
  loadImage(url).then(img => {
    images.custom = img;
    play('decide');
    showMessage('画像セット！', 1000);
  });
};
  backToTitleBtn.onclick = () => {
  showTitle();
};
  restorePremiumState();
  canvas.addEventListener('pointerdown', onPointerDown);
}
function restorePremiumState() {
  const savedUnlocked = localStorage.getItem('premiumUnlocked') === 'true';

  if (savedUnlocked) {
    unlocked = true;
    unlockedArea.classList.remove('hidden');
    const noteLink = document.getElementById('noteLink');

if (savedUnlocked) {
  noteLink.textContent = 'つぶおのnote';
} else {
  noteLink.textContent = '有料版を見る';
}
  }

  hardMode = localStorage.getItem('hardMode') === 'true';
  hardBtn.textContent = `高難易度：${hardMode ? 'ON' : 'OFF'}`;
}

function play(name, restart = true) {
  if (!soundOn || !audio[name]) return;
  try {
    if (restart) audio[name].currentTime = 0;
    audio[name].play().catch(() => {});
  } catch (_) {}
}
function stopAudio(name) { if (audio[name]) { audio[name].pause(); audio[name].currentTime = 0; } }
function stopAllAudio() { Object.values(audio).forEach(a => { a.pause(); a.currentTime = 0; }); }
function showOnly(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('show'));
  if (screenName) screens[screenName].classList.add('show');
}
function showTitle() {
  state = 'title';
  stopAllAudio();
  showOnly('title');
  hud.classList.add('hidden');
  backToTitleBtn.classList.add('hidden');
  messageLayer.classList.add('hidden');
  targets = [];
  blackEventActive = false;
  blackTarget = null;
}
function startCountdown() {
  play('decide');
  stopAllAudio();
  showOnly('countdown');
  hud.classList.add('hidden');
  state = 'countdown';
  const el = document.getElementById('countdownText');
  const seq = ['3', '2', '1', 'GO!'];
  let i = 0;
  el.textContent = seq[i];
  play('countdown');
  const timer = setInterval(() => {
    i++;
    if (i >= seq.length) {
      clearInterval(timer);
      beginGame();
    } else {
      el.textContent = seq[i];
    }
  }, 850);
}

function beginGame() {
  state = 'playing';
  demoTarget = null;
  showOnly(null);
  hud.classList.remove('hidden');
  backToTitleBtn.classList.remove('hidden');
  score = 0; combo = 0; maxCombo = 0; timeLeft = GAME_SECONDS;
  targets = [];
  spawnTarget(false);
  spawnTimer = 0;
  blackEventDone = false;
  blackEventActive = false;
  blackTarget = null;
  gameStartMs = performance.now();
  lastMs = gameStartMs;
  updateHUD();
  if (soundOn) audio.bgm.play().catch(() => {});
}

function endGame() {
  state = 'result';
  stopAudio('bgm');
  stopAudio('boss');
  targets = [];
  hud.classList.add('hidden');
  backToTitleBtn.classList.add('hidden');
  finalScore.textContent = score;
  const rank = getRank(score);
rankText.textContent = rank;
rankText.className = 'rank-text ' + getRankClass(rank);
  const bestScore = Number(localStorage.getItem('bestScore') || 0);

if (score > bestScore) {
  localStorage.setItem('bestScore', String(score));
  bestScoreText.textContent = `ベストスコア：${score}`;
  newRecordText.classList.remove('hidden');
} else {
  bestScoreText.textContent = `ベストスコア：${bestScore}`;
  newRecordText.classList.add('hidden');
}
  showOnly('result');
  document.getElementById('retryBtn').disabled = true;
document.getElementById('homeBtn').disabled = true;

setTimeout(() => {
  document.getElementById('retryBtn').disabled = false;
  document.getElementById('homeBtn').disabled = false;
}, 900);
if (soundOn) {
  play('fanfare');
}
}
function getRankClass(rank) {
  if (rank.includes('でんせつ')) return 'rank-legend';
  if (rank.includes('スーパー')) return 'rank-super';
  if (rank.includes('たつじん')) return 'rank-master';
  if (rank.includes('すごい')) return 'rank-great';
  if (rank.includes('じょうず')) return 'rank-good';
  if (rank.includes('みならい')) return 'rank-beginner';
  return 'rank-first';
}

function getRank(s) {
  if (!hardMode) {
    if (s >= 61) return 'たつじん！';
    if (s >= 46) return 'すごい！';
    if (s >= 31) return 'じょうず！';
    if (s >= 16) return 'みならい';
    return 'はじめてさん';
  }
  if (s >= 111) return 'でんせつ！！';
  if (s >= 91) return 'スーパーたつじん！';
  if (s >= 66) return 'たつじん！';
  if (s >= 46) return 'すごい！';
  if (s >= 31) return 'じょうず！';
  if (s >= 16) return 'みならい';
  return 'はじめてさん';
}

function updateHUD() {
  scoreText.textContent = score;
  timeText.textContent = Math.max(0, Math.ceil(timeLeft));
}

function loop(ms) {
  const dt = Math.min((ms - lastMs) / 1000, 0.05) || 0;
  lastMs = ms;
  drawBackground(dt);
  //if (state === 'title') drawDemo(dt, ms);
  if (state === 'playing') updateGame(dt, ms);
  drawEffects(ms);
  requestAnimationFrame(loop);
}

function drawBackground(dt) {
  if (images.bg) {
    const img = images.bg;
    const scale = Math.max(W / img.width, H / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const bgY = (H - ih) / 2 - H * 0.08;
ctx.drawImage(img, (W - iw) / 2, bgY, iw, ih);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07081e'); g.addColorStop(1, '#16052b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  drawMovingNeon(dt);
}

function drawMovingNeon(dt) {
  const speed = state === 'playing' && timeLeft <= 5 ? 1.8 : 0.7;
  neonOffset = (neonOffset + dt * speed) % 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cx = W / 2;
  const horizon = H * 0.47;
  const bottom = H * 1.08;
  for (let i = 0; i < 16; i++) {
    const t = ((i / 16 + neonOffset) % 1);
    const y = horizon + Math.pow(t, 2.25) * (bottom - horizon);
    const half = 18 + Math.pow(t, 1.6) * W * 0.62;
    const alpha = 0.12 + t * 0.45;
    ctx.strokeStyle = i % 2 ? `rgba(255,77,202,${alpha})` : `rgba(0,229,255,${alpha})`;
    ctx.lineWidth = 1 + t * 4;
    ctx.beginPath();
    ctx.moveTo(cx - half, y);
    ctx.lineTo(cx + half, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDemo(dt, ms) {
  if (!demoTarget || demoTarget.z > 1.15) demoTarget = makeTarget(false, true);
  demoTarget.z += dt * 0.22;
  drawTarget(demoTarget, ms);
}

function updateGame(dt, ms) {
  const elapsed = (ms - gameStartMs) / 1000;
  timeLeft = GAME_SECONDS - elapsed;
  if (timeLeft <= 0) { updateHUD(); endGame(); return; }

  if (!blackEventDone && !blackEventActive && timeLeft <= 16 && timeLeft >= 12) startBlackEvent();

  if (!blackEventActive) {
    const baseInterval = hardMode ? 0.24 : 0.50;
    const lastRush = timeLeft <= 5;
    const interval = lastRush ? (hardMode ? 0.09 : 0.22) : baseInterval;
    spawnTimer -= dt;
    while (spawnTimer <= 0) {
      spawnTarget(lastRush);
      spawnTimer += interval * (0.75 + Math.random() * 0.5);
    }
  }

  for (const t of targets) t.z += dt * t.speed;
targets = targets.filter(t => {
  if (t.hit) return false;

  if (t.z > 1.35) {
    combo = 0;

    if (t.type === 'black') {
      blackEventActive = false;
      blackTarget = null;
      stopAudio('boss');

      if (state === 'playing' && soundOn) {
        audio.bgm.play().catch(() => {});
      }

      showMessage('よわいなー！', 700);
    }

    return false;
  }

  return true;
});

  updateHUD();
  targets.sort((a,b) => a.z - b.z).forEach(t => drawTarget(t, ms));
}

function makeTarget(lastRush = false, demo = false) {
  const laneSpread = lastRush ? 0.72 : 0.52;
  const xOff = demo ? 0 : (Math.random() - 0.5) * laneSpread;
  return {
    type: 'normal', z: 0.02, xOff,
    speed: demo ? 0.22 : (hardMode ? 0.52 : 0.40) * (lastRush ? 1.22 : 1) * (0.86 + Math.random() * 0.25),
    wobble: Math.random() * Math.PI * 2,
    hit: false,
  };
}
function spawnTarget(lastRush = false) { targets.push(makeTarget(lastRush)); }

function drawTarget(t, ms) {
  const isBlack = t.type === 'black';
  const frames = isBlack ? images.black : (images.custom ? [images.custom] : images.tsubuo);
  const img = frames.length ? frames[Math.floor(ms / 140) % frames.length] : null;
  const cx = W / 2;
  const offsetY = worldYOffset();
const horizon = H * 0.48 + offsetY;
const y = horizon + Math.pow(t.z, 1.7) * H * 0.45;
  const x = cx + t.xOff * W * Math.pow(t.z, 1.15) + Math.sin(ms / 150 + t.wobble) * 7 * t.z;
  const size = (isBlack ? 110 : 78) + Math.pow(t.z, 1.45) * (isBlack ? 300 : 215);
  t.screen = { x, y, r: size * 0.45 };

  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.35 + t.z * 1.1);
  ctx.shadowColor = isBlack ? '#ff1744' : '#00e5ff';
  ctx.shadowBlur = 20;
  if (img) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  else {
    ctx.fillStyle = isBlack ? '#111' : '#fff';
    ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function onPointerDown(e) {
  if (state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let hit = null;
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    if (!t.screen) continue;
    const dx = x - t.screen.x, dy = y - t.screen.y;
    if (Math.sqrt(dx*dx + dy*dy) < t.screen.r * 1.25) { hit = t; break; }
  }
  if (!hit) return;

  if (hit.type === 'black') {
    hit.hp--;
    throttledTapSound();
    makeBurst(hit.screen.x, hit.screen.y, '#ff1744');
addImpact(hit.screen.x, hit.screen.y);
    if (hit.hp <= 0) defeatBlack(hit);
    return;
  }
  hit.hit = true;
  score += 1;
  combo += 1;
  maxCombo = Math.max(maxCombo, combo);
  play('tap');
  makeBurst(hit.screen.x, hit.screen.y, '#00e5ff');
  if (combo > 0 && combo % 10 === 0) showMessage(`${combo} COMBO!`, 650);
}

function throttledTapSound() {
  const now = performance.now();
  if (now - lastTapSoundMs > 90) { play('tap'); lastTapSoundMs = now; }
}

function startBlackEvent() {
  blackEventActive = true;
  blackEventDone = true;
  targets = [];
  stopAudio('bgm');
  showMessage('WARNING!', 1400);
  play('warning');
  setTimeout(() => {
    if (state !== 'playing') return;
    blackTarget = { type: 'black', z: 0.08, xOff: 0, speed: 0.22, wobble: 0, hp: hardMode ? 18 : 12, hit: false };
    targets.push(blackTarget);
    if (soundOn) audio.boss.play().catch(() => {});
  }, 850);
}

function defeatBlack(t) {
  t.hit = true;
  score += 20;
  stopAudio('boss');
  play('defeat');

  showMessage('撃破！', 600);

  setTimeout(() => {
    showMessage('おぼえてろー！', 1400);
    flyAwayAnimation(t.screen.x, t.screen.y);
  }, 550);

  setTimeout(() => {
    blackEventActive = false;
    if (state === 'playing' && soundOn) audio.bgm.play().catch(() => {});
  }, 1400);
}

function flyAwayAnimation(x, y) {
  let sparkPlayed = false;
  const start = performance.now();
  const img = images.blackDefeat || images.black[0];
  function anim(ms) {
    const p = Math.min(1, (ms - start) / 750);
    drawBackground(0);
    const nx = x + p * W * 0.42;
    const ny = y - p * H * 0.48;
    const size = 180 * (1 - p * 0.75);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(p * Math.PI * 5);
    ctx.globalAlpha = 1 - p * 0.25;
    if (img) ctx.drawImage(img, -size/2, -size/2, size, size);
    ctx.restore();
    ctx.font = `${Math.max(24, W * 0.04)}px system-ui`;

    if (p > 0.9) {

  ctx.font = `${Math.max(32, W * 0.05)}px system-ui`;
  ctx.fillText('✨', nx, ny);

  if (!sparkPlayed) {
    sparkPlayed = true;
    play('kiran');
  }
}
    
    if (p < 1 && state === 'playing') requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

function makeBurst(x, y, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  for (let i=0;i<12;i++) {
    const a = i / 12 * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    ctx.lineTo(x + Math.cos(a) * 44, y + Math.sin(a) * 44);
    ctx.stroke();
  }
  ctx.restore();
}
function showImpactEmoji(x, y) {
  ctx.save();
  ctx.font = `${Math.max(36, W * 0.055)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff1744';
  ctx.shadowBlur = 18;
  ctx.fillText('💥', x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
  ctx.restore();
}
function addImpact(x, y) {
  effects.push({
    x: x + (Math.random() - 0.5) * 60,
    y: y + (Math.random() - 0.5) * 60,
    start: performance.now(),
    duration: 420
  });
}

function drawEffects(ms) {
  effects = effects.filter(e => {
    const p = (ms - e.start) / e.duration;
    if (p >= 1) return false;

    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.font = `${Math.max(42, W * 0.06) * (1 + p * 0.6)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 20;
    ctx.fillText('💥', e.x, e.y - p * 36);
    ctx.restore();

    return true;
  });
}

let messageTimer = null;
function showMessage(text, ms = 1000) {
  messageLayer.innerHTML = text.replace(/\n/g, '<br>');
  messageLayer.classList.remove('hidden');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => messageLayer.classList.add('hidden'), ms);
}

init();
