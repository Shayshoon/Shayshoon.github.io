const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple Jekyll YAML front-matter parser without external dependencies
function parsePost(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  let body = content;

  if (match) {
    body = content.slice(match[0].length).trim();
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        meta[key] = val;
      }
    }
  }

  const filename = path.basename(filePath, path.extname(filePath));
  // Remove leading YYYY-MM-DD- date prefix to get the slug
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase();
  const permalink = meta.permalink || `/journal/${slug}/`;
  const url = `https://shayshoon.github.io${permalink.startsWith('/') ? '' : '/'}${permalink}${permalink.endsWith('/') ? '' : '/'}`;

  return {
    filePath,
    title: meta.title || filename,
    summary: meta.summary || '',
    date: meta.date || '',
    url,
    bodyPreview: body.slice(0, 300)
  };
}

// Find newly added or target post
function findTargetPost() {
  const customFile = process.env.POST_FILE || process.argv[2];
  if (customFile && fs.existsSync(customFile)) {
    return customFile;
  }

  // Check if we are in git repository and can detect newly added files in last commit
  try {
    const gitDiff = execSync('git diff --name-only --diff-filter=A HEAD~1 HEAD', { encoding: 'utf8' }).trim();
    const addedPosts = gitDiff.split(/\r?\n/).filter(f => f.startsWith('_posts/') && f.endsWith('.md'));
    if (addedPosts.length > 0 && fs.existsSync(addedPosts[0])) {
      return addedPosts[0];
    }
  } catch (e) {
    // If git diff fails (e.g. shallow checkout or initial commit), fallback to latest post file
  }

  // Fallback: pick the latest file in _posts/
  const postsDir = path.join(process.cwd(), '_posts');
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    if (files.length > 0) {
      return path.join('_posts', files[0]);
    }
  }

  return null;
}

async function main() {
  const targetPostFile = findTargetPost();
  if (!targetPostFile) {
    console.log('No post file found to broadcast. Exiting.');
    return;
  }

  console.log(`Processing post: ${targetPostFile}`);
  const post = parsePost(targetPostFile);
  console.log(`Title: ${post.title}`);
  console.log(`URL: ${post.url}`);
  console.log(`Date: ${post.date}`);
  console.log(`Summary: ${post.summary}`);

  const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('[DRY RUN] Would send broadcast for this post without emailing subscribers.');
    return;
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const secret = process.env.BROADCAST_SECRET;

  if (!scriptUrl) {
    throw new Error('APPS_SCRIPT_URL environment variable is required.');
  }
  if (!secret) {
    throw new Error('BROADCAST_SECRET environment variable is required.');
  }

  console.log(`Sending broadcast request to Google Apps Script...`);
  const payload = {
    action: 'broadcast',
    secret: secret,
    title: post.title,
    url: post.url,
    summary: post.summary,
    date: post.date
  };

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (err) {
    result = { raw: text };
  }

  console.log('Response from Google Apps Script:', result);

  if (result.status === 'error') {
    throw new Error(`Broadcast failed: ${result.message}`);
  }

  console.log(`Broadcast completed successfully! Sent to ${result.sentCount ?? 'all'} subscribers.`);
}

main().catch(err => {
  console.error('Error during broadcast:', err.message);
  process.exit(1);
});
