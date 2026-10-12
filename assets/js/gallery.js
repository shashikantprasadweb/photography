/**
 * Gallery & Lightbox Controller — Shashikant Prasad Platform
 * Handles category filtering, dynamic grid rendering, and full-screen modal lightbox.
 */

(function () {
  'use strict';

  let currentCategory = 'all';
  let activeIndex = 0;
  let filteredItems = [];

  const gridContainer = document.getElementById('gallery-grid');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Lightbox DOM Elements
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxCategory = document.getElementById('lightbox-category');
  const lightboxLocation = document.getElementById('lightbox-location');
  const lightboxExif = document.getElementById('lightbox-exif');
  const lightboxStory = document.getElementById('lightbox-story');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  let initAttempts = 0;
  function init() {
    const data = window.GALLERY_DATA || (typeof GALLERY_DATA !== 'undefined' ? GALLERY_DATA : null);
    if (!data || !Array.isArray(data)) {
      if (initAttempts < 40) {
        initAttempts++;
        setTimeout(init, 50);
        return;
      }
      console.warn('GALLERY_DATA not loaded after timeout.');
      return;
    }

    filteredItems = [...data];
    renderGrid(filteredItems);
    bindFilters();
    bindLightbox();
    bindFeaturedCards(data);
  }

  function bindFeaturedCards(data) {
    const featuredCards = document.querySelectorAll('[data-gallery-id], .gallery-card, .featured-photo-card');
    featuredCards.forEach((card) => {
      if (gridContainer && gridContainer.contains(card)) return;

      const photoId = card.getAttribute('data-gallery-id');
      const clickHandler = (e) => {
        if (e.target.closest('a')) return;
        filteredItems = [...data];
        let idx = -1;
        if (photoId) {
          idx = data.findIndex((item) => item.id === photoId);
        }
        if (idx === -1) {
          const img = card.querySelector('img');
          if (img && img.src) {
            idx = data.findIndex((item) => img.src.includes(item.thumbnail) || (item.image && img.src.includes(item.image)));
          }
        }
        if (idx !== -1) {
          openLightbox(idx);
        } else {
          openLightbox(0);
        }
      };

      card.style.cursor = 'pointer';
      card.addEventListener('click', clickHandler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          clickHandler(e);
        }
      });
    });
  }


  function resolveAssetPath(p) {
    if (!p) return '';
    if (p.startsWith('/') || p.startsWith('http')) return p;
    return '/' + p;
  }

  function renderGrid(items) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (items.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-500">
          <p>No photographs found in this category.</p>
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'gallery-card group relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/40 cursor-pointer shadow-lg hover:border-amber-500/40 transition-all duration-300';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `View ${item.title}`);

      card.innerHTML = `
        <div class="aspect-[4/5] relative overflow-hidden bg-slate-950">
          <img 
            src="${resolveAssetPath(item.thumbnail)}" 
            alt="${item.title}" 
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
          
          <div class="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end">
            <span class="text-amber-400 text-[10px] font-semibold tracking-widest uppercase mb-1.5 inline-block">
              ${item.categoryLabel}
            </span>
            <h3 class="font-cinzel text-lg text-white font-bold mb-1 leading-snug group-hover:text-amber-200 transition-colors">
              ${item.title}
            </h3>
            <p class="text-xs text-slate-400 font-mono flex items-center gap-2 mb-2">
              <span>${item.location}</span>
            </p>
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-300 font-mono tracking-wider w-fit">
              ${item.exif}
            </div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openLightbox(index));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(index);
        }
      });

      gridContainer.appendChild(card);
    });
  }

  function bindFilters() {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        currentCategory = cat;

        filterButtons.forEach((b) => {
          b.className = 'filter-btn px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all';
        });
        btn.className = 'filter-btn px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase bg-white text-slate-900 shadow-md transition-all';

        if (cat === 'all') {
          filteredItems = [...window.GALLERY_DATA];
        } else {
          filteredItems = window.GALLERY_DATA.filter((i) => i.category === cat);
        }

        renderGrid(filteredItems);
      });
    });
  }

  function openLightbox(index) {
    if (!lightbox || !filteredItems[index]) return;
    activeIndex = index;
    updateLightboxContent();

    lightbox.classList.remove('hidden');
    requestAnimationFrame(() => {
      lightbox.classList.remove('opacity-0');
      lightbox.classList.add('opacity-100');
    });
    document.body.classList.add('overflow-hidden');

    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('opacity-100');
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
      lightbox.classList.add('hidden');
    }, 300);
    document.body.classList.remove('overflow-hidden');
  }

  function updateLightboxContent() {
    const item = filteredItems[activeIndex];
    if (!item) return;

    if (lightboxImg) {
      lightboxImg.src = resolveAssetPath(item.image);
      lightboxImg.alt = item.title;
    }
    if (lightboxTitle) lightboxTitle.textContent = item.title;
    if (lightboxCategory) lightboxCategory.textContent = item.categoryLabel;
    if (lightboxLocation) lightboxLocation.textContent = item.location;
    if (lightboxExif) lightboxExif.textContent = `${item.camera} • ${item.exif}`;
    if (lightboxStory) lightboxStory.textContent = item.story;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(filteredItems.length).padStart(2, '0')}`;
    }
  }

  function nextPhoto() {
    if (filteredItems.length === 0) return;
    activeIndex = (activeIndex + 1) % filteredItems.length;
    updateLightboxContent();
  }

  function prevPhoto() {
    if (filteredItems.length === 0) return;
    activeIndex = (activeIndex - 1 + filteredItems.length) % filteredItems.length;
    updateLightboxContent();
  }

  function bindLightbox() {
    if (!lightbox) return;

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', nextPhoto);
    if (lightboxPrev) lightboxPrev.addEventListener('click', prevPhoto);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.id === 'lightbox-backdrop') {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === 'ArrowLeft') {
        prevPhoto();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
