export interface ParagraphItem {
  id: string;
  pageNumber: number;
  paragraphIndex: number;
  text: string;
  audioBlobUrl?: string;
  audioDuration?: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  fileSize?: string;
  totalPages: number;
  totalParagraphs: number;
  paragraphs: ParagraphItem[];
  currentParagraphIndex: number;
  progressPercent: number;
  dateAdded: string;
  colorAccent: string;
  category: string;
  summary?: string;
}

export type ThemeMode = 'dark' | 'sepia' | 'light';

export type EngineMode = 'gemini-neural' | 'native-device';

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  desc: string;
  lang: string;
}

export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoadingAudio: boolean;
  currentDocumentId: string | null;
  currentParagraphIndex: number;
  playbackRate: number;
  voice: string;
  engineMode: EngineMode;
  sleepTimerMinutes: number | null;
  sleepTimerSecondsRemaining: number | null;
  theme: ThemeMode;
  fontSize: number; // in px
  autoScroll: boolean;
  hasAudioError: string | null;
}
