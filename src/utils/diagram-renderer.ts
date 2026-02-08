/**
 * Server-side diagram renderer using Puppeteer
 * Renders Mermaid and WaveDrom diagrams to inline SVG
 */

import puppeteer, { Page } from 'puppeteer';
import { MermaidOptions } from '../converters/base';

export interface DiagramBlock {
  type: 'mermaid' | 'wavedrom';
  source: string;
  placeholder: string;
}

export interface RenderOptions {
  mermaid?: MermaidOptions;
}

/**
 * Extract all diagram blocks from markdown
 */
export function extractDiagramBlocks(markdown: string): { markdown: string; blocks: DiagramBlock[] } {
  const blocks: DiagramBlock[] = [];
  let result = markdown;
  let index = 0;

  // Extract mermaid blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  result = result.replace(mermaidRegex, (match, source) => {
    const placeholder = `<!--DIAGRAM_PLACEHOLDER_${index}-->`;
    blocks.push({ type: 'mermaid', source: source.trim(), placeholder });
    index++;
    return placeholder;
  });

  // Extract wavedrom blocks
  const wavedromRegex = /```wavedrom\n([\s\S]*?)```/g;
  result = result.replace(wavedromRegex, (match, source) => {
    const placeholder = `<!--DIAGRAM_PLACEHOLDER_${index}-->`;
    blocks.push({ type: 'wavedrom', source: source.trim(), placeholder });
    index++;
    return placeholder;
  });

  return { markdown: result, blocks };
}

/**
 * Render a single diagram to SVG using puppeteer
 */
async function renderDiagram(
  page: Page,
  type: 'mermaid' | 'wavedrom',
  source: string,
  index: number
): Promise<string> {
  try {
    if (type === 'mermaid') {
      const svg = await page.evaluate(async (src: string, idx: number) => {
        // @ts-ignore
        const mermaid = window.mermaid;
        if (!mermaid) return '<div style="color:red">Mermaid not loaded</div>';
        
        try {
          const { svg } = await mermaid.render(`mermaid-${idx}`, src);
          return svg;
        } catch (e: any) {
          return `<div style="color:red">Mermaid error: ${e.message}</div>`;
        }
      }, source, index);
      return svg;
    } else if (type === 'wavedrom') {
      const svg = await page.evaluate((src: string, idx: number) => {
        try {
          const parsed = JSON.parse(src);
          // @ts-ignore
          const WaveDrom = window.WaveDrom;
          if (!WaveDrom) return '<div style="color:red">WaveDrom not loaded</div>';
          
          // Create container
          const container = document.createElement('div');
          container.id = `wavedrom-${idx}`;
          container.innerHTML = `<script type="WaveDrom">${src}</script>`;
          document.body.appendChild(container);
          
          // Render
          WaveDrom.ProcessAll();
          
          // Get SVG
          const svgEl = container.querySelector('svg');
          const result = svgEl ? svgEl.outerHTML : '<div style="color:red">WaveDrom render failed</div>';
          
          // Cleanup
          container.remove();
          return result;
        } catch (e: any) {
          return `<div style="color:red">WaveDrom error: ${e.message}</div>`;
        }
      }, source, index);
      return svg;
    }
    return '';
  } catch (error) {
    console.error(`Error rendering ${type} diagram:`, error);
    return `<div style="color:red">Render error: ${error}</div>`;
  }
}

/**
 * Render all diagram blocks to SVG
 */
export async function renderAllDiagrams(
  blocks: DiagramBlock[],
  options?: RenderOptions
): Promise<Map<string, string>> {
  if (blocks.length === 0) return new Map();

  const results = new Map<string, string>();
  const mermaidOpts = options?.mermaid || {};

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Build mermaid config
    const mermaidConfig = {
      startOnLoad: false,
      theme: mermaidOpts.theme || 'default',
      look: mermaidOpts.handDraw ? 'handDrawn' : 'classic',
      layout: mermaidOpts.layout || 'dagre',
    };

    // Determine which scripts to load
    const useElk = mermaidOpts.layout === 'elk';
    
    // Load page with Mermaid and WaveDrom
    // Use mermaid 11 ESM for elk and handDrawn support
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.5.0/skins/default.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.5.0/wavedrom.min.js"></script>
          <script type="module">
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
            ${useElk ? `
            import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';
            mermaid.registerLayoutLoaders(elkLayouts);
            ` : ''}
            
            const config = ${JSON.stringify(mermaidConfig)};
            mermaid.initialize(config);
            
            // Expose mermaid to window for rendering
            window.mermaid = mermaid;
            window.mermaidReady = true;
          </script>
        </head>
        <body></body>
      </html>
    `, { waitUntil: 'networkidle0' });

    // Wait for libraries to load (ESM modules load async)
    await page.waitForFunction(() => {
      // @ts-ignore
      return window.mermaidReady === true && typeof window.WaveDrom !== 'undefined';
    }, { timeout: 20000 });

    // Extra wait for ELK to fully register
    if (useElk) {
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
    }

    // Render each diagram
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      console.log(`  Rendering ${block.type} diagram ${i + 1}/${blocks.length}...`);
      const svg = await renderDiagram(page, block.type, block.source, i);
      results.set(block.placeholder, svg);
    }
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Process markdown and render all diagrams inline
 */
export async function processDiagrams(
  markdown: string,
  options?: RenderOptions
): Promise<string> {
  const { markdown: processed, blocks } = extractDiagramBlocks(markdown);

  if (blocks.length === 0) return markdown;

  console.log(`Processing ${blocks.length} diagram(s)...`);
  const renderedDiagrams = await renderAllDiagrams(blocks, options);

  // Replace placeholders with rendered SVGs
  let result = processed;
  for (const [placeholder, svg] of renderedDiagrams) {
    const wrappedSvg = `<div class="diagram">${svg}</div>`;
    result = result.replace(placeholder, wrappedSvg);
  }

  return result;
}
