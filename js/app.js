/* app.js — Router, navigation, theme switcher, global init.
   initApp() is called by auth.js AFTER the user logs in and Firestore data is synced. */

let appInitialized = false;

/* ── Called by auth.js after successful login + data sync ─── */
function initApp() {
    // Set up greeting & date on first init
    if (!appInitialized) {
        const titleEl = document.querySelector('#page-dashboard .page-title');
        if (titleEl) titleEl.textContent = getGreeting();
        const dateEl = document.getElementById('dashDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });
        }

        // Init all feature modules
        initQuotes();
        initGoals();
        initCalendar();
        initIdeas();
        initHabits();
        initDiary();
        initStats();
        initPomodoro();
        initReminders();

        // Wire up navigation now that DOM is ready
        setupNavigation();

        // Notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        appInitialized = true;
    }

    // Always refresh ALL module UIs after login (picks up freshly synced cloud data)
    refreshAllModules();
    navigateTo('dashboard');
}

/* ── Re-render every module from current localStorage state ── */
/* Called after Firestore sync so cloud data is always displayed */
function refreshAllModules() {
    refreshDashboard();
    // Re-render modules that may have been initialized with stale data
    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderHabitChips === 'function') renderHabitChips();
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof renderBigGoals === 'function') renderBigGoals();
    if (typeof renderIdeas === 'function') renderIdeas();
    if (typeof renderDiaryHistory === 'function') renderDiaryHistory();
    // Re-render year goal display
    const yearGoalDisplay = document.getElementById('yearGoalDisplay');
    if (yearGoalDisplay && typeof Storage !== 'undefined') {
        const goal = Storage.get('yearGoal', '');
        yearGoalDisplay.innerHTML = goal
            ? `<p style="font-size:16px;line-height:1.6;color:var(--text-dark)">${goal.replace(/\n/g, '<br>')}</p>`
            : '<p class="empty-state">Click Edit to set your big goal for 2026! 🎉</p>';
    }
}

/* ── Greeting ─────────────────────────────────────────────── */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning, lovely! 🌷';
    if (h < 17) return 'Good afternoon, sunshine! ☀️';
    return 'Good evening, beauty! 🌙';
}

/* ── Dashboard refresh ────────────────────────────────────── */
function refreshDashboard() {
    renderDashHabits();
    renderDashTodos();
    renderMissedTasks();
    renderWeeklyGoal();
}

/* ── Page navigation ──────────────────────────────────────── */
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    if (page === 'dashboard') refreshDashboard();
    if (page === 'habits') { renderHabitGrid(); renderHabitChips(); }
    if (page === 'diary') renderDiaryHistory();
    if (page === 'stats') renderBigGoals();
    if (page === 'ideas') renderIdeas();
}

/* ── Navigation wiring ────────────────────────────────────── */
function setupNavigation() {
    document.querySelectorAll('.nav-link, .card-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) navigateTo(page);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });
}

/* ── Sidebar collapse ─────────────────────────────────────── */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (!sidebar || !toggleBtn) return;
    if (Storage.get('sidebarCollapsed', false)) sidebar.classList.add('collapsed');
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        Storage.set('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });
}

/* ── Theme switcher ───────────────────────────────────────── */
const THEMES = ['blossom', 'ocean', 'minimal'];

function applyTheme(theme) {
    document.body.classList.remove(...THEMES.map(t => 'theme-' + t));
    if (theme !== 'blossom') document.body.classList.add('theme-' + theme);
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.theme === theme);
    });
    Storage.set('colorTheme', theme);
}

function initTheme() {
    const saved = Storage.get('colorTheme', 'blossom');
    applyTheme(saved);
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
    });
}

/* ── Bootstrap ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    // Theme applies immediately (login screen also benefits)
    initTheme();

    // Sidebar collapse (works before login too)
    setupSidebar();

    // Sign-out button in sidebar
    document.getElementById('signOutBtn')?.addEventListener('click', signOutUser);

    // Google sign-in button on login overlay
    document.getElementById('googleSignInBtn')?.addEventListener('click', signInWithGoogle);

    // Guest / browser-only mode button
    document.getElementById('guestModeBtn')?.addEventListener('click', continueAsGuest);

    // Firebase auth (calls initApp() once user is authenticated)
    initFirebase();
});
