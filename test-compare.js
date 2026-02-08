const puppeteer = require('puppeteer');

async function testLayout(layout) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const useElk = layout === 'elk';
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script type="module">
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
          ${useElk ? `
          import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';
          mermaid.registerLayoutLoaders(elkLayouts);
          ` : ''}
          
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            ${useElk ? `layout: 'elk', flowchart: { defaultRenderer: 'elk' }` : ''}
          });
          
          window.mermaid = mermaid;
          window.mermaidReady = true;
        </script>
      </head>
      <body></body>
    </html>
  `, { waitUntil: 'networkidle0' });
  
  await page.waitForFunction(() => window.mermaidReady, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(async (layoutName) => {
    const code = `flowchart TB
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[Merge]
    D --> E
    E --> F[End]`;
    
    try {
      const { svg } = await window.mermaid.render('test-' + layoutName, code);
      
      // Extract viewBox dimensions
      const match = svg.match(/viewBox="([^"]+)"/);
      const viewBox = match ? match[1] : 'none';
      
      // Check for elk
      const hasElk = svg.includes('flowchart-elk') || svg.includes('aria-roledescription="flowchart-elk"');
      
      return {
        layout: layoutName,
        viewBox,
        hasElk,
        width: svg.match(/max-width: ([^;]+)/)?.[1] || 'unknown'
      };
    } catch (e) {
      return { layout: layoutName, error: e.message };
    }
  }, layout);
  
  await browser.close();
  return result;
}

async function main() {
  console.log('Testing DAGRE layout:');
  const dagre = await testLayout('dagre');
  console.log(dagre);
  
  console.log('\nTesting ELK layout:');
  const elk = await testLayout('elk');
  console.log(elk);
  
  console.log('\nComparison:');
  console.log('DAGRE viewBox:', dagre.viewBox);
  console.log('ELK viewBox:', elk.viewBox);
  console.log('ELK has elk marker:', elk.hasElk);
}

main().catch(console.error);
