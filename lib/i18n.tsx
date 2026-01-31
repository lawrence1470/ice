"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "en" | "es";

const translations = {
  en: {
    map: "Map",
    downloadPwa: "Install App",
    pwaInfo: "Install ICE Alert on your home screen for quick one-tap access — no app store needed. Stay ready to report and receive alerts instantly.",
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
    uploading: "Uploading...",
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
    addPhoto: "Add photo",
    imageTooLarge: "Image must be under 10MB.",
    howItWorks: "How it works",
    features: [
      { title: "4-Hour Expiry", desc: "Sightings disappear after 4 hours. Only what's relevant now." },
      { title: "Anonymous", desc: "No accounts, no tracking, no personal data." },
      { title: "Location-Based", desc: "Pinned to your GPS at the moment you submit." },
      { title: "Photos", desc: "Attach a photo. Auto-deleted with the sighting." },
      { title: "Real-Time", desc: "New sightings appear on the map instantly." },
      { title: "Push Alerts", desc: "Get notified when sightings are reported nearby." },
      { title: "Time Filters", desc: "Filter by last 30 min, 1 hour, or 2 hours." },
      { title: "Bilingual", desc: "English and Spanish. Toggle anytime." },
    ],
  },
  es: {
    map: "Mapa",
    downloadPwa: "Instalar App",
    pwaInfo: "Instala ICE Alert en tu pantalla de inicio para acceso rápido con un toque — sin tienda de apps. Mantente listo para reportar y recibir alertas al instante.",
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
    uploading: "Subiendo...",
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
    addPhoto: "Agregar foto",
    imageTooLarge: "La imagen debe ser menor a 10MB.",
    howItWorks: "Cómo funciona",
    features: [
      { title: "Expiración de 4 horas", desc: "Los avistamientos desaparecen después de 4 horas. Solo lo relevante." },
      { title: "Anónimo", desc: "Sin cuentas, sin rastreo, sin datos personales." },
      { title: "Basado en ubicación", desc: "Fijado a tu GPS al momento de enviar." },
      { title: "Fotos", desc: "Adjunta una foto. Se elimina con el avistamiento." },
      { title: "Tiempo real", desc: "Nuevos avistamientos aparecen al instante." },
      { title: "Alertas push", desc: "Recibe alertas de avistamientos cercanos." },
      { title: "Filtros de tiempo", desc: "Filtra por últimos 30 min, 1 hora o 2 horas." },
      { title: "Bilingüe", desc: "Inglés y español. Cambia en cualquier momento." },
    ],
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

// LRU translation cache (max 200 entries)
const CACHE_MAX = 200;
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
    if (translationCache.size >= CACHE_MAX) {
      const first = translationCache.keys().next().value;
      if (first !== undefined) translationCache.delete(first);
    }
    translationCache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}
