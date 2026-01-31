"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "en" | "es";

const translations = {
  en: {
    map: "Map",
    downloadPwa: "Download as PWA",
    about: "About",
    aboutTitle: "About",
    aboutP1:
      "ICE Alert is a community-driven tool built to keep our neighborhoods informed and safe. We believe everyone deserves to feel secure where they live.",
    aboutP2:
      "By sharing real-time, anonymous reports of ICE activity, we help protect the communities, families, and friends that make our neighborhoods home. This is how we make a difference — together.",
    learnMore: "Learn more at iceinmyarea.org →",
    reportSighting: "🚨 Report Sighting",
    reportTitle: "Report ICE Sighting",
    reportPlaceholder:
      "Optional: describe what you see (vehicle type, number of agents, location details...)",
    cancel: "Cancel",
    submit: "Submit",
    submitting: "Submitting...",
    reportSuccess: "Report submitted!",
    locationRequired: "Location access is required to report a sighting.",
    reportFailed: "Failed to submit report. Please try again.",
    cooldown: (mins: number) =>
      `Please wait ${mins} more minute${mins !== 1 ? "s" : ""} before reporting again.`,
    installFallback:
      'To install: tap the share button in your browser, then select "Add to Home Screen".',
    iceSighting: "ICE Sighting",
    iceSightings: (n: number) => `${n} ICE Sightings`,
    latest: "Latest",
    more: (n: number) => `+${n} more`,
    filterAll: "All",
    filter30m: "30m",
    filter1h: "1h",
    filter2h: "2h",
    noSightings: "No sightings to show",
    noSightingsFilter: "No sightings in this time range",
    offline: "You are offline",
    locationDenied: "Location access denied",
    justNow: "now",
    minutesAgo: (n: number) => `${n}m`,
    hoursAgo: (n: number) => `${n}h`,
  },
  es: {
    map: "Mapa",
    downloadPwa: "Descargar como App",
    about: "Acerca de",
    aboutTitle: "Acerca de",
    aboutP1:
      "ICE Alert es una herramienta comunitaria creada para mantener a nuestros vecindarios informados y seguros. Creemos que todos merecen sentirse seguros donde viven.",
    aboutP2:
      "Al compartir reportes anónimos en tiempo real sobre actividad de ICE, ayudamos a proteger las comunidades, familias y amigos que hacen de nuestros vecindarios un hogar. Así es como hacemos la diferencia — juntos.",
    learnMore: "Más información en iceinmyarea.org →",
    reportSighting: "🚨 Reportar Avistamiento",
    reportTitle: "Reportar Avistamiento de ICE",
    reportPlaceholder:
      "Opcional: describe lo que ves (tipo de vehículo, número de agentes, detalles del lugar...)",
    cancel: "Cancelar",
    submit: "Enviar",
    submitting: "Enviando...",
    reportSuccess: "¡Reporte enviado!",
    locationRequired:
      "Se requiere acceso a la ubicación para reportar un avistamiento.",
    reportFailed: "No se pudo enviar el reporte. Inténtalo de nuevo.",
    cooldown: (mins: number) =>
      `Espera ${mins} minuto${mins !== 1 ? "s" : ""} más antes de reportar de nuevo.`,
    installFallback:
      'Para instalar: toca el botón de compartir en tu navegador y selecciona "Agregar a pantalla de inicio".',
    iceSighting: "Avistamiento de ICE",
    iceSightings: (n: number) => `${n} Avistamientos de ICE`,
    latest: "Último",
    more: (n: number) => `+${n} más`,
    filterAll: "Todo",
    filter30m: "30m",
    filter1h: "1h",
    filter2h: "2h",
    noSightings: "No hay avistamientos",
    noSightingsFilter: "No hay avistamientos en este rango de tiempo",
    offline: "Sin conexión",
    locationDenied: "Acceso a ubicación denegado",
    justNow: "ahora",
    minutesAgo: (n: number) => `${n}m`,
    hoursAgo: (n: number) => `${n}h`,
  },
};

type Translations = typeof translations.en;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: translations.en,
});

const STORAGE_KEY = "ice-alert-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === "en" || saved === "es")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// In-memory translation cache
const translationCache = new Map<string, string>();

export async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string> {
  if (from === to) return text;
  const key = `${from}|${to}|${text}`;
  const cached = translationCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
    );
    const json = await res.json();
    const translated: string = json.responseData?.translatedText ?? text;
    translationCache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}
