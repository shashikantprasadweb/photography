/**
 * Gallery, Exhibition Wall, Cinema Filmstrip & Fullscreen Museum Lightbox Controller
 * Shashikant Prasad Platform (shashikantprasad.com)
 */

(function () {
  'use strict';

  let currentCategory = 'all';
  let activeIndex = 0;
  let filteredItems = [];
  let currentMode = 'exhibition'; // 'exhibition' | 'filmstrip'
  let hudTimer = null;
  let isHudVisible = true;

  const gridContainer = document.getElementById('gallery-grid');
  const filmstripContainer = document.getElementById('filmstrip-container');
  const filmstripTrack = document.getElementById('filmstrip-track');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const modeExhibitionBtn = document.getElementById('mode-exhibition-btn');
  const modeFilmstripBtn = document.getElementById('mode-filmstrip-btn');

  // Fullscreen Museum Lightbox DOM Elements
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxBackdrop = document.getElementById('lightbox-ambient-backdrop');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxHudTop = document.getElementById('lightbox-hud-top');
  const lightboxHudBottom = document.getElementById('lightbox-hud-bottom');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxLocation = document.getElementById('lightbox-location');
  const lightboxExif = document.getElementById('lightbox-exif');
  const lightboxStory = document.getElementById('lightbox-story');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const edgeZoneLeft = document.getElementById('edge-zone-left');
  const edgeZoneRight = document.getElementById('edge-zone-right');
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
    bindFullscreenLightbox();
    bindFeaturedCards(data);
    initFilmstripDrag();
  }

  function resolveAssetPath(p, preferWebp = false) {
    if (!p) return '';
    let target = p;
    if (preferWebp && target.endsWith('.jpg') && target.includes('_thumb')) {
      target = target.replace(/\.jpg$/, '.webp');
    }
    if (target.startsWith('/') || target.startsWith('http')) return target;
    return '/' + target;
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
            src="${resolveAssetPath(item.thumbnail, true)}" 
            alt="${item.title}" 
            loading="lazy" 
            class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            onerror="this.onerror=null; this.src='${resolveAssetPath(item.thumbnail, false)}';"
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
        openFullscreenLightbox(idx);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          filteredItems = [...data];
          openFullscreenLightbox(idx);
        }
      });
    });
  }

  // 1. Curator's Exhibition Wall Rendering
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
            src="${resolveAssetPath(item.thumbnail, true)}" 
            alt="${item.title}" 
            loading="${index < 4 ? 'eager' : 'lazy'}"
            class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            onerror="this.onerror=null; this.src='${resolveAssetPath(item.thumbnail, false)}';"
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

      card.addEventListener('click', () => openFullscreenLightbox(index));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFullscreenLightbox(index);
        }
      });

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
            src="${resolveAssetPath(item.thumbnail, true)}" 
            alt="${item.title}" 
            loading="lazy" 
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onerror="this.onerror=null; this.src='${resolveAssetPath(item.thumbnail, false)}';"
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

      itemEl.addEventListener('click', () => openFullscreenLightbox(index));
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

  // ==========================================================================
  // Cinema Museum Fullscreen Lightbox Controller
  // ==========================================================================

  function renderFullscreenScrubber() {
    if (!lightboxFilmstrip) return;
    lightboxFilmstrip.innerHTML = '';

    filteredItems.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = `hud-thumb-btn ${idx === activeIndex ? 'active' : ''}`;
      btn.setAttribute('aria-label', `Jump to ${item.title}`);
      btn.innerHTML = `<img src="${resolveAssetPath(item.thumbnail, true)}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${resolveAssetPath(item.thumbnail, false)}';" />`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeIndex = idx;
        updateFullscreenContent();
      });
      lightboxFilmstrip.appendChild(btn);
    });

    const activeBtn = lightboxFilmstrip.children[activeIndex];
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  function showHud() {
    isHudVisible = true;
    if (lightboxHudTop) lightboxHudTop.classList.remove('is-hidden');
    if (lightboxHudBottom) lightboxHudBottom.classList.remove('is-hidden');

    if (hudTimer) clearTimeout(hudTimer);
    hudTimer = setTimeout(() => {
      hideHud();
    }, 2800);
  }

  function hideHud() {
    isHudVisible = false;
    if (lightboxHudTop) lightboxHudTop.classList.add('is-hidden');
    if (lightboxHudBottom) lightboxHudBottom.classList.add('is-hidden');
  }

  function updateFullscreenContent() {
    const item = filteredItems[activeIndex];
    if (!item) return;

    const fullImageSrc = resolveAssetPath(item.image);

    // 1. Dynamic ambient blurred backdrop clone
    if (lightboxBackdrop) {
      lightboxBackdrop.style.backgroundImage = `url('${fullImageSrc}')`;
    }

    // 2. High-res optical stage image
    if (lightboxImg) {
      lightboxImg.style.opacity = '0';
      lightboxImg.src = fullImageSrc;
      lightboxImg.alt = item.title;
      lightboxImg.onload = () => {
        lightboxImg.style.opacity = '1';
      };
    }

    // 3. Telemetry and Labels
    if (lightboxTitle) lightboxTitle.textContent = item.title;
    if (lightboxLocation) lightboxLocation.textContent = item.location;
    if (lightboxExif) lightboxExif.textContent = `${item.camera} • ${item.exif}`;
    if (lightboxStory) lightboxStory.textContent = item.story;
    if (lightboxCounter) {
      lightboxCounter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(filteredItems.length).padStart(2, '0')}`;
    }

    renderFullscreenScrubber();
    showHud();
  }

  function openFullscreenLightbox(index) {
    if (!lightbox || !filteredItems[index]) return;
    activeIndex = index;
    updateFullscreenContent();

    lightbox.classList.remove('hidden');
    requestAnimationFrame(() => {
      lightbox.classList.remove('opacity-0');
      lightbox.classList.add('opacity-100');
    });
    document.body.classList.add('overflow-hidden');

    showHud();
  }

  function closeFullscreenLightbox() {
    if (!lightbox) return;
    if (hudTimer) clearTimeout(hudTimer);
    lightbox.classList.remove('opacity-100');
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
      lightbox.classList.add('hidden');
      if (lightboxImg) lightboxImg.src = '';
      if (lightboxBackdrop) lightboxBackdrop.style.backgroundImage = 'none';
    }, 300);
    document.body.classList.remove('overflow-hidden');
  }

  function nextPhoto() {
    if (filteredItems.length === 0) return;
    activeIndex = (activeIndex + 1) % filteredItems.length;
    updateFullscreenContent();
  }

  function prevPhoto() {
    if (filteredItems.length === 0) return;
    activeIndex = (activeIndex - 1 + filteredItems.length) % filteredItems.length;
    updateFullscreenContent();
  }

  function bindFullscreenLightbox() {
    if (!lightbox) return;

    if (lightboxClose) lightboxClose.addEventListener('click', closeFullscreenLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); nextPhoto(); });
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); prevPhoto(); });

    if (edgeZoneLeft) {
      edgeZoneLeft.addEventListener('click', (e) => { e.stopPropagation(); prevPhoto(); });
    }
    if (edgeZoneRight) {
      edgeZoneRight.addEventListener('click', (e) => { e.stopPropagation(); nextPhoto(); });
    }

    // Auto-Hide HUD on mouse movement / idle
    lightbox.addEventListener('mousemove', (e) => {
      showHud();

      // Proximity Edge Detection: reveal arrows when cursor approaches borders
      const w = window.innerWidth;
      const x = e.clientX;
      if (lightboxPrev) {
        if (x < w * 0.18) {
          lightboxPrev.classList.add('force-visible');
        } else {
          lightboxPrev.classList.remove('force-visible');
        }
      }
      if (lightboxNext) {
        if (x > w * 0.82) {
          lightboxNext.classList.add('force-visible');
        } else {
          lightboxNext.classList.remove('force-visible');
        }
      }
    });

    // Close on backdrop / stage click outside controls
    lightbox.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox-stage' || e.target.id === 'lightbox-ambient-backdrop' || e.target.id === 'lightbox-vignette') {
        closeFullscreenLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        closeFullscreenLightbox();
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
