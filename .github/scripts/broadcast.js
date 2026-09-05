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

  // Calculate word count and estimated reading time
  const cleanBody = body.replace(/!\[.*?\]\([^)]+\)/g, '').replace(/\[.*?\]\([^)]+\)/g, '').replace(/[#*_`]/g, '');
  const words = cleanBody.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(words / 180));

  // Count photos in body and frontmatter
  const markdownImgCount = (body.match(/!\[.*?\]\([^)]+\)/g) || []).length;
  const frontmatterPhotos = Array.isArray(meta.photos) ? meta.photos.length : (Array.isArray(meta.gallery) ? meta.gallery.length : 0);
  const totalPhotos = markdownImgCount + frontmatterPhotos;

  return {
    filePath,
    title: meta.title || filename,
    summary: meta.summary || '',
    date: meta.date || '',
    dir: meta.dir || 'rtl',
    url,
    words,
    readTime,
    totalPhotos,
    body
  };
}

// Find the post chronologically preceding this one for the "In case you missed it" section
function getPreviousPost(currentFilePath) {
  const postsDir = path.join(process.cwd(), '_posts');
  if (!fs.existsSync(postsDir)) return null;

  const files = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .sort(); // sorted ascending by date (e.g. 2026-08-06, 2026-08-07, 2026-09-05)

  const currentBasename = path.basename(currentFilePath);
  const currentIndex = files.indexOf(currentBasename);

  if (currentIndex > 0) {
    const prevFile = path.join(postsDir, files[currentIndex - 1]);
    return parsePost(prevFile);
  }
  return null;
}

// Build the email HTML matching feed.xml template
function buildEmailHtml(post, prevPost) {
  const isRtl = post.dir === 'rtl';
  const textAlign = isRtl ? 'right' : 'left';
  const borderSide = isRtl ? 'right' : 'left';

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2c2a29; max-width: 600px; margin: 0 auto; padding: 24px 16px; direction: ${post.dir}; text-align: ${textAlign}; background-color: #ffffff;">
    <div style="border-bottom: 2px solid #eae6df; padding-bottom: 12px; margin-bottom: 20px;">
      <a href="https://shayshoon.github.io" style="text-decoration: none; color: #736e68; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
        Shay's Digital Home
      </a>
    </div>

    <h1 style="font-size: 26px; line-height: 1.3; margin: 0 0 10px 0; color: #1a1918;">
      <a href="${post.url}" style="color: #1a1918; text-decoration: none;">${post.title}</a>
    </h1>

    <p style="color: #736e68; font-size: 13px; margin: 0 0 18px 0; font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;">
      <span>⏱️ ${post.readTime} min read (${post.words} words)</span>
      ${post.totalPhotos > 0 ? `<span> &bull; 📷 Includes ${post.totalPhotos} ${post.totalPhotos === 1 ? 'photo' : 'photos'}</span>` : ''}
    </p>

    ${post.summary ? `
    <div style="font-size: 16px; line-height: 1.6; margin: 18px 0 24px; padding: 14px 16px; background-color: #f7f5f0; border-${borderSide}: 4px solid #9c4125; border-radius: 4px;">
      ${post.summary}
    </div>` : ''}

    <div style="margin: 24px 0 28px;">
      <a href="${post.url}" style="background-color: #9c4125; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px;">
        Read the full post and view photos on the website &rarr;
      </a>
    </div>

    ${prevPost ? `
    <div style="font-size: 14px; color: #5e5a56; margin: 24px 0 16px; padding-top: 16px; border-top: 1px dashed #e2ded6;">
      ⏮️ <strong>In case you missed it:</strong>
      <a href="${prevPost.url}" style="color: #9c4125; text-decoration: underline; font-weight: 500;">
        ${prevPost.title}
      </a>
    </div>` : ''}

    <hr style="border: none; border-top: 1px dashed #e2ded6; margin: 24px 0 16px;" />

    <p style="color: #5e5a56; font-size: 14px; margin-bottom: 12px; line-height: 1.5;">
      💬 <em>Have thoughts, recommendations, or just want to say hi? Hit reply to this email or reach out on my site — I'd love to hear from you!</em>
    </p>

    <p style="color: #5e5a56; font-style: italic; font-size: 14px; margin-top: 6px;">
      Thanks for taking an interest :)
    </p>

    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 28px 0 14px;" />

    <div style="font-size: 12px; color: #999; line-height: 1.5;">
      You received this because you subscribed to updates on <a href="https://shayshoon.github.io" style="color: #999; text-decoration: underline;">Shay's Digital Home</a>.<br/>
      If you no longer wish to receive these emails, simply reply to this email asking to unsubscribe.
    </div>
  </div>
  `;
}

function buildEmailText(post, prevPost) {
  let text = `New post: ${post.title}\n\n`;
  text += `⏱️ ${post.readTime} min read (${post.words} words)`;
  if (post.totalPhotos > 0) {
    text += ` • 📷 Includes ${post.totalPhotos} photos`;
  }
  text += `\n\n`;
  if (post.summary) {
    text += `${post.summary}\n\n`;
  }
  text += `Read the full post and view photos: ${post.url}\n\n`;
  if (prevPost) {
    text += `⏮️ In case you missed it: ${prevPost.title} (${prevPost.url})\n\n`;
  }
  text += `---\n`;
  text += `💬 Have thoughts, recommendations, or just want to say hi? Hit reply to this email or reach out on my site — I'd love to hear from you!\n\n`;
  text += `Thanks for taking an interest :)\n\n`;
  text += `To unsubscribe, reply asking to be removed.`;
  return text;
}

