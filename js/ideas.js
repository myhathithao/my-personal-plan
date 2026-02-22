/* ideas.js — Idea Capture Board */
function initIdeas() {
    document.getElementById('addIdeaBtn').addEventListener('click', addIdea);
    document.getElementById('ideaTitle').addEventListener('keydown', e => { if (e.key === 'Enter') addIdea(); });
    renderIdeas();
}

function getIdeas() { return Storage.get('ideas', []); }
function setIdeas(ideas) { Storage.set('ideas', ideas); }

function addIdea() {
    const title = document.getElementById('ideaTitle').value.trim();
    if (!title) return;
    const desc = document.getElementById('ideaDesc').value.trim();
    const startDate = document.getElementById('ideaStartDate').value;
    const ideas = getIdeas();
    ideas.unshift({ id: Date.now(), title, desc, startDate, createdAt: Date.now() });
    setIdeas(ideas);
    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaDesc').value = '';
    document.getElementById('ideaStartDate').value = '';
    renderIdeas();
}

function deleteIdea(id) {
    setIdeas(getIdeas().filter(i => i.id !== id));
    renderIdeas();
}

function formatDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-');
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderIdeas() {
    const grid = document.getElementById('ideasGrid');
    const ideas = getIdeas();
    if (!ideas.length) {
        grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1;padding:20px">No ideas yet! Capture your first spark above ✨</p>';
        return;
    }
    grid.innerHTML = ideas.map(idea => `
    <div class="idea-card">
      <div class="idea-card-title">💡 ${escapeHtml(idea.title)}</div>
      ${idea.desc ? `<div class="idea-card-desc">${escapeHtml(idea.desc)}</div>` : ''}
      <div class="idea-card-footer">
        ${idea.startDate
            ? `<span class="idea-start-badge">🗓 Start: ${formatDate(idea.startDate)}</span>`
            : `<span class="idea-start-badge" style="background:var(--beige-mid);color:var(--text-light)">No date set</span>`}
        <button class="idea-delete-btn" onclick="deleteIdea(${idea.id})">✕ Delete</button>
      </div>
    </div>
  `).join('');
}
