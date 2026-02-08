const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.5.0/skins/default.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.5.0/wavedrom.min.js"></script>
        <script type="module">
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
          import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';
          
          mermaid.registerLayoutLoaders(elkLayouts);
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            layout: 'elk',
            flowchart: { defaultRenderer: 'elk' }
          });
          
          window.mermaid = mermaid;
          window.mermaidReady = true;
          console.log('Mermaid ready with ELK');
        </script>
      </head>
      <body></body>
    </html>
  `, { waitUntil: 'networkidle0' });
  
  await page.waitForFunction(() => window.mermaidReady, { timeout: 20000 });
  console.log('Page ready');
  
  // Test flowchart
  const svg = await page.evaluate(async () => {
    const code = `flowchart TB
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]`;
    
    try {
      const { svg } = await window.mermaid.render('test', code);
      // Check if elk is used
      const hasElk = svg.includes('elk') || svg.includes('layered');
      console.log('Has ELK markers:', hasElk);
      return svg.substring(0, 1000);
    } catch (e) {
      return 'ERROR: ' + e.message;
    }
  });
  
  console.log('SVG result:', svg.substring(0, 500));
  
  // Test wavedrom
  const wave = await page.evaluate(() => {
    try {
      const WaveDrom = window.WaveDrom;
      if (!WaveDrom) return 'WaveDrom not loaded';
      
      const src = { signal: [{ name: 'clk', wave: 'p....' }] };
      const container = document.createElement('div');
      container.id = 'wave-test';
      document.body.appendChild(container);
      
      WaveDrom.RenderWaveForm(container, src, 'wv-test');
      
      const svgEl = container.querySelector('svg');
      return svgEl ? 'WaveDrom OK: ' + svgEl.outerHTML.substring(0, 200) : 'No SVG';
    } catch (e) {
      return 'WaveDrom ERROR: ' + e.message;
    }
  });
  
  console.log('WaveDrom result:', wave);
  
  await browser.close();
}

test().catch(console.error);
