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
}

export async function downloadAndConvert(
  url: string,
  outputDir: string
): Promise<DownloadResult> {
  const response = await fetch(url);
  const html = await response.text();

  // Create images directory if it doesn't exist
  const imagesDir = path.join(outputDir, 'images');
  await fs.mkdir(imagesDir, { recursive: true });

  // Parse HTML
  const $ = cheerio.load(html);
  const imagePromises: Promise<string>[] = [];
  const images: string[] = [];

  // Extract main content
  const article = $('article').first();
  const title = $('h1').first().text().trim();
  const content = article
    .find('p, h2, h3, h4, h5, h6, ul, ol, blockquote')
    .map((_, el) => {
      return $(el).text().trim();
    })
    .get()
    .join('\n\n');

  // Initial markdown content
  let contentWithImages = `# ${title}\n\n${content}`;

  // Process images
  article.find('img').each((_, el) => {
    const img = $(el);
    const src = img.attr('src');
    const alt = img.attr('alt') || '';

    if (src && !src.includes('data:image')) {
      images.push(src);
      contentWithImages += `\n\n![${alt}](${src})`;
    }
  });

  // Download images and update their paths
  $('img').each((_, img) => {
    const src = $(img).attr('src');
    if (src) {
      const imageUrl = new URL(src, url).toString();
      const promise = downloadImage(imageUrl, imagesDir).then(filename => {
        $(img).attr('src', `images/${filename}`);
        images.push(filename);
        return filename;
      });
      imagePromises.push(promise);
    }
  });

  // Wait for all images to download
  await Promise.all(imagePromises);

  // Convert to markdown
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  const finalMarkdown = cleanupMarkdown(contentWithImages);

  return {
    markdown: finalMarkdown,
    images,
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
