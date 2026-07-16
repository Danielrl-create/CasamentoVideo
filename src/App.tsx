/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Video, 
  Camera, 
  Download,
  CloudUpload, 
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
  RotateCcw,
  Upload,
  ImagePlus
} from 'lucide-react';

const SLIDESHOW_IMAGES = [
  '/images/slide1.jpg',
  '/images/slide2.jpg',
  '/images/slide3.jpg'
];

function Slideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/60 shadow-sm mb-6">
      {SLIDESHOW_IMAGES.map((src, idx) => (
        <motion.img
          key={src}
          src={src}
          alt={`Slide ${idx + 1}`}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: idx === currentIndex ? 1 : 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

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
  brideName: "Vitória",
  groomName: "Daniel",
  date: "2026-09-05",
  location: "Sítio Rangel Coutinho, Travessão",
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

const MESSAGE_SUGGESTIONS = [
  { id: 1, title: "🗣️ Relembre uma História", desc: "Conte uma história engraçada ou emocionante que você viveu com a Vitória ou o Daniel." },
  { id: 2, title: "🥂 Um Brinde!", desc: "Deixe uma mensagem de felicitações e brinde ao amor do casal!" },
  { id: 3, title: "🔮 Conselho para o Futuro", desc: "Qual o segredo para um casamento feliz? Deixe seu conselho para os recém-casados." },
  { id: 4, title: "❤️ Muito Amor", desc: "Diga o quanto você os ama e está feliz por participar deste momento especial." },
  { id: 5, title: "👶 E os filhos?", desc: "Faça uma brincadeira amorosa perguntando quando virão os bebês!" },
  { id: 6, title: "🎉 Desejo de Felicidades", desc: "Seja breve e direto: 'Vitória e Daniel, desejo toda a felicidade do mundo para vocês!'" },
  { id: 7, title: "✈️ A Lua de Mel", desc: "Deseje uma ótima viagem de lua de mel e que aproveitem muito juntos!" }
];

export default function App() {
  // App Config State
  const [config, setConfig] = useState<WeddingConfig>(() => {
    const saved = localStorage.getItem('wedding_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Overwrite if it is the previous default configuration so the user sees the new names immediately
        if ((parsed.brideName === "Ana" && parsed.groomName === "Bruno") || (parsed.location === "Espaço Jardim das Flores, São Paulo")) {
          return DEFAULT_CONFIG;
        }
        return parsed;
      } catch (e) {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  // App States
  // 'welcome' | 'setup-camera' | 'ready' | 'recording' | 'preview-recorded' | 'saved-celebration'
  const [appState, setAppState] = useState<'welcome' | 'ready' | 'recording' | 'preview-recorded' | 'saved-celebration'>('welcome');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('gold');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [guestName, setGuestName] = useState<string>('');
  
  // Brightness level: 60% to 180%. Default slightly boosted to 115% for cozy indoor wedding lowlights.
  const [brightness, setBrightness] = useState<number>(115);
  // Auto Save timer countdown state
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);
  const [celebrationCountdown, setCelebrationCountdown] = useState<number | null>(null);
  const [triggerAutoSave, setTriggerAutoSave] = useState<boolean>(false);
  // Active pose index
  const [activePoseIndex, setActivePoseIndex] = useState<number>(0);
  // Demo / Simulation mode for sandbox iframe environments where media devices are restricted
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [alwaysSaveToDevice, setAlwaysSaveToDevice] = useState<boolean>(() => {
    return localStorage.getItem('wedding_always_save') === 'true';
  });

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

  // File Upload States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');

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

  // Guarantee that the stream is assigned to the video preview as soon as the element is mounted in the DOM
  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      if (videoPreviewRef.current.srcObject !== stream) {
        videoPreviewRef.current.srcObject = stream;
      }
    }
  }, [stream, appState]);

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
    if ((window as any)._fakeAudioInterval) {
      clearInterval((window as any)._fakeAudioInterval);
      (window as any)._fakeAudioInterval = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  // Request & Start Camera
  const startCamera = async (currentFacingMode = facingMode, forceDemo = false) => {
    try {
      hasAddedVideoTime.current = false;
      setIsLoadingStream(true);
      setErrorMsg('');
      stopAllMedia();

      if (forceDemo) {
        setIsDemoMode(true);
        // Start a fake audio visualizer update loop for high-fidelity interactive simulation
        let fakeAudioInterval = setInterval(() => {
          setIsAudioLevel(Math.floor(Math.random() * 45) + 10);
        }, 120);
        // Save interval so we can clear it in stopAllMedia
        (window as any)._fakeAudioInterval = fakeAudioInterval;
        setAppState('ready');
        return;
      }

      setIsDemoMode(false);
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
      console.warn("Camera access failed", err);
      setErrorMsg("Não foi possível acessar sua câmera ou microfone. Isso ocorre devido a restrições de permissão do navegador ou do ambiente do frame de teste.");
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
    if (isDemoMode) {
      setRecordedChunks([]);
      setErrorMsg('');
      setRecordingDuration(0);
      setAppState('recording');

      // Start duration counter for simulated recording
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= config.maxDuration - 1) {
            stopRecording(null);
            return config.maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
      return;
    }

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

    if (isDemoMode) {
      setAppState('preview-recorded');
      return;
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
    if (appState === 'preview-recorded') {
      if (isDemoMode) {
        // High quality fast public sample video
        const demoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
        setRecordedVideoUrl(demoUrl);
        setRecordedBlob(new Blob(["demo"], { type: "video/mp4" }));
      } else if (recordedChunks.length > 0) {
        const mimeType = getSupportedMimeType() || 'video/mp4';
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setRecordedBlob(blob);
      }
    }
  }, [recordedChunks, appState, isDemoMode]);

  // Auto-save logic when preview is ready
  useEffect(() => {
    if (appState !== 'preview-recorded' || !recordedBlob) {
      setAutoSaveCountdown(null);
      return;
    }

    if (alwaysSaveToDevice) {
      setTriggerAutoSave(true);
      return;
    }

    // Set 20 seconds countdown
    setAutoSaveCountdown(20);
    
    // We use a local variable to prevent multiple fires due to React strict mode
    let hasSaved = false;

    const interval = setInterval(() => {
      setAutoSaveCountdown((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasSaved) {
            hasSaved = true;
            setTriggerAutoSave(true);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [appState, recordedBlob, alwaysSaveToDevice]);

  useEffect(() => {
    if (triggerAutoSave) {
      setTriggerAutoSave(false);
      saveVideoToDevice('background');
      uploadVideoToDrive();
    }
  }, [triggerAutoSave, guestName]); // guestName dependency ensures we have latest closure

  useEffect(() => {
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
  }, [appState]);

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
  const saveVideoToDevice = async (isAuto: boolean | 'background' = false) => {
    if (!recordedBlob) return;

    // Build elegant filename
    const cleanGuestName = guestName.trim()
      ? guestName.trim().replace(/[^a-zA-Z0-9]/g, '_')
      : 'Convidado_Especial';
    
    const weddingFileName = `Casamento_${config.brideName}_e_${config.groomName}_Mensagem_de_${cleanGuestName}.mp4`;

    // Download flow
    if (isDemoMode) {
      // Fetch the sample video and download as a local blob so the custom filename is respected
      try {
        const res = await fetch(recordedVideoUrl!);
        const blob = await res.blob();
        const localUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = localUrl;
        a.download = weddingFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(localUrl);
        }, 100);
      } catch (err) {
        // Fallback if fetch is blocked
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = recordedVideoUrl!;
        a.download = weddingFileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      }
    } else {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = recordedVideoUrl!;
      a.download = weddingFileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
    }

    // Save to local gallery list as well (local memories history)
    const newMsg: SavedMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
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

    if (isAuto === 'background') {
      return;
    } else if (isAuto === true) {
      // Auto save transitions directly to welcome screen
      setAppState('welcome');
      setGuestName('');
      setRecordedChunks([]);
      setRecordedVideoUrl(null);
      setRecordedBlob(null);
    } else {
      setAppState('saved-celebration');
    }
  };

  // Upload Files to Drive Logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray: File[] = Array.from(e.target.files);
      const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime'];
      const validFiles = filesArray.filter((f: File) => {
         const isTypeValid = validTypes.includes(f.type) || !!f.name.toLowerCase().match(/\.(jpg|jpeg|png|heic|mp4|mov)$/);
         const isSizeValid = f.size <= 50 * 1024 * 1024;
         return isTypeValid && isSizeValid;
      });

      if (validFiles.length !== filesArray.length) {
         setErrorMsg('Alguns arquivos foram ignorados. Apenas imagens/vídeos válidos (até 50MB) são permitidos.');
      } else {
         setErrorMsg('');
      }

      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 15)); // Limit to 15 files at a time
    }
  };

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const pendingActionRef = useRef<'album' | 'video' | null>(null);
  const hasAddedVideoTime = useRef<boolean>(false);

  const loginAndUpload = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      if (pendingActionRef.current === 'video') {
        performVideoUpload(tokenResponse.access_token);
      } else {
        performUpload(tokenResponse.access_token);
      }
      pendingActionRef.current = null;
    },
    onError: () => {
      setErrorMsg('Erro ao fazer login com o Google.');
      setIsUploading(false);
      pendingActionRef.current = null;
    },
    scope: 'https://www.googleapis.com/auth/drive.file'
  });

  const performUpload = async (token: string) => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg('');
    setUploadSuccessMessage('');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar os arquivos.');
      }

      setSelectedFiles([]);
      setUploadSuccessMessage('Arquivos enviados com sucesso! Muito obrigado por compartilhar esses momentos! ❤️');
      setTimeout(() => setUploadSuccessMessage(''), 8000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao enviar os arquivos.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFiles = () => {
    if (selectedFiles.length === 0) return;
    
    if (!accessToken) {
      pendingActionRef.current = 'album';
      loginAndUpload();
    } else {
      performUpload(accessToken);
    }
  };

  const performVideoUpload = async (token: string) => {
    if (!recordedBlob) return;
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg('');
    setUploadSuccessMessage('');

    const cleanGuestName = guestName.trim() ? guestName.trim() : 'Convidado';
    const file = new File([recordedBlob], `Mensagem_de_${cleanGuestName}.mp4`, { type: recordedBlob.type });

    const formData = new FormData();
    formData.append('files', file);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar no Google Drive.');
      }

      setUploadSuccessMessage('Vídeo salvo no Google Drive com sucesso! ❤️');
      setTimeout(() => setUploadSuccessMessage(''), 8000);
      setAppState('saved-celebration'); // Avança para a tela final
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao salvar o vídeo.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVideoToDrive = () => {
    if (!recordedBlob) return;
    
    if (!accessToken) {
      pendingActionRef.current = 'video';
      loginAndUpload();
    } else {
      performVideoUpload(accessToken);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
    } catch (e: any) {
      const errorMsgLower = (e?.message || '').toLowerCase();
      const errorName = e?.name || '';
      
      if (
        errorName === 'AbortError' || 
        errorMsgLower.includes('abort') || 
        errorMsgLower.includes('cancel') || 
        errorMsgLower.includes('cancellation')
      ) {
        // User cancelled the share dialog naturally. Log as info, not as an error.
        console.info("Compartilhamento cancelado pelo usuário.");
      } else {
        console.error("Sharing failed", e);
      }
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
    <div id="wedding-app-root" className="min-h-screen flex flex-col items-center justify-start bg-stone-100 px-4 py-6 md:py-10 selection:bg-rose-100 selection:text-rose-gold text-stone-800 relative overflow-hidden font-sans">
      
      {/* Modern Background subtle elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[url('https://www.transparenttextures.com/patterns/clean-textile.png')] opacity-40 mix-blend-multiply"></div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex justify-center items-center">
        <div className="w-[120vw] h-[120vh] bg-gradient-to-tr from-stone-100 via-rose-50 to-stone-50 rounded-[100%] blur-[100px] opacity-70 animate-slow-spin-reverse" style={{ animationDuration: '40s' }} />
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-gold-100/40 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-rose-200/30 rounded-full blur-[90px]" />
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
                    <div className="flex-1 flex flex-col items-center justify-center py-4 w-full">
                      <Slideshow />

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
                      <p className="text-[11px] text-stone-300 flex items-center justify-center gap-1">
                        <Info className="w-3 h-3" />
                        Seu vídeo é salvo e enviado de forma segura.
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
                          style={{ filter: `brightness(${brightness}%) contrast(102%)` }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ filter: `brightness(${brightness}%) contrast(102%)` }}
                          className={`w-full h-full object-cover transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
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
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                                activeFilter === preset.id
                                  ? 'bg-rose-50 border-rose-gold text-rose-gold font-bold shadow-sm'
                                  : 'border-stone-100 bg-stone-100/50 text-stone-600 hover:bg-stone-200'
                              }`}
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

                {/* 3. PREVIEW AND SAVE SCREEN */}
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
                          style={{ filter: `brightness(${brightness}%) contrast(102%)` }}
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
                          <span>{isUploading ? `Enviando (${uploadProgress}%)` : 'Salvar e Enviar Vídeo'}</span>
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
                      Muito obrigado por deixar seu carinho gravado! O vídeo já foi enviado para o mural dos noivos de forma segura. 🎉
                    </p>

                    <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 shadow-sm max-w-xs mt-5 text-center flex flex-col items-center justify-center gap-2">
                      <span className="font-bold text-stone-600 uppercase tracking-widest text-[10px]">Redirecionando em</span>
                      <motion.div 
                        key={celebrationCountdown}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-4xl font-serif font-bold text-rose-gold"
                      >
                        {celebrationCountdown}
                      </motion.div>
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
              {localGallery.map((msg, index) => (
                <div key={`${msg.id}-${index}`} className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm relative group flex flex-col justify-between">
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
