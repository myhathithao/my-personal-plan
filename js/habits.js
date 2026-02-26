/* habits.js — Habit Tracker (Cloud-Sync Compatible) */

const HABIT_EMOJIS = ['🏃‍♀️', '💧', '📚', '😴', '🧘', '🥗', '✍️', '🎨', '🎵', '🌿', '🏋️', '🚴', '🛁', '💊', '🧹', '📖', '🌞', '🍎', '🌙', '☕', '🧠', '🫶', '✨', '💪'];

let habitMonth, habitYear;
let editingHabitId = null;
let selectedEmoji = '✨';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getHabits() { return Storage.get('habits', []); }
function habitDoneKey(hid, y, m, d) {
    return `h-${hid}-${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── Initialization ────────────────────────────────────────────────────────────
function initHabits() {
    const now = new Date();
    habitMonth = (habitMonth !== undefined) ? habitMonth : now.getMonth();
    habitYear = habitYear || now.getFullYear();

    if (Storage.get('habits') === null) Storage.set('habits', []);

    document.getElementById('addHabitBtn')?.addEventListener('click', () => openHabitModal());
    document.getElementById('saveNewHabitBtn')?.addEventListener('click', saveHabit);
    document.getElementById('cancelNewHabitBtn')?.addEventListener('click', closeHabitModal);
    
    document.getElementById('habitMonthPrev')?.addEventListener('click', () => {
        habitMonth--; if (habitMonth < 0) { habitMonth = 11; habitYear--; }
        renderHabitGrid(); renderHabitMonthLabel();
    });
    document.getElementById('habitMonthNext')?.addEventListener('click', () => {
        habitMonth++; if (habitMonth > 11) { habitMonth = 0; habitYear++; }
        renderHabitGrid(); renderHabitMonthLabel();
    });

    renderHabitChips();
    renderHabitGrid();
    renderHabitMonthLabel();
}

// ── Render Functions (Global Scope - Pattern from diary.js) ──────────────────

function renderHabitMonthLabel() {
    const label = document.getElementById('habitMonthLabel');
    if (!label) return;
    label.textContent = new Date(habitYear, habitMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function renderHabitChips() {
    const list = document.getElementById('habitList');
    if (!list) return; // Defensive check for page navigation
    
    const habits = getHabits();
    if (!habits.length) {
        list.innerHTML = '<p class="empty-state" style="font-size:13px">No habits yet! Click + New to add one 🌱</p>';
        return;
    }
    list.innerHTML = habits.map(h => `
    <div class="habit-chip">
      <div class="habit-chip-top">
        <span class="habit-chip-emoji">${h.emoji}</span>
        <span class="habit-chip-name">${escapeHtml(h.name)}</span>
        <div class="habit-chip-actions">
          <button class="habit-chip-edit" onclick="openHabitModal(${JSON.stringify(h).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
          <button class="habit-chip-del" onclick="deleteHabit(${h.id})" title="Remove">✕</button>
        </div>
      </div>
      ${h.details ? `<div class="habit-chip-details">${escapeHtml(h.details)}</div>` : ''}
    </div>
  `).join('');
}

function renderHabitGrid() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return; // Defensive check

    const habits = getHabits();
    const daysInMonth = new Date(habitYear, habitMonth + 1, 0).getDate();
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    grid.innerHTML = '';

    if (!habits.length) {
        grid.innerHTML = '<p class="empty-state" style="padding:12px;font-size:13px">Add habits on the left to start tracking! 📿</p>';
        return;
    }

    const table = document.createElement('div');
    table.className = 'habit-flipped-grid';
    table.style.gridTemplateColumns = `60px repeat(${habits.length}, minmax(48px,1fr))`;

    // Header row
    const cornerCell = document.createElement('div');
    cornerCell.className = 'hf-header-corner';
    cornerCell.textContent = 'Date';
    table.appendChild(cornerCell);

    habits.forEach(h => {
        const hd = document.createElement('div');
        hd.className = 'hf-habit-header';
        hd.title = h.name + (h.details ? '\n' + h.details : '');
        hd.innerHTML = `<span class="hf-header-emoji">${h.emoji}</span><span class="hf-header-name">${escapeHtml(h.name)}</span>`;
        table.appendChild(hd);
    });

    // Day rows
    for (let d = 1; d <= daysInMonth; d++) {
        const dateLabel = document.createElement('div');
        dateLabel.className = 'hf-date-label';
        const isToday = (habitYear === today.getFullYear() && habitMonth === today.getMonth() && d === today.getDate());
        if (isToday) dateLabel.classList.add('hf-today');
        dateLabel.textContent = d;
        table.appendChild(dateLabel);

        const cellDate = new Date(habitYear, habitMonth, d);
        const isFuture = cellDate > todayMidnight;

        habits.forEach(h => {
            const cell = document.createElement('div');
            cell.className = 'hf-cell';
            if (isFuture) { cell.classList.add('hf-future'); }

            const key = habitDoneKey(h.id, habitYear, habitMonth, d);
            const done = Storage.get(key, false);
            if (done) cell.classList.add('hf-checked');

            if (!isFuture) {
                cell.addEventListener('click', () => {
                    const cur = Storage.get(key, false);
                    Storage.set(key, !cur); // Cloud Sync
                    cell.classList.toggle('hf-checked', !cur);
                    renderDashHabits();
                });
            }
            table.appendChild(cell);
        });
    }
    grid.appendChild(table);
}

function renderDashHabits() {
    const container = document.getElementById('dashHabits');
    if (!container) return;
    
    const habits = getHabits();
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();

    if (!habits.length) {
        container.innerHTML = '<p class="empty-state" style="font-size:13px">No habits set. Go to Habits tab! 📿</p>';
        return;
    }
    container.innerHTML = habits.map(h => {
        const key = habitDoneKey(h.id, y, m, d);
        const done = Storage.get(key, false);
        return `
      <div class="habit-mini-item">
        <input type="checkbox" class="habit-mini-check" ${done ? 'checked' : ''} onchange="toggleDashHabit(${h.id}, this.checked)">
        <span>${h.emoji} ${escapeHtml(h.name)}</span>
        ${done ? '<span style="font-size:12px;color:var(--green-dark)">✓</span>' : ''}
      </div>`;
    }).join('');
}

// ── Data Actions (Using Storage.set to trigger Cloud Sync) ─────────────────────

function saveHabit() {
    const name = document.getElementById('newHabitName').value.trim();
    if (!name) return;
    const details = document.getElementById('newHabitDetails').value.trim();
    const habits = getHabits();

    if (editingHabitId !== null) {
        const idx = habits.findIndex(h => h.id === editingHabitId);
        if (idx > -1) { 
            habits[idx].name = name; 
            habits[idx].details = details; 
            habits[idx].emoji = selectedEmoji; 
        }
    } else {
        habits.push({ id: Date.now(), name, details, emoji: selectedEmoji });
    }
    
    Storage.set('habits', habits); // Cloud Sync
    closeHabitModal();
    renderHabitChips();
    renderHabitGrid();
    renderDashHabits();
}

function deleteHabit(id) {
    if (!confirm("Are you sure you want to remove this habit?")) return;
    Storage.set('habits', getHabits().filter(h => h.id !== id)); // Cloud Sync
    renderHabitChips();
    renderHabitGrid();
    renderDashHabits();
}

function toggleDashHabit(hid, done) {
    const now = new Date();
    const key = habitDoneKey(hid, now.getFullYear(), now.getMonth(), now.getDate());
    Storage.set(key, done); // Cloud Sync
    renderHabitGrid(); // Sync grid if user switches tabs
    renderDashHabits();
}

// ── Habit Modal & Emoji Picker (Internal Logic) ──────────────────────────────

function openHabitModal(habit = null) {
    editingHabitId = habit ? habit.id : null;
    const modal = document.getElementById('addHabitModal');
    if (!modal) return;
    
    document.getElementById('habitModalTitle').textContent = habit ? 'Edit Habit ✏️' : 'New Habit ✨';
    document.getElementById('newHabitName').value = habit ? habit.name : '';
    document.getElementById('newHabitDetails').value = habit ? (habit.details || '') : '';
    selectedEmoji = habit ? (habit.emoji || '✨') : '✨';
    
    renderEmojiPicker();
    modal.classList.remove('hidden');
    document.getElementById('newHabitName').focus();
}

function closeHabitModal() {
    document.getElementById('addHabitModal')?.classList.add('hidden');
    editingHabitId = null;
}

function renderEmojiPicker() {
    const grid = document.getElementById('emojiGrid');
    if (!grid) return;
    grid.innerHTML = HABIT_EMOJIS.map(e =>
        `<div class="emoji-opt${e === selectedEmoji ? ' selected' : ''}" data-e="${e}">${e}</div>`
    ).join('');
    grid.querySelectorAll('.emoji-opt').forEach(el => {
        el.addEventListener('click', () => {
            selectedEmoji = el.dataset.e;
            grid.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
            el.classList.add('selected');
        });
    });
}
