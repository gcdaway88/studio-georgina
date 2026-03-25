import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './firebase-config.js';
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, query, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/**
 * Load gallery items from Firestore and render into containerEl.
 * @param {HTMLElement} containerEl  - the #gallery div
 * @param {HTMLElement} countEl      - the #works-count element
 */
export async function loadGallery(containerEl, countEl) {
  containerEl.innerHTML = `
    <div class="col-span-3 flex flex-col items-center justify-center py-24 text-[#a9b4b3]">
      <span class="material-symbols-outlined text-5xl mb-4" style="animation:spin 1s linear infinite">progress_activity</span>
      <p class="text-sm tracking-widest uppercase">Loading gallery…</p>
    </div>`;

  try {
    const q = query(collection(db, 'gallery'), orderBy('order'));
    const snapshot = await getDocs(q);

    containerEl.innerHTML = '';

    if (snapshot.empty) {
      containerEl.innerHTML = `<div class="col-span-3 text-center py-24 text-[#a9b4b3]">No artworks yet.</div>`;
      if (countEl) countEl.textContent = 'Showing 0 works';
      return;
    }

    if (countEl) countEl.textContent = `Showing ${snapshot.size} works`;

    snapshot.forEach(docSnap => {
      containerEl.appendChild(_createCard(docSnap.id, docSnap.data(), false));
    });
  } catch (err) {
    console.error('Gallery load error:', err);
    containerEl.innerHTML = `<div class="col-span-3 text-center py-24 text-red-400">Failed to load gallery. Check Firebase config.</div>`;
  }
}

/**
 * Layer admin controls (delete buttons + Add Artwork button) onto an
 * already-rendered gallery. Call after loadGallery() resolves.
 * @param {HTMLElement} containerEl
 */
