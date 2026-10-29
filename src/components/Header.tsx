import React, { useState } from 'react';
import {
  Headphones,
  Smartphone,
  UploadCloud,
  Volume2,
  Download,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeView: 'reader' | 'library';
  onNavigate: (view: 'reader' | 'library') => void;
  onOpenLockScreenGuide: () => void;
  onOpenVoiceSettings: () => void;
  onTriggerUpload: () => void;
  hasDocument: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  onOpenLockScreenGuide,
  onOpenVoiceSettings,
  onTriggerUpload,
  hasDocument,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const { user, isAdmin, login, logout, loading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div
          onClick={() => onNavigate('library')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              VozDoc
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                LockScreen Audio
              </span>
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('library')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeView === 'library'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Biblioteca
          </button>

          {hasDocument && (
            <button
              onClick={() => onNavigate('reader')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeView === 'reader'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Lector
            </button>
          )}

          <button
            onClick={onOpenLockScreenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-500/20 transition-colors whitespace-nowrap"
            title="Cómo escuchar con la pantalla apagada"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modo</span> Pantalla Bloqueada
          </button>

          <button
            onClick={onOpenVoiceSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voces</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download ZIP button ONLY visible for administrator (ArantxaRegnault@gmail.com) */}
          {isAdmin && (
            <a
              href="/vozdoc-app.zip"
              download="vozdoc-app.zip"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
              title="Descargar código fuente en ZIP (Exclusivo para Arantxa)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar</span> ZIP
            </a>
          )}

          {isInstallable && (
            <button
              onClick={install}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
            >
              Instalar PWA
            </button>
          )}

          <button
            onClick={onTriggerUpload}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl hover:from-sky-400 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-sky-500/20 whitespace-nowrap"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Cargar PDF</span>
          </button>

          {/* User Auth Section */}
          {!loading && (
            <div className="relative ml-1">
              {user ? (
                <div>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition-colors flex items-center justify-center bg-slate-800"
                    title={user.email || 'Tu cuenta'}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {user.displayName?.[0] || user.email?.[0] || 'U'}
                      </span>
                    )}
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 animate-in fade-in">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <div className="text-xs font-bold text-white truncate">
                          {user.displayName || 'Mi Perfil'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </div>
                        {isAdmin && (
                          <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Administrador
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-950/30 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => login()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-semibold text-white transition-colors whitespace-nowrap"
                  title="Iniciar sesión con Google para sincronizar tu biblioteca en todos tus dispositivos"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Iniciar Sesión</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
