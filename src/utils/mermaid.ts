import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MermaidOptions } from '../converters/base';

export interface MermaidBlock {
  code: string;
  index: number;
  startPos: number;
  endPos: number;
}

/**
 * Extract mermaid code blocks from markdown
 */
export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      code: match[1].trim(),
      index: index++,
      startPos: match.index,
      endPos: match.index + match[0].length,
    });
  }

  return blocks;
}

/**
 * Check if mmdc (mermaid-cli) is available
 */
export function isMermaidCliAvailable(): boolean {
  try {
    execSync('which mmdc', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Render a single mermaid diagram to SVG using mmdc
 */
export async function renderMermaidToSvg(
  code: string,
  options: MermaidOptions = {}
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mxe-mermaid-'));
  const inputFile = path.join(tmpDir, 'input.mmd');
  const outputFile = path.join(tmpDir, 'output.svg');
  const configFile = path.join(tmpDir, 'config.json');

  try {
    // Write mermaid code to temp file
    fs.writeFileSync(inputFile, code);

    // Create mermaid config
    const config: Record<string, unknown> = {
      theme: options.theme || 'default',
    };

    // Hand-draw style (rough/sketch)
    if (options.handDraw) {
      config.look = 'handDrawn';
      config.handDrawnSeed = 42;
    }

    // Layout engine
    if (options.layout === 'elk') {
      config.flowchart = { defaultRenderer: 'elk' };
    }

    fs.writeFileSync(configFile, JSON.stringify(config));

    // Build mmdc command
    const args = [
      '-i', inputFile,
      '-o', outputFile,
      '-c', configFile,
      '-b', 'transparent',
      '--quiet',
    ];

    // Run mmdc
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('mmdc', args, { stdio: 'pipe' });
      let stderr = '';
      
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`mmdc failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });

    // Read SVG output
    const svg = fs.readFileSync(outputFile, 'utf-8');
    return svg;
  } finally {
    // Cleanup temp files
    try {
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
      fs.unlinkSync(configFile);
      fs.rmdirSync(tmpDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Process markdown and replace mermaid blocks with rendered SVGs
 */
export async function processMermaidInMarkdown(
  markdown: string,
  options: MermaidOptions = {}
): Promise<string> {
  if (!isMermaidCliAvailable()) {
    console.warn('Warning: mmdc not found. Install with: npm i -g @mermaid-js/mermaid-cli');
    return markdown;
  }

  const blocks = extractMermaidBlocks(markdown);
  if (blocks.length === 0) {
    return markdown;
  }

  console.log(`Processing ${blocks.length} mermaid diagram(s)...`);

  // Process blocks in reverse order to maintain positions
  let result = markdown;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    try {
      const svg = await renderMermaidToSvg(block.code, options);
      // Wrap SVG in a div for styling
      const replacement = `<div class="mermaid-diagram">\n${svg}\n</div>`;
      result = result.slice(0, block.startPos) + replacement + result.slice(block.endPos);
    } catch (error) {
      console.warn(`Warning: Failed to render mermaid diagram ${block.index + 1}:`, error);
      // Keep original code block on error
    }
  }

  return result;
}

/**
 * Render mermaid inline (for HTML embedding) without external mmdc
 * Uses mermaid JS library directly in the HTML
 */
export function getMermaidScript(options: MermaidOptions = {}): string {
  const config: Record<string, unknown> = {
    startOnLoad: true,
    theme: options.theme || 'default',
    securityLevel: 'loose',
  };

  if (options.handDraw) {
    config.look = 'handDrawn';
  }

  return `
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      mermaid.initialize(${JSON.stringify(config)});
    </script>
  `;
}
