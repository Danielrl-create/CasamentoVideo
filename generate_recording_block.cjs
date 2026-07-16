const fs = require('fs');

const code = `
                {/* 2. CAMERA AND RECORDING INTERFACE */}
                {(appState === 'ready' || appState === 'recording') && (
                  <motion.div
                    key="recording-interface"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-1 h-full"
                  >
                    {/* Error Box */}
                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 text-stone-800 p-4 rounded-xl text-xs mb-4 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-start gap-2 text-red-800">
                          <span className="text-red-500 font-bold text-sm">⚠️</span>
                          <div className="space-y-1">
                            <p className="font-bold">Acesso à Câmera Bloqueado</p>
                            <p className="leading-relaxed">{errorMsg}</p>
                          </div>
                        </div>
                        <div className="border-t border-red-100/60 pt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => startCamera(facingMode, true)}
                            className="bg-rose-gold text-white font-semibold py-1.5 px-3 rounded-lg hover:bg-rose-700 active:bg-rose-800 transition-colors cursor-pointer"
                          >
                            🎬 Ativar Câmera Simulada (Modo Teste)
                          </button>
                          <button
                            type="button"
                            onClick={() => startCamera(facingMode, false)}
                            className="bg-stone-100 text-stone-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-stone-200 active:bg-stone-300 transition-colors border border-stone-200 cursor-pointer"
                          >
                            🔄 Tentar Novamente
                          </button>
                        </div>
                        <p className="text-[10px] text-stone-400 italic">
                          Dica: Se estiver em um celular ou computador, clique no ícone de "Cadeado" ao lado da barra de endereços para dar permissão de câmera.
                        </p>
                      </div>
                    )}

                    {/* VIDEO CONTAINER */}
                    <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-inner flex items-center justify-center">
                      {/* HTML5 video element for camera preview */}
                      {isDemoMode ? (
                        <video
                          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ filter: \`brightness(\${brightness}%) contrast(102%)\` }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ filter: \`brightness(\${brightness}%) contrast(102%)\` }}
                          className={\`w-full h-full object-cover transform \${facingMode === 'user' ? 'scale-x-[-1]' : ''}\`}
                        />
                      )}

                      {/* Loading visual */}
                      {isLoadingStream && (
                        <div className="absolute inset-0 bg-stone-950/85 flex flex-col items-center justify-center text-white gap-3">
                          <RefreshCw className="w-10 h-10 animate-spin text-rose-gold" />
                          <p className="text-xs text-stone-300 font-medium font-serif">Iniciando Lente Romântica...</p>
                        </div>
                      )}

                      {/* Dynamic Overlays/Filters applied visually */}
                      {FILTER_PRESETS.map((preset) => {
                        if (preset.id === activeFilter && preset.id !== 'none') {
                          return (
                            <div 
                              key={preset.id} 
                              className={\`absolute inset-3 border-4 \${preset.border} rounded-xl pointer-events-none flex flex-col justify-end items-center p-4 transition-all duration-300 z-10\`}
                            >
                              {preset.id === 'romantic' && (
                                <>
                                  {/* Rosy flower overlays on corners */}
                                  <span className="absolute top-2 left-2 text-xl">🌸</span>
                                  <span className="absolute top-2 right-2 text-xl">🌸</span>
                                  <span className="absolute bottom-12 left-2 text-xl">🌹</span>
                                  <span className="absolute bottom-12 right-2 text-xl">🌹</span>
                                </>
                              )}

                              {preset.id === 'gold' && (
                                <>
                                  {/* Sparkling stars on corners */}
                                  <span className="absolute top-2 left-2 text-xl text-yellow-300">✨</span>
                                  <span className="absolute top-2 right-2 text-xl text-yellow-300">✨</span>
                                  <span className="absolute bottom-12 left-2 text-xl text-yellow-300">✨</span>
                                  <span className="absolute bottom-12 right-2 text-xl text-yellow-300">✨</span>
                                </>
                              )}

                              {preset.id === 'polaroid' && (
                                <div className="absolute top-3 left-4 right-4 text-center select-none">
                                  <span className="text-stone-300 font-mono text-[10px] tracking-wider bg-stone-950/40 px-2 py-0.5 rounded-full">
                                    {formatTimer(recordingDuration)} / {formatTimer(config.maxDuration)}
                                  </span>
                                </div>
                              )}

                              <div className="bg-white/90 backdrop-blur-[1px] px-4 py-1.5 rounded-lg border border-gold-200/60 shadow-sm text-center">
                                <p className="font-serif italic text-xs font-bold text-stone-800 tracking-wide">{preset.text}</p>
                                <p className="text-[9px] text-rose-gold font-sans font-medium uppercase tracking-wider">
                                  {config.brideName} & {config.groomName}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}

                      {/* Live indicators */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-15">
                        {appState === 'recording' ? (
                          <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shadow-sm">
                            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                            <span>GRAVANDO</span>
                          </div>
                        ) : (
                          <div className="bg-stone-900/80 backdrop-blur-sm text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-stone-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>Câmera Pronta</span>
                          </div>
                        )}
                        
                        {/* Audio track level visualizer */}
                        {appState === 'recording' && !isMuted && (
                          <div className="bg-stone-900/80 backdrop-blur-sm p-1.5 rounded-full border border-stone-800 flex items-center gap-0.5" title="Volume do Microfone">
                            <div className="w-1 bg-green-400 rounded-full transition-all duration-75" style={{ height: \`\${Math.max(4, isAudioLevel * 0.2)}px\` }} />
                            <div className="w-1 bg-green-400 rounded-full transition-all duration-75" style={{ height: \`\${Math.max(4, isAudioLevel * 0.35)}px\` }} />
                            <div className="w-1 bg-green-400 rounded-full transition-all duration-75" style={{ height: \`\${Math.max(4, isAudioLevel * 0.15)}px\` }} />
                          </div>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-2 z-15">
                        {/* Camera Swap Button */}
                        <button
                          onClick={toggleFacingMode}
                          className="p-2 rounded-full bg-stone-900/80 hover:bg-stone-900 backdrop-blur-sm text-white hover:text-rose-gold border border-stone-800 transition-all cursor-pointer"
                          title="Inverter Câmera (Frontal/Traseira)"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        
                        {/* Mute Mic Button */}
                        <button
                          onClick={() => {
                            const newMuted = !isMuted;
                            setIsMuted(newMuted);
                            if (streamRef.current) {
                              streamRef.current.getAudioTracks().forEach(track => {
                                track.enabled = !newMuted;
                              });
                            }
                          }}
                          className={\`p-2 rounded-full backdrop-blur-sm border transition-all cursor-pointer \${
                            isMuted 
                              ? 'bg-red-500/95 text-white border-red-600' 
                              : 'bg-stone-900/80 hover:bg-stone-900 text-white border-stone-800'
                          }\`}
                          title={isMuted ? 'Ativar Microfone' : 'Mutar Microfone'}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Timer details at the bottom of the viewfinder */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-stone-950/60 backdrop-blur-[2px] py-1.5 px-3 rounded-lg text-white pointer-events-none z-15">
                        <span className="text-[10px] text-stone-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tempo Máximo: {config.maxDuration}s
                        </span>
                        <span className={\`font-mono text-xs font-bold \${recordingDuration >= config.maxDuration - 10 ? 'text-red-400 animate-pulse' : 'text-stone-100'}\`}>
                          {formatTimer(recordingDuration)}
                        </span>
                      </div>
                    </div>

                    {/* CONTROLS (RECORD BUTTON) OVERLAPPING THE BOTTOM OF THE VIDEO */}
                    <div className="flex justify-center -mt-10 mb-4 z-20 relative drop-shadow-xl">
                      {appState === 'ready' ? (
                        <button
                          onClick={startRecording}
                          className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-gold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
                        >
                          <span className="w-14 h-14 bg-red-600 rounded-full group-hover:scale-95 transition-all" />
                          <span className="absolute -bottom-6 text-[10px] font-bold text-stone-600 uppercase tracking-wider bg-white/80 px-2 rounded-full shadow-sm backdrop-blur-sm">Gravar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => stopRecording()}
                          className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center border-4 border-stone-600 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
                        >
                          <span className="w-8 h-8 bg-stone-800 rounded-sm" />
                          <span className="absolute -bottom-6 text-[10px] font-bold text-red-600 uppercase tracking-wider bg-white/80 px-2 rounded-full shadow-sm backdrop-blur-sm">Parar</span>
                        </button>
                      )}
                    </div>

                    {/* FILTER, BRIGHTNESS CONTROL & POSE TIPS ROW */}
                    <div className="grid grid-cols-1 gap-3 px-1">
                      {/* Filter Selector */}
                      <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 shadow-sm">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2 text-center">
                          Moldura do Vídeo:
                        </label>
                        <div className="flex justify-center gap-1.5 flex-wrap">
                          {FILTER_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setActiveFilter(preset.id)}
                              className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all \${
                                activeFilter === preset.id
                                  ? 'bg-rose-50 border-rose-gold text-rose-gold font-bold shadow-sm'
                                  : 'border-stone-100 bg-stone-100/50 text-stone-600 hover:bg-stone-200'
                              }\`}
                            >
                              <span>{preset.emoji}</span>
                              <span className="inline">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* BRIGHTNESS / EXPOSURE SLIDER */}
                      <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-sm">
                        <div className="flex justify-between items-center text-xs text-stone-600 font-semibold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm">☀️</span> Brilho / Exposição
                          </span>
                          <span className="text-rose-gold text-sm font-bold">{brightness}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-stone-400 font-medium">Escuro</span>
                          <input
                            type="range"
                            min="60"
                            max="180"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="flex-1 accent-rose-gold h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs text-stone-400 font-medium">Claro</span>
                        </div>
                      </div>

                      {/* MESSAGE TIPS COMPONENT */}
                      <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 shadow-sm relative overflow-hidden">
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-rose-100/30 rounded-full" />
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-rose-gold uppercase tracking-wider flex items-center gap-1.5">
                            <Smile className="w-4 h-4" /> Dica de Mensagem
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {activePoseIndex + 1} de {MESSAGE_SUGGESTIONS.length}
                          </span>
                        </div>
                        <div className="min-h-12 flex flex-col justify-center">
                          <p className="text-stone-800 text-[11px] font-bold leading-tight">
                            {MESSAGE_SUGGESTIONS[activePoseIndex].title}
                          </p>
                          <p className="text-stone-600 text-[11px] leading-snug mt-1">
                            {MESSAGE_SUGGESTIONS[activePoseIndex].desc}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-rose-100/40">
                          <button
                            type="button"
                            onClick={() => setActivePoseIndex((prev) => (prev > 0 ? prev - 1 : MESSAGE_SUGGESTIONS.length - 1))}
                            className="text-[10px] font-bold text-rose-gold/80 hover:text-rose-gold transition-colors flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                          >
                            ← Anterior
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePoseIndex((prev) => (prev < MESSAGE_SUGGESTIONS.length - 1 ? prev + 1 : 0))}
                            className="text-[10px] font-bold text-rose-gold/80 hover:text-rose-gold transition-colors flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                          >
                            Próxima →
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Go Back button */}
                    <div className="flex justify-center mt-6 mb-2">
                      {appState === 'ready' && (
                        <button
                          onClick={() => {
                            stopAllMedia();
                            setAppState('welcome');
                          }}
                          className="text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          Cancelar e Voltar ao Início
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
`;

let fullCode = fs.readFileSync('src/App.tsx', 'utf8');
const startTag = "{/* 2. CAMERA AND RECORDING INTERFACE */}";
const endTag = "{/* 3. PREVIEW AND SAVE SCREEN */}";
const startIndex = fullCode.indexOf(startTag);
const endIndex = fullCode.indexOf(endTag);

const newFullCode = fullCode.substring(0, startIndex) + code + "\n                " + fullCode.substring(endIndex);
fs.writeFileSync('src/App.tsx', newFullCode);
