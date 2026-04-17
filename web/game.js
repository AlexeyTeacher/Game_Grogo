// ─────────────────────────────────────────────────────────────────────────────
// Grogu Game — HTML5 Canvas port
// Controls: SPACE / ↑ = jump   ↓ / LCTRL = duck   ESC = menu
// ─────────────────────────────────────────────────────────────────────────────

const CANVAS = document.getElementById('game');
const CTX    = CANVAS.getContext('2d');

// Logical resolution (all coordinates are in this space)
const W = 1280;
const H = 720;
CANVAS.width  = W;
CANVAS.height = H;

function resize() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    CANVAS.style.width  = Math.floor(W * s) + 'px';
    CANVAS.style.height = Math.floor(H * s) + 'px';
}
resize();
window.addEventListener('resize', resize);

// ── ASSETS ───────────────────────────────────────────────────────────────────
const IMG = {};
const ASSET_PATH = '../assets/';

function loadImage(key, src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = () => { IMG[key] = img; resolve(); };
        img.onerror = () => reject(new Error('Failed to load: ' + src));
        img.src = src;
    });
}

async function loadAllImages() {
    const p = ASSET_PATH + 'image/';
    await Promise.all([
        loadImage('bg',          p + 'world/background.png'),
        loadImage('horizon',     p + 'world/horizon.png'),
        loadImage('ground',      p + 'world/ground.png'),
        loadImage('cloud1',      p + 'world/cloud_1.png'),
        loadImage('cloud2',      p + 'world/cloud_2.png'),
        loadImage('run1',        p + 'grogu/grogu_run_1.png'),
        loadImage('run2',        p + 'grogu/grogu_run_2.png'),
        loadImage('jump',        p + 'grogu/grogu_jump.png'),
        loadImage('down1',       p + 'grogu/grogu_down_1.png'),
        loadImage('down2',       p + 'grogu/grogu_down_2.png'),
        loadImage('start',       p + 'grogu/grogu_start.png'),
        loadImage('dead',        p + 'grogu/grogu_dead.png'),
        loadImage('jawa',        p + 'enemies/jawa.png'),
        loadImage('trooper',     p + 'enemies/trooper.png'),
        loadImage('droid',       p + 'enemies/droid.png'),
        loadImage('gideon',      p + 'enemies/gideon.png'),
        loadImage('tie1',        p + 'tie_fighter/tie_fighter_1.png'),
        loadImage('tie2',        p + 'tie_fighter/tie_fighter_2.png'),
    ]);
}

async function loadFont() {
    try {
        const face = new FontFace('Starjedi', 'url(' + ASSET_PATH + 'font/Starjedi.ttf)');
        await face.load();
        document.fonts.add(face);
    } catch (e) {
        console.warn('Starjedi font not loaded, using fallback');
    }
}

// ── AUDIO ────────────────────────────────────────────────────────────────────
let music = null;

function initMusic() {
    music = new Audio(ASSET_PATH + 'music/soundtrack.ogg');
    music.loop   = true;
    music.volume = 0.45;
}

function playMusic() {
    if (music && music.paused) music.play().catch(() => {});
}

// ── INPUT ────────────────────────────────────────────────────────────────────
const KEYS = {};

window.addEventListener('keydown', e => {
    KEYS[e.code] = true;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
        e.preventDefault();
});
window.addEventListener('keyup', e => { KEYS[e.code] = false; });

function clearKeys() {
    Object.keys(KEYS).forEach(k => delete KEYS[k]);
}

// ── GAME STATE ────────────────────────────────────────────────────────────────
let state       = 'loading';  // loading | menu | playing | dead
let GAME_SPEED  = 20;
let POINTS      = 0;
let OBSTACLES   = [];
let x_pos_bg    = 0;
let y_pos_bg    = H * 0.6;

// ── HIGH SCORE ────────────────────────────────────────────────────────────────
function getHighScore() {
    return parseInt(localStorage.getItem('grogu_hs') || '0', 10);
}
function saveHighScore() {
    if (POINTS > getHighScore()) localStorage.setItem('grogu_hs', POINTS);
}

// ── GROGU CLASS ───────────────────────────────────────────────────────────────
class Grogu {
    constructor() {
        this.X       = 80;
        this.Y_RUN   = H * 0.66;
        this.Y_DUCK  = H * 0.70;
        this.JUMP_V0 = 9;

        this.x        = this.X;
        this.y        = this.Y_RUN;
        this.jumpVel  = this.JUMP_V0;
        this.jumping  = false;
        this.ducking  = false;
        this.step     = 0;
        this.img      = IMG.run1;
    }

