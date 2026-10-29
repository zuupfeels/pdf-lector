import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Play,
  Clock,
  Sparkles,
  Smartphone,
  Trash2,
  Plus,
  BookOpen,
  ArrowRight,
  Loader2,
  Cloud,
  LogIn,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface DocumentLibraryProps {
  documents: DocumentItem[];
  activeDocumentId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onFileUpload: (file: File) => Promise<void>;
  onPasteText: (text: string, title: string) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenLockScreenGuide: () => void;
  isParsingPdf: boolean;
  parsingProgress?: { current: number; total: number; percent: number } | null;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  onFileUpload,
  onPasteText,
  onDeleteDocument,
  onOpenLockScreenGuide,
  isParsingPdf,
  parsingProgress,
}) => {
  const { user, login } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onFileUpload(file);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedContent.trim()) return;
    onPasteText(pastedContent.trim(), pastedTitle.trim() || 'Texto pegado');
    setPastedTitle('');
    setPastedContent('');
    setShowPasteModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-36 pt-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="mb-10 text-center sm:text-left sm:flex sm:items-end sm:justify-between gap-6 pb-8 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Soporte para Pantalla Bloqueada y Segundo Plano</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Escucha tus documentos con el celular en el bolsillo
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              Carga tus PDFs, notas y libros para escucharlos con voz humana natural. Apaga la pantalla o bloquea tu teléfono y controla la reproducción desde la pantalla de bloqueo o tus auriculares.
            </p>

            {user ? (
              <div className="mt-3.5 inline-flex items-center gap-2 text-xs text-sky-300 bg-sky-950/40 border border-sky-500/30 px-3 py-1.5 rounded-xl">
                <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Biblioteca privada de <strong>{user.displayName || user.email}</strong> sincronizada en la nube</span>
              </div>
            ) : (
              <div className="mt-3.5 inline-flex flex-wrap items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                <span>💡 Cada usuario puede tener su biblioteca privada sincronizada.</span>
                <button
                  type="button"
                  onClick={() => login()}
                  className="text-white hover:text-sky-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  Iniciar sesión con Google
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 sm:mt-0 flex items-center justify-center sm:justify-end gap-3 shrink-0">
            <button
              onClick={onOpenLockScreenGuide}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold text-emerald-400 flex items-center gap-2 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              ¿Cómo funciona?
            </button>
          </div>
        </div>

        {/* Upload & Action Bento Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {/* PDF Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isParsingPdf && fileInputRef.current?.click()}
            className={`md:col-span-2 p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center group ${
              isParsingPdf
                ? 'border-indigo-500 bg-indigo-950/20 cursor-wait'
                : dragOver
                ? 'border-sky-500 bg-sky-950/20 cursor-pointer'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70 cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              disabled={isParsingPdf}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              {isParsingPdf ? (
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              {isParsingPdf
                ? parsingProgress
                  ? `Extrayendo página ${parsingProgress.current} de ${parsingProgress.total} (${parsingProgress.percent}%)`
                  : 'Procesando documento...'
                : 'Selecciona o arrastra tu archivo PDF aquí'}
            </h3>

            {isParsingPdf && parsingProgress && (
              <div className="w-64 bg-slate-800 rounded-full h-2 mt-2 mb-3 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-200"
                  style={{ width: `${parsingProgress.percent}%` }}
                />
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
              Admite PDFs de hasta <strong className="text-white">100 MB</strong> y cientos de páginas. Se procesa en tu propio dispositivo sin consumir datos móviles.
            </p>

            <div className="flex items-center gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                PDF hasta 100 MB
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                Archivos TXT
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-medium text-emerald-300">
                100% Privado
              </span>
            </div>

            <button
              type="button"
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              Examinar Archivos
            </button>
          </div>

          {/* Quick Paste Card */}
          <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Pegar Texto Directo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Copia artículos web, notas de estudio o emails y escúchalos de inmediato en audio.
              </p>
            </div>

            <button
              onClick={() => setShowPasteModal(true)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Pegar texto
            </button>
          </div>
        </div>

        {/* Documents Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Tu Biblioteca ({documents.length})
            </h2>
            <span className="text-xs text-slate-400">Pulsa cualquier documento para empezar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const isActive = activeDocumentId === doc.id;
              const totalWords = doc.paragraphs.reduce((a, b) => a + b.text.split(' ').length, 0);
              const readMins = Math.max(1, Math.round(totalWords / 150));

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {doc.category}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {doc.fileSize}
                        </span>

                        {documents.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                      {doc.title}
                    </h3>

                    {/* Summary snippet */}
                    {doc.summary && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {doc.summary}
                      </p>
                    )}
                  </div>

                  {/* Bottom Stats & Play Action */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        ~{readMins} min
                      </span>
                      <span>·</span>
                      <span>{doc.totalPages} pág.</span>
                      <span>·</span>
                      <span>{doc.totalParagraphs} párrafos</span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-indigo-600 group-hover:bg-indigo-500 text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Pegar Texto para Lectura</h3>
            <p className="text-xs text-slate-400 mb-4">
              Pega cualquier texto o apuntes para convertirlos en audiolibro con soporte de pantalla bloqueada.
            </p>

            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Título del documento (opcional)
                </label>
                <input
                  type="text"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  placeholder="Ej: Resumen de Historia o Artículo Web"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Contenido
                </label>
                <textarea
                  required
                  rows={6}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Pega el texto aquí..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Crear y Escuchar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
