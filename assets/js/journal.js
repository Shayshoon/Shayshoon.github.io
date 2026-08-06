window.Journal = {
  // Parse frontmatter from markdown string
  // Returns { meta: {title, date, time, location}, content: 'markdown body' }
  parseFrontmatter(mdText) {
    const match = mdText.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      return { meta: {}, content: mdText };
    }
    
    const metaStr = match[1];
    const content = match[2];
    const meta = {};
    
    metaStr.split('\n').forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        // Remove surrounding quotes if present
        if (/^['"].*['"]$/.test(value)) {
          value = value.slice(1, -1);
        }
        meta[key] = value;
      }
    });
    
    return { meta, content };
  },
  
  // Render the post list on journal/index.html
  // Fetches manifest.json, creates HTML for each entry (reverse chronological)
  async renderPostList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const response = await fetch('/journal/posts/manifest.json');
      if (!response.ok) throw new Error('Failed to load posts manifest');
      
      const data = await response.json();
      const posts = Array.isArray(data) ? data : data.posts;
      
      // Sort posts by date descending
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const html = posts.map(post => {
        const dateStr = new Date(post.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        return `
          <article class="journal-entry">
            <a href="/journal/entry/?post=${encodeURIComponent(post.slug)}">
              <time datetime="${post.date}">${dateStr}</time>
              ${post.time ? `<span class="journal-time">${post.time}</span>` : ''}
              ${post.location ? `<span class="journal-location">📍 ${post.location}</span>` : ''}
              <h2>${post.title}</h2>
              ${post.summary ? `<p class="journal-summary">${post.summary}</p>` : ''}
            </a>
          </article>
        `;
      }).join('');
      
      container.innerHTML = `<ul class="journal-list">${html}</ul>`;
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="journal-error">Could not load the journal at this time.</p>`;
    }
  },
  
  // Render a single post on journal/post.html  
  // Reads ?post= param, fetches the .md file, renders with marked
  async renderPost(containerId, metaContainerId) {
    const container = document.getElementById(containerId);
    const metaContainer = document.getElementById(metaContainerId);
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('post');
    
    if (!slug) {
      container.innerHTML = `<p class="journal-error">Post not found.</p>`;
      return;
    }

    try {
      const response = await fetch(`/journal/posts/${slug}.md`);
      if (!response.ok) throw new Error('Post not found');
      
      const mdText = await response.text();
      const { meta, content } = this.parseFrontmatter(mdText);
      
      if (meta.title) {
        document.title = `${meta.title} — Shay's Digital Home`;
      }
      
      if (metaContainer) {
        const dateStr = meta.date ? new Date(meta.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '';
        
        metaContainer.innerHTML = `
          <div class="journal-post-meta">
            <h1>${meta.title || 'Untitled'}</h1>
            <div class="meta-line">
              ${meta.date ? `<time datetime="${meta.date}">${dateStr}</time>` : ''}
              ${meta.time ? `<span class="journal-time">${meta.time}</span>` : ''}
              ${meta.location ? `<span class="journal-location">📍 ${meta.location}</span>` : ''}
            </div>
          </div>
        `;
      }

      // Configure marked renderer for custom image/video handling
      if (window.marked) {
        const renderer = new window.marked.Renderer();
        
        renderer.image = function({ href, title, text }) {
          const isVideo = /\.(mp4|webm|mov|ogg|avi)$/i.test(href);
          
          if (isVideo) {
            const ext = href.split('.').pop().toLowerCase();
            return `
              <figure>
                <video controls playsinline>
                  <source src="${href}" type="video/${ext === 'mov' ? 'mp4' : ext}">
                </video>
                ${text ? `<figcaption>${text}</figcaption>` : ''}
              </figure>
            `;
          } else if (text && text.trim().length > 0) {
            return `
              <figure>
                <img src="${href}" alt="${text}"${title ? ` title="${title}"` : ''}>
                <figcaption>${text}</figcaption>
              </figure>
            `;
          }
          
          return `<img src="${href}" alt="${text || ''}"${title ? ` title="${title}"` : ''}>`;
        };
        
        window.marked.use({ renderer });
        container.innerHTML = `<div class="journal-content">${window.marked.parse(content)}</div>`;
      } else {
        container.innerHTML = `<p class="journal-error">Markdown parser not loaded.</p>`;
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `<p class="journal-error">Error loading post.</p>`;
    }
  }
};

// Auto-initialize: deferred scripts run after DOM is ready
(function() {
  var listEl = document.getElementById('journal-list');
  var postEl = document.getElementById('post-content');
  if (listEl) {
    window.Journal.renderPostList('journal-list');
  } else if (postEl) {
    window.Journal.renderPost('post-content', 'post-meta');
  }
})();
