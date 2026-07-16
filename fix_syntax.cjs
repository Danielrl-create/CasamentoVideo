const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The incorrect command added `\n                )}` after `                  </motion.div>` globally.
code = code.replace(/                  <\/motion.div>\n                \)\}/g, '                  </motion.div>');

fs.writeFileSync('src/App.tsx', code);
