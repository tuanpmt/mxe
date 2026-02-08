/**
 * WaveDrom renderer for digital timing diagrams
 * Renders ```wavedrom code blocks as embedded diagrams
 */

export interface WaveDromOptions {
  // Future options if needed
}

/**
 * Get WaveDrom script for client-side rendering
 */
export function getWaveDromScript(): string {
  return `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.5.0/skins/default.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.5.0/wavedrom.min.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof WaveDrom !== 'undefined') {
          WaveDrom.ProcessAll();
        }
      });
    </script>
  `;
}

/**
 * Check if markdown contains wavedrom blocks
 */
export function hasWaveDrom(markdown: string): boolean {
  return /```wavedrom\n/.test(markdown);
}

/**
 * Get WaveDrom styles
 */
export function getWaveDromStyles(): string {
  return `
    .wavedrom-diagram {
      display: flex;
      justify-content: center;
      margin: 1.5em 0;
      page-break-inside: avoid;
      overflow-x: auto;
    }

    .wavedrom-diagram svg {
      max-width: 100%;
      height: auto;
    }
  `;
}