// Find newly added or target post
function findTargetPost() {
  const customFile = process.env.POST_FILE || process.argv[2];
  if (customFile && fs.existsSync(customFile)) {
    return customFile;
  }

  const eventName = process.env.GITHUB_EVENT_NAME || '';

  // Check commit message for skip flags (e.g. [skip broadcast])
  try {
    const commitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    if (/\[(skip|no)[\s_-]?broadcast\]/i.test(commitMsg)) {
      console.log('Commit message contains [skip broadcast]. Skipping email.');
      return null;
    }
  } catch (e) {}

  // On push event: ONLY trigger if a brand new Markdown file was ADDED in this commit
  if (eventName === 'push') {
    try {
      const gitDiff = execSync('git diff --name-only --diff-filter=A HEAD~1 HEAD', { encoding: 'utf8' }).trim();
      const addedPosts = gitDiff.split(/\r?\n/).filter(f => f.startsWith('_posts/') && f.endsWith('.md'));
      if (addedPosts.length > 0 && fs.existsSync(addedPosts[0])) {
        return addedPosts[0];
      }
      console.log('No newly added posts in this commit (likely an edit or typo fix). Skipping broadcast.');
      return null;
    } catch (e) {
      console.log('Could not inspect git diff. Skipping automatic broadcast for safety.');
      return null;
    }
  }

  // Fallback (for manual "workflow_dispatch" button or local testing): pick latest post
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
  console.log(`Stats: ${post.readTime} min read (${post.words} words), ${post.totalPhotos} photos`);

  const prevPost = getPreviousPost(targetPostFile);
  if (prevPost) {
    console.log(`Previous post: "${prevPost.title}" (${prevPost.url})`);
  }

  const htmlBody = buildEmailHtml(post, prevPost);
  const textBody = buildEmailText(post, prevPost);

  const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('[DRY RUN] Would send broadcast for this post without emailing subscribers.');
    console.log('\n--- EMAIL HTML PREVIEW ---\n', htmlBody);
    console.log('\n--- EMAIL TEXT PREVIEW ---\n', textBody);
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
    date: post.date,
    dir: post.dir,
    htmlBody: htmlBody,
    textBody: textBody
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
