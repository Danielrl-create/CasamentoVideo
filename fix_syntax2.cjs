const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('{/* 3. PREVIEW AND SAVE SCREEN */}'));
lines.splice(idx, 0, '                )}');

fs.writeFileSync('src/App.tsx', lines.join('\n'));
