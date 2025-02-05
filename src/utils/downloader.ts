import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import * as path from 'path';
import TurndownService from 'turndown';
import { cleanupMarkdown } from './markdown';

export interface DownloadResult {
  markdown: string;
  images: string[];
  html: string;
  cleanHtml: string;
}

export async function downloadAndConvert(
  url: string,
  outputDir: string
): Promise<DownloadResult> {
  const response = await fetch(url);
  const html = await response.text();

  const imagesDir = path.join(outputDir, 'images');
  await fs.mkdir(imagesDir, { recursive: true });

  const $ = cheerio.load(html);
  const images: string[] = [];

  // Better content extraction
  const article = $(
    'article, .article, .post-content, .entry-content, main'
  ).first();
  const title = $('h1, .article-title, .post-title, .entry-title')
    .first()
    .text()
    .trim();

  // Remove unwanted elements
  article
    .find(
      'script, style, iframe, .advertisement, .social-share, .related-posts'
    )
    .remove();

  // Extract content with more elements
  const content = article
    .find(
      'p, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, code, table, img, figure, div[class*="content"]'
    )
    .map((_, el) => {
      if (el.tagName === 'img') {
        const $img = $(el);
        const src = $img.attr('src');
        const alt = $img.attr('alt') || '';
        if (src && !src.startsWith('data:')) {
          images.push(src);
          return `![${alt}](${src})`;
        }
        return '';
      }
      return $(el).html();
    })
    .get()
    .join('\n\n');

  // Convert to markdown with preserved HTML where needed
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    keepReplacement: content => content,
  });

  // Add custom rules to preserve certain HTML elements
  turndownService.addRule('codeBlocks', {
    filter: ['pre', 'code'],
    replacement: (content, node) => {
      return `\n\`\`\`\n${content}\n\`\`\`\n`;
    },
  });

  let markdown = turndownService.turndown(content);
  markdown = `# ${title}\n\n${markdown}`;

  // Clean up the markdown
  const finalMarkdown = cleanupMarkdown(markdown);

  // Get clean HTML of main content
  const cleanHtml = article.html() || '';

  // Format clean HTML with proper structure
  const formattedCleanHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
        }
        img { max-width: 100%; height: auto; }
        pre { background: #f6f8fa; padding: 16px; overflow: auto; }
        code { font-family: monospace; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
    <article>
        <h1>${title}</h1>
        ${article.html()}
    </article>
</body>
</html>`;

  return {
    markdown: finalMarkdown,
    images,
    html, // Original full HTML
    cleanHtml: formattedCleanHtml, // Formatted clean HTML
  };
}

async function downloadImage(url: string, outputDir: string): Promise<string> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Generate filename from URL hash
  const hash = createHash('md5').update(url).digest('hex');
  const ext = path.extname(url) || '.jpg';
  const filename = `${hash}${ext}`;

  const outputPath = path.join(outputDir, filename);
  await fs.writeFile(outputPath, buffer);

  return filename;
}
