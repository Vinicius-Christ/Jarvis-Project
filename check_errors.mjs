import { chromium } from 'playwright';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.error(`[PAGE ERROR] ${error.message}`));
  
  try {
    console.log("Navigating to http://localhost:3000 ...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 10000 });
    console.log("Navigation complete.");
    
    // Check if the root div has content
    const rootHtml = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? root.innerHTML : 'NO ROOT DIV FOUND';
    });
    
    console.log("Root div length:", rootHtml.length);
    if (rootHtml.length < 50) {
        console.log("Root div content:", rootHtml);
    }
  } catch (err) {
    console.error("Navigation failed:", err.message);
  } finally {
    await browser.close();
  }
})();
