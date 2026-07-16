const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update SLIDESHOW_IMAGES
const imagesRegex = /const SLIDESHOW_IMAGES = \[\s*[\s\S]*?\];/m;
const newImages = `const SLIDESHOW_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1583939002231-155e9754fbe8?auto=format&fit=crop&q=80&w=800'
];`;
code = code.replace(imagesRegex, newImages);

// 2. Add celebrationCountdown state
const stateMarker = `const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);`;
code = code.replace(stateMarker, stateMarker + `\n  const [celebrationCountdown, setCelebrationCountdown] = useState<number | null>(null);`);

// 3. Update useEffect for saved-celebration
const oldEffect = `  useEffect(() => {
    if (appState === 'saved-celebration') {
      const timer = setTimeout(() => {
        setAppState('welcome');
        setGuestName('');
        setRecordedChunks([]);
        setRecordedVideoUrl(null);
        setRecordedBlob(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [appState]);`;

const newEffect = `  useEffect(() => {
    if (appState === 'saved-celebration') {
      setCelebrationCountdown(10);
      const interval = setInterval(() => {
        setCelebrationCountdown((prev) => {
          if (prev === null) {
            clearInterval(interval);
            return null;
          }
          if (prev <= 1) {
            clearInterval(interval);
            setAppState('welcome');
            setGuestName('');
            setRecordedChunks([]);
            setRecordedVideoUrl(null);
            setRecordedBlob(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCelebrationCountdown(null);
    }
  }, [appState]);`;

code = code.replace(oldEffect, newEffect);

// 4. Update the celebration screen text to show countdown
const redirRegex = /<span className="font-bold text-stone-700 block mb-1">Redirecionando...<\/span>\s*Você voltará para a tela inicial em 10 segundos./;
const newRedir = `<span className="font-bold text-stone-700 block mb-1">Redirecionando...</span>
                      Você voltará para a tela inicial em <span className="font-bold text-rose-gold text-sm ml-1">{celebrationCountdown}</span> segundos.`;
code = code.replace(redirRegex, newRedir);

fs.writeFileSync('src/App.tsx', code);
