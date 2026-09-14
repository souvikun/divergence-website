// --- Global State & Config ---
let metrics = [];
let divergence = 0.0;
let allMet = false;
let audioCtx = null;

// Default Data
const defaultMetrics = [
    { name: "Maths",      current: 0.0, target: 11.0, weight: 0.15 },
    { name: "Physics",    current: 0.0, target: 15.0, weight: 0.15 },
    { name: "Chemistry",  current: 0.0, target: 8.0,  weight: 0.10 },
    { name: "FEEE",       current: 0.0, target: 8.0,  weight: 0.15 },
    { name: "JELET PYQ",  current: 0.0, target: 5.0,  weight: 0.12 },
    { name: "WBJEE PYQ",  current: 0.0, target: 10.0, weight: 0.13 },
    { name: "Mock Tests", current: 0.0, target: 50.0, weight: 0.20 }
];

// --- Audio System (Glitch Sounds) ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playGlitchSound(intensity = 1) {
    if (!audioCtx) return;
    
    // Intensity 1 = fast tick, Intensity 2 = thick chunk
    const duration = intensity === 1 ? 0.02 : 0.06;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate raw white noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; 
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    // Add an envelope so it clicks instead of pops unpleasantly
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(intensity === 1 ? 0.1 : 0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    noise.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noise.start();
}

// --- Logic & Math ---
function loadData() {
    const stored = localStorage.getItem('fg204_metrics');
    if (stored) {
        metrics = JSON.parse(stored);
    } else {
        metrics = JSON.parse(JSON.stringify(defaultMetrics));
        saveData();
    }
    calculateDivergence();
}

function saveData() {
    localStorage.setItem('fg204_metrics', JSON.stringify(metrics));
}

function logShift(note) {
    let logs = JSON.parse(localStorage.getItem('fg204_logs') || '[]');
    const d = new Date();
    const ts = d.toISOString().replace('T', ' ').substring(0, 19);
    logs.push(`[${ts}] DIV: ${divergence.toFixed(6)}% | ${note}`);
    if (logs.length > 20) logs.shift(); // keep last 20
    localStorage.setItem('fg204_logs', JSON.stringify(logs));
}

function calculateDivergence() {
    let div = 0.0;
    allMet = true;
    metrics.forEach(m => {
        let ratio = Math.min(1.0, m.current / m.target);
        div += ratio * m.weight;
        if (m.current < m.target) allMet = false;
    });
    divergence = allMet ? 1.048596 : div;
}

