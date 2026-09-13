document.addEventListener('DOMContentLoaded', () => {
  let themeToggle, themeIcon;

  const ICONS = {
    auto: '◐',
    light: '☀',
    dark: '●'
  };

  function getTheme() {
    return localStorage.getItem('theme') || 'auto';
  }

  function applyTheme(theme) {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (themeIcon) {
      themeIcon.textContent = ICONS[theme];
    }
  }

  function cycleTheme() {
    const currentTheme = getTheme();
    let nextTheme = 'auto';
    
    if (currentTheme === 'auto') nextTheme = 'light';
    else if (currentTheme === 'light') nextTheme = 'dark';
    
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
  }

  function initThemeToggle() {
    const siteHeader = document.querySelector('site-header');
    if (siteHeader) {
      themeToggle = siteHeader.querySelector('#theme-toggle');
      themeIcon = themeToggle?.querySelector('.theme-icon');
      if (themeToggle) {
        themeToggle.addEventListener('click', cycleTheme);
      }
    }
    applyTheme(getTheme());
  }

  // Since components.js is a deferred script that runs before main.js, 
  // the custom element is already defined and upgraded by the time DOMContentLoaded fires.
  initThemeToggle();

  // Embed Badge Textarea Auto-Select
  const badgeEmbed = document.querySelector('.badge-embed');
  if (badgeEmbed) {
    badgeEmbed.addEventListener('click', function() {
      this.select();
    });
  }



  // Journal Post Image & Video Lightbox & Scrollable Gallery
  function initPostLightbox() {
    const journalContent = document.querySelector('.journal-content');
    let photoStripContainer = document.querySelector('.post-photo-strip-container');
    let photoStrip = document.querySelector('.post-photo-strip');

    if (!journalContent && !photoStrip) return;

    const VIDEO_EXT_REGEX = /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i;
    function isVideoUrl(url) {
      if (!url) return false;
      return VIDEO_EXT_REGEX.test(url.trim());
    }

    // 1. Transform in-body Markdown video images: ![caption](video.mp4) -> <div class="journal-video-wrapper">...</div>
    if (journalContent) {
      const inBodyImgs = Array.from(journalContent.querySelectorAll('img'));
      inBodyImgs.forEach(img => {
        const src = img.getAttribute('src') || img.src || '';
        if (isVideoUrl(src)) {
          const altText = (img.getAttribute('alt') || '').trim();
          const videoWrapper = document.createElement('div');
          videoWrapper.className = 'journal-video-wrapper';
          videoWrapper.setAttribute('role', 'button');
          videoWrapper.setAttribute('tabindex', '0');
          videoWrapper.setAttribute('aria-label', (altText ? altText + ' - ' : '') + 'Click to view full video in gallery');

          const videoEl = document.createElement('video');
          videoEl.className = 'journal-video';
          videoEl.src = src.includes('#t=') ? src : `${src}#t=0.001`;
          videoEl.preload = 'metadata';
          videoEl.muted = true;
          videoEl.playsInline = true;

          const playBtn = document.createElement('div');
          playBtn.className = 'journal-video-play-btn';
          playBtn.setAttribute('aria-hidden', 'true');
          playBtn.textContent = '▶';

          videoWrapper.appendChild(videoEl);
          videoWrapper.appendChild(playBtn);

          img.replaceWith(videoWrapper);

          if (altText && !videoWrapper.parentElement.querySelector('.journal-caption')) {
            const captionEl = document.createElement('div');
            captionEl.className = 'journal-caption';
            captionEl.textContent = altText;
            videoWrapper.insertAdjacentElement('afterend', captionEl);
          }
        }
      });
    }

    // 2. Extract Markdown gallery section (### Gallery, ### Photos, ### Videos, etc.)
    const extraGalleryItems = [];
    if (journalContent) {
      const GALLERY_TITLES = [
        'gallery', 'photos', 'photo strip', 'strip', 'images', 'videos', 'media',
        'תמונות', 'גלריה', 'רצועת תמונות', 'סרטונים', 'מדיה', 'וידאו'
      ];

      const headings = Array.from(journalContent.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const galleryHeading = headings.find(h => {
        const text = h.textContent.trim().toLowerCase();
        return GALLERY_TITLES.includes(text);
      });

      if (galleryHeading) {
        const headingLevel = parseInt(galleryHeading.tagName.substring(1), 10);
        const elementsToRemove = [galleryHeading];
        let nextNode = galleryHeading.nextElementSibling;

        while (nextNode) {
          if (/^H[1-6]$/i.test(nextNode.tagName)) {
            const nextLevel = parseInt(nextNode.tagName.substring(1), 10);
            if (nextLevel <= headingLevel) {
              break;
            }
          }

          const mediaNodes = nextNode.querySelectorAll('img, video');
          mediaNodes.forEach(node => {
            if (node.tagName.toLowerCase() === 'video') {
              const rawSrc = node.getAttribute('src') || node.currentSrc || node.querySelector('source')?.getAttribute('src') || '';
              const cleanSrc = rawSrc.replace(/#t=[\d.]+/, '');
              const alt = (node.getAttribute('title') || node.getAttribute('aria-label') || '').trim();
              if (cleanSrc) {
                extraGalleryItems.push({ type: 'video', src: cleanSrc, alt });
              }
            } else {
              const src = node.getAttribute('src') || node.src || '';
              const alt = (node.getAttribute('alt') || '').trim();
              if (src) {
                extraGalleryItems.push({
                  type: isVideoUrl(src) ? 'video' : 'image',
                  src: isVideoUrl(src) ? src.replace(/#t=[\d.]+/, '') : src,
                  alt
                });
              }
            }
          });

          elementsToRemove.push(nextNode);
          nextNode = nextNode.nextElementSibling;
        }

        elementsToRemove.forEach(el => el.remove());
      }
    }

    // 3. Find all in-body media in document order
    const inBodyMediaItems = [];
    if (journalContent) {
      const inBodyElements = Array.from(journalContent.querySelectorAll('img:not(.strip-thumb-img), .journal-video-wrapper, figure video:not(.journal-video)'));
      inBodyElements.forEach(el => {
        if (el.classList.contains('journal-video-wrapper')) {
          const vid = el.querySelector('video');
          const rawSrc = vid?.getAttribute('src') || vid?.currentSrc || '';
          const cleanSrc = rawSrc.replace(/#t=[\d.]+/, '');
          const captionEl = el.nextElementSibling?.classList.contains('journal-caption') ? el.nextElementSibling : null;
          const alt = (captionEl ? captionEl.textContent : (el.getAttribute('aria-label') || '')).replace(/\s*-\s*Click to view full video in gallery$/i, '').trim();
          inBodyMediaItems.push({
            type: 'video',
            src: cleanSrc,
            alt: alt,
            inBodyEl: el
          });
        } else if (el.tagName.toLowerCase() === 'img') {
          const altText = (el.getAttribute('alt') || '').trim();
          if (altText && !el.parentElement.querySelector('.journal-caption') && !el.closest('figure')?.querySelector('figcaption')) {
            const captionEl = document.createElement('div');
            captionEl.className = 'journal-caption';
            captionEl.textContent = altText;
            el.insertAdjacentElement('afterend', captionEl);
          }
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', (altText ? altText + ' - ' : '') + 'Click to view full image in gallery');
          inBodyMediaItems.push({
            type: 'image',
            src: el.currentSrc || el.src,
            alt: altText,
            inBodyEl: el
          });
        } else if (el.tagName.toLowerCase() === 'video') {
          const rawSrc = el.getAttribute('src') || el.currentSrc || '';
          const cleanSrc = rawSrc.replace(/#t=[\d.]+/, '');
          const figcaption = el.closest('figure')?.querySelector('figcaption');
          const altText = (figcaption ? figcaption.textContent : (el.getAttribute('title') || el.getAttribute('aria-label') || '')).trim();
          inBodyMediaItems.push({
            type: 'video',
            src: cleanSrc,
            alt: altText,
            inBodyEl: el
          });
        }
      });
    }

    // 4. Combine all post media: in-body media (chronological story order) + extra gallery items
    const allMedia = [...inBodyMediaItems, ...extraGalleryItems];
    if (!allMedia.length) return;

    // 5. Populate or create the top images reel (photo & video strip)
    if (allMedia.length > 0) {
      if (!photoStripContainer) {
        photoStripContainer = document.createElement('div');
        photoStripContainer.className = 'post-photo-strip-container';
        photoStripContainer.innerHTML = `<div class="post-photo-strip" aria-label="Photo and video gallery reel"></div>`;
        journalContent.insertAdjacentElement('beforebegin', photoStripContainer);
        photoStrip = photoStripContainer.querySelector('.post-photo-strip');
      }

      if (photoStrip) {
        photoStrip.innerHTML = '';
        allMedia.forEach((item, idx) => {
          const btn = document.createElement('button');
          btn.className = 'strip-thumb-btn' + (item.type === 'video' ? ' strip-thumb-video-btn' : '');
          btn.type = 'button';
          btn.setAttribute('aria-label', (item.alt ? item.alt + ' - ' : '') + `View ${item.type} in gallery`);
          if (item.type === 'video') {
            btn.innerHTML = `
              <div class="strip-thumb-wrapper">
                <video src="${item.src}#t=0.001" preload="metadata" muted playsinline class="strip-thumb-img strip-thumb-video"></video>
                <span class="strip-play-badge" aria-hidden="true">▶</span>
              </div>
            `;
          } else {
            btn.innerHTML = `<img src="${item.src}" alt="${item.alt}" class="strip-thumb-img" />`;
          }
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            openLightbox(idx);
          });
          photoStrip.appendChild(btn);
        });
      }
    }

    // 6. Connect in-body elements to open lightbox at their index
    allMedia.forEach((item, idx) => {
      if (item.inBodyEl) {
        item.inBodyEl.addEventListener('click', (e) => {
          e.preventDefault();
          openLightbox(idx);
        });
        item.inBodyEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(idx);
          }
        });
      }
    });

    // 7. Create lightbox DOM elements if not already present
    let lightbox = document.querySelector('.image-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'image-lightbox';
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-label', 'Media gallery');
      lightbox.innerHTML = `
        <button class="image-lightbox-close" aria-label="Close media gallery">&times;</button>
        <button class="image-lightbox-arrow image-lightbox-prev" aria-label="Previous media">&#10094;</button>
        <button class="image-lightbox-arrow image-lightbox-next" aria-label="Next media">&#10095;</button>
        <div class="image-lightbox-counter"></div>
        <div class="image-lightbox-track"></div>
      `;
      document.body.appendChild(lightbox);
    }

    const track = lightbox.querySelector('.image-lightbox-track');
    const closeBtn = lightbox.querySelector('.image-lightbox-close');
    const prevBtn = lightbox.querySelector('.image-lightbox-prev');
    const nextBtn = lightbox.querySelector('.image-lightbox-next');
    const counter = lightbox.querySelector('.image-lightbox-counter');

    // 8. Build lightbox slides
    track.innerHTML = '';
    allMedia.forEach((item, idx) => {
      const slide = document.createElement('div');
      slide.className = 'image-lightbox-slide';
      slide.setAttribute('data-index', idx);

      const captionHtml = item.alt ? `<div class="image-lightbox-caption">${item.alt}</div>` : '';
      if (item.type === 'video') {
        slide.innerHTML = `
          <div class="image-lightbox-container image-lightbox-video-container">
            <video class="image-lightbox-video" src="${item.src}" controls playsinline preload="auto"></video>
            ${captionHtml}
          </div>
        `;
      } else {
        slide.innerHTML = `
          <div class="image-lightbox-container">
            <img class="image-lightbox-img" src="${item.src}" alt="${item.alt}" />
            ${captionHtml}
          </div>
        `;
      }

      // Stop click inside slide container from closing the lightbox
      const container = slide.querySelector('.image-lightbox-container');
      if (container) {
        container.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      track.appendChild(slide);
    });

    const slides = Array.from(track.querySelectorAll('.image-lightbox-slide'));
    let currentIndex = 0;
    let previousActiveElement = null;
    let isProgrammaticScroll = false;

    function updateNavState(index) {
      currentIndex = index;
      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${slides.length}`;
      }
      prevBtn.disabled = (currentIndex === 0);
      nextBtn.disabled = (currentIndex === slides.length - 1);

      // Play video on active slide, pause on all others
      slides.forEach((s, i) => {
        const vid = s.querySelector('video');
        if (vid) {
          if (i !== currentIndex) {
            vid.pause();
          } else {
            vid.play().catch(() => {});
          }
        }
      });
    }

    function goToSlide(index, smooth = true) {
      if (index < 0) index = 0;
      if (index >= slides.length) index = slides.length - 1;
      currentIndex = index;

      const targetSlide = slides[currentIndex];
      if (targetSlide) {
        isProgrammaticScroll = true;
        track.scrollTo({
          left: targetSlide.offsetLeft,
          behavior: smooth ? 'smooth' : 'auto'
        });
        setTimeout(() => {
          isProgrammaticScroll = false;
        }, smooth ? 400 : 80);
      }
      updateNavState(currentIndex);
    }

    function openLightbox(index) {
      previousActiveElement = document.activeElement;
      document.querySelectorAll('.journal-content video').forEach(v => v.pause());

      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';

      const multiple = slides.length > 1;
      prevBtn.style.display = multiple ? 'flex' : 'none';
      nextBtn.style.display = multiple ? 'flex' : 'none';
      counter.style.display = multiple ? 'block' : 'none';

      goToSlide(index, false);
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      slides.forEach(s => {
        const vid = s.querySelector('video');
        if (vid) {
          vid.pause();
        }
      });
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    }

    track.addEventListener('scroll', () => {
      if (isProgrammaticScroll) return;
      const slideWidth = track.clientWidth || window.innerWidth;
      if (!slideWidth) return;
      const newIndex = Math.round(track.scrollLeft / slideWidth);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < slides.length) {
        updateNavState(newIndex);
      }
    }, { passive: true });

    let wheelTimeout = null;
    track.addEventListener('wheel', (e) => {
      if (slides.length <= 1) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 25) {
        e.preventDefault();
        if (wheelTimeout) return;
        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 300);

        if (e.deltaY > 0) {
          goToSlide(currentIndex + 1);
        } else {
          goToSlide(currentIndex - 1);
        }
      }
    }, { passive: false });

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentIndex - 1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentIndex + 1);
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target.classList.contains('image-lightbox-slide') || e.target.classList.contains('image-lightbox-track') || e.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        if (document.activeElement && document.activeElement.tagName === 'VIDEO') return;
        e.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        if (document.activeElement && document.activeElement.tagName === 'VIDEO') return;
        e.preventDefault();
        goToSlide(currentIndex + 1);
      }
    });
  }

  initPostLightbox();

  // Subscribe Form AJAX Handler (Google Sheets via Apps Script)
  function initSubscribeForm() {
    const forms = document.querySelectorAll('.subscribe-form');
    forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const actionUrl = form.getAttribute('action')?.trim();
        const submitBtn = form.querySelector('.subscribe-submit-btn');
        const input = form.querySelector('.subscribe-input');
        const statusMsg = form.querySelector('.subscribe-status-msg');
        const email = input ? input.value.trim() : '';

        if (!actionUrl || !email) return;

        const originalBtnText = submitBtn ? submitBtn.textContent : 'Subscribe';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Subscribing...';
        }
        if (statusMsg) {
          statusMsg.style.display = 'none';
        }

        try {
          const params = new URLSearchParams();
          params.append('email', email);
          params.append('date', new Date().toISOString());

          await fetch(actionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            mode: 'no-cors'
          });

          if (input) input.value = '';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Subscribed!';
          }
          if (statusMsg) {
            statusMsg.textContent = "✓ You're subscribed! Thanks for following along.";
            statusMsg.className = 'subscribe-status-msg success';
            statusMsg.style.display = 'block';
          }
          setTimeout(() => {
            if (submitBtn) submitBtn.textContent = originalBtnText;
          }, 4000);
        } catch (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          }
          if (statusMsg) {
            statusMsg.textContent = 'Oops, something went wrong. Please try again or subscribe via RSS.';
            statusMsg.className = 'subscribe-status-msg error';
            statusMsg.style.display = 'block';
          }
        }
      });
    });
  }

  initSubscribeForm();
});

