/* reminders.js — Missed tasks detector */
function initReminders() {
    renderMissedTasks();
}

function getMissedTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const missed = [];

    // Scan last 30 days
    for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        const todos = getTodos(key);
        const undone = todos.filter(t => !t.done);
        undone.forEach(t => {
            missed.push({
                text: t.text,
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                key
            });
        });
        if (missed.length >= 8) break; // cap at 8
    }
    return missed;
}

function renderMissedTasks() {
    const container = document.getElementById('dashMissed');
    if (!container) return;
    const missed = getMissedTasks();
    if (!missed.length) {
        container.innerHTML = '<p class="empty-state" style="font-size:13px;color:var(--green-dark)">Nothing missed! You\'re on top of it 🎉</p>';
        return;
    }
    container.innerHTML = missed.slice(0, 5).map(m => `
    <div class="missed-item">
      <div class="missed-item-date">${m.date}</div>
      <div>📌 ${escapeHtml(m.text)}</div>
    </div>
  `).join('');
    if (missed.length > 5) {
        container.innerHTML += `<p style="font-size:12px;color:var(--text-light);margin-top:6px">...and ${missed.length - 5} more. Check your calendar!</p>`;
    }
}
