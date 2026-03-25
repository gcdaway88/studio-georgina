import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const provider = new GoogleAuthProvider();
const readyCallbacks = [];
let currentAdminUser = null;

/**
 * Check if an email exists in the Firestore admins collection.
 */
async function _isAdminEmail(email) {
  try {
    const snap = await getDoc(doc(db, 'admins', email));
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Call once per page. Listens for a persisted session and fires
 * all onAdminReady() callbacks if the signed-in user is in the admins collection.
 */
export function initAdminAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      const isAdmin = await _isAdminEmail(user.email);
      if (isAdmin) {
        currentAdminUser = user;
        _showAdminIndicator(user);
        readyCallbacks.forEach(cb => cb(user));
        return;
      }
    }
    currentAdminUser = null;
    if (user) await signOut(auth); // signed in but not an admin — sign out silently
  });
}

/**
 * Register a callback that fires when admin auth is confirmed.
 * If admin is already confirmed, fires immediately.
 */
export function onAdminReady(callback) {
  if (currentAdminUser) {
    callback(currentAdminUser);
  } else {
    readyCallbacks.push(callback);
  }
}

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutAdmin() {
  return signOut(auth);
}

export function getCurrentAdmin() {
  return currentAdminUser;
}

// ── Internal: show a subtle admin mode banner and fill the account icon ──

function _showAdminIndicator(user) {
  const iconEl = document.querySelector('[data-icon="account_circle"]');
  if (iconEl) {
    iconEl.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    iconEl.style.color = '#50625d';
    iconEl.parentElement.title = `Admin: ${user.email}`;
  }

  if (document.getElementById('admin-mode-bar')) return;
  const navHeight = document.querySelector('nav')?.offsetHeight || 64;
  const bar = document.createElement('div');
  bar.id = 'admin-mode-bar';
  bar.style.cssText = `
    position: fixed; top: ${navHeight}px; left: 0; right: 0; z-index: 49;
    background: #50625d; color: #e8fcf5;
    font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 6px 16px;
  `;
  bar.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:14px">admin_panel_settings</span>
    Admin mode active
    <a href="admin.html" style="margin-left:8px; text-decoration:underline; opacity:0.8; font-size:10px">Dashboard</a>
  `;
  document.body.appendChild(bar);

  const main = document.querySelector('main');
  if (main) main.style.paddingTop = (parseInt(getComputedStyle(main).paddingTop) + 28) + 'px';
}
