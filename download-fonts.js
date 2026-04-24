const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const urls = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// Need a modern User-Agent to ensure we get woff2
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  }
};

let cssContent = '';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const url of urls) {
    console.log(`Fetching CSS from: ${url}`);
    const css = await fetchUrl(url);
    
    // Parse woff2 URLs
    const regex = /url\((https:\/\/[^)]+\.woff2)\)/g;
    let match;
    let modifiedCss = css;

    while ((match = regex.exec(css)) !== null) {
      const fontUrl = match[1];
      const filename = path.basename(fontUrl);
      const dest = path.join(fontsDir, filename);
      
      console.log(`Downloading font: ${filename}`);
      await downloadFile(fontUrl, dest);
      
      // Replace URL in CSS
      modifiedCss = modifiedCss.replace(fontUrl, `../fonts/${filename}`);
    }
    
    cssContent += modifiedCss + '\n\n';
  }

  const cssPath = path.join(__dirname, 'public', 'css', 'fonts.css');
  fs.writeFileSync(cssPath, cssContent);
  console.log('Done! Generated public/css/fonts.css');
}

main().catch(console.error);
