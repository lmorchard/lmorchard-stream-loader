const BORDER = { w: 125, h: 80 };
const NUM_LAYERS = 2;
const COLOR_TIME_RANGE = { min: 750, max: 3000 };
const BAR_HEIGHT_RANGE = { min: 10, max: 100 };
const DY_RANGE = { min: 0.01, max: 0.1 };
const MAX_STATUS_TIME = 7 * 1000;

let content, canvas, ctx;
let updateTimer, lastUpdate, currStatusTime;
let particles = [];
let bgParticle;

let currTimer, maxTimer;

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  maxTimer = 1000 * (parseInt(urlParams.get("timer")) || 600);
  
  $$("title").innerHTML = urlParams.get("title") || "Now loading...";
  
  currTimer = 0;
  currStatusTime = 0;
  
  content = document.getElementById("content");
  canvas = document.getElementById("main");
  ctx = canvas.getContext("2d");
  resize();
  
  initParticles();
  pickStatusMessage();
  
  lastUpdate = Date.now();
  setTimeout(update, 16);
  window.requestAnimationFrame(draw);
  clean();
}

function update() {
  const currentUpdate = Date.now();
  const deltaT = currentUpdate - lastUpdate;
  lastUpdate = currentUpdate;

  currTimer += deltaT;
  particles.forEach(particle => updateParticle(particle, deltaT));

  updateStatusMessage(deltaT);
  
  updateTimer = setTimeout(update, 16);  
}

function draw() {
  resize();

  $$("timer").innerHTML = formatTimer(Math.max(0.0, maxTimer - currTimer));
  $$("statusMessage").style.opacity = `${Math.min(1.0, 0.1 + Math.abs(Math.sin(currTimer / 1000)))}`;
  
  bgParticle.h = canvas.height;

  content.style.marginLeft =
    content.style.marginRight = `${BORDER.w}px`;
  content.style.marginTop =
    content.style.marginBottom = `${BORDER.h}px`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = rgbCSS(c64Colors.black);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach(particle => drawParticle(particle, ctx));

  ctx.clearRect(BORDER.w, BORDER.h, canvas.width - BORDER.w * 2, canvas.height - BORDER.h * 2);
  
  window.requestAnimationFrame(draw); 
}

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function clean() {
  particles = particles.filter(particle => particle.live);
  setTimeout(clean, 1000);
}

function pickStatusMessage() {
  document.getElementById("statusMessage").innerHTML = pick(statusMessages);
}

function updateStatusMessage(deltaT) {
  currStatusTime += deltaT;
  if (currStatusTime >= MAX_STATUS_TIME) {
    currStatusTime = 0;
    pickStatusMessage();
  }
}

function initParticles() {
  bgParticle = createParticle({ direction: 0 });
  particles.push(bgParticle);

  for (let cnt = 0; cnt < NUM_LAYERS; cnt++) {
    let y = 0;
    let direction = 1;
    while (y < canvas.height) {
      direction = 0 - direction;
      const particle = createParticle({ direction });
      particle.y = y;
      y += particle.h;
      particles.push(particle);
    }  
  }
}

function createParticle({ direction = 1 }) {
  const p = {};

  p.live = true;
  p.direction = direction;
  p.prevColor = p.color = pickColor();
  p.nextColor = pickColor();
  p.maxColorTime = pickRange(COLOR_TIME_RANGE);
  p.colorTime = 0;
  p.y = 0;
  p.dy = direction * pickRange(DY_RANGE);
  p.h = pickRange(BAR_HEIGHT_RANGE);
  
  return p;
}

function spawnParticle(params) {
  const particle = createParticle(params);
  particle.y = particle.direction > 0
    ? 0 - particle.h
    : canvas.height + particle.h;
  particles.push(particle);
}

function updateParticle(particle, deltaT) {
  if (!particle.live) { return; }
  
  particle.colorTime += deltaT;  
  if (particle.colorTime >= particle.maxColorTime) {
    particle.colorTime = 0;
    particle.prevColor = particle.color = particle.nextColor;
    particle.nextColor = pickColor();
  }
  
  particle.y += particle.dy * deltaT;
  if (
    (particle.direction < 0 && particle.y <= 0 - particle.h) ||
    (particle.direction > 0 && particle.y >= canvas.height + particle.h)
  ) {
    spawnParticle({ direction: particle.direction });
    particle.live = false;
  }

  particle.color = lerpColor(
    particle.prevColor,
    particle.nextColor,
    particle.colorTime / particle.maxColorTime
  );
}

function drawParticle(particle, ctx) {
  if (!particle.live) { return; }
  ctx.fillStyle = rgbCSS(particle.color);
  ctx.fillRect(0, particle.y, canvas.width, particle.h);
}

const $$ = id => document.getElementById(id);

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const pickColor = () => pick(Object.values(c64Colors));

const pickRange = ({ min, max }) => min + Math.random() * (max - min);

const lerp = (v0, v1, t) => v0 * (1 - t) + v1 * t;

const lerpColor = (c0, c1, t) => ([
  lerp(c0[0], c1[0], t),
  lerp(c0[1], c1[1], t),
  lerp(c0[2], c1[2], t),
]);

const rgbCSS = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

const timerFactors = [ 1000, 60 * 1000, 60 * 60 * 1000 ];

const formatTimer = duration => {
  var milliseconds = parseInt((duration%1000)/100)
      , seconds = parseInt((duration/1000)%60)
      , minutes = parseInt((duration/(1000*60))%60)
      , hours = parseInt((duration/(1000*60*60))%24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;  
};

const c64Colors = Object
  .entries({
    // https://lospec.com/palette-list/commodore64
    black: "#000000",
    grey0: "#626262",
    grey1: "#898989",
    grey2: "#adadad",
    white: "#ffffff",
    red: "#9f4e44",
    pink: "#cb7e75",
    tan: "#6d5412",
    brown: "#a1683c",
    olive: "#c9d487",
    mint: "#9ae29b",
    green: "#5cab5e",
    teal: "#6abfc6",
    blue1: "#887ecb",
    blue0: "#50459b",
    purple: "#a057a3",
  })
  .reduce((acc, [ name, hex ]) => Object.assign({}, acc, {
    [name]: [
      parseInt(hex.substr(1, 2), 16),
      parseInt(hex.substr(3, 2), 16),
      parseInt(hex.substr(5, 2), 16),
    ]
  }), {});

const statusMessages = [
  "Brewing an espresso.",
  "Refilling my water bottle.",
  "Muting my phone.",
  "Petting a cat.",
  "Decrunching.",
  "Re-decrunching.",
  "Hyperventilating.",
  "Rehydrating.",
  "Dehydrating.",
  "Respawning.",
  "Reticulating splines.",
  "Scanning, taping, filing, instantly checking.",
  "Stopping all the downloading.",
  "Blowing on the cartridge.",
];

init();