/* calendar.js — Monthly Calendar + Daily To-Dos + Weekly Goal */

let calYear, calMonth, selectedDate;

// ── Helpers (Logic remains same) ──────────────────────────────────────────────
function todayKey() {
    const d = new Date();
    return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}
function dateKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function weekKey(date) {
    const d = new Date(date);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - day);
    return `wk-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDayLabel(y, m, d) {
    return new Date(y, m, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function formatMonthYear(y, m) {
    return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getTodos(key) { return Storage.get(`todos-${key}`, []); }
function setTodos(key, todos) { Storage.set(`todos-${key}`, todos); }

function getDeadlineItems(key) {
    const items = [];
    const ideas = Storage.get('ideas', []);
    ideas.forEach(idea => {
        if (idea.deadline === key) {
            items.push({ label: `💡 ${idea.title}`, type: 'idea' });
        }
    });
    const bigGoals = Storage.get('bigGoals', []);
    bigGoals.forEach(goal => {
        (goal.subTasks || []).forEach(task => {
            if (task.deadline === key) {
                items.push({ label: `🎯 ${task.name}`, sublabel: goal.title, type: 'goal', done: task.done });
            }
        });
    });
    return items;
}

// ── Initialization ────────────────────────────────────────────────────────────
function initCalendar() {
    const now = new Date();
    calYear = calYear || now.getFullYear(); // Preserve if already set by sync
    calMonth = (calMonth !== undefined) ? calMonth : now.getMonth();
    selectedDate = selectedDate || todayKey();

    document.getElementById('calPrev')?.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCal(); });
    document.getElementById('calNext')?.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCal(); });

    document.getElementById('editWeeklyGoalBtn')?.addEventListener('click', openWeeklyEdit);
    document.getElementById('saveWeeklyGoalBtn')?.addEventListener('click', saveWeeklyGoal);
    document.getElementById('cancelWeeklyGoalBtn')?.addEventListener('click', closeWeeklyEdit);

    document.getElementById('addTodoBtn')?.addEventListener('click', addTodo);
    document.getElementById('todoInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

    document.getElementById('addWeeklyTaskBtn')?.addEventListener('click', addWeeklyTask);
    document.getElementById('weeklyTaskInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') addWeeklyTask(); });

    renderCal();
    renderWeeklyGoal();
    renderDayPanel(selectedDate);
}

// ── Render Functions (Global Scope - Pattern from diary.js) ──────────────────

function renderCal() {
    const grid = document.getElementById('calGrid');
    if (!grid) return;

    document.getElementById('calMonthYear').textContent = formatMonthYear(calYear, calMonth);
    grid.innerHTML = '';
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) { 
        const d = document.createElement('div'); 
        d.className = 'cal-day empty'; 
        grid.appendChild(d); 
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const key = dateKey(calYear, calMonth, day);
        const el = document.createElement('div');
        el.className = 'cal-day';
        if (calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate()) el.classList.add('today');
        if (key === selectedDate) el.classList.add('selected');

        const todos = getTodos(key);
        const deadlines = getDeadlineItems(key);
        const dots = document.createElement('div');
        dots.className = 'cal-day-dots';
        const keyDate = new Date(calYear, calMonth, day);
        const isPast = keyDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        todos.slice(0, 4).forEach(t => {
            const dot = document.createElement('div');
            dot.className = 'cal-dot';
            if (t.done) dot.classList.add('done');
            else if (isPast) dot.classList.add('missed');
            dots.appendChild(dot);
        });

        deadlines.slice(0, 3).forEach(d => {
            const dot = document.createElement('div');
            dot.className = 'cal-dot deadline' + (d.done ? ' done' : '');
            dots.appendChild(dot);
        });

        el.innerHTML = `<span class="cal-day-num">${day}</span>`;
        el.appendChild(dots);
        el.addEventListener('click', () => selectDay(key));
        grid.appendChild(el);
    }
}

function renderDayPanel(key) {
    const panel = document.getElementById('dayPanel');
    if (!panel) return;

    const [y, m, d] = key.split('-').map(Number);
    document.getElementById('dayPanelTitle').textContent = formatDayLabel(y, m - 1, d);
    renderDeadlineItems(key);
    renderTodos(key);
}

function renderTodos(key) {
    const list = document.getElementById('todoList');
    if (!list) return;
    const todos = getTodos(key);
    list.innerHTML = '';
    todos.forEach((todo, idx) => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.done ? ' done' : '');
        li.innerHTML = `
            <input type="checkbox" class="todo-check" ${todo.done ? 'checked' : ''} data-idx="${idx}">
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="todo-delete" data-idx="${idx}">✕</button>
        `;
        li.querySelector('.todo-check').addEventListener('change', e => toggleTodo(key, idx, e.target.checked));
        li.querySelector('.todo-delete').addEventListener('click', () => deleteTodo(key, idx));
        list.appendChild(li);
    });
}

function renderWeeklyGoal() {
    const goal = Storage.get(getWeekKey(), '');
    const display = document.getElementById('weeklyGoalDisplay');
    const dashDisplay = document.getElementById('dashWeeklyGoal');

    if (display) {
        display.textContent = goal || 'No weekly goal set yet. Click Edit! 🌟';
        display.style.fontStyle = goal ? 'normal' : 'italic';
        display.style.color = goal ? 'var(--text-dark)' : 'var(--text-light)';
    }
    
    if (dashDisplay) {
        dashDisplay.textContent = goal || 'No weekly goal set yet.';
    }
    
    renderWeeklyTasks();
}

function renderWeeklyTasks() {
    const list = document.getElementById('weeklyTaskList');
    if (!list) return;
    const tasks = getWeeklyTasks();
    list.innerHTML = '';
    if (!tasks.length) {
        list.innerHTML = '<li class="weekly-task-empty">No tasks yet — add your first one above! 🌱</li>';
        return;
    }
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'weekly-task-item' + (task.done ? ' done' : '');
        li.innerHTML = `
            <input type="checkbox" class="weekly-task-check" ${task.done ? 'checked' : ''}>
            <span class="weekly-task-text">${escapeHtml(task.text)}</span>
            <button class="weekly-task-delete">✕</button>
        `;
        li.querySelector('.weekly-task-check').addEventListener('change', e => toggleWeeklyTask(task.id, e.target.checked));
        li.querySelector('.weekly-task-delete').addEventListener('click', () => deleteWeeklyTask(task.id));
        list.appendChild(li);
    });
}

function renderDashTodos() {
    const key = todayKey();
    const todos = getTodos(key).slice(0, 5);
    const container = document.getElementById('dashTodos');
    if (!container) return;
    container.innerHTML = todos.length
        ? todos.map(t => `<div class="todo-mini-item${t.done ? ' done' : ''}"><span>${t.done ? '✅' : '⬜'}</span> ${escapeHtml(t.text)}</div>`).join('')
        : '<p class="empty-state" style="font-size:13px">No tasks today! Add from Calendar 📅</p>';
}

// ── Data Actions (Using Storage.set to trigger Cloud Sync) ─────────────────────
function selectDay(key) {
    selectedDate = key;
    renderCal();
    renderDayPanel(key);
    document.getElementById('dayPanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) return;
    const todos = getTodos(selectedDate);
    todos.push({ text, done: false, createdAt: Date.now() });
    setTodos(selectedDate, todos); // Calls Storage.set
    input.value = '';
    renderTodos(selectedDate);
    renderCal();
    if (typeof refreshDashboard === 'function') refreshDashboard();
}

function toggleTodo(key, idx, done) {
    const todos = getTodos(key);
    todos[idx].done = done;
    setTodos(key, todos);
    renderTodos(key);
    renderCal();
    if (typeof refreshDashboard === 'function') refreshDashboard();
}

function deleteTodo(key, idx) {
    const todos = getTodos(key);
    todos.splice(idx, 1);
    setTodos(key, todos);
    renderTodos(key);
    renderCal();
    if (typeof refreshDashboard === 'function') refreshDashboard();
}

// Weekly Actions
function getWeekKey() { return weekKey(new Date()); }
function openWeeklyEdit() {
    document.getElementById('weeklyGoalInput').value = Storage.get(getWeekKey(), '');
    document.getElementById('weeklyGoalInput').classList.remove('hidden');
    document.getElementById('weeklyGoalActions').classList.remove('hidden');
    document.getElementById('editWeeklyGoalBtn').classList.add('hidden');
    document.getElementById('weeklyGoalDisplay').classList.add('hidden');
}
function saveWeeklyGoal() {
    const val = document.getElementById('weeklyGoalInput').value.trim();
    Storage.set(getWeekKey(), val); // Cloud Sync
    renderWeeklyGoal();
    closeWeeklyEdit();
}
function closeWeeklyEdit() {
    document.getElementById('weeklyGoalInput').classList.add('hidden');
    document.getElementById('weeklyGoalActions').classList.add('hidden');
    document.getElementById('editWeeklyGoalBtn').classList.remove('hidden');
    document.getElementById('weeklyGoalDisplay').classList.remove('hidden');
}

function getWeeklyTasks() { return Storage.get(`wtasks-${getWeekKey()}`, []); }
function setWeeklyTasks(tasks) { Storage.set(`wtasks-${getWeekKey()}`, tasks); }

function addWeeklyTask() {
    const input = document.getElementById('weeklyTaskInput');
    const text = input.value.trim();
    if (!text) return;
    const tasks = getWeeklyTasks();
    tasks.push({ id: Date.now(), text, done: false });
    setWeeklyTasks(tasks);
    input.value = '';
    renderWeeklyTasks();
}

function toggleWeeklyTask(id, done) {
    const tasks = getWeeklyTasks();
    const t = tasks.find(t => t.id === id);
    if (t) t.done = done;
    setWeeklyTasks(tasks);
    renderWeeklyTasks();
}

function deleteWeeklyTask(id) {
    setWeeklyTasks(getWeeklyTasks().filter(t => t.id !== id));
    renderWeeklyTasks();
}
