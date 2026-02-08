const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script type="module">
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
          import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';
          
          console.log('elkLayouts:', typeof elkLayouts);
          console.log('registerLayoutLoaders:', typeof mermaid.registerLayoutLoaders);
          
          try {
            mermaid.registerLayoutLoaders(elkLayouts);
            console.log('ELK registered successfully');
          } catch (e) {
            console.log('ELK register error:', e.message);
          }
          
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            layout: 'elk',
            flowchart: { 
              defaultRenderer: 'elk'
            }
          });
          
          window.mermaid = mermaid;
          window.mermaidReady = true;
          console.log('Mermaid initialized');
        </script>
      </head>
      <body></body>
    </html>
  `, { waitUntil: 'networkidle0' });
  
  await page.waitForFunction(() => window.mermaidReady, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000)); // Extra wait
  
  // Test render
  const result = await page.evaluate(async () => {
    const code = `flowchart TB
    A[Start] --> B[Step 1]
    B --> C[Step 2]
    C --> D[End]`;
    
    try {
      const { svg } = await window.mermaid.render('test-elk', code);
      
      // Check for ELK markers
      const hasElkClass = svg.includes('flowchart-elk');
      const hasElkAttr = svg.includes('elk');
      
      return {
        success: true,
        hasElkClass,
        hasElkAttr,
        svgPreview: svg.substring(0, 500)
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  console.log('Render result:', JSON.stringify(result, null, 2));
  
  await browser.close();
}

test().catch(console.error);
