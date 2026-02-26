/* goals.js — Flexible Plan Board */

// ─── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Soft accent colours for cards (cycles through)
const CARD_COLORS = [
    '#fda4af', '#fb923c', '#fbbf24', '#86efac',
    '#67e8f9', '#818cf8', '#f0abfc', '#94a3b8'
];

// Emoji palette for new-card picker
const EMOJI_PALETTE = [
    '🌸', '☀️', '🍂', '❄️', '🎯', '💪', '💼', '💰',
    '❤️', '📚', '🌱', '🏆', '😊', '🎮', '💬', '✨',
    '🚀', '🧘', '🎨', '🍀', '⭐', '📖', '🏋️', '🌙'
];

// ─── Year Goal ───────────────────────────────────────────────────────────────

/**
 * RENDER FUNCTION (GLOBAL SCOPE)
 * We move this out so app.js can call it during the refresh cycle.
 * Name changed to renderBigGoals to match app.js
 */
function renderBigGoals() {
    const yearDisplay = document.getElementById('yearGoalDisplay');
    if (!yearDisplay) return;

    // Get the freshly synced data from Storage
    const goal = Storage.get('yearGoal', '');
    
    // Display in English as requested
    yearDisplay.innerHTML = goal
        ? `<p style="font-size:16px;line-height:1.6;color:var(--text-dark)">${escapeHtml(goal).replace(/\n/g, '<br>')}</p>`
        : '<p class="empty-state">Click Edit to set your big goal for 2026! 🎉</p>';
}

/**
 * INITIALIZATION FUNCTION
 * Sets up listeners and does the first render.
 */
function initYearGoal() {
    const yearDisplay = document.getElementById('yearGoalDisplay');
    const yearInput = document.getElementById('yearGoalInput');
    const editBtn = document.getElementById('editYearGoalBtn');
    const saveBtn = document.getElementById('saveYearGoalBtn');
    const cancelBtn = document.getElementById('cancelYearGoalBtn');
    const actionsDiv = document.getElementById('yearGoalActions');

    // Perform initial render
    renderBigGoals();

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
        const value = yearInput.value.trim();
        Storage.set('yearGoal', value); // This triggers pushToFirestore automatically
        renderBigGoals(); // Update UI immediately
        cancelYearEdit();
    });

    cancelBtn.addEventListener('click', cancelYearEdit);
}

// ─── Plan Board ──────────────────────────────────────────────────────────────
function getPlanBoard() {
    return Storage.get('planBoard', []);
}
function savePlanBoard(board) {
    Storage.set('planBoard', board);
}

function renderBoard() {
    const board = getPlanBoard();
    const container = document.getElementById('planBoard');
    if (!container) return;

    if (board.length === 0) {
        container.innerHTML = `
          <div class="plan-board-empty">
            <p>🗂️ Your plan board is empty.</p>
            <p>Click <strong>+ Add Card</strong> above or choose a quick-start template to begin!</p>
          </div>`;
        return;
    }

    container.innerHTML = '';
    board.forEach((card, cardIdx) => {
        const accentColor = card.color || CARD_COLORS[cardIdx % CARD_COLORS.length];
        const doneCount = card.items.filter(i => i.done).length;
        const totalCount = card.items.length;
        const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

        const el = document.createElement('div');
        el.className = 'plan-card';
        el.dataset.id = card.id;
        el.style.setProperty('--card-accent', accentColor);

        el.innerHTML = `
          <div class="plan-card-header">
            <span class="plan-card-emoji" title="Click to change emoji">${escapeHtml(card.emoji || '📋')}</span>
            <input class="plan-card-title-input" value="${escapeHtml(card.title)}" placeholder="Card title…" />
            <button class="plan-card-delete btn-icon" title="Delete card">🗑️</button>
          </div>
          ${totalCount > 0 ? `
          <div class="plan-card-progress">
            <div class="plan-progress-bar"><div class="plan-progress-fill" style="width:${pct}%"></div></div>
            <span class="plan-progress-label">${doneCount}/${totalCount} done</span>
          </div>` : ''}
          <ul class="plan-item-list">
            ${card.items.map(item => `
              <li class="plan-item${item.done ? ' done' : ''}" data-item-id="${item.id}">
                <input type="checkbox" class="plan-item-check" ${item.done ? 'checked' : ''} />
                <span class="plan-item-text">${escapeHtml(item.text)}</span>
                <button class="plan-item-delete btn-icon" title="Remove">×</button>
              </li>`).join('')}
          </ul>
          <div class="plan-add-item-row">
            <input type="text" class="plan-item-input text-input" placeholder="Add item… 🌸" />
            <button class="plan-item-add-btn btn-primary">Add</button>
          </div>`;

        // ── Title rename ──
        const titleInput = el.querySelector('.plan-card-title-input');
        titleInput.addEventListener('change', () => {
            const b = getPlanBoard();
            const c = b.find(c => c.id === card.id);
            if (c) { c.title = titleInput.value.trim() || c.title; savePlanBoard(b); }
        });

        // ── Emoji click ──
        el.querySelector('.plan-card-emoji').addEventListener('click', () => {
            openEmojiPicker(card.id, el.querySelector('.plan-card-emoji'));
        });

        // ── Delete card ──
        el.querySelector('.plan-card-delete').addEventListener('click', () => {
            if (!confirm(`Delete card "${card.title}"?`)) return;
            const b = getPlanBoard().filter(c => c.id !== card.id);
            savePlanBoard(b);
            renderBoard();
        });

        // ── Toggle item ──
        el.querySelectorAll('.plan-item-check').forEach(cb => {
            cb.addEventListener('change', () => {
                const itemId = cb.closest('.plan-item').dataset.itemId;
                const b = getPlanBoard();
                const c = b.find(c => c.id === card.id);
                if (c) {
                    const it = c.items.find(i => i.id === itemId);
                    if (it) { it.done = cb.checked; savePlanBoard(b); renderBoard(); }
                }
            });
        });

        // ── Delete item ──
        el.querySelectorAll('.plan-item-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.closest('.plan-item').dataset.itemId;
                const b = getPlanBoard();
                const c = b.find(c => c.id === card.id);
                if (c) { c.items = c.items.filter(i => i.id !== itemId); savePlanBoard(b); renderBoard(); }
            });
        });

        // ── Add item ──
        const itemInput = el.querySelector('.plan-item-input');
        const addItemBtn = el.querySelector('.plan-item-add-btn');
        function addNewItem() {
            const text = itemInput.value.trim();
            if (!text) return;
            const b = getPlanBoard();
            const c = b.find(c => c.id === card.id);
            if (c) { c.items.push({ id: uid(), text, done: false }); savePlanBoard(b); renderBoard(); }
        }
        addItemBtn.addEventListener('click', addNewItem);
        itemInput.addEventListener('keydown', e => { if (e.key === 'Enter') addNewItem(); });

        container.appendChild(el);
    });
}

