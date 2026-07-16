const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const sliceBlock = (startRegex, endRegex) => {
  const start = lines.findIndex(l => startRegex.test(l));
  let end = lines.findIndex((l, i) => i > start && endRegex.test(l));
  if (end === -1) end = lines.length; // shouldn't happen
  return lines.slice(start, end).join('\n');
}

// Blocks
const filterBlock = sliceBlock(/{\/\* Filter Selector/, /{\/\* VIDEO CONTAINER/);
const videoBlock = sliceBlock(/{\/\* VIDEO CONTAINER/, /{\/\* BRIGHTNESS CONTROL &/);
const brightnessBlock = sliceBlock(/{\/\* BRIGHTNESS CONTROL &/, /{\/\* CONTROLS \*\//);
const controlsBlock = sliceBlock(/{\/\* CONTROLS \*\//, /{\/\* Go Back button/);
const goBackBlock = sliceBlock(/{\/\* Go Back button/, /<\/motion.div>/);

// Add motion div close
const newContent = 
videoBlock + '\n' + 
'                    <div className="flex justify-center -mt-10 mb-4 z-20 relative">\n' +
controlsBlock.replace('mt-6', 'mt-0').replace(/<div className="mt-6 flex flex-col items-center">/, '') + '\n' +
'                    <div className="mt-2 grid grid-cols-1 gap-3">\n' +
filterBlock + '\n' +
brightnessBlock.replace('<div className="mt-3 grid grid-cols-1 gap-3">', '') + '\n' +
goBackBlock + '\n' +
'                  </motion.div>';

const startIdx = lines.findIndex(l => /{\/\* Filter Selector/.test(l));
const endIdx = lines.findIndex((l, i) => i > startIdx && /<\/motion\.div>/.test(l));

lines.splice(startIdx, endIdx - startIdx + 1, newContent);

fs.writeFileSync('src/App.tsx', lines.join('\n'));
