import * as fs from 'fs/promises';
import * as path from 'path';
import { downloadAndConvert } from '../utils/downloader';

interface DownloadOptions {
  output?: string;
}

export const download = async (url: string, options: DownloadOptions) => {
  try {
    const outputDir = options.output || process.cwd();
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop() || 'article';

    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    const { markdown, images } = await downloadAndConvert(url, outputDir);

    // Write markdown file
    const mdPath = path.join(outputDir, `${filename}.md`);
    await fs.writeFile(mdPath, markdown);

    console.log(`Downloaded: ${url}`);
    console.log(`Markdown saved: ${mdPath}`);
    console.log(`Images downloaded: ${images.length}`);
  } catch (error) {
    console.error('Download failed:', error);
    process.exit(1);
  }
};
