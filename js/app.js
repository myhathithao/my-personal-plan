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
        if (typeof initQuotes === 'function') initQuotes();
        if (typeof initGoals === 'function') initGoals();
        if (typeof initCalendar === 'function') initCalendar();
        if (typeof initIdeas === 'function') initIdeas();
        if (typeof initHabits === 'function') initHabits();
        if (typeof initDiary === 'function') initDiary();
        if (typeof initStats === 'function') initStats();
        if (typeof initPomodoro === 'function') initPomodoro();
        if (typeof initReminders === 'function') initReminders();

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
    // 1. Refresh the dashboard components
    refreshDashboard();

    // 2. Refresh Module UIs (Checking for existence to prevent errors)
    // Updated naming convention to match specific module files
    if (typeof renderYearGoalText === 'function') renderYearGoalText(); // From goals.js
    if (typeof renderBigGoalsList === 'function') renderBigGoalsList(); // From stats.js
    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderHabitChips === 'function') renderHabitChips();
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof renderIdeas === 'function') renderIdeas();
    if (typeof renderDiaryHistory === 'function') renderDiaryHistory();
    if (typeof renderCal === 'function') renderCal();
    if (typeof renderPomoTasks === 'function') renderPomoTasks();
    if (typeof renderPomoTimer === 'function') renderPomoTimer();
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
    if (typeof renderDashHabits === 'function') renderDashHabits();
    if (typeof renderDashTodos === 'function') renderDashTodos();
    if (typeof renderMissedTasks === 'function') renderMissedTasks();
    if (typeof renderWeeklyGoal === 'function') renderWeeklyGoal();
}

/* ── Page navigation ──────────────────────────────────────── */
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    // Trigger specific renders when entering a page
    if (page === 'dashboard') refreshDashboard();
    if (page === 'habits') { 
        if (typeof renderHabitGrid === 'function') renderHabitGrid(); 
        if (typeof renderHabitChips === 'function') renderHabitChips(); 
    }
    if (page === 'diary') {
        if (typeof renderDiaryHistory === 'function') renderDiaryHistory();
    }
    if (page === 'stats') {
        if (typeof renderBigGoalsList === 'function') renderBigGoalsList();
    }
    if (page === 'ideas') {
        if (typeof renderIdeas === 'function') renderIdeas();
    }
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
    // Theme applies immediately
    initTheme();

    // Sidebar collapse
    setupSidebar();

    // Sign-out button
    document.getElementById('signOutBtn')?.addEventListener('click', signOutUser);

    // Google sign-in
    document.getElementById('googleSignInBtn')?.addEventListener('click', signInWithGoogle);

    // Guest mode
    document.getElementById('guestModeBtn')?.addEventListener('click', continueAsGuest);

    // Firebase auth logic starts here
    initFirebase();
});
