import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs, doc, setDoc, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/**
 * On page load: read the pageText collection for the given page key
 * and update any [data-text] elements with the stored content.
 * @param {string} pageKey  "main" | "mystory" | "contact"
 */
export async function loadPageText(pageKey) {
  try {
    const q = query(collection(db, 'pageText'), where('page', '==', pageKey));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const { content } = docSnap.data();
      if (!content) return;
      const el = document.querySelector(`[data-text="${docSnap.id}"]`);
      if (el) _setContent(el, content);
    });
  } catch (err) {
    console.warn('Page text load error (non-fatal):', err);
  }
}

/**
 * Admin only: add hover edit badge to every [data-text] element on the page.
 * Clicking the badge opens a modal to edit and save the text.
 * @param {string} pageKey
 */
export function initPageTextAdmin(pageKey) {
  const modal = _buildModal(pageKey);
  document.body.appendChild(modal);

  document.querySelectorAll('[data-text]').forEach(el => {
    _wireElement(el, modal);
  });
}

// ── Private ──────────────────────────────────────────────────────────────────

/**
 * Update element content while preserving the admin badge element.
 */
function _setContent(el, html) {
  const badge = el.querySelector('.admin-text-badge');
  el.innerHTML = html;
  if (badge) el.appendChild(badge);
}

/**
 * Attach a hover pencil badge to a [data-text] element.
 */
function _wireElement(el, modal) {
  if (el.querySelector('.admin-text-badge')) return; // already wired

  const cs = getComputedStyle(el);
  if (cs.position === 'static') el.style.position = 'relative';

  const badge = document.createElement('button');
  badge.className = 'admin-text-badge';
  badge.title = 'Edit text';
  badge.style.cssText = `
    position: absolute; top: -10px; right: -10px; z-index: 40;
    width: 22px; height: 22px; border-radius: 50%; border: none;
    background: #50625d; color: #e8fcf5;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    opacity: 0; transition: opacity 0.15s; padding: 0;
  `;
  badge.innerHTML = `<span class="material-symbols-outlined"
    style="font-size:13px;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20">edit</span>`;

  el.addEventListener('mouseenter', () => { badge.style.opacity = '1'; });
  el.addEventListener('mouseleave', () => { badge.style.opacity = '0'; });
  badge.addEventListener('click', e => {
    e.stopPropagation();
    modal._open(el);
  });

  el.appendChild(badge);
}

/**
 * Build the shared edit modal. pageKey is captured for Firestore writes.
 */
function _buildModal(pageKey) {
  const overlay = document.createElement('div');
  overlay.id = 'text-edit-modal';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
    display: none; align-items: center; justify-content: center; padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: #1a2424; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
      width: 100%; max-width: 560px; padding: 32px;
      font-family: 'Epilogue', sans-serif; color: #e8fcf5;
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span class="material-symbols-outlined" style="font-size:18px;color:#50625d">edit_note</span>
        <p id="tem-label" style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#a9b4b3;"></p>
      </div>
      <p id="tem-hint" style="font-size:11px;color:#a9b4b3;margin-bottom:14px;"></p>
      <textarea id="tem-area" rows="7" style="
        width:100%; background:#2a3434; border:1px solid rgba(255,255,255,0.15);
        border-radius:8px; padding:12px 16px; color:#e8fcf5; font-size:14px;
        line-height:1.7; resize:vertical; outline:none; font-family:inherit;
        box-sizing:border-box;
      "></textarea>
      <div style="display:flex;gap:12px;margin-top:18px;justify-content:flex-end;align-items:center;">
        <p id="tem-status" style="font-size:12px;margin-right:auto;"></p>
        <button id="tem-cancel" style="
          padding:9px 22px; border:1px solid rgba(255,255,255,0.2);
          background:transparent; color:#a9b4b3; border-radius:8px;
          cursor:pointer; font-size:13px; font-family:inherit;
        ">Cancel</button>
        <button id="tem-save" style="
          padding:9px 22px; background:#50625d; color:#e8fcf5;
          border:none; border-radius:8px; cursor:pointer;
          font-size:13px; font-weight:700; font-family:inherit;
        ">Save</button>
      </div>
    </div>
  `;

  let currentEl = null;

  overlay._open = (el) => {
    currentEl = el;
    const isRaw = 'textRaw' in el.dataset;
    overlay.querySelector('#tem-label').textContent = el.dataset.text;
    overlay.querySelector('#tem-area').value = _toPlain(el, isRaw);
    overlay.querySelector('#tem-hint').textContent = isRaw
      ? 'HTML tags are preserved. Edit only the plain text; leave <span> tags unchanged to keep styled words.'
      : 'Press Enter for a new line.';
    overlay.querySelector('#tem-status').textContent = '';
    overlay.style.display = 'flex';
    setTimeout(() => overlay.querySelector('#tem-area').focus(), 50);
  };

  overlay.querySelector('#tem-cancel').onclick = () => { overlay.style.display = 'none'; };
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });

  overlay.querySelector('#tem-save').onclick = async () => {
    if (!currentEl) return;
    const statusEl = overlay.querySelector('#tem-status');
    const saveBtn  = overlay.querySelector('#tem-save');
    const isRaw    = 'textRaw' in currentEl.dataset;
    const html     = _toHtml(overlay.querySelector('#tem-area').value, isRaw);

    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;
    statusEl.style.color = '#a9b4b3';
    statusEl.textContent = '';

    try {
      await setDoc(doc(db, 'pageText', currentEl.dataset.text), {
        page: pageKey,
        content: html,
        updatedAt: Timestamp.now()
      }, { merge: true });

      _setContent(currentEl, html);
      _wireElement(currentEl, overlay); // re-attach badge if lost after innerHTML update

      statusEl.style.color = '#4ade80';
      statusEl.textContent = '✓ Saved';
      setTimeout(() => { overlay.style.display = 'none'; }, 700);
    } catch (err) {
      statusEl.style.color = '#f87171';
      statusEl.textContent = err.message;
    } finally {
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  };

  return overlay;
}

/**
 * Extract editable text from an element.
 * raw=true  → keep HTML tags intact, only convert <br> to newlines (for h1 with styled spans)
 * raw=false → strip all tags, decode entities (plain text editing)
 */
function _toPlain(el, raw = false) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('.admin-text-badge').forEach(b => b.remove());
  const html = clone.innerHTML.replace(/<br\s*\/?>/gi, '\n').trim();
  if (raw) return html;
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Convert textarea value back to HTML for storage.
 * raw=true  → treat input as HTML, only convert newlines to <br>
 * raw=false → escape entities, convert newlines to <br>
 */
function _toHtml(text, raw = false) {
  if (raw) return text.replace(/\n/g, '<br>');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
