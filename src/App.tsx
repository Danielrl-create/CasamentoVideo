/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Video, 
  Camera, 
  Download, 
  RefreshCw, 
  Play, 
  Pause, 
  Trash2, 
  Settings, 
  Check, 
  Sparkles, 
  Share2, 
  Volume2, 
  VolumeX, 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  ArrowRight,
  Info,
  HelpCircle,
  Film,
  Smile,
  X,
  FileVideo,
  RotateCcw
} from 'lucide-react';

// Interfaces
interface WeddingConfig {
  brideName: string;
  groomName: string;
  date: string;
  location: string;
  welcomeMessage: string;
  maxDuration: number; // in seconds
}

interface SavedMessage {
  id: string;
  guestName: string;
  videoUrl: string;
  createdAt: string;
  duration: number;
}

// Default Configuration
const DEFAULT_CONFIG: WeddingConfig = {
  brideName: "Ana",
  groomName: "Bruno",
  date: "2026-09-19",
  location: "Espaço Jardim das Flores, São Paulo",
  welcomeMessage: "Deixe seu carinho gravado para sempre em nossa história! Grave um vídeo especial desejando felicidades aos noivos.",
  maxDuration: 60, // 60 seconds limit
};

// Wedding Filter Overlays
const FILTER_PRESETS = [
  { id: 'none', name: 'Sem Moldura', emoji: '📸' },
  { id: 'romantic', name: 'Romântico (Rosas)', emoji: '🌸', border: 'border-pink-300', text: 'Felizes para Sempre' },
  { id: 'gold', name: 'Luxo (Ouro)', emoji: '✨', border: 'border-amber-400', text: 'Amor Eterno' },
  { id: 'polaroid', name: 'Vintage (Polaroid)', emoji: '🎞️', border: 'border-white pb-12 shadow-md', text: 'Nosso Casamento ❤️' },
];

