const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
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
        </script>
      </head>
      <body></body>
    </html>
  `, { waitUntil: 'networkidle0' });
  
  await page.waitForFunction(() => window.mermaidReady, { timeout: 20000 });
  
  // Test wavedrom with ProcessAll
  const wave = await page.evaluate(() => {
    try {
      const WaveDrom = window.WaveDrom;
      if (!WaveDrom) return 'WaveDrom not loaded';
      
      const src = { signal: [{ name: 'clk', wave: 'p....' }, { name: 'data', wave: 'x.34x' }] };
      
      const container = document.createElement('div');
      container.id = 'wave-container';
      
      const script = document.createElement('script');
      script.type = 'WaveDrom';
      script.id = 'wv-test';
      script.textContent = JSON.stringify(src);
      container.appendChild(script);
      document.body.appendChild(container);
      
      WaveDrom.ProcessAll();
      
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        return 'WaveDrom OK - SVG width: ' + svgEl.getAttribute('width');
      }
      return 'No SVG found. Container HTML: ' + container.innerHTML.substring(0, 200);
    } catch (e) {
      return 'WaveDrom ERROR: ' + e.message;
    }
  });
  
  console.log('WaveDrom result:', wave);
  
  await browser.close();
}

test().catch(console.error);
