/**
 * Gallery, Exhibition Wall, Cinema Filmstrip & Lightbox Controller
 * Shashikant Prasad Platform (shashikantprasad.com)
 */

(function () {
  'use strict';

  let currentCategory = 'all';
  let activeIndex = 0;
  let filteredItems = [];
  let currentMode = 'exhibition'; // 'exhibition' | 'filmstrip'
  let isZoomed = false;

  const gridContainer = document.getElementById('gallery-grid');
  const filmstripContainer = document.getElementById('filmstrip-container');
  const filmstripTrack = document.getElementById('filmstrip-track');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const modeExhibitionBtn = document.getElementById('mode-exhibition-btn');
  const modeFilmstripBtn = document.getElementById('mode-filmstrip-btn');

  // Ambient Canvas & Cursor
  const ambientCanvas = document.getElementById('ambient-glow-canvas');
  const cursorDot = document.getElementById('custom-cursor-dot');
  const cursorRing = document.getElementById('custom-cursor-ring');

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
  const lightboxZoomToggle = document.getElementById('lightbox-zoom-toggle');
  const zoomBtnLabel = document.getElementById('zoom-btn-label');
  const lightboxFilmstrip = document.getElementById('lightbox-filmstrip');

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
    renderFeatured(data);
    renderCounts(data);
    renderExhibitionWall(filteredItems);
    renderFilmstrip(filteredItems);
    bindFilters();
    bindModeToggle();
    bindLightbox();
    bindFeaturedCards(data);
    initAmbientSampling();
    initMagneticCursor();
    initFilmstripDrag();
  }

  function resolveAssetPath(p) {
    if (!p) return '';
    if (p.startsWith('/') || p.startsWith('http')) return p;
    return '/' + p;
  }

  function renderCounts(data) {
    if (!Array.isArray(data)) return;
    const allCount = data.length;
    const catCounts = {};

    data.forEach((item) => {
      if (item && item.category) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
    });

    document.querySelectorAll('[data-gallery-count]').forEach((el) => {
      const key = el.getAttribute('data-gallery-count');
      if (key === 'all') {
        el.textContent = String(allCount);
      } else if (catCounts[key] !== undefined) {
        el.textContent = String(catCounts[key]);
      } else {
        el.textContent = '0';
      }
    });
  }

  function renderFeatured(data) {
    const featuredContainer = document.getElementById('featured-grid');
    if (!featuredContainer) return;

    const featuredIds = window.FEATURED_IDS || [];
    if (!Array.isArray(featuredIds) || featuredIds.length === 0) return;

    featuredContainer.innerHTML = '';

    featuredIds.forEach((id) => {
      const item = data.find((d) => d.id === id);
      if (!item) return;

      const card = document.createElement('article');
      card.setAttribute('data-gallery-id', item.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `View ${item.title} in full-screen lightbox`);
      card.className = 'gallery-card group relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/40 shadow-lg cursor-pointer hover:border-amber-500/50 transition-all duration-300';

      card.innerHTML = `
        <div class="aspect-[4/5] relative overflow-hidden bg-slate-950">
          <img 
            src="${resolveAssetPath(item.thumbnail)}" 
            alt="${item.title}" 
            loading="lazy" 
            class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
          <div class="absolute top-4 left-4 flex items-center gap-2">
            <span class="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700/80 text-[10px] font-semibold tracking-wider uppercase text-amber-400 backdrop-blur-md">
              ${item.categoryLabel}
            </span>
          </div>
          <div class="absolute bottom-4 inset-x-4">
            <span class="text-xs text-slate-400 block mb-1">${item.location}</span>
            <h3 class="font-cinzel text-lg text-white font-bold group-hover:text-amber-200 transition-colors">${item.title}</h3>
            <p class="text-[11px] font-mono text-slate-400 mt-1">${item.exif}</p>
          </div>
        </div>
      `;

      featuredContainer.appendChild(card);
    });
  }

  function bindFeaturedCards(data) {
    const featuredContainer = document.getElementById('featured-grid');
    if (!featuredContainer) return;

    featuredContainer.querySelectorAll('article[data-gallery-id]').forEach((card) => {
      const gid = card.getAttribute('data-gallery-id');
      const idx = data.findIndex((d) => d.id === gid);
      if (idx === -1) return;

      card.addEventListener('click', () => {
        filteredItems = [...data];
        openLightbox(idx);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          filteredItems = [...data];
          openLightbox(idx);
        }
      });
    });
  }

  // 1. Curator's Exhibition Wall Rendering (Asymmetric Editorial Rhythm)
  function renderExhibitionWall(items) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (items.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-20 text-center text-slate-500 font-light">
          <p>No masterworks found in this collection category.</p>
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement('article');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `View ${item.title}`);
      
      // Assign rhythmic editorial spans (Hero 8-col, Tall 4-col, Wide 6-col, Standard 4-col)
      let spanClass = 'grid-card-standard';
      let aspectClass = 'aspect-[4/5]';

      if (index === 0) {
        spanClass = 'grid-card-hero';
        aspectClass = 'aspect-[16/10] sm:aspect-[16/9]';
      } else if (index % 7 === 1) {
        spanClass = 'grid-card-tall';
        aspectClass = 'aspect-[3/4] sm:aspect-[2/3]';
      } else if (index % 7 === 3 || index % 7 === 4) {
        spanClass = 'grid-card-wide';
        aspectClass = 'aspect-[16/10]';
      }

      card.className = `gallery-card group relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-900/40 cursor-pointer shadow-xl hover:border-amber-500/50 transition-all duration-300 ${spanClass}`;

      card.innerHTML = `
        <div class="${aspectClass} relative overflow-hidden bg-slate-950">
          <img 
            src="${resolveAssetPath(item.thumbnail)}" 
            alt="${item.title}" 
            loading="${index < 4 ? 'eager' : 'lazy'}"
            class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/25 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
          
          <div class="absolute top-4 left-4 flex items-center gap-2">
            <span class="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700/80 text-[10px] font-semibold tracking-wider uppercase text-amber-400 backdrop-blur-md">
              ${item.categoryLabel}
            </span>
            ${index === 0 ? '<span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono tracking-widest uppercase text-amber-300">CURATOR HERO</span>' : ''}
          </div>

          <div class="absolute inset-x-0 bottom-0 p-5 sm:p-7 flex flex-col justify-end">
            <span class="text-xs text-slate-400 font-mono mb-1">${item.location}</span>
            <h3 class="font-cinzel text-lg sm:text-2xl text-white font-bold leading-snug group-hover:text-amber-200 transition-colors">
              ${item.title}
            </h3>
            <div class="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-amber-400/90 tracking-wider w-fit backdrop-blur-md">
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

      // Hover triggers subtle chromatic background bloom
      card.addEventListener('mouseenter', () => triggerAmbientBloom(item));

      gridContainer.appendChild(card);
    });
  }

  // 2. Cinema Filmstrip Light-Table Rendering
  function renderFilmstrip(items) {
    if (!filmstripTrack) return;
    filmstripTrack.innerHTML = '';

    items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'filmstrip-item group cursor-pointer';
      itemEl.setAttribute('role', 'button');
      itemEl.setAttribute('tabindex', '0');

      itemEl.innerHTML = `
        <div class="aspect-[16/10] relative overflow-hidden bg-slate-950">
          <img 
            src="${resolveAssetPath(item.thumbnail)}" 
            alt="${item.title}" 
            loading="lazy" 
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#04060a] via-transparent to-transparent opacity-85"></div>
          <div class="absolute top-3 left-3">
            <span class="text-[9px] font-mono tracking-widest uppercase text-amber-400 px-2 py-0.5 rounded bg-black/70 border border-amber-500/30">
              FRAME ${String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <div class="absolute bottom-3 inset-x-3">
            <span class="text-[10px] text-slate-400 font-mono block">${item.location}</span>
            <h4 class="font-cinzel text-sm text-white font-bold truncate group-hover:text-amber-300 transition-colors">${item.title}</h4>
            <span class="text-[10px] font-mono text-amber-400/80 block mt-0.5">${item.exif}</span>
          </div>
        </div>
      `;

      itemEl.addEventListener('click', () => openLightbox(index));
      itemEl.addEventListener('mouseenter', () => triggerAmbientBloom(item));
      filmstripTrack.appendChild(itemEl);
    });
  }

  // 3. View Mode Switcher
  function bindModeToggle() {
    if (!modeExhibitionBtn || !modeFilmstripBtn) return;

    modeExhibitionBtn.addEventListener('click', () => {
      currentMode = 'exhibition';
      modeExhibitionBtn.classList.add('active');
      modeFilmstripBtn.classList.remove('active');
      if (gridContainer) gridContainer.classList.remove('hidden');
      if (filmstripContainer) filmstripContainer.classList.add('hidden');
    });

    modeFilmstripBtn.addEventListener('click', () => {
      currentMode = 'filmstrip';
      modeFilmstripBtn.classList.add('active');
      modeExhibitionBtn.classList.remove('active');
      if (gridContainer) gridContainer.classList.add('hidden');
      if (filmstripContainer) filmstripContainer.classList.remove('hidden');
    });
  }

  // 4. Horizontal Drag Physics on Filmstrip Track
  function initFilmstripDrag() {
    if (!filmstripTrack) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    filmstripTrack.addEventListener('mousedown', (e) => {
      isDown = true;
      filmstripTrack.classList.add('active');
      startX = e.pageX - filmstripTrack.offsetLeft;
      scrollLeft = filmstripTrack.scrollLeft;
    });

    filmstripTrack.addEventListener('mouseleave', () => { isDown = false; });
    filmstripTrack.addEventListener('mouseup', () => { isDown = false; });
    filmstripTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - filmstripTrack.offsetLeft;
      const walk = (x - startX) * 1.8;
      filmstripTrack.scrollLeft = scrollLeft - walk;
    });
  }

  // 5. Category Filter Binding
  function bindFilters() {
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        currentCategory = cat;

        filterButtons.forEach((b) => {
          b.className = 'filter-btn px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white transition-all';
        });
        btn.className = 'filter-btn active px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase border border-slate-700 bg-white text-slate-900 shadow-md transition-all';

        if (cat === 'all') {
          filteredItems = [...window.GALLERY_DATA];
        } else {
          filteredItems = window.GALLERY_DATA.filter((i) => i.category === cat);
        }

        renderExhibitionWall(filteredItems);
        renderFilmstrip(filteredItems);
      });
    });
  }

  // 6. Ambient Chromatic Canvas Sampling
  function initAmbientSampling() {
    if (!ambientCanvas) return;
    const ctx = ambientCanvas.getContext('2d');
    function resize() {
      ambientCanvas.width = window.innerWidth / 4;
      ambientCanvas.height = window.innerHeight / 4;
    }
    resize();
    window.addEventListener('resize', resize);
  }

  function triggerAmbientBloom(item) {
    if (!ambientCanvas || !item) return;
    const ctx = ambientCanvas.getContext('2d');
    if (!ctx) return;

    let r = 245, g = 158, b = 11; // default warm amber
    if (item.category === 'coastal') { r = 14; g = 165; b = 233; } // cyan horizon
    else if (item.category === 'alps') { r = 99; g = 102; b = 241; } // indigo peaks
    else if (item.category === 'wild') { r = 16; g = 185; b = 129; } // emerald moss
    else if (item.category === 'night') { r = 168; g = 85; b = 247; } // violet nocturne

    const w = ambientCanvas.width;
    const h = ambientCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
    grad.addColorStop(1, 'rgba(7, 9, 14, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // 7. Magnetic Custom Cursor Controller
  function initMagneticCursor() {
    if (!cursorDot || !cursorRing) return;
    if (window.matchMedia('(pointer: coarse)').matches) {
      cursorDot.style.display = 'none';
      cursorRing.style.display = 'none';
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
    });

    function renderCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Image inspect hover effect
    document.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.gallery-card, .filmstrip-item');
      if (card) {
        cursorRing.classList.add('cursor-hover-image');
      } else {
        cursorRing.classList.remove('cursor-hover-image');
      }
    });
  }

  // 8. Archival Darkroom Lightbox with Zoom & Thumbnail Scrubber
  function renderLightboxScrubber() {
    if (!lightboxFilmstrip) return;
    lightboxFilmstrip.innerHTML = '';

    filteredItems.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = `lightbox-thumb-btn ${idx === activeIndex ? 'active' : ''}`;
      btn.setAttribute('aria-label', `Jump to ${item.title}`);
      btn.innerHTML = `<img src="${resolveAssetPath(item.thumbnail)}" alt="" class="w-full h-full object-cover" />`;
      btn.addEventListener('click', () => {
        activeIndex = idx;
        updateLightboxContent();
      });
      lightboxFilmstrip.appendChild(btn);
    });

    // Center active thumbnail in scrubber
    const activeBtn = lightboxFilmstrip.children[activeIndex];
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  function resetZoom() {
    isZoomed = false;
    if (lightboxImg) {
      lightboxImg.style.transform = 'scale(1)';
      lightboxImg.classList.remove('is-zoomed');
    }
    if (zoomBtnLabel) zoomBtnLabel.textContent = '100% Zoom';
  }

  function toggleZoom() {
    if (!lightboxImg) return;
    isZoomed = !isZoomed;
    if (isZoomed) {
      lightboxImg.style.transform = 'scale(2.2)';
      lightboxImg.classList.add('is-zoomed');
      if (zoomBtnLabel) zoomBtnLabel.textContent = 'Reset (1:1)';
    } else {
      resetZoom();
    }
  }

  function updateLightboxContent() {
    const item = filteredItems[activeIndex];
    if (!item) return;

    resetZoom();

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

    renderLightboxScrubber();
    triggerAmbientBloom(item);
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
    resetZoom();
    lightbox.classList.remove('opacity-100');
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
      lightbox.classList.add('hidden');
    }, 300);
    document.body.classList.remove('overflow-hidden');
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
    if (lightboxZoomToggle) lightboxZoomToggle.addEventListener('click', toggleZoom);

    if (lightboxImg) {
      lightboxImg.addEventListener('dblclick', toggleZoom);
    }

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
      } else if (e.key === 'z' || e.key === 'Z') {
        toggleZoom();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
