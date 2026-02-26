/* ============================================================
   auth.js — Firebase Authentication & Firestore Cloud Sync
   ============================================================ */

const SYNC_EXCLUDE_KEYS = new Set(['guestMode', 'sidebarCollapsed', 'colorTheme']);

let db = null;
let currentUser = null;
let firestoreReady = false;

/**
 * HÀM TRỢ GIÚP: Chuẩn hóa ID tài liệu Firestore.
 * Đảm bảo các phím có dấu chấm (.) hoặc gạch chéo (/) luôn nhất quán.
 */
function _getDocId(key) {
    if (!key) return 'unknown';
    return key.replace(/[\/\.#\[\]\\]/g, '|');
}

/* ── Init ─────────────────────────────────────────────────── */
function initFirebase() {
    if (sessionStorage.getItem('guestMode') === 'true') {
        showApp(null);
        if (typeof initApp === 'function') initApp();
        return;
    }

    if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
        console.warn('Firebase config not set.');
        showConfigWarning();
        showLoginScreen();
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        db = firebase.firestore();
        firestoreReady = true;

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                showLoadingState(true);

                // Xóa localStorage cũ để tránh trộn lẫn dữ liệu Guest
                if (sessionStorage.getItem('guestMode') !== 'true') {
                    localStorage.clear();
                }

                try {
                    // QUY TRÌNH ĐỒNG BỘ 3 BƯỚC:
                    // 1. Tải dữ liệu hiện có
                    await syncFromFirestore(user.uid);
                    // 2. Tự động sửa lỗi định dạng ID (Migration)
                    await migrateFirestoreData();
                    // 3. Tải lại để đảm bảo LocalStorage nhận diện đúng các ID đã sửa
                    await syncFromFirestore(user.uid);
                } catch (e) {
                    console.warn('Sync/Migration flow failed:', e);
                }

                showLoadingState(false);
                showApp(user);
                // Khởi chạy giao diện app sau khi dữ liệu đã sẵn sàng
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
    showApp(null);
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
    } catch (e) {
        console.error('Sign-in error:', e);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = getGoogleBtnHTML();
        }
        const errEl = document.getElementById('loginError');
        if (errEl) {
            errEl.textContent = 'Sign-in failed: ' + e.message;
            errEl.style.display = 'block';
        }
    }
}

/* ── Sign Out ─────────────────────────────────────────────── */
async function signOutUser() {
    sessionStorage.removeItem('guestMode');

    if (firestoreReady && db && currentUser) {
        try {
            await flushAllToFirestore(currentUser.uid);
        } catch (e) {
            console.warn('Pre-signout flush failed:', e);
        }
    }

    try {
        if (firestoreReady && currentUser) {
            await firebase.auth().signOut();
        } else {
            currentUser = null;
            showLoginScreen();
        }
    } catch (e) {
        console.error('Sign-out error:', e);
        showLoginScreen();
    }
}

/* ── Firestore Sync & Maintenance ────────────────────────── */

/**
 * Tự động quét và sửa lỗi định dạng ID trên Cloud.
 */
async function migrateFirestoreData() {
    if (!db || !currentUser) return;

    const userDataRef = db.collection('users').doc(currentUser.uid).collection('data');
    const snapshot = await userDataRef.get();
    const batch = db.batch();
    let moveCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.k) return;

        const correctId = _getDocId(data.k);

        if (doc.id !== correctId) {
            console.log(`🔧 Migrating: ${doc.id} -> ${correctId}`);
            batch.set(userDataRef.doc(correctId), {
                ...data,
                t: firebase.firestore.FieldValue.serverTimestamp()
            });
            batch.delete(doc.ref);
            moveCount++;
        }
    });

    if (moveCount > 0) {
        await batch.commit();
        console.log(`✅ Migration complete! Fixed ${moveCount} items.`);
        if (typeof refreshAllModules === 'function') refreshAllModules();
    }
}

async function flushAllToFirestore(uid) {
    if (!db || !uid) return;
    const writes = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || SYNC_EXCLUDE_KEYS.has(key)) continue;
        const raw = localStorage.getItem(key);
        if (raw === null) continue;

        const docId = _getDocId(key); // Sử dụng hàm chuẩn hóa
        writes.push(
            db.collection('users').doc(uid)
                .collection('data').doc(docId)
                .set({ k: key, v: raw, t: firebase.firestore.FieldValue.serverTimestamp() })
                .catch(e => console.warn('⚠️ Flush failed:', key, e.message))
        );
    }
    await Promise.all(writes);
}

async function syncFromFirestore(uid) {
    if (!db) return;
    const snapshot = await db
        .collection('users').doc(uid)
        .collection('data').get();

    if (snapshot.empty) {
        console.log('☁️ Cloud is empty. No data to sync.');
        return; 
    }

    snapshot.forEach(doc => {
        const { k, v } = doc.data();
        if (k && v !== undefined) {
            localStorage.setItem(k, v);
        }
    });
    console.log(`✅ Synced ${snapshot.size} keys from Firestore.`);
}

function pushToFirestore(key, jsonStr) {
    if (!firestoreReady || !db || !currentUser || SYNC_EXCLUDE_KEYS.has(key)) return;
    const docId = _getDocId(key); // Sử dụng hàm chuẩn hóa
    db.collection('users').doc(currentUser.uid)
        .collection('data').doc(docId)
        .set({ k: key, v: jsonStr, t: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(e => console.warn('⚠️ Write failed:', key, e.message));
}

/* ── UI Helpers ────────────────────────────────────────────── */

function showApp(user) {
    const overlay = document.getElementById('loginOverlay');
    const app = document.getElementById('appContainer');
    if (overlay) overlay.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    const userEl = document.getElementById('sidebarUser');
    const nameEl = document.getElementById('sidebarUserName');
    const photoEl = document.getElementById('sidebarUserPhoto');

    if (userEl) userEl.style.display = 'flex';

    if (user) {
        if (nameEl) nameEl.textContent = (user.displayName || user.email || 'You').split(' ')[0];
        if (photoEl && user.photoURL) {
            photoEl.src = user.photoURL.replace(/=s\d+-c/, '=s60-c');
            photoEl.style.display = 'block';
            photoEl.onerror = () => { photoEl.style.display = 'none'; };
        } else if (photoEl) {
            photoEl.style.display = 'none';
        }
    } else {
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
        el.textContent = msg || '⚠️ Firebase not configured.';
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
