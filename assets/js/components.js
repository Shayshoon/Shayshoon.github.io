class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="site-header">
        <nav class="site-nav" aria-label="Main Navigation">
          <a href="/" class="nav-home" aria-current="page">~shay</a>
          <ul class="nav-links">
            <li><a href="/about/">About</a></li>
            <li><a href="/now/">Now</a></li>
            <li><a href="/journal/">Journal</a></li>
            <li><a href="/garden/">Garden</a></li>
            <li><a href="/projects/">Projects</a></li>
            <li><a href="/links/">Links</a></li>
          </ul>
          <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode" title="Toggle theme">
            <span class="theme-icon" aria-hidden="true">◐</span>
          </button>
        </nav>
      </header>
    `;

    // Highlight the active link
    const currentPath = window.location.pathname;
    const links = this.querySelectorAll('a');
    links.forEach(link => {
      // Remove active class from all first
      link.classList.remove('active');
      link.removeAttribute('aria-current');

      const href = link.getAttribute('href');
      // Root exactly matches, others prefix match
      if ((href === '/' && currentPath === '/') || (href !== '/' && currentPath.startsWith(href))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    // Dispatch event so main.js can hook up the theme toggle listener if needed
    document.dispatchEvent(new Event('header-loaded'));
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">
        <nav class="webring-nav" aria-label="Webring">
          <span class="webring-title">IndieWeb Webring</span>
          <a href="https://webring.example.com/prev" title="Previous Site">&larr; Prev</a>
          <a href="https://webring.example.com/random" title="Random Site">&#9858; Random</a>
          <a href="https://webring.example.com/next" title="Next Site">Next &rarr;</a>
        </nav>
        <p class="footer-text">
          Built with plain HTML, CSS &amp; a sprinkle of JS. No tracking. No frameworks. Just the open web.<br>
          Content shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license">CC BY-SA 4.0</a> unless noted.
        </p>
      </footer>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
