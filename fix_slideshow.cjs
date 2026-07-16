const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSlideshow = `<motion.img
          key={src}
          src={src}
          alt={\`Slide \${idx + 1}\`}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: idx === currentIndex ? 1 : 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />`;

const newSlideshow = `<motion.img
          key={src}
          src={src}
          alt={\`Slide \${idx + 1}\`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: idx === currentIndex ? 1 : 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />`;

code = code.replace(oldSlideshow, newSlideshow);

const oldCountdown = `<div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 max-w-xs mt-5 text-center text-xs text-stone-500 leading-relaxed">
                      <span className="font-bold text-stone-700 block mb-1">Redirecionando...</span>
                      Você voltará para a tela inicial em <span className="font-bold text-rose-gold text-sm ml-1">{celebrationCountdown}</span> segundos.
                    </div>`;

const newCountdown = `<div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 shadow-sm max-w-xs mt-5 text-center flex flex-col items-center justify-center gap-2">
                      <span className="font-bold text-stone-600 uppercase tracking-widest text-[10px]">Redirecionando em</span>
                      <motion.div 
                        key={celebrationCountdown}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-4xl font-serif font-bold text-rose-gold"
                      >
                        {celebrationCountdown}
                      </motion.div>
                    </div>`;

code = code.replace(oldCountdown, newCountdown);
fs.writeFileSync('src/App.tsx', code);
