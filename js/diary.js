/* diary.js — Daily Self-Reflection & Diary */
const MOODS = ['😊', '😄', '😌', '😢', '😤', '😴', '🥰', '😰'];

function initDiary() {
    const today = new Date();
    document.getElementById('diaryEntryDate').textContent =
        today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Mood buttons
    const moodOptions = document.getElementById('moodOptions');
    moodOptions.innerHTML = MOODS.map(m =>
        `<button class="mood-btn" data-mood="${m}" title="${m}">${m}</button>`
    ).join('');
    moodOptions.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            moodOptions.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    document.getElementById('saveDiaryBtn').addEventListener('click', saveDiaryEntry);
    document.getElementById('clearDiaryBtn').addEventListener('click', () => {
        document.getElementById('diaryText').value = '';
        document.getElementById('moodOptions').querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    });

    renderDiaryHistory();
}

function getDiaries() { return Storage.get('diaries', {}); }

function saveDiaryEntry() {
    const text = document.getElementById('diaryText').value.trim();
    const selectedMood = document.querySelector('.mood-btn.selected')?.dataset.mood || '';
    if (!text) return;

    const key = todayKey();
    const entries = getDiaries();

    // Each day stores an array of entries
    if (!Array.isArray(entries[key])) {
        // Migrate old single-object format to array if needed
        entries[key] = entries[key] ? [entries[key]] : [];
    }
    entries[key].push({ text, mood: selectedMood, savedAt: Date.now() });
    Storage.set('diaries', entries);

    // Clear the editor for the next entry
    document.getElementById('diaryText').value = '';
    document.getElementById('moodOptions').querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));

    renderDiaryHistory();

    // Brief save feedback
    const btn = document.getElementById('saveDiaryBtn');
    btn.textContent = 'Saved! 💕';
    setTimeout(() => { btn.textContent = 'Save Entry 💾'; }, 1500);
}

function deleteDiaryEntry(key, idx) {
    const entries = getDiaries();
    if (!entries[key]) return;
    // Normalise to array
    if (!Array.isArray(entries[key])) entries[key] = [entries[key]];
    entries[key].splice(idx, 1);
    if (entries[key].length === 0) delete entries[key];
    Storage.set('diaries', entries);
    renderDiaryHistory();
}

function renderDiaryHistory() {
    const container = document.getElementById('diaryHistory');
    const all = getDiaries();

    // Sort days newest first
    const keys = Object.keys(all).sort((a, b) => b.localeCompare(a));

    if (!keys.length) {
        container.innerHTML = '<p class="empty-state" style="font-size:13px">No entries yet. Start writing! 🌸</p>';
        return;
    }

    container.innerHTML = keys.map(key => {
        const [y, m, d] = key.split('-').map(Number);
        const dateStr = new Date(y, m - 1, d).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });

        // Normalise to array (handles old single-object data)
        let dayEntries = all[key];
        if (!Array.isArray(dayEntries)) dayEntries = [dayEntries];

        const rows = dayEntries.map((e, idx) => {
            const time = e.savedAt
                ? new Date(e.savedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '';
            const entryId = `diary-row-${key}-${idx}`;
            const mood = e.mood ? `<span class="diary-row-mood">${e.mood}</span>` : '';
            return `<div class="diary-entry-row" id="${entryId}" onclick="toggleDiaryRow('${entryId}', '${key}', ${idx})">
  <div class="diary-row-summary">
    <div class="diary-row-main">
      ${mood}<span class="diary-row-text">${escapeHtml(e.text)}</span>
    </div>
    <span class="diary-row-time">${time}</span>
  </div>
  <div class="diary-row-expanded" id="${entryId}-full" style="display:none">
    <div class="diary-row-full-text">${escapeHtml(e.text)}</div>
    <div class="diary-row-actions">
      <button class="btn-soft diary-entry-card-del" onclick="event.stopPropagation();deleteDiaryEntry('${key}', ${idx})">🗑️ Delete</button>
    </div>
  </div>
</div>`;
        }).join('');

        return `<div class="diary-day-group">
  <div class="diary-day-label">📅 ${dateStr}</div>
  ${rows}
</div>`;
    }).join('');
}

function toggleDiaryRow(entryId, key, idx) {
    const row = document.getElementById(entryId);
    const full = document.getElementById(entryId + '-full');
    if (!row || !full) return;
    const isOpen = full.style.display !== 'none';
    full.style.display = isOpen ? 'none' : 'block';
    row.classList.toggle('diary-row-open', !isOpen);
}
