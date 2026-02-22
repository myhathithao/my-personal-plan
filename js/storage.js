/* storage.js — localStorage wrapper with Firestore background sync */
const Storage = {
    get(key, def = null) {
        try {
            const v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : def;
        } catch { return def; }
    },

    set(key, val) {
        try {
            const jsonStr = JSON.stringify(val);
            localStorage.setItem(key, jsonStr);
            // Background cloud sync — non-blocking, safe to fail
            if (typeof pushToFirestore === 'function') {
                pushToFirestore(key, jsonStr);
            }
        } catch { }
    },

    update(key, def, fn) {
        const cur = this.get(key, def);
        const next = fn(cur);
        this.set(key, next);
        return next;
    }
};
