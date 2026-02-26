/* ideas.js — Idea Capture Board (Cloud-Sync Compatible) */

// ─── Initialization ──────────────────────────────────────────────────────────
function initIdeas() {
    document.getElementById('addIdeaBtn')?.addEventListener('click', addIdea);
    document.getElementById('ideaTitle')?.addEventListener('keydown', e => { 
        if (e.key === 'Enter') addIdea(); 
    });
    renderIdeas();
}

// ─── Data Access (Using Storage.set to trigger Cloud Sync) ────────────────────
function getIdeas() { return Storage.get('ideas', []); }

function setIdeas(ideas) { 
    // Storage.set triggers pushToFirestore automatically
    Storage.set('ideas', ideas); 
}

// ─── Render Function (Global Scope - Pattern from diary.js) ──────────────────
function renderIdeas() {
    const grid = document.getElementById('ideasGrid');
    if (!grid) return; // Defensive check: prevents errors if not on Ideas page

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
        ${idea.deadline
            ? `<span class="idea-deadline-badge">⏰ Due: ${formatDate(idea.deadline)}</span>`
            : ''}
        <button class="idea-delete-btn" onclick="deleteIdea(${idea.id})">✕ Delete</button>
      </div>
    </div>
  `).join('');
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function addIdea() {
    const titleEl = document.getElementById('ideaTitle');
    const descEl = document.getElementById('ideaDesc');
    const startEl = document.getElementById('ideaStartDate');
    const deadlineEl = document.getElementById('ideaDeadline');

    const title = titleEl.value.trim();
    if (!title) return;

    const desc = descEl.value.trim();
    const startDate = startEl.value;
    const deadline = deadlineEl ? deadlineEl.value : '';
    
    const ideas = getIdeas();
    // Add new idea to the beginning of the list
    ideas.unshift({ 
        id: Date.now(), 
        title, 
        desc, 
        startDate, 
        deadline, 
        createdAt: Date.now() 
    });
    
    setIdeas(ideas); // Triggers Cloud Sync
    
    // Clear inputs
    titleEl.value = '';
    descEl.value = '';
    startEl.value = '';
    if (deadlineEl) deadlineEl.value = '';
    
    renderIdeas();
}

function deleteIdea(id) {
    if (!confirm("Are you sure you want to delete this idea?")) return;
    setIdeas(getIdeas().filter(i => i.id !== id)); // Triggers Cloud Sync
    renderIdeas();
}

function formatDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-');
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}
