document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');
  
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

  if (themeToggle) {
    themeToggle.addEventListener('click', cycleTheme);
  }

  // Initialize theme on load
  applyTheme(getTheme());

  // Embed Badge Textarea Auto-Select
  const badgeEmbed = document.querySelector('.badge-embed');
  if (badgeEmbed) {
    badgeEmbed.addEventListener('click', function() {
      this.select();
    });
  }
});
