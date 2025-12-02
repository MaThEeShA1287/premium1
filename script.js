const audio = document.getElementById('audio');
const fileInput = document.getElementById('audioFile');
const trackName = document.getElementById('trackName');
const albumArt = document.getElementById('albumArt');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const timeline = document.getElementById('timeline');
const progress = document.getElementById('progress');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const spectrumButtons = document.querySelectorAll('.spectrum-selector button');

let spectrumType = 'bar';
spectrumButtons.forEach(btn => btn.addEventListener('click', () => spectrumType = btn.dataset.type));

// Handle audio file selection
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  audio.src = url;
  trackName.textContent = file.name;
  albumArt.src = 'https://via.placeholder.com/120x120.png?text=🎵';
});

// Timeline click
timeline.addEventListener('click', e => {
  const rect = timeline.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
});

// Canvas resize
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Audio context setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioCtx.destination);

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Particles setup
const particles = [];
for(let i=0;i<150;i++){
  particles.push({
    x: Math.random()*canvas.width,
    y: Math.random()*canvas.height,
    size: Math.random()*3+1,
    color: `hsl(${Math.random()*360}, 100%, 50%)`,
    speed: Math.random()*1+0.5
  });
}

// Draw visualizer
function draw() {
  requestAnimationFrame(draw);
  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const width = canvas.width;
  const height = canvas.height;

  if(spectrumType==='bar'){
    const barWidth = width / bufferLength*2.5;
    let x=0;
    for(let i=0;i<bufferLength;i++){
      const barHeight = dataArray[i]*1.5;
      ctx.fillStyle = `hsl(${i*2 + performance.now()/20},100%,50%)`;
      ctx.fillRect(x, height-barHeight, barWidth, barHeight);
      x+=barWidth+1;
    }
  } else if(spectrumType==='line'){
    ctx.beginPath();
    const sliceWidth = width/bufferLength;
    let x=0;
    for(let i=0;i<bufferLength;i++){
      const y = height - (dataArray[i]/255)*height;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      x+=sliceWidth;
    }
    ctx.strokeStyle = 'hsl('+performance.now()/10+',100%,50%)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if(spectrumType==='radial'){
    const radius = 100;
    const centerX = width/2;
    const centerY = height/2;
    for(let i=0;i<bufferLength;i++){
      const angle = (i/bufferLength)*2*Math.PI;
      const barHeight = dataArray[i]*0.8;
      const x1=centerX + Math.cos(angle)*radius;
      const y1=centerY + Math.sin(angle)*radius;
      const x2=centerX + Math.cos(angle)*(radius+barHeight);
      const y2=centerY + Math.sin(angle)*(radius+barHeight);
      ctx.strokeStyle = `hsl(${i*3},100%,50%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    }
  } else if(spectrumType==='circle'){
    const centerX = width/2;
    const centerY = height/2;
    const radius = 50;
    for(let i=0;i<bufferLength;i++){
      const angle = i/bufferLength*2*Math.PI;
      const barHeight = dataArray[i]*1.2;
      ctx.strokeStyle = `hsl(${i*4},100%,50%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle)*radius, centerY + Math.sin(angle)*radius);
      ctx.lineTo(centerX + Math.cos(angle)*(radius+barHeight), centerY + Math.sin(angle)*(radius+barHeight));
      ctx.stroke();
    }
  } else if(spectrumType==='particles'){
    particles.forEach(p => {
      const freq = dataArray[Math.floor(Math.random()*bufferLength)];
      const size = p.size + freq/200;
      ctx.beginPath();
      ctx.arc(p.x,p.y,size,0,Math.PI*2);
      ctx.fillStyle=p.color;
      ctx.fill();
      p.y -= p.speed + freq/200;
      if(p.y<0) p.y=height;
    });
  }
}

// Update time & progress
audio.addEventListener('timeupdate', ()=>{
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
  const percent = (audio.currentTime/audio.duration)*100;
  progress.style.width = percent+'%';
});

function formatTime(sec){
  if(isNaN(sec)) return '00:00';
  const m=Math.floor(sec/60).toString().padStart(2,'0');
  const s=Math.floor(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

audio.addEventListener('play', ()=>{
  audioCtx.resume();
  draw();
});
// Custom Controls
const playPauseBtn = document.getElementById('playPause');
const stopBtn = document.getElementById('stop');
const rewindBtn = document.getElementById('rewind');
const forwardBtn = document.getElementById('forward');
const volumeSlider = document.getElementById('volume');

playPauseBtn.addEventListener('click', () => {
  if(audio.paused){
    audio.play();
    playPauseBtn.textContent = '⏸️';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶️';
  }
});

stopBtn.addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  playPauseBtn.textContent = '▶️';
});

rewindBtn.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10); // back 10s
});

forwardBtn.addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); // forward 10s
});

volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value;
});
