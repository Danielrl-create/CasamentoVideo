const fs = require('fs');

let code = fs.readFileSync('recording_interface.txt', 'utf8');

const filterSelector = code.match(/{\/\* Filter Selector.*?(?={\/\* VIDEO CONTAINER)/s)[0];
const videoContainer = code.match(/{\/\* VIDEO CONTAINER \*\/\}.*?(?={\/\* BRIGHTNESS CONTROL)/s)[0];
const brightnessAndTips = code.match(/{\/\* BRIGHTNESS CONTROL & POSE TIPS ROW \*\/\}.*?(?={\/\* CONTROLS \*\/\})/s)[0];
const controlsArea = code.match(/{\/\* CONTROLS \*\/\}.*?<\/motion\.div>/s)[0]; // Till the end of motion.div

// Now we re-assemble
const controlsInner = controlsArea.match(/<div className="mt-6 flex flex-col items-center">\s*([\s\S]*?)<\/div>\s*<\/motion\.div>/s);
const buttonsContent = controlsInner ? controlsInner[1] : '';

const newStructure = `
                    ${videoContainer}

                    {/* CONTROLS (RECORD BUTTON) MOVED UP */}
                    <div className="flex justify-center -mt-10 mb-4 z-20 relative">
                      ${buttonsContent.replace(/<button\s*onClick=\{\(\) => \{\s*stopAllMedia\(\);\s*setAppState\('welcome'\);\s*\}\}[\s\S]*?Voltar para o início\s*<\/button>/, '')}
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-3">
                      ${filterSelector}
                      ${brightnessAndTips.replace('<div className="mt-3 grid grid-cols-1 gap-3">', '').replace(/<\/div>\s*$/, '')}
                    </div>

                    <div className="flex justify-center mt-6">
                      {appState === 'ready' && (
                        <button
                          onClick={() => {
                            stopAllMedia();
                            setAppState('welcome');
                          }}
                          className="mt-2 text-xs font-semibold text-stone-400 hover:text-stone-600 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Voltar para o início
                        </button>
                      )}
                    </div>
                  </motion.div>
`;

let fullCode = fs.readFileSync('src/App.tsx', 'utf8');
const startTag = "{/* Filter Selector (When ready, before recording or while recording) */}";
const endTag = "{/* 3. PREVIEW AND SAVE SCREEN */}";
const startIndex = fullCode.indexOf(startTag);
const endIndex = fullCode.indexOf(endTag);

const newFullCode = fullCode.substring(0, startIndex) + newStructure + "\n                " + fullCode.substring(endIndex);
fs.writeFileSync('src/App.tsx', newFullCode);