// ─── Emoji Picker (inline popover) ───────────────────────────────────────────
let _emojiPickerEl = null;
function openEmojiPicker(cardId, anchorEl) {
    closeEmojiPicker();
    const popover = document.createElement('div');
    popover.className = 'emoji-popover';
    EMOJI_PALETTE.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-popover-btn';
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
            const b = getPlanBoard();
            const c = b.find(c => c.id === cardId);
            if (c) { c.emoji = emoji; savePlanBoard(b); renderBoard(); }
            closeEmojiPicker();
        });
        popover.appendChild(btn);
    });
    anchorEl.parentNode.insertBefore(popover, anchorEl.nextSibling);
    _emojiPickerEl = popover;
    setTimeout(() => document.addEventListener('click', closeEmojiPickerOnOutside), 0);
}
function closeEmojiPickerOnOutside(e) {
    if (_emojiPickerEl && !_emojiPickerEl.contains(e.target)) closeEmojiPicker();
}
function closeEmojiPicker() {
    if (_emojiPickerEl) { _emojiPickerEl.remove(); _emojiPickerEl = null; }
    document.removeEventListener('click', closeEmojiPickerOnOutside);
}

// ─── New Card Modal ───────────────────────────────────────────────────────────
function initNewCardModal() {
    const modal = document.getElementById('newCardModal');
    const titleInput = document.getElementById('newCardTitle');
    const saveBtn = document.getElementById('saveNewCardBtn');
    const cancelBtn = document.getElementById('cancelNewCardBtn');
    const emojiRow = document.getElementById('newCardEmojiRow');
    const addCardBtn = document.getElementById('addPlanCardBtn');

    let selectedEmoji = '📋';

    // Populate emoji picker in modal
    EMOJI_PALETTE.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'modal-emoji-btn';
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
            emojiRow.querySelectorAll('.modal-emoji-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedEmoji = emoji;
        });
        emojiRow.appendChild(btn);
    });

    addCardBtn.addEventListener('click', () => {
        titleInput.value = '';
        emojiRow.querySelectorAll('.modal-emoji-btn').forEach(b => b.classList.remove('selected'));
        selectedEmoji = '📋';
        modal.classList.remove('hidden');
        titleInput.focus();
    });

    function saveNewCard() {
        const title = titleInput.value.trim();
        if (!title) { titleInput.focus(); return; }
        const board = getPlanBoard();
        board.push({
            id: uid(),
            emoji: selectedEmoji,
            title,
            color: CARD_COLORS[board.length % CARD_COLORS.length],
            items: []
        });
        savePlanBoard(board);
        renderBoard();
        modal.classList.add('hidden');
    }

    saveBtn.addEventListener('click', saveNewCard);
    titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveNewCard(); });
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
}

// ─── Template Chips ───────────────────────────────────────────────────────────
function initTemplateChips() {
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const emoji = chip.dataset.emoji;
            const title = chip.dataset.title;
            const board = getPlanBoard();
            // Avoid duplicates
            if (board.some(c => c.title.toLowerCase() === title.toLowerCase())) {
                chip.classList.add('chip-exists');
                setTimeout(() => chip.classList.remove('chip-exists'), 1200);
                return;
            }
            board.push({
                id: uid(),
                emoji,
                title,
                color: CARD_COLORS[board.length % CARD_COLORS.length],
                items: []
            });
            savePlanBoard(board);
            renderBoard();
        });
    });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initGoals() {
    initYearGoal();
    initNewCardModal();
    initTemplateChips();
    renderBoard();
}

