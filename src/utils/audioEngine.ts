import { EngineMode, ParagraphItem } from '../types';

export interface AudioEngineCallbacks {
  onParagraphChange: (index: number) => void;
  onPlayStateChange: (isPlaying: boolean, isPaused: boolean) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onError: (errorMessage: string | null) => void;
  onSleepTimerTick: (secondsRemaining: number | null) => void;
  onDocumentFinished?: () => void;
}

class AudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private silentAudioElement: HTMLAudioElement | null = null;
  private audioCache = new Map<string, string>(); // key: docId_paraIndex_voice -> blobUrl
  private isPreloading = false;
  private preloadedKey: string | null = null;

  // Active state
  private currentDocId: string = '';
  private currentTitle: string = '';
  private paragraphs: ParagraphItem[] = [];
  private currentIndex: number = 0;
  private voice: string = 'Kore';
  private engineMode: EngineMode = 'gemini-neural';
  private playbackRate: number = 1.0;
  private callbacks: Partial<AudioEngineCallbacks> = {};

  // Sleep timer
  private sleepTimerId: ReturnType<typeof setInterval> | null = null;
  private sleepSecondsRemaining: number | null = null;

  // Native speech synthesis fallback
  private nativeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.setupMediaSession();
    }
  }

  private initAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('ended', () => {
      this.handleParagraphEnded();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.callbacks.onTimeUpdate?.(this.audioElement.currentTime, this.audioElement.duration || 0);
        this.updateMediaSessionPosition();
      }
    });

    this.audioElement.addEventListener('play', () => {
      this.callbacks.onPlayStateChange?.(true, false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    this.audioElement.addEventListener('pause', () => {
      this.callbacks.onPlayStateChange?.(false, true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Audio element error event:', e);
      // Fallback gracefully if needed
    });

    // Create a 1-second silent audio data URI to keep the mobile session awake during transitions or native speech
    // 44-byte silent WAV
    const silentWavBase64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    this.silentAudioElement = new Audio(silentWavBase64);
    this.silentAudioElement.loop = true;
  }

  public setCallbacks(callbacks: Partial<AudioEngineCallbacks>) {
    this.callbacks = callbacks;
  }

  public setEngineMode(mode: EngineMode) {
    this.engineMode = mode;
  }

  public setVoice(voice: string) {
    this.voice = voice;
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.audioElement) {
      this.audioElement.playbackRate = rate;
    }
    if (this.nativeUtterance) {
      this.nativeUtterance.rate = rate;
    }
  }

  public loadDocument(docId: string, title: string, paragraphs: ParagraphItem[], initialIndex: number = 0) {
    this.pause();
    this.currentDocId = docId;
    this.currentTitle = title;
    this.paragraphs = paragraphs;
    this.currentIndex = Math.max(0, Math.min(initialIndex, paragraphs.length - 1));
    this.updateMediaSessionMetadata();
  }

  public async playParagraph(index: number): Promise<void> {
    if (!this.paragraphs.length) return;
    this.currentIndex = Math.max(0, Math.min(index, this.paragraphs.length - 1));
    this.callbacks.onParagraphChange?.(this.currentIndex);
    this.updateMediaSessionMetadata();

    const currentParagraph = this.paragraphs[this.currentIndex];
    if (!currentParagraph || !currentParagraph.text.trim()) {
      this.nextParagraph();
      return;
    }

    // Start silent audio carrier first on user gesture to secure iOS background audio session
    try {
      this.silentAudioElement?.play().catch(() => {});
    } catch {}

    if (this.engineMode === 'gemini-neural') {
      await this.playWithGeminiTTS(currentParagraph);
    } else {
      this.playWithNativeSpeech(currentParagraph);
    }
  }

  private async playWithGeminiTTS(paragraph: ParagraphItem): Promise<void> {
    const cacheKey = `${this.currentDocId}_${paragraph.paragraphIndex}_${this.voice}`;
    let blobUrl = this.audioCache.get(cacheKey);

    this.callbacks.onLoadingChange?.(!blobUrl);
    this.callbacks.onError?.(null);

    try {
      if (!blobUrl) {
        // Fetch audio from /api/tts
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: paragraph.text,
            voice: this.voice,
            stylePrompt: 'Voz en español neutral, cálida, ritmo sereno de audiolibro con buena dicción y pausas naturales.',
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          // If server reports API key missing or error, seamlessly switch to native speech
          if (errData.fallbackToNative || response.status === 503) {
            console.info('Switching to native speech engine:', errData.error);
            this.callbacks.onError?.('Usando voz del dispositivo (Gemini API no configurada en este momento).');
            this.engineMode = 'native-device';
            this.playWithNativeSpeech(paragraph);
            return;
          }
          throw new Error(errData.error || `Error ${response.status} al generar audio`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        this.audioCache.set(cacheKey, blobUrl);
      }

      if (!this.audioElement) return;

      this.audioElement.src = blobUrl;
      this.audioElement.playbackRate = this.playbackRate;
      await this.audioElement.play();
      this.callbacks.onLoadingChange?.(false);
      this.callbacks.onPlayStateChange?.(true, false);

      // Trigger preloading of next paragraph in the background
      this.preloadNextParagraph(this.currentIndex + 1);
    } catch (err: unknown) {
      console.error('Error playing TTS chunk:', err);
      this.callbacks.onLoadingChange?.(false);
      // Fallback automatically to native speech so audio never stops
      this.callbacks.onError?.('Cambiando automáticamente a voz del dispositivo para no detener la lectura.');
      this.playWithNativeSpeech(paragraph);
    }
  }

  private preloadNextParagraph(nextIndex: number) {
    if (nextIndex >= this.paragraphs.length || this.isPreloading) return;

    const nextPara = this.paragraphs[nextIndex];
    const cacheKey = `${this.currentDocId}_${nextPara.paragraphIndex}_${this.voice}`;
    if (this.audioCache.has(cacheKey) || this.preloadedKey === cacheKey) return;

    this.isPreloading = true;
    this.preloadedKey = cacheKey;

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: nextPara.text,
        voice: this.voice,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          this.audioCache.set(cacheKey, url);
        }
      })
      .catch(() => {})
      .finally(() => {
        this.isPreloading = false;
      });
  }

  private playWithNativeSpeech(paragraph: ParagraphItem) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.callbacks.onError?.('Tu navegador no soporta síntesis de voz.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(paragraph.text);
    utterance.lang = 'es-ES';
    utterance.rate = this.playbackRate;

    // Pick best Spanish voice if available
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v) => v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))) ||
      voices.find((v) => v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onstart = () => {
      this.callbacks.onLoadingChange?.(false);
      this.callbacks.onPlayStateChange?.(true, false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    utterance.onend = () => {
      this.handleParagraphEnded();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Native speech error:', e);
        this.callbacks.onError?.('Error en la síntesis de voz nativa.');
      }
    };

    this.nativeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    this.callbacks.onLoadingChange?.(false);
  }

  private handleParagraphEnded() {
    if (this.currentIndex < this.paragraphs.length - 1) {
      this.playParagraph(this.currentIndex + 1);
    } else {
      this.callbacks.onPlayStateChange?.(false, false);
      this.callbacks.onDocumentFinished?.();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    this.callbacks.onPlayStateChange?.(false, true);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  public resume(): void {
    if (this.engineMode === 'gemini-neural') {
      if (this.audioElement && this.audioElement.src) {
        this.audioElement.play().catch(() => {
          this.playParagraph(this.currentIndex);
        });
      } else {
        this.playParagraph(this.currentIndex);
      }
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        this.playParagraph(this.currentIndex);
      }
    }
  }

  public togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public nextParagraph(): void {
    if (this.currentIndex < this.paragraphs.length - 1) {
      this.playParagraph(this.currentIndex + 1);
    }
  }

  public previousParagraph(): void {
    if (this.currentIndex > 0) {
      this.playParagraph(this.currentIndex - 1);
    } else if (this.audioElement) {
      this.audioElement.currentTime = 0;
    }
  }

  public isPlaying(): boolean {
    if (this.engineMode === 'gemini-neural') {
      return Boolean(this.audioElement && !this.audioElement.paused && !this.audioElement.ended);
    } else {
      return Boolean(typeof window !== 'undefined' && window.speechSynthesis.speaking && !window.speechSynthesis.paused);
    }
  }

  public isPaused(): boolean {
    if (this.engineMode === 'gemini-neural') {
      return Boolean(this.audioElement && this.audioElement.paused && this.audioElement.currentTime > 0);
    } else {
      return Boolean(typeof window !== 'undefined' && window.speechSynthesis.paused);
    }
  }

  // --- Sleep Timer ---
  public setSleepTimer(minutes: number | null): void {
    if (this.sleepTimerId) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = null;
    }

    if (!minutes || minutes <= 0) {
      this.sleepSecondsRemaining = null;
      this.callbacks.onSleepTimerTick?.(null);
      return;
    }

    this.sleepSecondsRemaining = minutes * 60;
    this.callbacks.onSleepTimerTick?.(this.sleepSecondsRemaining);

    this.sleepTimerId = setInterval(() => {
      if (this.sleepSecondsRemaining === null) return;
      this.sleepSecondsRemaining--;
      this.callbacks.onSleepTimerTick?.(this.sleepSecondsRemaining);

      // Fade out volume in the last 15 seconds
      if (this.sleepSecondsRemaining <= 15 && this.audioElement && this.sleepSecondsRemaining > 0) {
        this.audioElement.volume = Math.max(0.1, this.sleepSecondsRemaining / 15);
      }

      if (this.sleepSecondsRemaining <= 0) {
        if (this.sleepTimerId) clearInterval(this.sleepTimerId);
        this.sleepTimerId = null;
        this.sleepSecondsRemaining = null;
        this.pause();
        if (this.audioElement) this.audioElement.volume = 1.0;
        this.callbacks.onSleepTimerTick?.(null);
      }
    }, 1000);
  }

  // --- MediaSession API for Lockscreen and System Audio Controls ---
  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.previousParagraph();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.nextParagraph();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (this.audioElement) {
          this.audioElement.currentTime = Math.max(0, this.audioElement.currentTime - skipTime);
        } else {
          this.previousParagraph();
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (this.audioElement) {
          this.audioElement.currentTime = Math.min(this.audioElement.duration || 0, this.audioElement.currentTime + skipTime);
        } else {
          this.nextParagraph();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.pause();
      });
    } catch (e) {
      console.warn('MediaSession handler setup failed:', e);
    }
  }

  private updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;

    const total = this.paragraphs.length;
    const currentNum = this.currentIndex + 1;
    const currentPara = this.paragraphs[this.currentIndex];
    const pageNum = currentPara?.pageNumber || 1;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTitle || 'Documento en lectura',
        artist: 'VozDoc - Lector Pantalla Bloqueada',
        album: `Página ${pageNum} · Párrafo ${currentNum} de ${total}`,
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    } catch (e) {
      console.warn('Could not set MediaMetadata:', e);
    }
  }

  private updateMediaSessionPosition() {
    if (!('mediaSession' in navigator) || !this.audioElement) return;

    if ('setPositionState' in navigator.mediaSession && this.audioElement.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audioElement.duration,
          playbackRate: this.audioElement.playbackRate,
          position: Math.min(this.audioElement.currentTime, this.audioElement.duration),
        });
      } catch {}
    }
  }

  public destroy() {
    if (this.sleepTimerId) {
      clearInterval(this.sleepTimerId);
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.silentAudioElement) {
      this.silentAudioElement.pause();
      this.silentAudioElement.src = '';
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

// Global singleton audio engine instance
export const audioEngine = new AudioEngine();
