const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script type="module">
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
          import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';
          
          mermaid.registerLayoutLoaders(elkLayouts);
          mermaid.initialize({ startOnLoad: false, theme: 'default' });
          
          window.mermaid = mermaid;
          window.mermaidReady = true;
        </script>
      </head>
      <body></body>
    </html>
  `, { waitUntil: 'networkidle0' });
  
  await page.waitForFunction(() => window.mermaidReady, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Test with directive injected
  const result = await page.evaluate(async () => {
    const codeWithDirective = `%%{init: {"flowchart": {"defaultRenderer": "elk"}}}%%
flowchart TB
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;
    
    try {
      const { svg } = await window.mermaid.render('test-directive', codeWithDirective);
      const hasElk = svg.includes('flowchart-elk');
      const roleDesc = svg.match(/aria-roledescription="([^"]+)"/)?.[1];
      return { success: true, hasElk, roleDesc, preview: svg.substring(0, 300) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  await browser.close();
}

test().catch(console.error);
