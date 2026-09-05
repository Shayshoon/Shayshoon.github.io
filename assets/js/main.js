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

  // Handle Email Subscribe Form Submission (Google Sheets)
  function initSubscribeForm() {
    const subscribeForms = document.querySelectorAll('.subscribe-form');
    subscribeForms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const actionUrl = form.getAttribute('action')?.trim();
        const submitBtn = form.querySelector('.subscribe-submit-btn');
        const input = form.querySelector('.subscribe-input');
        const statusMsg = form.querySelector('.subscribe-status-msg');
        const email = input.value.trim();

        if (!actionUrl || actionUrl === "") {
          if (statusMsg) {
            statusMsg.textContent = 'Please configure your Google Sheet URL in _config.yml to start collecting emails.';
            statusMsg.className = 'subscribe-status-msg error';
            statusMsg.style.display = 'block';
          }
          return;
        }

        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';
        if (statusMsg) statusMsg.style.display = 'none';

        try {
          const formData = new FormData();
          formData.append('email', email);
          formData.append('date', new Date().toISOString());

          await fetch(actionUrl, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
          });

          input.value = '';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Subscribed!';
          if (statusMsg) {
            statusMsg.textContent = "✓ You're subscribed! Thanks for following along.";
            statusMsg.className = 'subscribe-status-msg success';
            statusMsg.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
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

  // Journal Post Image Lightbox & Scrollable Gallery
  function initPostLightbox() {
    const journalContent = document.querySelector('.journal-content');
    let photoStripContainer = document.querySelector('.post-photo-strip-container');
    let photoStrip = document.querySelector('.post-photo-strip');

    // Automatically detect and extract a Markdown gallery section (e.g. ### Gallery or ### Photos)
    if (journalContent) {
      const GALLERY_TITLES = [
        'gallery', 'photos', 'photo strip', 'strip', 'images',
        'תמונות', 'גלריה', 'רצועת תמונות'
      ];

      const headings = Array.from(journalContent.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const galleryHeading = headings.find(h => {
        const text = h.textContent.trim().toLowerCase();
        return GALLERY_TITLES.includes(text);
      });

      if (galleryHeading) {
        const headingLevel = parseInt(galleryHeading.tagName.substring(1), 10);
        const elementsToRemove = [galleryHeading];
        const extractedImages = [];
        let nextNode = galleryHeading.nextElementSibling;

        while (nextNode) {
          if (/^H[1-6]$/i.test(nextNode.tagName)) {
            const nextLevel = parseInt(nextNode.tagName.substring(1), 10);
            if (nextLevel <= headingLevel) {
              break;
            }
          }

          const imgs = nextNode.querySelectorAll('img');
          imgs.forEach(img => {
            extractedImages.push({
              src: img.getAttribute('src') || img.src,
              alt: (img.getAttribute('alt') || '').trim()
            });
          });

          elementsToRemove.push(nextNode);
          nextNode = nextNode.nextElementSibling;
        }

        // Remove the gallery section from the body so it's not featured in the post body
        elementsToRemove.forEach(el => el.remove());

        // Create or populate the top strip container with the extracted images
        if (extractedImages.length > 0) {
          if (!photoStripContainer) {
            photoStripContainer = document.createElement('div');
            photoStripContainer.className = 'post-photo-strip-container';
            photoStripContainer.innerHTML = `<div class="post-photo-strip" aria-label="Photo strip gallery"></div>`;
            journalContent.insertAdjacentElement('beforebegin', photoStripContainer);
            photoStrip = photoStripContainer.querySelector('.post-photo-strip');
          }

          extractedImages.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'strip-thumb-btn';
            btn.type = 'button';
            btn.setAttribute('aria-label', (item.alt ? item.alt + ' - ' : '') + 'View photo in gallery');
            btn.innerHTML = `<img src="${item.src}" alt="${item.alt}" class="strip-thumb-img" />`;
            photoStrip.appendChild(btn);
          });
        }
      }
    }

    if (!journalContent && !photoStrip) return;

    const stripImages = photoStrip ? Array.from(photoStrip.querySelectorAll('img')) : [];
    const contentImages = journalContent ? Array.from(journalContent.querySelectorAll('img')) : [];
    const images = [...stripImages, ...contentImages];
    if (!images.length) return;

    // Create lightbox DOM elements if not already present
    let lightbox = document.querySelector('.image-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'image-lightbox';
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-label', 'Image gallery');
      lightbox.innerHTML = `
        <button class="image-lightbox-close" aria-label="Close image gallery">&times;</button>
        <button class="image-lightbox-arrow image-lightbox-prev" aria-label="Previous image">&#10094;</button>
        <button class="image-lightbox-arrow image-lightbox-next" aria-label="Next image">&#10095;</button>
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

    // Build the gallery slides for all images in the post (strip + body)
    track.innerHTML = '';
    images.forEach((img, idx) => {
      const altText = (img.getAttribute('alt') || '').trim();
      const isStripImg = img.classList.contains('strip-thumb-img');

      // For in-body images: render caption on page if alt text is provided
      if (!isStripImg && altText && !img.parentElement.querySelector('.journal-caption') && !img.closest('figure')?.querySelector('figcaption')) {
        const captionEl = document.createElement('div');
        captionEl.className = 'journal-caption';
        captionEl.textContent = altText;
        img.insertAdjacentElement('afterend', captionEl);
      }

      // Add interactive attributes to post image (if not already button-wrapped)
      if (!isStripImg) {
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', (altText ? altText + ' - ' : '') + 'Click to view full image in gallery');
      }

      // Create slide in lightbox track
      const slide = document.createElement('div');
      slide.className = 'image-lightbox-slide';
      slide.setAttribute('data-index', idx);

      const captionHtml = altText ? `<div class="image-lightbox-caption">${altText}</div>` : '';
      slide.innerHTML = `
        <div class="image-lightbox-container">
          <img class="image-lightbox-img" src="${img.currentSrc || img.src}" alt="${altText}" />
          ${captionHtml}
        </div>
      `;
      track.appendChild(slide);

      // Open lightbox trigger
      const trigger = isStripImg ? (img.closest('.strip-thumb-btn') || img) : img;
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openLightbox(idx);
      });

      if (!isStripImg) {
        img.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(idx);
          }
        });
      }
    });

    const slides = Array.from(track.querySelectorAll('.image-lightbox-slide'));
    let currentIndex = 0;
    let previousActiveElement = null;
    let isScrolling = false;

    function updateNavState(index) {
      currentIndex = index;
      if (counter) {
        counter.textContent = `${currentIndex + 1} / ${slides.length}`;
      }
      prevBtn.disabled = (currentIndex === 0);
      nextBtn.disabled = (currentIndex === slides.length - 1);
    }

    function goToSlide(index, smooth = true) {
      if (index < 0) index = 0;
      if (index >= slides.length) index = slides.length - 1;
      currentIndex = index;

      const targetSlide = slides[currentIndex];
      if (targetSlide) {
        track.scrollTo({
          left: targetSlide.offsetLeft,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
      updateNavState(currentIndex);
    }

    function openLightbox(index) {
      previousActiveElement = document.activeElement;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Show or hide arrows & counter depending on image count
      const multiple = slides.length > 1;
      prevBtn.style.display = multiple ? 'flex' : 'none';
      nextBtn.style.display = multiple ? 'flex' : 'none';
      counter.style.display = multiple ? 'block' : 'none';

      // Instantly position track at clicked slide
      goToSlide(index, false);
      closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    }

    // Update active slide on scroll (e.g. trackpad swipe, touch scroll, scroll-snap)
    track.addEventListener('scroll', () => {
      const slideWidth = track.clientWidth || window.innerWidth;
      const newIndex = Math.round(track.scrollLeft / slideWidth);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < slides.length) {
        updateNavState(newIndex);
      }
    }, { passive: true });

    // Mouse wheel navigation between slides
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

    // Side navigation button clicks
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentIndex - 1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(currentIndex + 1);
    });

    // Close button click
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });

    // Close when clicking outside image/container
    lightbox.addEventListener('click', (e) => {
      if (e.target.classList.contains('image-lightbox-slide') || e.target.classList.contains('image-lightbox-track')) {
        closeLightbox();
      }
    });

    // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToSlide(currentIndex + 1);
      }
    });
  }

  initPostLightbox();
});
