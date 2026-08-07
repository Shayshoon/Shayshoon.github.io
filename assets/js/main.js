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
});
