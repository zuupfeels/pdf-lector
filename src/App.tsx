import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Header } from './components/Header';
import { DocumentLibrary } from './components/DocumentLibrary';
import { DocumentViewer } from './components/DocumentViewer';
import { PlayerBar } from './components/PlayerBar';
import { LockScreenModal } from './components/LockScreenModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { DocumentItem, PlayerState, ThemeMode } from './types';
import { SAMPLE_DOCUMENTS, parsePdfFile, parsePlainText } from './utils/pdfParser';
import { audioEngine } from './utils/audioEngine';
import { useAuth } from './context/AuthContext';
import { db, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  const { user } = useAuth();

  // Local documents fallback for visitors/sample documents
  const [localDocuments, setLocalDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('vozdoc_documents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SAMPLE_DOCUMENTS;
  });

  // Cloud documents when logged in
  const [cloudDocuments, setCloudDocuments] = useState<DocumentItem[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  // Active documents depending on auth
  const documents = user ? (cloudDocuments.length > 0 ? cloudDocuments : SAMPLE_DOCUMENTS) : localDocuments;

  const [activeDocumentId, setActiveDocumentId] = useState<string>(SAMPLE_DOCUMENTS[0].id);
  const [activeView, setActiveView] = useState<'reader' | 'library'>('library');
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [showLockScreenGuide, setShowLockScreenGuide] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    let savedTheme: ThemeMode = 'dark';
    try {
      const t = localStorage.getItem('vozdoc_theme');
      if (t === 'dark' || t === 'sepia' || t === 'light') savedTheme = t;
    } catch {}

    return {
      isPlaying: false,
      isPaused: false,
      isLoadingAudio: false,
      currentDocumentId: SAMPLE_DOCUMENTS[0].id,
      currentParagraphIndex: 0,
      playbackRate: 1.0,
      voice: 'Kore',
      engineMode: 'gemini-neural',
      sleepTimerMinutes: null,
      sleepTimerSecondsRemaining: null,
      theme: savedTheme,
      fontSize: 18,
      autoScroll: true,
      hasAudioError: null,
    };
  });

  // Active document object
  const activeDocument = documents.find((d) => d.id === activeDocumentId) || documents[0] || null;

  // Listen to user's cloud documents in Firestore when logged in
  useEffect(() => {
    if (!user) {
      setCloudDocuments([]);
      return;
    }

    setIsCloudLoading(true);
    const docsPath = `users/${user.uid}/documents`;
    const docsRef = collection(db, 'users', user.uid, 'documents');

    const unsubscribe = onSnapshot(
      docsRef,
      (snapshot) => {
        const fetchedDocs: DocumentItem[] = [];
        snapshot.forEach((docSnap) => {
          fetchedDocs.push(docSnap.data() as DocumentItem);
        });

        setCloudDocuments(fetchedDocs);
        setIsCloudLoading(false);

        // If active document was in cloud or deleted, adjust
        if (fetchedDocs.length > 0) {
          const stillExists = fetchedDocs.some((d) => d.id === activeDocumentId);
          if (!stillExists) {
            setActiveDocumentId(fetchedDocs[0].id);
          }
        }
      },
      (error) => {
        setIsCloudLoading(false);
        handleFirestoreError(error, OperationType.GET, docsPath);
      }
    );

    return () => unsubscribe();
  }, [user, activeDocumentId]);

  // Persist local documents to localStorage when not logged in
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('vozdoc_documents', JSON.stringify(localDocuments));
      } catch {}
    }
  }, [localDocuments, user]);

  // Persist theme
  useEffect(() => {
    try {
      localStorage.setItem('vozdoc_theme', playerState.theme);
    } catch {}
  }, [playerState.theme]);

  // Wire up audio engine callbacks
  useEffect(() => {
    audioEngine.setCallbacks({
      onParagraphChange: (index) => {
        setPlayerState((prev) => ({
          ...prev,
          currentParagraphIndex: index,
        }));

        // Sync paragraph progress to Firestore if logged in
        if (user && activeDocument) {
          const docRef = doc(db, 'users', user.uid, 'documents', activeDocument.id);
          setDoc(
            docRef,
            {
              currentParagraphIndex: index,
              progressPercent: activeDocument.totalParagraphs > 0
                ? Math.round(((index + 1) / activeDocument.totalParagraphs) * 100)
                : 0,
            },
            { merge: true }
          ).catch(() => {});
        }
      },
      onPlayStateChange: (isPlaying, isPaused) => {
        setPlayerState((prev) => ({
          ...prev,
          isPlaying,
          isPaused,
        }));
      },
      onLoadingChange: (isLoading) => {
        setPlayerState((prev) => ({
          ...prev,
          isLoadingAudio: isLoading,
        }));
      },
      onError: (errorMessage) => {
        setPlayerState((prev) => ({
          ...prev,
          hasAudioError: errorMessage,
        }));
      },
      onSleepTimerTick: (seconds) => {
        setPlayerState((prev) => ({
          ...prev,
          sleepTimerSecondsRemaining: seconds,
        }));
      },
      onDocumentFinished: () => {
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
        }));
      },
    });

    return () => {
      audioEngine.destroy();
    };
  }, [user, activeDocument]);

  // Update audio engine settings when voice, mode or speed changes
  useEffect(() => {
    audioEngine.setVoice(playerState.voice);
    audioEngine.setEngineMode(playerState.engineMode);
    audioEngine.setPlaybackRate(playerState.playbackRate);
  }, [playerState.voice, playerState.engineMode, playerState.playbackRate]);

  // Handle document selection
  const handleSelectDocument = useCallback((docItem: DocumentItem) => {
    setActiveDocumentId(docItem.id);
    setActiveView('reader');
    setPlayerState((prev) => ({
      ...prev,
      currentDocumentId: docItem.id,
      currentParagraphIndex: docItem.currentParagraphIndex || 0,
    }));
    audioEngine.loadDocument(docItem.id, docItem.title, docItem.paragraphs, docItem.currentParagraphIndex || 0);
  }, []);

  // Handle selecting a specific paragraph from document view
  const handleSelectParagraph = useCallback((index: number) => {
    setPlayerState((prev) => ({
      ...prev,
      currentParagraphIndex: index,
    }));
    audioEngine.playParagraph(index);
  }, []);

  // Handle Play/Pause
  const handleTogglePlay = useCallback(() => {
    if (!activeDocument) return;

    if (playerState.isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.loadDocument(
        activeDocument.id,
        activeDocument.title,
        activeDocument.paragraphs,
        playerState.currentParagraphIndex
      );
      audioEngine.playParagraph(playerState.currentParagraphIndex);
    }
  }, [activeDocument, playerState.isPlaying, playerState.currentParagraphIndex]);

  const handlePrevParagraph = useCallback(() => {
    audioEngine.previousParagraph();
  }, []);

  const handleNextParagraph = useCallback(() => {
    audioEngine.nextParagraph();
  }, []);

  const handleSeek = useCallback((deltaSeconds: number) => {
    if (deltaSeconds < 0) {
      audioEngine.previousParagraph();
    } else {
      audioEngine.nextParagraph();
    }
  }, []);

  const handleChangeSpeed = useCallback((rate: number) => {
    setPlayerState((prev) => ({ ...prev, playbackRate: rate }));
    audioEngine.setPlaybackRate(rate);
  }, []);

  const handleSetSleepTimer = useCallback((minutes: number | null) => {
    setPlayerState((prev) => ({ ...prev, sleepTimerMinutes: minutes }));
    audioEngine.setSleepTimer(minutes);
  }, []);

  // Save new document to cloud or local
  const saveNewDocument = async (newDoc: DocumentItem) => {
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'documents', newDoc.id);
        await setDoc(docRef, {
          ...newDoc,
          userId: user.uid,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/documents/${newDoc.id}`);
      }
    } else {
      setLocalDocuments((prev) => [newDoc, ...prev]);
    }
    handleSelectDocument(newDoc);
  };

  // File Upload handler
  const handleFileUpload = async (file: File) => {
    setIsParsingPdf(true);
    setParsingProgress(null);
    try {
      let newDoc: DocumentItem;
      if (file.name.toLowerCase().endsWith('.pdf')) {
        newDoc = await parsePdfFile(file, (progress) => {
          setParsingProgress(progress);
        });
      } else {
        const text = await file.text();
        newDoc = parsePlainText(text, file.name.replace(/\.[^/.]+$/, ''));
      }

      await saveNewDocument(newDoc);
    } catch (err: unknown) {
      console.error('Error reading PDF file:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo procesar el archivo PDF.';
      alert(msg);
    } finally {
      setIsParsingPdf(false);
      setParsingProgress(null);
    }
  };

  // Text Paste handler
  const handlePasteText = async (text: string, title: string) => {
    const newDoc = parsePlainText(text, title);
    await saveNewDocument(newDoc);
  };

  // Delete document
  const handleDeleteDocument = async (docId: string) => {
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'documents', docId);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/documents/${docId}`);
      }
    } else {
      setLocalDocuments((prev) => prev.filter((d) => d.id !== docId));
    }

    if (activeDocumentId === docId) {
      const remaining = documents.filter((d) => d.id !== docId);
      if (remaining.length > 0) {
        handleSelectDocument(remaining[0]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Hidden file input for Header upload button */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await handleFileUpload(file);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <Header
        activeView={activeView}
        onNavigate={(view) => setActiveView(view)}
        onOpenLockScreenGuide={() => setShowLockScreenGuide(true)}
        onOpenVoiceSettings={() => setShowVoiceSettings(true)}
        onTriggerUpload={() => hiddenFileInputRef.current?.click()}
        hasDocument={Boolean(activeDocument)}
      />

      {/* Audio Error Alert / Toast */}
      {playerState.hasAudioError && (
        <div className="fixed top-16 right-4 z-50 max-w-sm p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-lg flex items-center justify-between gap-3 animate-in fade-in">
          <span>{playerState.hasAudioError}</span>
          <button
            onClick={() => setPlayerState((prev) => ({ ...prev, hasAudioError: null }))}
            className="text-amber-400 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeView === 'library' || !activeDocument ? (
        <DocumentLibrary
          documents={documents}
          activeDocumentId={activeDocumentId}
          onSelectDocument={handleSelectDocument}
          onFileUpload={handleFileUpload}
          onPasteText={handlePasteText}
          onDeleteDocument={handleDeleteDocument}
          onOpenLockScreenGuide={() => setShowLockScreenGuide(true)}
          isParsingPdf={isParsingPdf}
          parsingProgress={parsingProgress}
        />
      ) : (
        <DocumentViewer
          document={activeDocument}
          playerState={playerState}
          onSelectParagraph={handleSelectParagraph}
          onChangeTheme={(theme) => setPlayerState((prev) => ({ ...prev, theme }))}
          onChangeFontSize={(size) => setPlayerState((prev) => ({ ...prev, fontSize: size }))}
          onToggleAutoScroll={() => setPlayerState((prev) => ({ ...prev, autoScroll: !prev.autoScroll }))}
        />
      )}

      {/* Bottom Sticky Player Bar */}
      <PlayerBar
        document={activeDocument}
        playerState={playerState}
        onTogglePlay={handleTogglePlay}
        onPrevParagraph={handlePrevParagraph}
        onNextParagraph={handleNextParagraph}
        onSeek={handleSeek}
        onChangeSpeed={handleChangeSpeed}
        onSetSleepTimer={handleSetSleepTimer}
        onOpenVoiceSettings={() => setShowVoiceSettings(true)}
        onOpenLockScreenGuide={() => setShowLockScreenGuide(true)}
      />

      {/* Lock Screen & Background Audio Explainer Modal */}
      <LockScreenModal
        isOpen={showLockScreenGuide}
        onClose={() => setShowLockScreenGuide(false)}
        playerState={playerState}
        documentTitle={activeDocument?.title || 'Documento en lectura'}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrevParagraph}
        onNext={handleNextParagraph}
      />

      {/* Voice and Engine Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        currentVoice={playerState.voice}
        onSelectVoice={(voice) => setPlayerState((prev) => ({ ...prev, voice }))}
        engineMode={playerState.engineMode}
        onChangeEngineMode={(mode) => setPlayerState((prev) => ({ ...prev, engineMode: mode }))}
        playbackRate={playerState.playbackRate}
        onChangePlaybackRate={handleChangeSpeed}
      />
    </div>
  );
}
