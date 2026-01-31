"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";


const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "ice-alert-last-report";

function canReport(): boolean {
  if (typeof window === "undefined") return false;
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > RATE_LIMIT_MS;
}

function remainingCooldown(): number {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return 0;
  const elapsed = Date.now() - parseInt(last, 10);
  return Math.max(0, RATE_LIMIT_MS - elapsed);
}

export default function ReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { t } = useI18n();

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!canReport()) {
      const mins = Math.ceil(remainingCooldown() / 60000);
      setError(t.cooldown(mins));
      return;
    }

    setSubmitting(true);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const { error: dbError } = await supabase.rpc("insert_sighting", {
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
        description: description.trim().slice(0, 280) || null,
      });

      if (dbError) throw dbError;

      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setSuccess(true);
      setDescription("");
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Report submission error:", err);
      if (err instanceof GeolocationPositionError) {
        setError(t.locationRequired);
      } else if (err && typeof err === "object" && "message" in err) {
        setError(String((err as { message: string }).message));
      } else {
        setError(t.reportFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }, [description, t]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold px-7 py-3.5 rounded-full shadow-[0_4px_24px_rgba(220,38,38,0.45)] hover:shadow-[0_4px_32px_rgba(220,38,38,0.6)] transition-all duration-200 text-base cursor-pointer ring-1 ring-red-500/30"
      >
        {t.reportSighting}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">{t.reportTitle}</h2>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.reportPlaceholder}
          rows={3}
          maxLength={280}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white p-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-1 resize-none"
        />
        <p className={`text-xs text-right mb-3 ${description.length >= 260 ? "text-red-400" : "text-zinc-500"}`}>
          {description.length}/280
        </p>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-3">{t.reportSuccess}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-zinc-400 px-4 py-2 text-white font-semibold transition-colors"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
