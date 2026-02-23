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

/* ── Task List ────────────────────────────────────────────── */
function getPomoTasks() {
    return Storage.get('pomoTasks', []);
}
function savePomoTasks(tasks) {
    Storage.set('pomoTasks', tasks);
}

function addPomoTask(text) {
    const tasks = getPomoTasks();
    tasks.push({ id: Date.now(), text, done: false });
    savePomoTasks(tasks);
    renderPomoTasks();
}

function togglePomoTask(id) {
    const tasks = getPomoTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = true;
    savePomoTasks(tasks);

    // Visually mark as done, then auto-remove after 1.2s
    const li = document.querySelector(`.pomo-task-item[data-id="${id}"]`);
    if (li) {
        li.classList.add('pomo-task-done');
        setTimeout(() => {
            deletePomoTask(id);
        }, 1200);
    }
}

function deletePomoTask(id) {
    const tasks = getPomoTasks().filter(t => t.id !== id);
    savePomoTasks(tasks);
    renderPomoTasks();
}

function renderPomoTasks() {
    const list = document.getElementById('pomoTaskList');
    if (!list) return;
    const tasks = getPomoTasks();

    if (!tasks.length) {
        list.innerHTML = '<li class="pomo-task-empty">No tasks yet. Add one above! 🌸</li>';
        return;
    }

    list.innerHTML = tasks.map(t => `
      <li class="pomo-task-item${t.done ? ' pomo-task-done' : ''}" data-id="${t.id}">
        <input type="checkbox" class="pomo-task-check" ${t.done ? 'checked' : ''}
          onchange="togglePomoTask(${t.id})" />
        <span class="pomo-task-text">${escapeHtml(t.text)}</span>
        <button class="pomo-task-delete" onclick="deletePomoTask(${t.id})" title="Remove">×</button>
      </li>
    `).join('');
}

/* ── Duration helpers ─────────────────────────────────────── */
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

/* ── Init ─────────────────────────────────────────────────── */
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
        if (d[pomoCurrentMode] > 1) {
            setPomoDuration(pomoCurrentMode, d[pomoCurrentMode] - 1);
            reloadDuration();
        }
    });
    document.getElementById('pomoDurPlus').addEventListener('click', () => {
        if (pomoRunning) return;
        const d = getPomoDurations();
        if (d[pomoCurrentMode] < 120) {
            setPomoDuration(pomoCurrentMode, d[pomoCurrentMode] + 1);
            reloadDuration();
        }
    });

    // Task input — Add on button click or Enter key
    const taskInput = document.getElementById('pomoTaskInput');
    const addBtn = document.getElementById('setPomoTaskBtn');

    addBtn.addEventListener('click', () => {
        const val = taskInput.value.trim();
        if (!val) return;
        addPomoTask(val);
        taskInput.value = '';
        taskInput.focus();
    });

    taskInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addBtn.click();
    });

    // Load session count
    const today = new Date().toLocaleDateString();
    document.getElementById('pomoCount').textContent = Storage.get('pomoSessions-' + today, 0);

    renderPomoTasks();
    renderPomoTimer();
    renderDurVal();
}

/* ── Timer ────────────────────────────────────────────────── */
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

/* ── Utility ──────────────────────────────────────────────── */
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
