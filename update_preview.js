const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const startTag = "{/* 3. PREVIEW AND SAVE SCREEN */}";
const endTag = "{/* 4. CELEBRATION SCREEN */}";
const startIndex = code.indexOf(startTag);
const endIndex = code.indexOf(endTag);

const newContent = `{/* 3. PREVIEW AND SAVE SCREEN */}
                {appState === 'preview-recorded' && (
                  <motion.div
                    key="preview-recorded"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-1 h-full items-center justify-center w-full max-w-sm mx-auto"
                  >
                    <div className="w-full bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-xl border border-stone-200/60 flex flex-col gap-4">
                      <div className="text-center">
                        <h3 className="font-serif text-xl font-bold text-stone-800">Sua mensagem ficou pronta! 🎬</h3>
                        <p className="text-xs text-stone-500 mt-1">Assista ao vídeo e salve para enviar aos noivos.</p>
                      </div>

                      {/* VIDEO PLAYER PREVIEW */}
                      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-900 border-4 border-white shadow-sm">
                        <video
                          ref={recordedVideoRef}
                          src={recordedVideoUrl || undefined}
                          controls
                          style={{ filter: \`brightness(\${brightness}%) contrast(102%)\` }}
                          className="w-full h-full object-cover"
                          playsInline
                          onPlay={() => {
                            if (!hasAddedVideoTime.current && recordedVideoRef.current && autoSaveCountdown !== null) {
                              const duration = recordedVideoRef.current.duration;
                              if (duration && !isNaN(duration)) {
                                setAutoSaveCountdown(prev => (prev || 0) + Math.ceil(duration));
                                hasAddedVideoTime.current = true;
                              }
                            }
                          }}
                        />
                        {activeFilter !== 'none' && (
                          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12">
                            <span className="bg-stone-900/40 text-[9px] text-stone-300 font-mono py-1 px-2 rounded-full">
                              Moldura {FILTER_PRESETS.find(f => f.id === activeFilter)?.name} selecionada
                            </span>
                          </div>
                        )}
                      </div>

                      {/* SAVE CONTROLS / TAB */}
                      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 flex flex-col gap-3 relative overflow-hidden">
                        {autoSaveCountdown !== null && (
                          <div className="absolute top-0 left-0 w-full h-1 bg-stone-200">
                             <motion.div 
                               className="h-full bg-rose-gold" 
                               initial={{ width: '100%' }}
                               animate={{ width: '0%' }}
                               transition={{ duration: autoSaveCountdown, ease: 'linear' }}
                             />
                          </div>
                        )}
                        <div className="flex flex-col gap-2 mt-1">
                           <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Seu Nome:</label>
                           <input
                             type="text"
                             value={guestName}
                             onChange={(e) => setGuestName(e.target.value)}
                             placeholder="Ex: Pedro e Carol"
                             className="w-full px-3 py-2.5 border border-stone-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm font-medium text-stone-800"
                           />
                        </div>
                        
                        <button
                          onClick={() => {
                            setAutoSaveCountdown(null);
                            saveVideoToDevice('background');
                            uploadVideoToDrive();
                          }}
                          disabled={isUploading}
                          className="w-full bg-gold-600 hover:bg-gold-700 active:bg-gold-800 disabled:bg-stone-300 disabled:text-stone-500 text-white font-medium py-3.5 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 text-sm"
                        >
                          {isUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                          <span>{isUploading ? \`Enviando (\${uploadProgress}%)\` : 'Salvar e Enviar Vídeo'}</span>
                        </button>
                        
                        {autoSaveCountdown !== null && (
                           <div className="flex items-center justify-between text-[10px] text-stone-400">
                             <span>Salvamento automático em {autoSaveCountdown}s</span>
                             <button onClick={() => setAutoSaveCountdown(null)} className="hover:text-stone-600 uppercase font-bold">Pausar</button>
                           </div>
                        )}
                      </div>
                      
                      <button
                        onClick={discardRecording}
                        className="text-[11px] text-stone-500 font-bold uppercase hover:text-stone-700 py-1 transition-colors text-center w-full"
                      >
                        Descartar e Gravar Novamente
                      </button>
                    </div>
                  </motion.div>
                )}

                `;
code = code.substring(0, startIndex) + newContent + code.substring(endIndex);
fs.writeFileSync('src/App.tsx', code);
