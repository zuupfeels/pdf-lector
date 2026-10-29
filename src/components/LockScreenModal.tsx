import React from 'react';
import { X, Smartphone, Headphones, CheckCircle2, Play, Pause, SkipBack, SkipForward, BatteryCharging, ShieldCheck, Zap } from 'lucide-react';
import { PlayerState } from '../types';

interface LockScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  documentTitle: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  isOpen,
  onClose,
  playerState,
  documentTitle,
  onTogglePlay,
  onPrev,
  onNext,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              ¿Cómo leer PDFs con la pantalla apagada?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Tecnología de sesión multimedia en segundo plano (Media Session API)
            </p>
          </div>
        </div>

        {/* Direct Answer Alert */}
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-sm mb-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-300">
              ¡Sí! Esta aplicación está optimizada exactamente para eso.
            </p>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 leading-relaxed">
              A diferencia de otros visores que usan voces simples que se apagan al bloquear el celular, VozDoc genera un flujo continuo de audio <strong className="text-white">HTML5</strong> compatible con la <strong className="text-white">Media Session API</strong>. Tu teléfono (iOS o Android) lo trata igual que a Spotify o Apple Podcasts.
            </p>
          </div>
        </div>

        {/* Live Interactive Lock Screen Simulator */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
            <span>VISTA PREVIA DE PANTALLA DE BLOQUEO</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sincronizado en vivo
            </span>
          </div>

          {/* Interactive Widget Box */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              {/* Artwork / Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                <Headphones className="w-7 h-7 text-white" />
              </div>

              {/* Title & info */}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  VozDoc Audio · Párrafo {playerState.currentParagraphIndex + 1}
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                  {documentTitle || 'Documento sin título'}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  Voz: {playerState.voice} · {playerState.engineMode === 'gemini-neural' ? 'Gemini Neural' : 'Voz Local'}
                </p>
              </div>

              {/* Interactive Controls inside mock */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  onClick={onPrev}
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Párrafo anterior"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={onTogglePlay}
                  className="w-10 h-10 rounded-full bg-white text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-transform active:scale-95 shadow-md"
                  title={playerState.isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {playerState.isPlaying ? (
                    <Pause className="w-5 h-5 fill-slate-900" />
                  ) : (
                    <Play className="w-5 h-5 fill-slate-900 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNext}
                  className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Párrafo siguiente"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-bar showing audio status */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                Ahorro de batería activo (Pantalla apagada)
              </span>
              <span>Velocidad: {playerState.playbackRate}x</span>
            </div>
          </div>
        </div>

        {/* 3 Simple Steps */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            3 Pasos para usarlo en tu celular
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center mb-2">
                1
              </div>
              <h4 className="text-xs font-semibold text-white mb-1">Presiona Play</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Toca cualquier párrafo o el botón Play para iniciar la sesión de audio del sistema.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center mb-2">
                2
              </div>
              <h4 className="text-xs font-semibold text-white mb-1">Bloquea tu celular</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Presiona el botón lateral de apagado o guarda el móvil en tu bolsillo. La narración no se detendrá.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-2">
                3
              </div>
              <h4 className="text-xs font-semibold text-white mb-1">Controla a ciegas</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Usa el widget de pantalla de bloqueo, la Dynamic Island o los toques en tus auriculares Bluetooth.
              </p>
            </div>
          </div>
        </div>

        {/* Technical advantages */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Precarga inteligente de párrafos sin silencios</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Disponible como PWA instalable en iOS y Android</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
          >
            Entendido, empezar a escuchar
          </button>
        </div>
      </div>
    </div>
  );
};
