/* stats.js — Goal Progress Tracker (Big Goal → Sub-tasks → Deadlines → Completion %) */

let editingBigGoalId = null;
let editingSubTaskGoalId = null;

function initStats() {
    document.getElementById('addBigGoalBtn').addEventListener('click', () => openBigGoalModal());
    document.getElementById('saveBigGoalBtn').addEventListener('click', saveBigGoal);
    document.getElementById('cancelBigGoalBtn').addEventListener('click', () => document.getElementById('bigGoalModal').classList.add('hidden'));
    document.getElementById('saveSubTaskBtn').addEventListener('click', saveSubTask);
    document.getElementById('cancelSubTaskBtn').addEventListener('click', () => document.getElementById('subTaskModal').classList.add('hidden'));
    renderBigGoals();
}

function getBigGoals() { return Storage.get('bigGoals', []); }
function setBigGoals(goals) { Storage.set('bigGoals', goals); }

function openBigGoalModal(goalId = null) {
    editingBigGoalId = goalId;
    const modal = document.getElementById('bigGoalModal');
    const titleInput = document.getElementById('bigGoalTitle');
    if (goalId !== null) {
        const goal = getBigGoals().find(g => g.id === goalId);
        titleInput.value = goal ? goal.title : '';
        document.getElementById('bigGoalModalTitle').textContent = 'Edit Goal ✏️';
    } else {
        titleInput.value = '';
        document.getElementById('bigGoalModalTitle').textContent = 'New Big Goal 🎯';
    }
    modal.classList.remove('hidden');
    titleInput.focus();
}

function saveBigGoal() {
    const title = document.getElementById('bigGoalTitle').value.trim();
    if (!title) return;
    const goals = getBigGoals();
    if (editingBigGoalId !== null) {
        const idx = goals.findIndex(g => g.id === editingBigGoalId);
        if (idx > -1) goals[idx].title = title;
    } else {
        goals.push({ id: Date.now(), title, subTasks: [] });
    }
    setBigGoals(goals);
    document.getElementById('bigGoalModal').classList.add('hidden');
    editingBigGoalId = null;
    renderBigGoals();
}

function deleteBigGoal(id) {
    if (!confirm('Delete this goal and all its sub-tasks?')) return;
    setBigGoals(getBigGoals().filter(g => g.id !== id));
    renderBigGoals();
}

function openSubTaskModal(goalId) {
    editingSubTaskGoalId = goalId;
    document.getElementById('subTaskName').value = '';
    document.getElementById('subTaskDeadline').value = '';
    document.getElementById('subTaskModal').classList.remove('hidden');
    document.getElementById('subTaskName').focus();
}

function saveSubTask() {
    const name = document.getElementById('subTaskName').value.trim();
    if (!name) return;
    const deadline = document.getElementById('subTaskDeadline').value;
    const goals = getBigGoals();
    const goal = goals.find(g => g.id === editingSubTaskGoalId);
    if (!goal) return;
    goal.subTasks.push({ id: Date.now(), name, deadline, done: false });
    setBigGoals(goals);
    document.getElementById('subTaskModal').classList.add('hidden');
    editingSubTaskGoalId = null;
    renderBigGoals();
}

function toggleSubTask(goalId, taskId, done) {
    const goals = getBigGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const task = goal.subTasks.find(t => t.id === taskId);
    if (task) task.done = done;
    setBigGoals(goals);
    renderBigGoals();
}

function deleteSubTask(goalId, taskId) {
    const goals = getBigGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    goal.subTasks = goal.subTasks.filter(t => t.id !== taskId);
    setBigGoals(goals);
    renderBigGoals();
}

function getDeadlineClass(deadlineStr) {
    if (!deadlineStr) return '';
    const [y, m, d] = deadlineStr.split('-').map(Number);
    const dl = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dl < today ? 'deadline-overdue' : '';
}

function formatDeadline(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderBigGoals() {
    const list = document.getElementById('bigGoalsList');
    const goals = getBigGoals();

    if (!goals.length) {
        list.innerHTML = '<p class="empty-state" style="padding:16px">No big goals yet! Add your first one above 🎯</p>';
        return;
    }

    list.innerHTML = goals.map(goal => {
        const total = goal.subTasks.length;
        const done = goal.subTasks.filter(t => t.done).length;
        const pct = total ? Math.round((done / total) * 100) : 0;

        const subtasksHtml = total
            ? `<table class="subtasks-table">
          <thead>
            <tr>
              <th style="width:28px">✓</th>
              <th>Task</th>
              <th>Deadline</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody>
            ${goal.subTasks.map(task => `
              <tr class="${task.done ? 'subtask-done' : ''}">
                <td><input type="checkbox" class="subtask-check" ${task.done ? 'checked' : ''} onchange="toggleSubTask(${goal.id}, ${task.id}, this.checked)"></td>
                <td class="subtask-name">${escapeHtml(task.name)}</td>
                <td><span class="deadline-badge ${getDeadlineClass(task.deadline)}">${formatDeadline(task.deadline)}</span></td>
                <td><button class="btn-danger" style="padding:3px 8px;font-size:12px" onclick="deleteSubTask(${goal.id}, ${task.id})">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
            : '<p class="empty-state" style="font-size:13px;padding:8px 0">No sub-tasks yet. Add your first step below! 🌱</p>';

        return `
      <div class="big-goal-block">
        <div class="big-goal-header">
          <span class="big-goal-title">🎯 ${escapeHtml(goal.title)}</span>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="progress-pct">${pct}%</span>
          <button class="btn-soft" style="padding:6px 12px;font-size:12px" onclick="openBigGoalModal(${goal.id})">Edit</button>
          <button class="btn-danger" onclick="deleteBigGoal(${goal.id})">Delete</button>
        </div>
        ${subtasksHtml}
        <div class="big-goal-actions">
          <button class="btn-primary" style="font-size:13px;padding:7px 16px" onclick="openSubTaskModal(${goal.id})">+ Add Sub-task</button>
          <span style="font-size:12px;color:var(--text-light);align-self:center">${done}/${total} tasks complete</span>
        </div>
      </div>`;
    }).join('');
}
