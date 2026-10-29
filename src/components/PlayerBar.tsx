import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Moon,
  Smartphone,
  Gauge,
  Volume2,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { DocumentItem, PlayerState } from '../types';

interface PlayerBarProps {
  document: DocumentItem | null;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onPrevParagraph: () => void;
  onNextParagraph: () => void;
  onSeek: (deltaSeconds: number) => void;
  onChangeSpeed: (rate: number) => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onOpenVoiceSettings: () => void;
  onOpenLockScreenGuide: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  document,
  playerState,
  onTogglePlay,
  onPrevParagraph,
  onNextParagraph,
  onSeek,
  onChangeSpeed,
  onSetSleepTimer,
  onOpenVoiceSettings,
  onOpenLockScreenGuide,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!document) return null;

  const currentParagraph = document.paragraphs[playerState.currentParagraphIndex];
  const total = document.totalParagraphs;
  const currentNum = playerState.currentParagraphIndex + 1;
  const progressPercent = total > 0 ? Math.round((currentNum / total) * 100) : 0;

  const formatSleepCountdown = (seconds: number | null) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl transition-all duration-300 pb-safe">
      {/* Top micro progress bar */}
      <div className="w-full bg-slate-900 h-1 overflow-hidden">
        <div
          className="bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        {/* Expanded Mode: Big quote & chapter details */}
        {isExpanded && (
          <div className="mb-4 pt-2 border-b border-slate-800/80 pb-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-mono uppercase text-indigo-400 tracking-wider">
                  Párrafo actual ({currentNum} de {total}) · Página {currentParagraph?.pageNumber || 1}
                </span>
                <p className="text-sm sm:text-base text-slate-200 font-serif italic mt-1 leading-relaxed line-clamp-3">
                  "{currentParagraph?.text}"
                </p>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 shrink-0"
                title="Minimizar reproductor"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Primary Player Row (Ergonomic Thumb zone) */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Document Info & expand toggle */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[35%] sm:max-w-[30%]">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md group relative"
              title="Expandir vista del lector"
            >
              <Volume2 className="w-5 h-5 text-white" />
              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-indigo-400 rounded-full p-0.5 border border-indigo-500/40">
                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
              </span>
            </button>

            <div className="min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-snug">
                {document.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Pág. {currentParagraph?.pageNumber || 1}</span>
                <span>·</span>
                <span className="font-mono text-indigo-300">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Center: Main Playback Controls (Touch target >= 44px) */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Jump -10s */}
            <button
              onClick={() => onSeek(-10)}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Retroceder 10 segundos"
              aria-label="Retroceder 10 segundos"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Prev Paragraph */}
            <button
              onClick={onPrevParagraph}
              disabled={playerState.currentParagraphIndex === 0}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Párrafo anterior"
              aria-label="Párrafo anterior"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Big Play / Pause CTA Button */}
            <button
              onClick={onTogglePlay}
              className="min-w-[48px] min-h-[48px] sm:min-w-[54px] sm:min-h-[54px] rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 hover:from-sky-300 hover:to-purple-400 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-indigo-500/25"
              title={playerState.isPlaying ? 'Pausar' : 'Reproducir con pantalla apagada'}
              aria-label={playerState.isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {playerState.isLoadingAudio ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : playerState.isPlaying ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-0.5" />
              )}
            </button>

            {/* Next Paragraph */}
            <button
              onClick={onNextParagraph}
              disabled={playerState.currentParagraphIndex >= total - 1}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Párrafo siguiente"
              aria-label="Párrafo siguiente"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Jump +10s */}
            <button
              onClick={() => onSeek(10)}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Avanzar 10 segundos"
              aria-label="Avanzar 10 segundos"
            >
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Right: Quick Settings & Lock Screen Status */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSleepMenu(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-slate-200 hover:text-white hover:border-slate-700 transition-colors"
                title="Velocidad de reproducción"
              >
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>{playerState.playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-28 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 animate-in fade-in">
                  <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">Velocidad</div>
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        onChangeSpeed(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between ${
                        playerState.playbackRate === rate
                          ? 'bg-sky-500/20 text-sky-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playerState.playbackRate === rate && <span className="text-sky-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sleep Timer */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSleepMenu(!showSleepMenu);
                  setShowSpeedMenu(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  playerState.sleepTimerSecondsRemaining
                    ? 'bg-purple-950/50 border-purple-500/50 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
                title="Temporizador de apagado"
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-mono">
                  {formatSleepCountdown(playerState.sleepTimerSecondsRemaining) || 'Off'}
                </span>
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-36 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 animate-in fade-in">
                  <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">Apagado Auto</div>
                  {[
                    { label: 'Desactivado', val: null },
                    { label: '5 minutos', val: 5 },
                    { label: '15 minutos', val: 15 },
                    { label: '30 minutos', val: 30 },
                    { label: '45 minutos', val: 45 },
                    { label: '60 minutos', val: 60 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        onSetSleepTimer(item.val);
                        setShowSleepMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-lg flex items-center justify-between ${
                        playerState.sleepTimerMinutes === item.val
                          ? 'bg-purple-500/20 text-purple-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{item.label}</span>
                      {playerState.sleepTimerMinutes === item.val && <span className="text-purple-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lockscreen Mode Guide Trigger */}
            <button
              onClick={onOpenLockScreenGuide}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/70 text-xs font-semibold transition-colors"
              title="Explicación de pantalla bloqueada"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Modo Pantalla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