export default function App() {
  // App Config State
  const [config, setConfig] = useState<WeddingConfig>(() => {
    const saved = localStorage.getItem('wedding_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  // App States
  // 'welcome' | 'setup-camera' | 'ready' | 'recording' | 'preview-recorded' | 'saved-celebration'
  const [appState, setAppState] = useState<'welcome' | 'ready' | 'recording' | 'preview-recorded' | 'saved-celebration'>('welcome');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('gold');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('');
  
  // Media Recorder States
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isAudioLevel, setIsAudioLevel] = useState<number>(0); // Fake level for visualizer
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);

  // Gallery of messages saved locally in this browser
  const [localGallery, setLocalGallery] = useState<SavedMessage[]>(() => {
    const saved = localStorage.getItem('wedding_gallery');
    return saved ? JSON.parse(saved) : [];
  });

  // HTML Element Refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const recordedVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('wedding_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('wedding_gallery', JSON.stringify(localGallery));
  }, [localGallery]);

  // Clean up media streams and animations on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  // Request & Start Camera
  const startCamera = async (currentFacingMode = facingMode) => {
    try {
      setIsLoadingStream(true);
      setErrorMsg('');
      stopAllMedia();

      const constraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      };

      const userStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = userStream;
      setStream(userStream);
      
      // Assign stream to video preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = userStream;
      }

      // Audio visualizer setup
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(userStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          // Scale level from 0 to 100
          setIsAudioLevel(Math.min(100, Math.round((average / 255) * 150)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (e) {
        console.warn("Audio level visualization not fully supported", e);
      }

      setAppState('ready');
    } catch (err: any) {
      console.error("Camera access failed", err);
      setErrorMsg("Não foi possível acessar sua câmera ou microfone. Por favor, certifique-se de dar permissão ao site para gravar.");
    } finally {
      setIsLoadingStream(false);
    }
  };

  // Switch facing mode (Front / Back Camera)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (appState === 'ready' || appState === 'recording') {
      startCamera(nextMode);
    }
  };

  // Find supported MIME types for Recording
  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/quicktime'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Start Recording Video
  const startRecording = () => {
    if (!streamRef.current) return;
    
    setRecordedChunks([]);
    setErrorMsg('');
    setRecordingDuration(0);

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        // Handled after state update or explicit click
      };

      // Handle mute state inside audio track
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });

      recorder.start(250); // Get chunks every 250ms
      setMediaRecorder(recorder);
      setAppState('recording');

      // Start duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= config.maxDuration - 1) {
            stopRecording(recorder);
            return config.maxDuration;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Failed to start MediaRecorder", err);
      setErrorMsg("Erro ao iniciar a gravação com o formato suportado pelo seu navegador.");
    }
  };

  // Stop Recording Video
  const stopRecording = (activeRecorder = mediaRecorder) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (activeRecorder && activeRecorder.state !== 'inactive') {
      activeRecorder.stop();
    }

    // Release camera stream so mic goes green/off
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);

    setAppState('preview-recorded');
  };

  // Compile chunks into a single URL for Previewing
  useEffect(() => {
    if (appState === 'preview-recorded' && recordedChunks.length > 0) {
      const mimeType = getSupportedMimeType() || 'video/mp4';
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setRecordedBlob(blob);
    }
  }, [recordedChunks, appState]);

  // Cancel Recording and return to active camera
  const discardRecording = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecordedBlob(null);
    setRecordedChunks([]);
    setRecordingDuration(0);
    startCamera(facingMode);
  };

  // Save the video file (Download to Gallery)
  const saveVideoToDevice = () => {
    if (!recordedBlob) return;

    // Build elegant filename
    const cleanGuestName = guestName.trim()
      ? guestName.trim().replace(/[^a-zA-Z0-9]/g, '_')
      : 'Convidado_Especial';
    
    const weddingFileName = `Casamento_${config.brideName}_e_${config.groomName}_Mensagem_de_${cleanGuestName}.mp4`;

    // Download flow
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = recordedVideoUrl!;
    a.download = weddingFileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);

    // Save to local gallery list as well (local memories history)
    const newMsg: SavedMessage = {
      id: Date.now().toString(),
      guestName: guestName.trim() || 'Convidado Especial',
      videoUrl: recordedVideoUrl!,
      createdAt: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      duration: recordingDuration
    };

    setLocalGallery((prev) => [newMsg, ...prev]);
    setAppState('saved-celebration');
  };

  // Trigger Native Sharing if supported
  const shareVideo = async () => {
    if (!recordedBlob) return;
    
    try {
      const cleanGuestName = guestName.trim() ? guestName.trim() : 'Convidado';
      const file = new File([recordedBlob], `Mensagem_de_${cleanGuestName}.mp4`, { type: recordedBlob.type });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Mensagem para ${config.brideName} & ${config.groomName}`,
          text: `Olha a mensagem de carinho que acabei de gravar para o casamento de ${config.brideName} & ${config.groomName}! ❤️`,
        });
      } else {
        // Fallback: Copy Link / WhatsApp instruction
        alert("O compartilhamento nativo de arquivos não é totalmente suportado pelo seu navegador atual. Você pode baixar o vídeo clicando em 'Salvar na Galeria' e depois compartilhá-lo via WhatsApp!");
      }
    } catch (e) {
      console.error("Sharing failed", e);
    }
  };

  // Format countdown timer (MM:SS)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Delete message from local memory
  const deleteLocalMessage = (id: string, url: string) => {
    if (confirm("Deseja realmente excluir este vídeo gravado? Isso apagará o registro local.")) {
      setLocalGallery((prev) => prev.filter(msg => msg.id !== id));
      URL.revokeObjectURL(url);
    }
  };

  // Format wedding date beautifully
  const formatWeddingDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div id="wedding-app-root" className="min-h-screen flex flex-col items-center justify-start bg-amber-50/20 px-4 py-6 md:py-10 selection:bg-rose-100 selection:text-rose-gold text-stone-800">
      
      {/* Dynamic Background subtle elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <span className="absolute top-[10%] left-[5%] text-rose-200/40 text-4xl animate-float">❤️</span>
        <span className="absolute top-[25%] right-[8%] text-amber-200/40 text-5xl animate-float" style={{ animationDelay: '1.5s' }}>✨</span>
        <span className="absolute bottom-[20%] left-[8%] text-rose-200/30 text-3xl animate-float" style={{ animationDelay: '2.5s' }}>🌸</span>
        <span className="absolute bottom-[10%] right-[12%] text-amber-200/40 text-4xl animate-float" style={{ animationDelay: '0.5s' }}>🥂</span>
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-gold-100/20 rounded-full filter blur-3xl" />
      </div>

      <div className="w-full max-w-md md:max-w-xl z-10 flex flex-col flex-1">
        
        {/* Header Branding */}
        <header id="wedding-header" className="text-center mb-8 flex flex-col items-center">
          <div className="relative inline-flex items-center justify-center p-2 bg-white rounded-full shadow-sm border border-gold-100 mb-3 animate-soft-pulse">
            <Heart className="w-8 h-8 text-rose-gold fill-rose-gold/20" />
            <Sparkles className="w-4 h-4 text-gold-400 absolute top-1 right-1" />
          </div>
          
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-gold-800 leading-tight">
            {config.brideName} <span className="font-serif italic text-rose-gold text-2xl md:text-3xl">&</span> {config.groomName}
          </h1>
          <p className="font-serif italic text-stone-500 mt-1 flex items-center gap-1.5 text-sm md:text-base">
            <Calendar className="w-4 h-4 text-gold-500" />
            {formatWeddingDate(config.date)}
          </p>

          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-gold-300 to-transparent my-3" />
        </header>

        {/* Primary Content Card Container */}
        <main className="bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-gold-100/60 p-5 md:p-8 flex-1 flex flex-col justify-between relative overflow-hidden">
          
          {/* Quick Setup Gear Button (Top-Right) */}
          <button 
            id="btn-toggle-settings"
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-50 hover:bg-stone-100 text-stone-400 hover:text-gold-600 transition-colors z-20"
            title="Configurar Casamento"
          >
            {showSettings ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
          </button>

          <AnimatePresence mode="wait">
            {/* 1. CONFIGURATION VIEW */}
            {showSettings ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-gold-600" />
                    <h2 className="font-serif text-lg font-medium text-stone-800">Painel dos Noivos</h2>
                  </div>
                  <p className="text-xs text-stone-500 mb-5">
                    Personalize os dados abaixo para configurar o aplicativo com os nomes e informações do seu próprio casamento!
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Nome da Noiva(o) 1</label>
                        <input 
                          type="text" 
                          value={config.brideName}
                          onChange={(e) => setConfig({ ...config, brideName: e.target.value })}
                          className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm font-medium"
                          placeholder="Ana"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Nome da Noiva(o) 2</label>
                        <input 
                          type="text" 
                          value={config.groomName}
                          onChange={(e) => setConfig({ ...config, groomName: e.target.value })}
                          className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm font-medium"
                          placeholder="Bruno"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Data do Casamento</label>
                      <input 
                        type="date" 
                        value={config.date}
                        onChange={(e) => setConfig({ ...config, date: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm text-stone-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Local da Cerimônia/Festa</label>
                      <input 
                        type="text" 
                        value={config.location}
                        onChange={(e) => setConfig({ ...config, location: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm"
                        placeholder="Espaço Jardim, São Paulo"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Mensagem de Boas-vindas</label>
                      <textarea 
                        value={config.welcomeMessage}
                        onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm text-stone-600 resize-none leading-relaxed"
                        placeholder="Mensagem exibida na tela inicial..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Tempo Máximo de Gravação ({config.maxDuration}s)</label>
                      <div className="flex gap-4 items-center mt-1">
                        {[30, 60, 90, 120].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setConfig({ ...config, maxDuration: sec })}
                            className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              config.maxDuration === sec 
                                ? 'bg-gold-500 border-gold-600 text-white shadow-sm' 
                                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full bg-gold-600 hover:bg-gold-700 active:bg-gold-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-md shadow-gold-600/10 flex items-center justify-center gap-2 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Configurações
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ACTIVE WEDDING USER VIEWS */
              <div className="flex flex-col h-full flex-1 justify-between">
                
                {appState === 'welcome' && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="flex flex-col items-center text-center justify-between h-full flex-1"
                  >
                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                      {/* Romantic Ring or Cake vector design */}
                      <div className="relative mb-6">
                        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100/60 shadow-inner">
                          <Film className="w-10 h-10 text-rose-gold animate-soft-pulse" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-amber-100 rounded-full p-1.5 border border-white">
                          <Sparkles className="w-4 h-4 text-gold-600" />
                        </div>
                      </div>

                      <h2 className="font-serif text-2xl font-semibold text-stone-800 leading-tight">
                        Deixe sua Mensagem de Vídeo!
                      </h2>

                      <p className="text-stone-600 text-sm md:text-base leading-relaxed max-w-sm mt-3 px-2">
                        {config.welcomeMessage}
                      </p>

                      {config.location && (
                        <div className="mt-4 flex items-center gap-1.5 text-xs text-stone-400 bg-stone-50 py-1.5 px-3 rounded-full border border-stone-100/50">
                          <MapPin className="w-3.5 h-3.5 text-gold-500" />
                          <span>{config.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full mt-6 space-y-4">
                      <button
                        id="btn-start-camera"
                        onClick={() => startCamera()}
                        disabled={isLoadingStream}
                        className="w-full bg-rose-gold hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 text-white font-medium py-3.5 rounded-2xl transition-all shadow-lg shadow-rose-gold/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoadingStream ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Preparando Câmera...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5" />
                            <span>Gravar Nova Mensagem</span>
                          </>
                        )}
                      </button>

                      {/* Info footer */}
                      <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1">
                        <Info className="w-3 h-3" />
                        Seu vídeo é salvo diretamente no armazenamento do seu celular.
                      </p>
                    </div>
                  </motion.div>
                )}

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
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-3 flex items-start gap-2">
                        <span className="text-red-500 font-bold">⚠️</span>
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    {/* Filter Selector (When ready, before recording or while recording) */}
                    <div className="mb-4">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5 text-center">
                        Selecione a Moldura do Vídeo:
                      </label>
                      <div className="flex justify-center gap-2">
                        {FILTER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setActiveFilter(preset.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              activeFilter === preset.id
                                ? 'bg-rose-50 border-rose-gold text-rose-gold font-bold shadow-sm'
                                : 'border-stone-100 bg-stone-50/80 text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            <span>{preset.emoji}</span>
                            <span className="hidden sm:inline">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* VIDEO CONTAINER */}
                    <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-inner flex items-center justify-center">
                      
                      {/* HTML5 video element for camera preview */}
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                      />

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
                              className={`absolute inset-3 border-4 ${preset.border} rounded-xl pointer-events-none flex flex-col justify-end items-center p-4 transition-all duration-300 z-10`}
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
                            <div className="w-1 bg-green-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, isAudioLevel * 0.2)}px` }} />
                            <div className="w-1 bg-green-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, isAudioLevel * 0.35)}px` }} />
                            <div className="w-1 bg-green-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, isAudioLevel * 0.15)}px` }} />
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
                          className={`p-2 rounded-full backdrop-blur-sm border transition-all cursor-pointer ${
                            isMuted 
                              ? 'bg-red-500/95 text-white border-red-600' 
                              : 'bg-stone-900/80 hover:bg-stone-900 text-white border-stone-800'
                          }`}
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
                        <span className={`font-mono text-xs font-bold ${recordingDuration >= config.maxDuration - 10 ? 'text-red-400 animate-pulse' : 'text-stone-100'}`}>
                          {formatTimer(recordingDuration)}
                        </span>
                      </div>
                    </div>

                    {/* CONTROLS */}
                    <div className="mt-6 flex flex-col items-center">
                      {appState === 'ready' ? (
                        <button
                          onClick={startRecording}
                          className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center border-4 border-rose-gold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
                        >
                          <span className="w-14 h-14 bg-red-600 rounded-full group-hover:scale-95 transition-all" />
                          <span className="absolute -bottom-6 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Gravar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => stopRecording()}
                          className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center border-4 border-stone-600 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
                        >
                          <span className="w-8 h-8 bg-stone-800 rounded-sm" />
                          <span className="absolute -bottom-6 text-[10px] font-bold text-red-600 uppercase tracking-wider">Parar</span>
                        </button>
                      )}

                      {/* Go Back button */}
                      {appState === 'ready' && (
                        <button
                          onClick={() => {
                            stopAllMedia();
                            setAppState('welcome');
                          }}
                          className="mt-10 text-xs font-semibold text-stone-400 hover:text-stone-600 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Voltar para o início
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 3. PREVIEW AND SAVE SCREEN */}
                {appState === 'preview-recorded' && (
                  <motion.div
                    key="preview-recorded"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-1 h-full"
                  >
                    <div className="text-center mb-4">
                      <h3 className="font-serif text-lg font-bold text-stone-800">Sua mensagem ficou pronta! 🎬</h3>
                      <p className="text-xs text-stone-500">Assista ao seu vídeo antes de salvar diretamente no celular.</p>
                    </div>

                    {/* VIDEO PLAYER PREVIEW */}
                    <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-900 border border-stone-200/80 shadow-md">
                      <video
                        ref={recordedVideoRef}
                        src={recordedVideoUrl || undefined}
                        controls
                        className="w-full h-full object-cover"
                        playsInline
                      />
                      
                      {/* Interactive frame layer over play (visual aid, not embedded directly in downsampled pixels, but represents styling) */}
                      {activeFilter !== 'none' && (
                        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12">
                          <span className="bg-stone-900/40 text-[9px] text-stone-300 font-mono py-1 px-2 rounded-full">
                            Moldura {FILTER_PRESETS.find(f => f.id === activeFilter)?.name} selecionada
                          </span>
                        </div>
                      )}
                    </div>

                    {/* GUEST DETAILS INPUT */}
                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-rose-gold" />
                          Seu Nome ou Nome do Casal:
                        </label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Ex: Pedro e Carol, Família Silva..."
                          className="w-full px-4 py-3 border border-stone-200 bg-stone-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-gold text-sm font-medium text-stone-800 shadow-inner"
                        />
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="space-y-3 pt-2">
                        {/* Download and Save */}
                        <button
                          onClick={saveVideoToDevice}
                          className="w-full bg-rose-gold hover:bg-rose-700 active:bg-rose-800 text-white font-medium py-3.5 rounded-2xl transition-all shadow-md shadow-rose-gold/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>Salvar na Galeria do Celular</span>
                        </button>

                        {/* Optional share */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={shareVideo}
                            type="button"
                            className="bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-700 font-semibold py-2.5 px-3 rounded-xl border border-stone-200 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Compartilhar
                          </button>

                          <button
                            onClick={discardRecording}
                            type="button"
                            className="bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-red-600 font-semibold py-2.5 px-3 rounded-xl border border-stone-200 hover:border-red-100 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Gravar Outro
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. CELEBRATION SCREEN */}
                {appState === 'saved-celebration' && (
                  <motion.div
                    key="saved-celebration"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center justify-center py-6 h-full flex-1"
                  >
                    {/* Pulsing visual heart burst */}
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center shadow-inner border border-rose-100">
                        <Heart className="w-10 h-10 text-rose-gold fill-rose-gold" />
                      </div>
                      
                      {/* Floating mini-hearts or sparkles */}
                      <span className="absolute -top-1 -left-1 text-base animate-bounce">✨</span>
                      <span className="absolute top-1/2 -right-3 text-lg animate-pulse" style={{ animationDelay: '0.8s' }}>💖</span>
                    </div>

                    <h3 className="font-serif text-2xl font-semibold text-stone-800">Sua mensagem foi salva!</h3>
                    
                    <p className="text-stone-600 text-sm leading-relaxed max-w-xs mt-3">
                      O vídeo foi baixado e já está na galeria ou na pasta de downloads do seu celular! 🎉
                    </p>

                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 max-w-xs mt-5 text-left text-xs text-stone-500 leading-relaxed">
                      <span className="font-bold text-stone-700 block mb-1">Como enviar aos noivos?</span>
                      Você pode abrir seu WhatsApp, Instagram ou Telegram e enviar este vídeo diretamente para {config.brideName} & {config.groomName}, ou carregá-lo na pasta compartilhada de presentes do casal!
                    </div>

                    <div className="w-full mt-8 space-y-3">
                      <button
                        onClick={() => {
                          setAppState('welcome');
                          setGuestName('');
                          setRecordedChunks([]);
                          setRecordedVideoUrl(null);
                          setRecordedBlob(null);
                        }}
                        className="w-full bg-gold-600 hover:bg-gold-700 active:bg-gold-800 text-white font-medium py-3 rounded-xl transition-all shadow-md shadow-gold-600/10 text-xs"
                      >
                        Deixar Outra Mensagem
                      </button>

                      <button
                        onClick={shareVideo}
                        className="w-full bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-semibold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Compartilhar Agora
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>
            )}
          </AnimatePresence>

        </main>

        {/* Local device memory gallery section (only show if messages are saved) */}
        {!showSettings && localGallery.length > 0 && (
          <motion.section 
            id="saved-messages-gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 bg-white/65 backdrop-blur-sm rounded-2xl border border-gold-100/40 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-gold-600" />
                <h3 className="font-serif text-sm font-semibold text-stone-700">Seus Vídeos Salvos neste Aparelho</h3>
              </div>
              <span className="bg-gold-100 text-gold-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {localGallery.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {localGallery.map((msg) => (
                <div key={msg.id} className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm relative group flex flex-col justify-between">
                  <div>
                    <p className="font-medium text-stone-800 text-xs truncate" title={msg.guestName}>
                      {msg.guestName}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-300" />
                      {formatTimer(msg.duration)} • {msg.createdAt.split(' ')[0]}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-stone-50">
                    <a
                      href={msg.videoUrl}
                      download={`Casamento_${config.brideName}_e_${config.groomName}_Mensagem_de_${msg.guestName.replace(/ /g, '_')}.mp4`}
                      className="flex-1 py-1 px-2 bg-gold-50 hover:bg-gold-100 text-gold-800 font-bold rounded text-[10px] text-center flex items-center justify-center gap-1 transition-colors"
                      title="Baixar de Novo"
                    >
                      <Download className="w-3 h-3" />
                      Baixar
                    </a>
                    
                    <button
                      onClick={() => deleteLocalMessage(msg.id, msg.videoUrl)}
                      className="p-1 hover:bg-red-50 text-stone-300 hover:text-red-500 rounded transition-colors"
                      title="Excluir do aparelho"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Elegant Footer with Credits */}
        <footer className="text-center mt-8 pb-10 text-[10px] text-stone-400">
          <p className="font-serif italic text-gold-800/60 mb-1">
            Feito com amor para o casamento de {config.brideName} & {config.groomName}
          </p>
          <p>© 2026 • Gravador de Recordações de Casamento</p>
        </footer>

      </div>
    </div>
  );
}
