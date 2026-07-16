const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("                  </motion.div>\n                )}\n          </AnimatePresence>", "                  </motion.div>\n                )}\n              </div>\n            )}\n          </AnimatePresence>");
fs.writeFileSync('src/App.tsx', code);
