import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  Play,
  Volume2,
  Bookmark,
  Sun,
  Moon,
  Coffee,
  Type,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react';
import { DocumentItem, PlayerState, ThemeMode } from '../types';

interface DocumentViewerProps {
  document: DocumentItem;
  playerState: PlayerState;
  onSelectParagraph: (index: number) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeFontSize: (size: number) => void;
  onToggleAutoScroll: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  playerState,
  onSelectParagraph,
  onChangeTheme,
  onChangeFontSize,
  onToggleAutoScroll,
}) => {
  const activeParagraphRef = useRef<HTMLDivElement | null>(null);
  const [activePageFilter, setActivePageFilter] = useState<number | 'all'>('all');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(document.summary || null);
  const [copiedParagraphId, setCopiedParagraphId] = useState<string | null>(null);

  // Auto-scroll to active paragraph
  useEffect(() => {
    if (playerState.autoScroll && activeParagraphRef.current) {
      activeParagraphRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [playerState.currentParagraphIndex, playerState.autoScroll]);

  const handleGenerateSummary = async () => {
    if (isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    try {
      const sampleText = document.paragraphs.map((p) => p.text).join(' ').slice(0, 8000);
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.title,
          text: sampleText,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (e) {
      console.warn('Failed to generate summary:', e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const copyParagraphText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedParagraphId(id);
    setTimeout(() => setCopiedParagraphId(null), 1500);
  };

  // Filter paragraphs by page if selected
  const displayedParagraphs =
    activePageFilter === 'all'
      ? document.paragraphs
      : document.paragraphs.filter((p) => p.pageNumber === activePageFilter);

  // Theme styles
  const themeStyles = {
    dark: {
      bg: 'bg-slate-950',
      text: 'text-slate-200',
      cardBg: 'bg-slate-900/60',
      cardBorder: 'border-slate-800',
      activeBg: 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-indigo-500/5',
      mutedText: 'text-slate-400',
      highlightBadge: 'bg-indigo-500/20 text-indigo-300',
    },
    sepia: {
      bg: 'bg-[#fbf0d9]',
      text: 'text-[#3e3427]',
      cardBg: 'bg-[#f4e4c1]/60',
      cardBorder: 'border-[#dfc8a2]',
      activeBg: 'bg-[#ebd4a8] border-[#b88c49] text-[#2c2214] shadow-[#b88c49]/10',
      mutedText: 'text-[#7d6c55]',
      highlightBadge: 'bg-[#c99f58]/20 text-[#694b19]',
    },
    light: {
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-200',
      activeBg: 'bg-sky-50 border-sky-400 text-slate-900 shadow-sky-400/10',
      mutedText: 'text-slate-500',
      highlightBadge: 'bg-sky-100 text-sky-800',
    },
  }[playerState.theme];

  // Calculate estimated listening minutes at average 150 wpm
  const totalWords = document.paragraphs.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0);
  const estimatedMins = Math.max(1, Math.round(totalWords / (150 * playerState.playbackRate)));

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeStyles.bg} ${themeStyles.text} pb-36`}>
      {/* Sticky Reader Toolbar */}
      <div className={`sticky top-[57px] z-30 border-b backdrop-blur-md px-4 sm:px-6 py-2.5 transition-colors ${
        playerState.theme === 'dark'
          ? 'bg-slate-950/85 border-slate-800'
          : playerState.theme === 'sepia'
          ? 'bg-[#fbf0d9]/90 border-[#dfc8a2]'
          : 'bg-slate-50/90 border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs">
          {/* Left: Page selector dropdown or tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className={`font-semibold shrink-0 ${themeStyles.mutedText}`}>Páginas:</span>
            <button
              onClick={() => setActivePageFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
                activePageFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : `${themeStyles.cardBg} ${themeStyles.mutedText} hover:${themeStyles.text}`
              }`}
            >
              Todas ({document.totalPages})
            </button>
            {Array.from({ length: document.totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setActivePageFilter(pNum)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
                    activePageFilter === pNum
                      ? 'bg-indigo-600 text-white'
                      : `${themeStyles.cardBg} ${themeStyles.mutedText} hover:${themeStyles.text}`
                  }`}
                >
                  Pág {pNum}
                </button>
              );
            })}
          </div>

          {/* Right: Theme & Font controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-scroll toggle */}
            <button
              onClick={onToggleAutoScroll}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors hidden sm:flex items-center gap-1 ${
                playerState.autoScroll
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                  : `border-transparent ${themeStyles.mutedText}`
              }`}
              title="Seguir automáticamente el párrafo en lectura"
            >
              <span>Auto-scroll</span>
              <span className={`w-1.5 h-1.5 rounded-full ${playerState.autoScroll ? 'bg-indigo-400' : 'bg-slate-500'}`} />
            </button>

            {/* Font size picker */}
            <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-0.5 rounded-md">
              <button
                onClick={() => onChangeFontSize(Math.max(14, playerState.fontSize - 2))}
                className="px-2 py-0.5 text-xs font-bold hover:opacity-80"
                title="Reducir texto"
              >
                A-
              </button>
              <span className="text-[10px] font-mono w-5 text-center">{playerState.fontSize}</span>
              <button
                onClick={() => onChangeFontSize(Math.min(26, playerState.fontSize + 2))}
                className="px-2 py-0.5 text-xs font-bold hover:opacity-80"
                title="Aumentar texto"
              >
                A+
              </button>
            </div>

            {/* Theme switcher */}
            <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-0.5 rounded-md">
              <button
                onClick={() => onChangeTheme('dark')}
                className={`p-1 rounded ${playerState.theme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400'}`}
                title="Modo Noche (OLED)"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeTheme('sepia')}
                className={`p-1 rounded ${playerState.theme === 'sepia' ? 'bg-[#ebd4a8] text-[#3e3427] shadow-xs' : 'text-[#7d6c55]'}`}
                title="Modo Sepia (Papel)"
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeTheme('light')}
                className={`p-1 rounded ${playerState.theme === 'light' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400'}`}
                title="Modo Día"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Content Canvas */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Document Header Metadata */}
        <div className={`p-6 sm:p-8 rounded-3xl border mb-8 transition-colors ${themeStyles.cardBg} ${themeStyles.cardBorder}`}>
          <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold ${themeStyles.highlightBadge}`}>
              {document.category}
            </span>
            <span className={themeStyles.mutedText}>·</span>
            <span className={themeStyles.mutedText}>{document.totalPages} páginas</span>
            <span className={themeStyles.mutedText}>·</span>
            <span className={themeStyles.mutedText}>{document.totalParagraphs} párrafos</span>
            <span className={themeStyles.mutedText}>·</span>
            <span className="font-mono text-indigo-400">~{estimatedMins} min de escucha</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            {document.title}
          </h1>

          {/* AI Audio Overview Box */}
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                Resumen Ejecutivo / Introducción
              </span>

              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="text-[11px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <span>Regenerar con IA</span>
                )}
              </button>
            </div>

            {aiSummary ? (
              <p className={`text-xs sm:text-sm leading-relaxed italic ${themeStyles.mutedText}`}>
                {aiSummary}
              </p>
            ) : (
              <p className={`text-xs ${themeStyles.mutedText}`}>
                Pulsa en "Regenerar con IA" para crear una introducción antes de comenzar la lectura en audio.
              </p>
            )}
          </div>
        </div>

        {/* Tip Banner about screen locking */}
        <div className="mb-6 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">
              Toca cualquier párrafo para comenzar a escuchar. Puedes bloquear la pantalla del celular en cualquier momento.
            </span>
          </div>
        </div>

        {/* Paragraphs List */}
        <div className="space-y-4">
          {displayedParagraphs.map((paragraph) => {
            const isCurrent = playerState.currentParagraphIndex === paragraph.paragraphIndex;
            const isPlayingThis = isCurrent && playerState.isPlaying;

            return (
              <div
                key={paragraph.id}
                ref={isCurrent ? activeParagraphRef : null}
                onClick={() => onSelectParagraph(paragraph.paragraphIndex)}
                className={`group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  isCurrent
                    ? `${themeStyles.activeBg} shadow-lg ring-1 ring-indigo-500/30`
                    : `${themeStyles.cardBg} ${themeStyles.cardBorder} hover:border-indigo-500/30`
                }`}
              >
                {/* Paragraph header badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isPlayingThis
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : isCurrent
                          ? 'bg-indigo-500/30 text-indigo-300'
                          : 'bg-black/10 dark:bg-white/10 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}
                      title={isPlayingThis ? 'Párrafo en reproducción' : 'Reproducir este párrafo'}
                    >
                      {isPlayingThis ? (
                        <Volume2 className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3 h-3 ml-0.5 fill-current" />
                      )}
                    </button>

                    <span className={`text-[10px] font-mono tracking-wider uppercase ${themeStyles.mutedText}`}>
                      Pág. {paragraph.pageNumber} · #{paragraph.paragraphIndex + 1}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyParagraphText(paragraph.id, paragraph.text);
                    }}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      copiedParagraphId === paragraph.id
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : `${themeStyles.mutedText} hover:text-white`
                    }`}
                  >
                    {copiedParagraphId === paragraph.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                {/* Paragraph text */}
                <p
                  className="leading-relaxed transition-all"
                  style={{ fontSize: `${playerState.fontSize}px`, lineHeight: 1.65 }}
                >
                  {paragraph.text}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
