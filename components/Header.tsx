"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { locale, setLocale, t } = useI18n();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      alert(t.installFallback);
    }
    setMenuOpen(false);
  };

  return (
    <>
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-xl">🚨</span>
          <span className="font-semibold text-white text-lg">ICE Alert</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === "en" ? "es" : "en")}
            className="flex items-center gap-1.5 cursor-pointer"
            aria-label="Toggle language"
          >
            <span className={`text-xs font-medium transition-opacity ${locale === "en" ? "text-white" : "text-white/40"}`}>EN</span>
            <div className="relative w-10 h-[22px] rounded-full bg-white/15 p-[2px] transition-colors">
              <div className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${locale === "es" ? "translate-x-[18px]" : "translate-x-0"}`} />
            </div>
            <span className={`text-xs font-medium transition-opacity ${locale === "es" ? "text-white" : "text-white/40"}`}>ES</span>
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col gap-[5px] p-2 -mr-2 cursor-pointer"
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      <nav
        className={`bg-black/80 backdrop-blur-md border-t border-white/10 overflow-hidden transition-all duration-300 ease-out ${menuOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0 border-t-transparent"}`}
      >
        <ul className="flex flex-col">
          <li>
            <button
              onClick={() => setMenuOpen(false)}
              className={`w-full text-left px-5 py-3.5 text-white/90 hover:bg-white/10 active:bg-white/15 cursor-pointer transition-all duration-300 ${menuOpen ? "translate-y-0 opacity-100 delay-75" : "-translate-y-2 opacity-0"}`}
            >
              {t.map}
            </button>
          </li>
          {!isInstalled && (
            <li>
              <button
                onClick={handleInstall}
                className={`w-full text-left px-5 py-3.5 text-white/90 hover:bg-white/10 active:bg-white/15 cursor-pointer transition-all duration-300 flex items-center gap-2 ${menuOpen ? "translate-y-0 opacity-100 delay-100" : "-translate-y-2 opacity-0"}`}
              >
                <span>📲</span>
                <span>{t.downloadPwa}</span>
              </button>
            </li>
          )}
          <li>
            <button
              onClick={() => { setMenuOpen(false); setAboutOpen(true); }}
              className={`w-full text-left px-5 py-3.5 text-white/90 hover:bg-white/10 active:bg-white/15 cursor-pointer transition-all duration-300 ${menuOpen ? "translate-y-0 opacity-100 delay-150" : "-translate-y-2 opacity-0"}`}
            >
              {t.about}
            </button>
          </li>
        </ul>
      </nav>

      {/* Backdrop to close menu */}
      <div
        className={`fixed inset-0 -z-10 transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
      />
    </header>

    {/* About modal */}
    {aboutOpen && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setAboutOpen(false)}
      >
        <div
          className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 animate-[fadeUp_0.25s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">{t.aboutTitle}</h2>
            <button
              onClick={() => setAboutOpen(false)}
              className="text-white/50 hover:text-white text-2xl leading-none cursor-pointer"
            >
              ×
            </button>
          </div>

          <p className="text-white/80 text-sm leading-relaxed mb-3">
            {t.aboutP1}
          </p>
          <p className="text-white/80 text-sm leading-relaxed">
            {t.aboutP2}
          </p>
        </div>
      </div>
    )}
    </>
  );
}