export function initGalleryAdmin(containerEl) {
  // Add delete button to every existing card
  containerEl.querySelectorAll('[data-gallery-id]').forEach(card => {
    _addDeleteBtn(card);
  });

  // Floating "Add Artwork" button
  if (document.getElementById('admin-add-btn')) return;
  const addBtn = document.createElement('button');
  addBtn.id = 'admin-add-btn';
  addBtn.className = 'fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 flex items-center gap-2 bg-[#50625d] text-white px-5 py-3 rounded-full shadow-xl hover:bg-[#445651] transition-colors font-bold text-sm';
  addBtn.innerHTML = '<span class="material-symbols-outlined text-base" style="font-size:18px">add</span> Add Artwork';
  addBtn.addEventListener('click', () => _openAddModal(containerEl));
  document.body.appendChild(addBtn);
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _createCard(id, data, withDelete) {
  const item = document.createElement('div');
  item.className = 'group relative';
  item.dataset.galleryId = id;

  item.innerHTML = `
    <div class="relative overflow-hidden aspect-[4/5] bg-[#ececec] rounded-lg mb-4">
      <img
        alt="${_esc(data.title)}"
        class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
        src="${_esc(data.storageUrl)}"
      />
      <div class="absolute inset-0 bg-[#2a3434]/0 group-hover:bg-[#2a3434]/5 transition-colors duration-500"></div>
    </div>
    <div class="flex justify-between items-start">
      <div>
        <h3 class="font-headline font-bold text-lg text-[#2a3434]">${_esc(data.title)}</h3>
        <p class="text-sm text-[#50625d] font-medium">${_esc(data.medium)}</p>
      </div>
      <span class="font-epilogue font-bold text-[#2a3434]">${_esc(data.price)}</span>
    </div>`;

  if (withDelete) _addDeleteBtn(item);
  return item;
}

function _addDeleteBtn(card) {
  const imgWrapper = card.querySelector('.aspect-\\[4\\/5\\]');
  if (!imgWrapper || card.querySelector('.admin-delete-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'admin-delete-btn absolute top-3 right-3 w-9 h-9 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10';
  btn.title = 'Delete artwork';
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">delete</span>';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    _deleteArtwork(card.dataset.galleryId, card.querySelector('img').src, card);
  });
  imgWrapper.appendChild(btn);
}

async function _deleteArtwork(id, imgSrc, cardEl) {
  if (!confirm('Delete this artwork? This cannot be undone.')) return;

  try {
    await deleteDoc(doc(db, 'gallery', id));

    // Cloudinary images can be removed manually from your Cloudinary media library if needed.

    cardEl.remove();

    const countEl = document.getElementById('works-count');
    if (countEl) {
      const n = document.querySelectorAll('[data-gallery-id]').length;
      countEl.textContent = `Showing ${n} works`;
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete artwork. Please try again.');
  }
}

function _openAddModal(containerEl) {
  document.getElementById('admin-add-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'admin-add-modal';
  modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';

  modal.innerHTML = `
    <div class="bg-[#f8faf9] rounded-xl p-8 w-full max-w-md shadow-2xl">
      <div class="flex justify-between items-center mb-6">
        <h2 class="font-bold text-2xl text-[#2a3434]" style="font-family:Epilogue,sans-serif">Add Artwork</h2>
        <button id="modal-close" class="text-[#a9b4b3] hover:text-[#2a3434] transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-[#50625d] mb-2">Image *</label>
          <div id="drop-zone" class="border-2 border-dashed border-[#a9b4b3] rounded-lg p-6 text-center cursor-pointer hover:border-[#50625d] transition-colors">
            <span class="material-symbols-outlined text-3xl text-[#a9b4b3] block mb-2">upload_file</span>
            <p class="text-sm text-[#a9b4b3]">Click or drag &amp; drop to upload</p>
            <input type="file" id="modal-file" accept="image/*" class="hidden"/>
          </div>
          <div id="preview-wrap" class="hidden mt-2">
            <img id="modal-preview" class="w-full h-40 object-cover rounded-lg"/>
            <p id="preview-name" class="text-xs text-[#a9b4b3] mt-1 truncate"></p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-[#50625d] mb-2">Title *</label>
          <input type="text" id="modal-title" placeholder="e.g. Wanderlust XVI"
            class="w-full border border-[#a9b4b3] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#50625d]"/>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-[#50625d] mb-2">Medium *</label>
          <input type="text" id="modal-medium" placeholder="e.g. Oil on Canvas"
            class="w-full border border-[#a9b4b3] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#50625d]"/>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-[#50625d] mb-2">Price *</label>
          <input type="text" id="modal-price" placeholder="e.g. $1,200"
            class="w-full border border-[#a9b4b3] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#50625d]"/>
        </div>
      </div>

      <div id="upload-progress" class="hidden mt-4">
        <div class="w-full bg-[#a9b4b3]/30 rounded-full h-1.5">
          <div id="progress-bar" class="bg-[#50625d] h-1.5 rounded-full transition-all duration-300" style="width:0%"></div>
        </div>
        <p id="progress-text" class="text-xs text-[#a9b4b3] mt-1 text-center">Uploading…</p>
      </div>

      <div class="flex gap-3 mt-6">
        <button id="modal-cancel" class="flex-1 border border-[#a9b4b3] text-[#50625d] py-2 rounded text-sm font-medium hover:bg-[#a9b4b3]/10 transition-colors">Cancel</button>
        <button id="modal-submit" class="flex-1 bg-[#50625d] text-white py-2 rounded text-sm font-medium hover:bg-[#445651] transition-colors">Add to Gallery</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Close handlers
  modal.querySelector('#modal-close').addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // File / drag-drop
  const dropZone  = modal.querySelector('#drop-zone');
  const fileInput = modal.querySelector('#modal-file');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-[#50625d]'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-[#50625d]'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) _showPreview(e.dataTransfer.files[0], modal);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) _showPreview(fileInput.files[0], modal);
  });

  modal.querySelector('#modal-submit').addEventListener('click', () => _submitArtwork(modal, containerEl));
}

function _showPreview(file, modal) {
  const reader = new FileReader();
  reader.onload = (e) => {
    modal.querySelector('#drop-zone').classList.add('hidden');
    modal.querySelector('#preview-wrap').classList.remove('hidden');
    modal.querySelector('#modal-preview').src = e.target.result;
    modal.querySelector('#preview-name').textContent = file.name;
    modal.querySelector('#modal-file')._file = file;
  };
  reader.readAsDataURL(file);
}

async function _submitArtwork(modal, containerEl) {
  const fileInput = modal.querySelector('#modal-file');
  const file   = fileInput._file || fileInput.files[0];
  const title  = modal.querySelector('#modal-title').value.trim();
  const medium = modal.querySelector('#modal-medium').value.trim();
  const price  = modal.querySelector('#modal-price').value.trim();

  if (!file || !title || !medium || !price) {
    alert('Please fill in all fields and select an image.');
    return;
  }

  const submitBtn = modal.querySelector('#modal-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading…';
  modal.querySelector('#upload-progress').classList.remove('hidden');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'studio-georgina/gallery');

    modal.querySelector('#progress-bar').style.width = '40%';
    modal.querySelector('#progress-text').textContent = 'Uploading…';

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) throw new Error(`Cloudinary error: ${res.status}`);
    const data = await res.json();
    const downloadURL = data.secure_url;

    modal.querySelector('#progress-bar').style.width = '80%';

    const order = containerEl.querySelectorAll('[data-gallery-id]').length;

    const docRef = await addDoc(collection(db, 'gallery'), {
      storageUrl: downloadURL,
      title, medium, price, order,
      createdAt: Timestamp.now()
    });

    const newCard = _createCard(docRef.id, { storageUrl: downloadURL, title, medium, price }, true);
    containerEl.appendChild(newCard);

    const countEl = document.getElementById('works-count');
    if (countEl) {
      const n = containerEl.querySelectorAll('[data-gallery-id]').length;
      countEl.textContent = `Showing ${n} works`;
    }

    modal.remove();
  } catch (err) {
    console.error('Upload error:', err);
    alert('Upload failed: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add to Gallery';
  }
}

// XSS-safe string escaping
function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
