/* diary.js — Daily Self-Reflection & Diary */
const MOODS = ['😊', '😄', '😌', '😢', '😤', '😴', '🥰', '😰'];

let currentDiaryDate;

function initDiary() {
    currentDiaryDate = todayKey();
    document.getElementById('diaryEntryDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

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

    // Load today's existing entry
    loadDiaryEntry(currentDiaryDate);

    document.getElementById('saveDiaryBtn').addEventListener('click', saveDiaryEntry);
    document.getElementById('clearDiaryBtn').addEventListener('click', () => {
        document.getElementById('diaryText').value = '';
        document.getElementById('moodOptions').querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    });

    renderDiaryHistory();
}

function getDiaries() { return Storage.get('diaries', {}); }

function loadDiaryEntry(key) {
    const entries = getDiaries();
    const entry = entries[key];
    if (entry) {
        document.getElementById('diaryText').value = entry.text || '';
        document.querySelectorAll('.mood-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.mood === entry.mood);
        });
    } else {
        document.getElementById('diaryText').value = '';
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    }
}

function saveDiaryEntry() {
    const text = document.getElementById('diaryText').value.trim();
    const selectedMood = document.querySelector('.mood-btn.selected')?.dataset.mood || '';
    if (!text) return;
    const entries = getDiaries();
    entries[currentDiaryDate] = { text, mood: selectedMood, savedAt: Date.now() };
    Storage.set('diaries', entries);
    renderDiaryHistory();

    // Brief save feedback
    const btn = document.getElementById('saveDiaryBtn');
    btn.textContent = 'Saved! 💕';
    setTimeout(() => { btn.textContent = 'Save Entry 💾'; }, 1500);
}

function renderDiaryHistory() {
    const container = document.getElementById('diaryHistory');
    const entries = getDiaries();
    const keys = Object.keys(entries).sort((a, b) => b.localeCompare(a));
    if (!keys.length) {
        container.innerHTML = '<p class="empty-state" style="font-size:13px">No entries yet. Start writing! 🌸</p>';
        return;
    }
    container.innerHTML = keys.map(key => {
        const e = entries[key];
        const [y, m, d] = key.split('-').map(Number);
        const dateStr = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const preview = e.text.slice(0, 80) + (e.text.length > 80 ? '…' : '');
        return `<div class="diary-entry-card" onclick="openDiaryEntry('${key}')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span class="diary-entry-card-date">${dateStr}</span>
        <span class="diary-entry-card-mood">${e.mood || ''}</span>
      </div>
      <div class="diary-entry-card-preview">${escapeHtml(preview)}</div>
    </div>`;
    }).join('');
}

function openDiaryEntry(key) {
    currentDiaryDate = key;
    const [y, m, d] = key.split('-').map(Number);
    document.getElementById('diaryEntryDate').textContent =
        new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    loadDiaryEntry(key);
}