    update() {
        const up   = KEYS['Space'] || KEYS['ArrowUp'];
        const down = KEYS['ArrowDown'] || KEYS['ControlLeft'];

        if (up && !this.jumping) {
            this.jumping = true;
            this.ducking = false;
            this.jumpVel = this.JUMP_V0;
        } else if (down && !this.jumping) {
            this.ducking = true;
        } else if (!this.jumping && !down) {
            this.ducking = false;
        }

        if (this.jumping) {
            this.img  = IMG.jump;
            this.y   -= this.jumpVel * 4;
            this.jumpVel -= 0.8;
            if (this.jumpVel < -this.JUMP_V0) {
                this.jumping = false;
                this.jumpVel = this.JUMP_V0;
                this.y = this.Y_RUN;
            }
        } else if (this.ducking) {
            this.img = this.step < 5 ? IMG.down1 : IMG.down2;
            this.y   = this.Y_DUCK;
            this.step = (this.step + 1) % 10;
        } else {
            this.img  = this.step < 5 ? IMG.run1 : IMG.run2;
            this.y    = this.Y_RUN;
            this.step = (this.step + 1) % 10;
        }
    }

    draw() {
        CTX.drawImage(this.img, this.x, this.y);
    }

    // Slightly inset hitbox for fairness
    rect() {
        const m = 8;
        return { x: this.x + m, y: this.y + m, w: this.img.width - m * 2, h: this.img.height - m * 2 };
    }
}

// ── CLOUD CLASS ───────────────────────────────────────────────────────────────
class Cloud {
    constructor(offscreen = false) {
        this.reset(offscreen);
    }

    reset(offscreen) {
        this.img = Math.random() < 0.5 ? IMG.cloud1 : IMG.cloud2;
        this.x   = offscreen
            ? W + 200 + Math.random() * 800
            : Math.random() * W;
        this.y   = 50 + Math.random() * (H * 0.28);
    }

    update() {
        this.x -= GAME_SPEED * 0.5;
        if (this.x + this.img.width < 0) this.reset(true);
    }

    draw() {
        CTX.drawImage(this.img, this.x, this.y);
    }
}

// ── ENEMY CLASSES ─────────────────────────────────────────────────────────────
class SmallEnemy {
    constructor() {
        const pick = Math.random() < 0.5 ? 'jawa' : 'trooper';
        this.img = IMG[pick];
        this.x   = W;
        this.y   = H * 0.675;
    }
    update() { this.x -= GAME_SPEED; }
    draw()   { CTX.drawImage(this.img, this.x, this.y); }
    rect() {
        const m = 6;
        return { x: this.x + m, y: this.y + m, w: this.img.width - m * 2, h: this.img.height - m * 2 };
    }
    gone() { return this.x + this.img.width < 0; }
}

class BigEnemy {
    constructor() {
        const pick = Math.random() < 0.5 ? 'droid' : 'gideon';
        this.img = IMG[pick];
        this.x   = W;
        this.y   = H * 0.65;
    }
    update() { this.x -= GAME_SPEED; }
    draw()   { CTX.drawImage(this.img, this.x, this.y); }
    rect() {
        const m = 6;
        return { x: this.x + m, y: this.y + m, w: this.img.width - m * 2, h: this.img.height - m * 2 };
    }
    gone() { return this.x + this.img.width < 0; }
}

class TieFighter {
    constructor() {
        this.x     = W;
        this.y     = H * 0.58;
        this.frame = 0;
    }
    update() { this.x -= GAME_SPEED; this.frame++; }
    draw() {
        const img = this.frame % 10 < 5 ? IMG.tie1 : IMG.tie2;
        CTX.drawImage(img, this.x, this.y);
    }
    rect() {
        const m = 6;
        return { x: this.x + m, y: this.y + m, w: IMG.tie1.width - m * 2, h: IMG.tie1.height - m * 2 };
    }
    gone() { return this.x + IMG.tie1.width < 0; }
}

// ── COLLISION ─────────────────────────────────────────────────────────────────
function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── SPAWN ─────────────────────────────────────────────────────────────────────
function spawnObstacle() {
    const r = Math.floor(Math.random() * 3);
    if (r === 0) OBSTACLES.push(new SmallEnemy());
    else if (r === 1) OBSTACLES.push(new BigEnemy());
    else             OBSTACLES.push(new TieFighter());
}

// ── DRAW HELPERS ──────────────────────────────────────────────────────────────
function drawBackground() {
    // Full background image
    CTX.drawImage(IMG.bg, 0, 0, W, H);

    // Scrolling horizon (tiled)
    const hw = IMG.horizon.width;
    CTX.drawImage(IMG.horizon, x_pos_bg,      y_pos_bg);
    CTX.drawImage(IMG.horizon, x_pos_bg + hw, y_pos_bg);

    // Scrolling ground (tiled)
    const gw = IMG.ground.width;
    const gy = y_pos_bg * 1.2;
    CTX.drawImage(IMG.ground, x_pos_bg,      gy);
    CTX.drawImage(IMG.ground, x_pos_bg + gw, gy);

    x_pos_bg -= GAME_SPEED;
    if (x_pos_bg <= -hw) x_pos_bg = 0;
}

