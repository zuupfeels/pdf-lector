import React, { useState } from 'react';
import { X, Volume2, Sparkles, Cpu, Play, Check } from 'lucide-react';
import { EngineMode } from '../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoice: string;
  onSelectVoice: (voice: string) => void;
  engineMode: EngineMode;
  onChangeEngineMode: (mode: EngineMode) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
}

const VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'Femenino', desc: 'Cálida, clara y expresiva. Ideal para audiolibros y artículos.', sampleText: 'Hola, soy la voz Kore. Leeré tus documentos con un ritmo natural y sereno.' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Masculino', desc: 'Profunda, narrativa y autoritaria. Excelente para relatos y ensayos.', sampleText: 'Saludos, soy Fenrir. Me especializo en lecturas profundas y narrativas.' },
  { id: 'Puck', name: 'Puck', gender: 'Masculino', desc: 'Dinámica, juvenil y ágil. Perfecta para apuntes de estudio y tecnología.', sampleText: '¡Qué tal! Soy Puck, una voz ágil y dinámica para aprender rápido.' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Femenino', desc: 'Suave, relajante y pausada. Muy recomendada para lecturas antes de dormir.', sampleText: 'Hola, soy Zephyr. Mi tono es suave y reconfortante para escuchar con calma.' },
  { id: 'Charon', name: 'Charon', gender: 'Masculino', desc: 'Formal, pausada y académica. Recomendada para documentos legales o técnicos.', sampleText: 'Buenos días, soy Charon. Ofrezco una cadencia analítica y formal.' },
];

const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  currentVoice,
  onSelectVoice,
  engineMode,
  onChangeEngineMode,
  playbackRate,
  onChangePlaybackRate,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const testVoiceSample = async (voiceId: string, sampleText: string) => {
    setIsPlayingPreview(voiceId);
    try {
      if (engineMode === 'gemini-neural') {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sampleText,
            voice: voiceId,
          }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audio.playbackRate = playbackRate;
          audio.onended = () => setIsPlayingPreview(null);
          audio.onerror = () => setIsPlayingPreview(null);
          await audio.play();
          return;
        }
      }
      // Fallback test with Web Speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.lang = 'es-ES';
        utterance.rate = playbackRate;
        utterance.onend = () => setIsPlayingPreview(null);
        utterance.onerror = () => setIsPlayingPreview(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingPreview(null);
      }
    } catch {
      setIsPlayingPreview(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Configuración de Voz</h3>
              <p className="text-xs text-slate-400">Personaliza el motor, narrador y velocidad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Mode Toggle */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            Motor de Síntesis
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => onChangeEngineMode('gemini-neural')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'gemini-neural'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gemini Neural TTS
            </button>
            <button
              onClick={() => onChangeEngineMode('native-device')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'native-device'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Voz del Dispositivo (Offline)
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {engineMode === 'gemini-neural'
              ? '✨ Sonido de estudio con modulación humana, pausas de respiración y entonación realista.'
              : '⚡ Rápido y ligero, funciona sin conexión a internet utilizando el sintetizador del navegador.'}
          </p>
        </div>

        {/* Playback Speed */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Velocidad de Lectura
            </label>
            <span className="text-xs font-mono font-bold text-sky-400">{playbackRate}x</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {SPEED_PRESETS.map((rate) => (
              <button
                key={rate}
                onClick={() => onChangePlaybackRate(rate)}
                className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                  playbackRate === rate
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Voices List (for Gemini Neural) */}
        {engineMode === 'gemini-neural' && (
          <div className="mt-6">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Seleccionar Narrador
            </label>
            <div className="space-y-2">
              {VOICES.map((v) => {
                const isSelected = currentVoice === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectVoice(v.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/60 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{v.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {v.gender}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{v.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        testVoiceSample(v.id, v.sampleText);
                      }}
                      disabled={isPlayingPreview === v.id}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                      title="Escuchar muestra"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Muestra</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
};