function getDaysUntilApril30() {
    const now = new Date();
    let target = new Date(now.getFullYear(), 3, 30, 23, 59, 59); // Month is 0-indexed (3 = April)
    if (target < now) {
        target.setFullYear(now.getFullYear() + 1);
    }
    const diffTime = Math.abs(target - now);
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function getColor(t) {
    t = Math.max(0, Math.min(1, t));
    if (t < 0.33) return "#ff3333"; // Red
    if (t < 0.66) return "#ffaa00"; // Orange
    return "#00ff00"; // Green
}

// --- UI Rendering ---
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function bootSequence() {
    document.getElementById('init-screen').classList.add('hidden');
    const bootDiv = document.getElementById('boot-sequence');
    bootDiv.classList.remove('hidden');

    const lines = [
        "  >> FG-204 METER // PROTOTYPE v3.0",
        "  >> INIT REV. 7 HARDWARE BRIDGE...",
        "  >> CALIBRATING STEINER INTERFACE.",
        "  >> SYNCING D-MAIL BUFFER.........",
        "  >> READING ATTRACTOR SENSORS.....",
        "  >> LOCKING OBSERVER WORLDLINE"
    ];

    for (let line of lines) {
        let p = document.createElement('div');
        p.className = 'boot-line';
        bootDiv.appendChild(p);
        
        for (let char of line) {
            p.innerHTML += char;
            await sleep(10);
        }
        playGlitchSound(1);
        await sleep(150);
    }
    
    let ok = document.createElement('span');
    ok.className = 'boot-ok';
    ok.innerText = " [OK]";
    bootDiv.lastChild.appendChild(ok);
    playGlitchSound(2);
    
    await sleep(600);
    bootDiv.classList.add('hidden');
    startNixieAnimation();
}

async function startNixieAnimation() {
    document.getElementById('dashboard').classList.remove('hidden');
    renderMetrics(0, false); // Render empty metrics

    const targetStr = divergence.toFixed(6);
    const nixieDiv = document.getElementById('nixie-display');
    const totalFrames = 50;

    // Build digit divs
    nixieDiv.innerHTML = '';
    const digitDivs = [];
    for (let i = 0; i < targetStr.length; i++) {
        let d = document.createElement('div');
        d.className = 'nixie-digit';
        nixieDiv.appendChild(d);
        digitDivs.push(d);
    }

    for (let frame = 0; frame < totalFrames; frame++) {
        let lockEvent = false;
        let glitchActive = false;

        for (let i = 0; i < targetStr.length; i++) {
            const char = targetStr[i];
            const div = digitDivs[i];
            
            if (char === '.') {
                div.innerText = '.';
                div.className = 'nixie-digit state-1';
                continue;
            }

            let lockFrame = 12 + (i * 5);
            let state = 0;
            let displayChar = Math.floor(Math.random() * 10);

            if (frame < lockFrame - 6) {
                state = Math.random() > 0.6 ? 3 : 0;
            } else if (frame < lockFrame) {
                state = 3;
            } else if (frame === lockFrame || frame === lockFrame + 1) {
                displayChar = char;
                state = 2; // Flash
            } else {
                displayChar = char;
                state = 1; // Locked
            }

            if (frame === lockFrame) lockEvent = true;
            if (state === 3) glitchActive = true;

            // Global dim flicker
            if (Math.random() < 0.08 && frame < totalFrames - 10) {
                if (state === 1 || state === 3) state = 0;
            }

            div.innerText = displayChar;
            div.className = `nixie-digit state-${state}`;
        }

        // Audio Triggers
        if (lockEvent) {
            playGlitchSound(2);
        } else if (glitchActive && Math.random() < 0.3) {
            playGlitchSound(1);
        }

        // Surge progress bar
        let revealPct = (divergence * (frame / totalFrames)) * 100;
        updateProgressBar(revealPct);

        // Frame pacing
        let delay = 16;
        if (frame > totalFrames * 0.4) delay = 25;
        if (frame > totalFrames * 0.7) delay = 40;
        
        await sleep(delay);
    }

    // Final Setup
    document.getElementById('status-text').innerText = allMet ? "STEINS GATE LOCKED" : (divergence < 0.5 ? "ALPHA - HIGH RESISTANCE" : "BETA - CONVERGING");
    document.getElementById('status-text').style.color = getColor(divergence);
    
    const daysLeft = getDaysUntilApril30();
    document.getElementById('field-name').innerText = divergence < 0.5 ? "Alpha" : "Beta";
    document.getElementById('field-name').style.color = divergence < 0.5 ? "#ff3333" : "#ffcc00";
    document.getElementById('deadline-text').innerHTML = `<span style="color: ${daysLeft > 21 ? '#0f0' : '#f00'}">${daysLeft} days</span> until April 30`;

    renderMetrics(daysLeft, true);
}

function updateProgressBar(pct) {
    const bar = document.getElementById('overall-bar');
    const text = document.getElementById('overall-pct');
    pct = Math.min(100, Math.max(0, pct));
    bar.style.width = `${pct}%`;
    bar.style.backgroundColor = getColor(pct / 100);
    text.innerText = pct.toFixed(1);
}

function renderMetrics(daysLeft, final) {
    const list = document.getElementById('metrics-list');
    list.innerHTML = '';

    metrics.forEach((m, idx) => {
        let pct = Math.min(1.0, m.current / m.target);
        let rem = Math.max(0, m.target - m.current);
        let perDay = daysLeft > 0 ? (rem / daysLeft) : 0;
        let color = getColor(pct);

        let row = document.createElement('div');
        row.className = 'metric-row';
        
        let rateHtml = final ? (rem > 0 ? `<span style="color:${perDay > 1 ? '#f00' : '#ff0'}">${perDay.toFixed(2)}/d</span>` : `<span style="color:#0f0">OK</span>`) : '...';

        row.innerHTML = `
            <div class="m-idx">[${idx + 1}]</div>
            <div class="m-name">${m.name}</div>
            <div class="m-frac" style="color: ${final ? color : '#666'}">${final ? m.current + '/' + m.target : '---'}</div>
            <div class="m-mini-bar">
                <div class="m-mini-fill" style="width: ${final ? pct * 100 : 0}%; background-color: ${color}"></div>
            </div>
            <div class="m-rate">(${rateHtml})</div>
        `;
        list.appendChild(row);
    });
}

// --- Interactivity ---
function openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('update-btn').addEventListener('click', () => {
    let options = metrics.map((m, i) => `<option value="${i}">${m.name} (Cur: ${m.current})</option>`).join('');
    openModal(`
        <h3 style="color:var(--text-cyan); margin-top:0;">Update Worldline</h3>
        <select id="metric-select" style="width:100%; background:#000; color:#fff; border:1px solid #55aaff; padding:5px;">
            ${options}
        </select>
        <input type="number" id="metric-val" step="0.1" placeholder="Enter new total value...">
        <div class="modal-btns">
            <button onclick="closeModal()" style="color:#f00">[X] Cancel</button>
            <button onclick="commitUpdate()" style="color:#0f0">[&gt;] Commit Shift</button>
        </div>
    `);
});

window.commitUpdate = function() {
    const idx = document.getElementById('metric-select').value;
    const val = parseFloat(document.getElementById('metric-val').value);
    
    if (!isNaN(val) && val >= 0) {
        const old = metrics[idx].current;
        metrics[idx].current = val;
        saveData();
        calculateDivergence();
        logShift(`${metrics[idx].name} updated: ${old} -> ${val}`);
        closeModal();
        playGlitchSound(2);
        
        // Quick flicker re-render
        document.getElementById('dashboard').classList.add('hidden');
        startNixieAnimation();
    }
}

document.getElementById('log-btn').addEventListener('click', () => {
    let logs = JSON.parse(localStorage.getItem('fg204_logs') || '[]');
    let logHtml = logs.length === 0 ? '<p class="muted">No shifts recorded yet.</p>' : 
                  logs.reverse().map(l => `<div class="log-entry">${l}</div>`).join('');
    
    openModal(`
        <h3 style="color:var(--text-cyan); margin-top:0;">Worldline History</h3>
        <div style="max-height: 250px; overflow-y: auto;">${logHtml}</div>
        <div class="modal-btns" style="justify-content:center;">
            <button onclick="closeModal()">[X] Close</button>
        </div>
    `);
});

// Init Event
document.getElementById('boot-btn').addEventListener('click', () => {
    initAudio(); 
    bootSequence();
});

// Load on start
loadData();
