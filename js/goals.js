/* goals.js — Year Goal & Season Goals */
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

function initGoals() {
    // ---- Year Goal ----
    const yearDisplay = document.getElementById('yearGoalDisplay');
    const yearInput = document.getElementById('yearGoalInput');
    const editBtn = document.getElementById('editYearGoalBtn');
    const saveBtn = document.getElementById('saveYearGoalBtn');
    const cancelBtn = document.getElementById('cancelYearGoalBtn');
    const actionsDiv = document.getElementById('yearGoalActions');

    function renderYearGoal() {
        const goal = Storage.get('yearGoal', '');
        yearDisplay.innerHTML = goal
            ? `<p style="font-size:16px;line-height:1.6;color:var(--text-dark)">${escapeHtml(goal)}</p>`
            : '<p class="empty-state">Click Edit to set your big goal for 2026! 🎉</p>';
    }
    renderYearGoal();

    editBtn.addEventListener('click', () => {
        yearInput.value = Storage.get('yearGoal', '');
        yearInput.classList.remove('hidden');
        actionsDiv.classList.remove('hidden');
        editBtn.classList.add('hidden');
        yearDisplay.classList.add('hidden');
        yearInput.focus();
    });

    function cancelYearEdit() {
        yearInput.classList.add('hidden');
        actionsDiv.classList.add('hidden');
        editBtn.classList.remove('hidden');
        yearDisplay.classList.remove('hidden');
    }

    saveBtn.addEventListener('click', () => {
        Storage.set('yearGoal', yearInput.value.trim());
        renderYearGoal();
        cancelYearEdit();
    });
    cancelBtn.addEventListener('click', cancelYearEdit);

    // ---- Season Goals ----
    const modal = document.getElementById('seasonModal');
    const modalTitle = document.getElementById('seasonModalTitle');
    const seasonInput = document.getElementById('seasonGoalInput');
    const saveSeasonBtn = document.getElementById('saveSeasonGoalBtn');
    const cancelSeasonBtn = document.getElementById('cancelSeasonGoalBtn');
    let editingSeason = null;

    function renderSeasonGoals() {
        document.querySelectorAll('.season-goal-display').forEach(el => {
            const idx = parseInt(el.dataset.season);
            const goals = Storage.get('seasonGoals', ['', '', '', '']);
            el.textContent = goals[idx] || 'No goal set yet.';
            el.style.color = goals[idx] ? 'var(--text-dark)' : 'var(--text-light)';
            el.style.fontStyle = goals[idx] ? 'normal' : 'italic';
        });
    }
    renderSeasonGoals();

    document.querySelectorAll('.season-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            editingSeason = parseInt(btn.closest('.season-card').dataset.season);
            const goals = Storage.get('seasonGoals', ['', '', '', '']);
            modalTitle.textContent = `Edit ${SEASONS[editingSeason]} Goal 🌿`;
            seasonInput.value = goals[editingSeason] || '';
            modal.classList.remove('hidden');
            seasonInput.focus();
        });
    });

    saveSeasonBtn.addEventListener('click', () => {
        if (editingSeason === null) return;
        Storage.update('seasonGoals', ['', '', '', ''], goals => {
            goals[editingSeason] = seasonInput.value.trim();
            return goals;
        });
        renderSeasonGoals();
        modal.classList.add('hidden');
        editingSeason = null;
    });
    cancelSeasonBtn.addEventListener('click', () => { modal.classList.add('hidden'); editingSeason = null; });
    modal.addEventListener('click', e => { if (e.target === modal) { modal.classList.add('hidden'); editingSeason = null; } });
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