function drawStaticBackground() {
    CTX.drawImage(IMG.bg, 0, 0, W, H);
    const gy = y_pos_bg * 1.2;
    for (let x = 0; x < W + IMG.horizon.width; x += IMG.horizon.width)
        CTX.drawImage(IMG.horizon, x, y_pos_bg);
    for (let x = 0; x < W + IMG.ground.width; x += IMG.ground.width)
        CTX.drawImage(IMG.ground, x, gy);
}

function drawText(text, x, y, size = 30, align = 'center') {
    CTX.font      = size + 'px Starjedi, sans-serif';
    CTX.fillStyle = '#000';
    CTX.textAlign = align;
    CTX.fillText(text, x, y);
}

function drawScore() {
    POINTS++;
    if (POINTS % 100 === 0) GAME_SPEED++;
    drawText('Points: ' + POINTS, W - 50, 52, 30, 'right');
}

// ── GAME OBJECTS ──────────────────────────────────────────────────────────────
let player, clouds;

function initGame() {
    GAME_SPEED = 20;
    POINTS     = 0;
    OBSTACLES  = [];
    x_pos_bg   = 0;
    y_pos_bg   = H * 0.6;
    player     = new Grogu();
    clouds     = [new Cloud(false), new Cloud(false), new Cloud(false)];
    clearKeys();
    state = 'playing';
    playMusic();
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
function drawMenu() {
    y_pos_bg = H * 0.6;
    drawStaticBackground();
    CTX.drawImage(IMG.start, 80, H * 0.66);
    drawText('Press any Key to Start',     W / 2, H / 2 - 50);
    drawText('Height Score: ' + getHighScore(), W / 2, H / 2 + 100);
}

function drawDeadScreen() {
    drawStaticBackground();
    CTX.drawImage(IMG.dead, 80, H * 0.66);
    drawText('Press any Key to Restart', W / 2, H / 2 - 50);
    drawText('Your Score: ' + POINTS,       W / 2, H / 2 + 50);
    drawText('Height Score: ' + getHighScore(), W / 2, H / 2 + 100);
}

// ── GAME LOOP ─────────────────────────────────────────────────────────────────
const FPS        = 30;
const FRAME_MS   = 1000 / FPS;
let   lastTime   = 0;
let   accumulator = 0;

function loop(now) {
    requestAnimationFrame(loop);

    accumulator += now - lastTime;
    lastTime = now;

    // Run at most 2 fixed-step ticks per RAF call to avoid spiral of death
    let ticks = 0;
    while (accumulator >= FRAME_MS && ticks < 2) {
        tick();
        accumulator -= FRAME_MS;
        ticks++;
    }
}

function tick() {
    if (state === 'menu') {
        drawMenu();
        return;
    }

    if (state === 'dead') {
        drawDeadScreen();
        return;
    }

    // ── playing ──────────────────────────────────────────
    drawBackground();

    clouds.forEach(c => { c.update(); c.draw(); });

    player.update();
    player.draw();

    if (OBSTACLES.length === 0) spawnObstacle();

    const pr = player.rect();
    for (let i = OBSTACLES.length - 1; i >= 0; i--) {
        const obs = OBSTACLES[i];
        obs.update();
        obs.draw();

        if (obs.gone()) {
            OBSTACLES.splice(i, 1);
            continue;
        }

        if (overlaps(pr, obs.rect())) {
            saveHighScore();
            state = 'dead';
            return;
        }
    }

    drawScore();
}

// ── KEY / TOUCH HANDLING FOR MENU & RESTART ──────────────────────────────────
window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
        if (state === 'playing' || state === 'dead') { state = 'menu'; clearKeys(); }
        return;
    }
    if (state === 'menu' || state === 'dead') initGame();
});

CANVAS.addEventListener('touchstart', e => {
    e.preventDefault();
    if (state === 'menu' || state === 'dead') { initGame(); return; }
    const relY = e.touches[0].clientY / window.innerHeight;
    if (relY < 0.5) KEYS['Space']     = true;
    else             KEYS['ArrowDown'] = true;
}, { passive: false });

CANVAS.addEventListener('touchend', e => {
    e.preventDefault();
    KEYS['Space']     = false;
    KEYS['ArrowDown'] = false;
}, { passive: false });

// ── BOOT ──────────────────────────────────────────────────────────────────────
(async function boot() {
    await Promise.all([loadAllImages(), loadFont()]);
    initMusic();
    document.getElementById('loading').style.display = 'none';
    state = 'menu';
    requestAnimationFrame(ts => { lastTime = ts; loop(ts); });
})();
