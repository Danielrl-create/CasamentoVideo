const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const imagesRegex = /const SLIDESHOW_IMAGES = \[\s*[\s\S]*?\];/m;
const newImages = `const SLIDESHOW_IMAGES = [
  'https://picsum.photos/seed/love1/800/600',
  'https://picsum.photos/seed/love2/800/600',
  'https://picsum.photos/seed/love3/800/600'
];`;
code = code.replace(imagesRegex, newImages);
fs.writeFileSync('src/App.tsx', code);
