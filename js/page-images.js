import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase-config.js';
import {
  collection, query, where, getDocs, doc, setDoc, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Inject spin keyframe + hide empty-src imgs once (module-level, runs immediately)
(function _injectStyles() {
  if (document.getElementById('page-images-css')) return;
  const s = document.createElement('style');
  s.id = 'page-images-css';
  s.textContent = `
    @keyframes pi-spin { to { transform: rotate(360deg); } }
    img[data-slot][src=""] { visibility: hidden; }
  `;
  document.head.appendChild(s);
})();

/**
 * On page load: show a spinner on every [data-slot] container immediately,
 * fetch stored URLs from Firestore, update the DOM, then remove spinners.
 * @param {string} pageKey  "main" | "mystory" | "contact"
 */
export async function loadPageImages(pageKey) {
  // ── Show spinners synchronously before the first await ──────────────────
  const loaders = [];
  document.querySelectorAll('[data-slot]').forEach(el => {
    const loader = _addLoader(el);
    if (loader) loaders.push(loader);
  });

  try {
    const q = query(collection(db, 'pageImages'), where('page', '==', pageKey));
    const snapshot = await getDocs(q);

    snapshot.forEach(docSnap => {
      const { storageUrl } = docSnap.data();
      if (!storageUrl) return;

      const el = document.querySelector(`[data-slot="${docSnap.id}"]`);
      if (!el) return;

      if (el.tagName === 'IMG') {
        el.src = storageUrl;
        el.style.visibility = '';   // restore visibility
      } else {
        el.style.backgroundImage = `url('${storageUrl}')`;
      }
    });
  } catch (err) {
    console.warn('Page images load error (non-fatal):', err);
  } finally {
    loaders.forEach(l => l.remove());
  }
}

/**
 * Admin only: add hover overlay with "Change Image" button to every
 * [data-slot] element on the page.
 * @param {string} pageKey
 */
export function initPageImageAdmin(pageKey) {
  document.querySelectorAll('[data-slot]').forEach(el => {
    // <img> elements can't have visible children (replaced element).
    // Absolutely-positioned background-image divs (z-index:0) create their own
    // stacking context that gets painted under sibling z-10 content divs.
    // In both cases, attach the overlay to the parent container instead.
    const target = _overlayTarget(el);
    if (!target) return;

    if (target.querySelector('.admin-slot-overlay')) return; // already wired

    const cs = getComputedStyle(target);
    if (cs.position === 'static') target.style.position = 'relative';

    // Persistent small badge (always visible in admin mode)
    const imgBadge = document.createElement('button');
    imgBadge.className = 'admin-img-badge';
    imgBadge.title = 'Change image';
    imgBadge.style.cssText = `
      position: absolute; top: 8px; right: 8px; z-index: 40;
      width: 28px; height: 28px; border-radius: 50%; border: none;
      background: rgba(80,98,93,0.9); color: #e8fcf5;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4); padding: 0;
    `;
    imgBadge.innerHTML = `<span class="material-symbols-outlined"
      style="font-size:15px;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20">image</span>`;
    target.appendChild(imgBadge);

    const overlay = document.createElement('div');
    overlay.className = 'admin-slot-overlay';
    overlay.style.cssText = `
      position: absolute; inset: 0; z-index: 30;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      background: rgba(42,52,52,0.45); color: white;
      opacity: 0; transition: opacity 0.2s; cursor: pointer;
      border-radius: inherit;
    `;
    overlay.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:28px">edit</span>
      <span style="font-size:10px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase">Change Image</span>
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    overlay.addEventListener('mouseenter', () => { overlay.style.opacity = '1'; });
    overlay.addEventListener('mouseleave', () => { overlay.style.opacity = '0'; });
    overlay.addEventListener('click', () => fileInput.click());
    imgBadge.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;

      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const MAX_SIZE_MB = 10;

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Only JPEG, PNG, WebP or GIF images are allowed.');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`Image must be under ${MAX_SIZE_MB}MB.`);
        return;
      }

      _uploadPageImage(el.dataset.slot, pageKey, file, el, overlay);
    });

    target.appendChild(overlay);
    target.appendChild(fileInput);
  });
}

/**
 * Add a loading spinner to the visual container of a slot.
 * Returns the loader element (so the caller can remove it later), or null if skipped.
 */
function _addLoader(el) {
  // Skip subtle texture images whose parent intentionally has very low opacity
  const directParent = el.parentElement;
  if (directParent && parseFloat(getComputedStyle(directParent).opacity) < 0.5) return null;

  const container = (el.tagName === 'IMG' || getComputedStyle(el).position === 'absolute')
    ? directParent
    : el;
  if (!container) return null;

  // Don't double-add
  const existing = container.querySelector('.pi-loader');
  if (existing) return existing;

  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  const loader = document.createElement('div');
  loader.className = 'pi-loader';
  loader.style.cssText = `
    position: absolute; inset: 0; z-index: 15;
    background: #edf1f0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  `;
  loader.innerHTML = `<span class="material-symbols-outlined" style="
    font-size: 22px; color: #a9b4b3;
    animation: pi-spin 1s linear infinite;
    font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
  ">progress_activity</span>`;
  container.appendChild(loader);
  return loader;
}

/**
 * Determine where to attach the overlay for a given [data-slot] element.
 * - <img> elements cannot render children → use parent.
 * - position:absolute divs (background-image pattern) create a stacking context
 *   at z:0, hiding children behind sibling z:10 content → use parent.
 * - For low-opacity parents (e.g. opacity-10 texture overlays), skip up further.
 */
function _overlayTarget(el) {
  const needsParent = el.tagName === 'IMG' || getComputedStyle(el).position === 'absolute';
  if (!needsParent) return el;

  let parent = el.parentElement;
  // Skip containers whose opacity would make the overlay nearly invisible
  while (parent && parseFloat(getComputedStyle(parent).opacity) < 0.5) {
    parent = parent.parentElement;
  }
  return parent || el;
}

// ── Private ──────────────────────────────────────────────────────────────────

async function _uploadPageImage(slotKey, pageKey, file, el, overlayEl) {
  // Show uploading state on the overlay
  overlayEl.style.opacity = '1';
  overlayEl.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:28px;animation:spin 1s linear infinite">progress_activity</span>
    <span style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase">Uploading…</span>
  `;

  try {
    // Capture old URL before overwriting, for Storage cleanup
    let oldUrl = null;
    if (el.tagName === 'IMG') {
      oldUrl = el.src;
    } else {
      const m = el.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (m) oldUrl = m[1];
    }

    // Upload new file to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `studio-georgina/pages`);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) throw new Error(`Cloudinary error: ${res.status}`);
    const data = await res.json();
    const downloadURL = data.secure_url;

    // Update DOM immediately
    if (el.tagName === 'IMG') {
      el.src = downloadURL;
    } else {
      el.style.backgroundImage = `url('${downloadURL}')`;
    }

    // Persist to Firestore
    await setDoc(doc(db, 'pageImages', slotKey), {
      page: pageKey,
      storageUrl: downloadURL,
      updatedAt: Timestamp.now()
    }, { merge: true });

    // Old Cloudinary images can be removed manually from your Cloudinary media library if needed.

    _restoreOverlay(overlayEl);
  } catch (err) {
    console.error('Page image upload error:', err);
    alert('Upload failed: ' + err.message);
    _restoreOverlay(overlayEl);
  }
}

function _restoreOverlay(overlayEl) {
  overlayEl.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:28px">edit</span>
    <span style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase">Change Image</span>
  `;
  overlayEl.style.opacity = '0';
}
