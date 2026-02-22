/* ============================================================
   auth.js — Firebase Authentication & Firestore Cloud Sync
   ============================================================
   Handles:
   - Google Sign-In via popup
   - onAuthStateChanged → shows app or login screen
   - syncFromFirestore(uid) → pulls all user data into localStorage on login
   - pushToFirestore(key, jsonStr) → called by storage.js on every write
   - signOutUser() → clears localStorage, signs out
   ============================================================ */

let db = null;
let currentUser = null;
let firestoreReady = false;

/* ── Init ─────────────────────────────────────────────────── */
function initFirebase() {
    // If user chose guest mode this session, skip Firebase entirely
    if (sessionStorage.getItem('guestMode') === 'true') {
        showApp(null);
        if (typeof initApp === 'function') initApp();
        return;
    }

    // Guard: check config is filled in
    if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey === 'AIzaSyBbxYjdkm0AC4ZafzAofNOp44U3v8C98Mo') {
        console.warn('Firebase config not set. See js/firebase-config.js');
        showConfigWarning();
        showLoginScreen();
        return;
    }

    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        firestoreReady = true;

        // Listen for auth state changes
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                showLoadingState(true);
                try {
                    await syncFromFirestore(user.uid);
                } catch (e) {
                    console.warn('Firestore sync failed, using local data:', e);
                }
                showLoadingState(false);
                showApp(user);
                if (typeof initApp === 'function') initApp();
            } else {
                currentUser = null;
                showLoginScreen();
            }
        });
    } catch (e) {
        console.error('Firebase init error:', e);
        showConfigWarning('Firebase init failed: ' + e.message);
        showLoginScreen();
    }
}

/* ── Guest Mode ───────────────────────────────────────────── */
function continueAsGuest() {
    sessionStorage.setItem('guestMode', 'true');
    showApp(null); // null = no Google user
    if (typeof initApp === 'function') initApp();
}

/* ── Sign In ──────────────────────────────────────────────── */
async function signInWithGoogle() {
    const btn = document.getElementById('googleSignInBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="signin-spinner">⏳</span> Signing in…';
    }
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        // onAuthStateChanged handles the rest
    } catch (e) {
        console.error('Sign-in error:', e);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = getGoogleBtnHTML();
        }
        const errEl = document.getElementById('loginError');
        if (errEl) {
            errEl.textContent = e.code === 'auth/popup-closed-by-user'
                ? 'Sign-in cancelled. Try again.'
                : 'Sign-in failed: ' + e.message;
            errEl.style.display = 'block';
        }
    }
}

/* ── Sign Out ─────────────────────────────────────────────── */
async function signOutUser() {
    // Clear guest mode session flag
    sessionStorage.removeItem('guestMode');
    try {
        // Clear all app localStorage data for privacy
        localStorage.clear();
        if (firestoreReady && currentUser) {
            await firebase.auth().signOut();
            // onAuthStateChanged will call showLoginScreen()
        } else {
            currentUser = null;
            showLoginScreen();
        }
    } catch (e) {
        console.error('Sign-out error:', e);
        showLoginScreen();
    }
}

/* ── Firestore Sync ────────────────────────────────────────── */

// Pull all of the user's Firestore docs into localStorage
async function syncFromFirestore(uid) {
    if (!db) return;
    const snapshot = await db
        .collection('users').doc(uid)
        .collection('data').get();

    snapshot.forEach(doc => {
        const { k, v } = doc.data();
        if (k && v !== undefined) {
            localStorage.setItem(k, v); // v is already JSON-stringified
        }
    });
}

// Write one key→value to Firestore (called from Storage.set)
// Non-blocking — errors are silently swallowed so UI is never blocked
function pushToFirestore(key, jsonStr) {
    if (!firestoreReady || !db || !currentUser) return;
    const docId = key.replace(/\//g, '|').replace(/\\/g, '|'); // Firestore doc IDs can't have /
    db.collection('users').doc(currentUser.uid)
        .collection('data').doc(docId)
        .set({ k: key, v: jsonStr, t: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(e => console.warn('Firestore write failed for key', key, e));
}

/* ── UI Helpers ────────────────────────────────────────────── */

function showApp(user) {
    const overlay = document.getElementById('loginOverlay');
    const app = document.getElementById('appContainer');
    if (overlay) overlay.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    // Update sidebar user profile
    const userEl = document.getElementById('sidebarUser');
    const nameEl = document.getElementById('sidebarUserName');
    const photoEl = document.getElementById('sidebarUserPhoto');

    if (userEl) userEl.style.display = 'flex';

    if (user) {
        // Google account user
        if (nameEl) nameEl.textContent = (user.displayName || user.email || 'You').split(' ')[0];
        if (photoEl && user.photoURL) { photoEl.src = user.photoURL; photoEl.style.display = 'block'; }
    } else {
        // Guest / browser-only mode
        if (nameEl) nameEl.textContent = 'Browser only';
        if (photoEl) photoEl.style.display = 'none';
    }
}

function showLoginScreen() {
    const overlay = document.getElementById('loginOverlay');
    const app = document.getElementById('appContainer');
    if (overlay) overlay.classList.remove('hidden');
    if (app) app.classList.add('hidden');
}

function showLoadingState(loading) {
    const spinner = document.getElementById('loginLoadingMsg');
    if (spinner) spinner.style.display = loading ? 'block' : 'none';
}

function showConfigWarning(msg) {
    const el = document.getElementById('loginError');
    if (el) {
        el.textContent = msg || '⚠️ Firebase not configured. Fill in js/firebase-config.js first.';
        el.style.display = 'block';
    }
}

function getGoogleBtnHTML() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="22" height="22" style="flex-shrink:0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
    Sign in with Google`;
}


