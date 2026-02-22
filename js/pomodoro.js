/* pomodoro.js — Focus Timer with editable durations per mode */
const POMO_DEFAULTS = {
    work: { label: 'Focus Time', minutes: 25, color: 'var(--pink)' },
    short: { label: 'Short Break', minutes: 5, color: 'var(--green)' },
    long: { label: 'Long Break', minutes: 15, color: 'var(--green-dark)' },
};
const RING_CIRCUMFERENCE = 2 * Math.PI * 90; // 565.5

let pomoCurrentMode = 'work';
let pomoInterval = null;
let pomoRunning = false;
let pomoTimeLeft = 0;
let pomoTotalTime = 0;

// Load or init custom durations
function getPomoDurations() {
    return Storage.get('pomoDurations', {
        work: 25, short: 5, long: 15
    });
}
function setPomoDuration(mode, mins) {
    const d = getPomoDurations();
    d[mode] = mins;
    Storage.set('pomoDurations', d);
}

function initPomodoro() {
    const durations = getPomoDurations();
    pomoTimeLeft = durations[pomoCurrentMode] * 60;
    pomoTotalTime = pomoTimeLeft;

    document.querySelectorAll('.pomo-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            if (pomoRunning) return;
            switchPomoMode(tab.dataset.mode);
        });
    });

    document.getElementById('pomoStart').addEventListener('click', startPomo);
    document.getElementById('pomoPause').addEventListener('click', pausePomo);
    document.getElementById('pomoReset').addEventListener('click', resetPomo);

    // +/- duration buttons
    document.getElementById('pomoDurMinus').addEventListener('click', () => {
        if (pomoRunning) return;
        const d = getPomoDurations();
        const min = 1;
        if (d[pomoCurrentMode] > min) {
            setPomoDuration(pomoCurrentMode, d[pomoCurrentMode] - 1);
            reloadDuration();
        }
    });
    document.getElementById('pomoDurPlus').addEventListener('click', () => {
        if (pomoRunning) return;
        const d = getPomoDurations();
        const max = 120;
        if (d[pomoCurrentMode] < max) {
            setPomoDuration(pomoCurrentMode, d[pomoCurrentMode] + 1);
            reloadDuration();
        }
    });

    document.getElementById('setPomoTaskBtn').addEventListener('click', () => {
        const val = document.getElementById('pomoTaskInput').value.trim();
        if (!val) return;
        document.getElementById('pomoFocusDisplay').textContent = '🎯 ' + val;
        document.getElementById('pomoTaskInput').value = '';
    });

    // Load session count
    const today = new Date().toLocaleDateString();
    document.getElementById('pomoCount').textContent = Storage.get('pomoSessions-' + today, 0);

    renderPomoTimer();
    renderDurVal();
}

function reloadDuration() {
    const d = getPomoDurations();
    pomoTimeLeft = d[pomoCurrentMode] * 60;
    pomoTotalTime = pomoTimeLeft;
    renderPomoTimer();
    renderDurVal();
}

function renderDurVal() {
    const d = getPomoDurations();
    document.getElementById('pomoDurVal').textContent = d[pomoCurrentMode];
}

function startPomo() {
    if (pomoRunning) return;
    pomoRunning = true;
    pomoInterval = setInterval(() => {
        if (pomoTimeLeft <= 0) {
            clearInterval(pomoInterval);
            pomoRunning = false;
            onPomoComplete();
            return;
        }
        pomoTimeLeft--;
        renderPomoTimer();
    }, 1000);
}

function pausePomo() {
    clearInterval(pomoInterval);
    pomoRunning = false;
}

function resetPomo() {
    pausePomo();
    reloadDuration();
}

function onPomoComplete() {
    if (pomoCurrentMode === 'work') {
        const today = new Date().toLocaleDateString();
        const key = 'pomoSessions-' + today;
        const count = Storage.get(key, 0) + 1;
        Storage.set(key, count);
        document.getElementById('pomoCount').textContent = count;
    }
    const sessions = Storage.get('pomoSessions-' + new Date().toLocaleDateString(), 0);
    const nextMode = pomoCurrentMode === 'work'
        ? (sessions % 4 === 0 ? 'long' : 'short')
        : 'work';
    switchPomoMode(nextMode);
    try {
        const msg = pomoCurrentMode === 'work' ? '🍅 Focus done! Time for a break.' : '☕ Break over! Back to work!';
        if (Notification.permission === 'granted') new Notification('My Year Planner', { body: msg });
    } catch { }
}

function switchPomoMode(mode) {
    pomoCurrentMode = mode;
    document.querySelectorAll('.pomo-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.mode === mode);
    });
    reloadDuration();
}

function renderPomoTimer() {
    const mins = String(Math.floor(pomoTimeLeft / 60)).padStart(2, '0');
    const secs = String(pomoTimeLeft % 60).padStart(2, '0');
    document.getElementById('pomoTime').textContent = `${mins}:${secs}`;
    document.getElementById('pomoLabel').textContent = POMO_DEFAULTS[pomoCurrentMode].label;

    const progress = pomoTotalTime > 0 ? pomoTimeLeft / pomoTotalTime : 1;
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    const ring = document.getElementById('pomoRingProgress');
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = POMO_DEFAULTS[pomoCurrentMode].color;
}
