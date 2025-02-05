import * as fs from 'fs/promises';
import * as path from 'path';
import { downloadAndConvert } from '../utils/downloader';
import { generateSafeFilename } from '../utils/url';

interface DownloadOptions {
  output?: string;
}

interface DownloadResult {
  workingDir: string;
  inputFilename: string;
  content: string;
}

export const download = async (
  url: string,
  options: DownloadOptions
): Promise<DownloadResult> => {
  try {
    const safeFilename = generateSafeFilename(url);
    const workingDir = path.join(options.output || process.cwd(), safeFilename);
    await fs.mkdir(workingDir, { recursive: true });

    const { markdown, images, html, cleanHtml } = await downloadAndConvert(
      url,
      workingDir
    );

    // Save markdown file with safe filename
    const inputFilename = `${safeFilename}.md`;
    await fs.writeFile(path.join(workingDir, inputFilename), markdown);

    // Define file paths
    const fullHtmlPath = path.join(workingDir, `${safeFilename}.full.html`);
    const cleanHtmlPath = path.join(workingDir, `${safeFilename}.html`);

    // Write files with proper encoding
    await Promise.all([
      fs.writeFile(fullHtmlPath, html, 'utf8'),
      fs.writeFile(cleanHtmlPath, cleanHtml, 'utf8'),
    ]);

    console.log(`Downloaded: ${url}`);
    console.log(`Markdown saved: ${path.join(workingDir, inputFilename)}`);
    console.log(`Full HTML saved: ${fullHtmlPath}`);
    console.log(`Clean HTML saved: ${cleanHtmlPath}`);
    console.log(`Images downloaded: ${images.length}`);

    return {
      workingDir,
      inputFilename,
      content: markdown,
    };
  } catch (error) {
    console.error(
      'Download failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
};
