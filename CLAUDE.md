# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

**Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5** (strict) + **Tailwind CSS v4**

Path alias: `@/*` maps to project root.

### PWA

Manual service worker at `public/sw.js` (no next-pwa — incompatible with Turbopack). Registered via `components/ServiceWorkerRegistrar.tsx` in the root layout. Manifest at `public/manifest.json`. Push notification handling is in the SW's `push` event listener.

### Supabase

- Client: `lib/supabase.ts` — lazy-initialized proxy to avoid build-time env errors
- Types: `lib/database.types.ts` — manually maintained (matches `supabase/migration.sql`)
- Migration: `supabase/migration.sql` — run against your Supabase project to set up tables, RLS, PostGIS, and realtime

Tables: `sightings` (PostGIS geography point, 4hr auto-expiry, RLS: anon insert + select non-expired), `push_subscriptions`.

### Map (`components/Map.tsx`)

Full-screen MapLibre GL map using CARTO Dark Matter basemap. Centers on user via Geolocation API. Loads sightings from Supabase and subscribes to realtime INSERT events. Sighting markers are red pulsing dots with popups.

### Report Flow (`components/ReportButton.tsx`)

Floating button → modal with optional description → grabs geolocation → inserts to Supabase. Client-side 5-minute rate limit via localStorage.

### Push Notifications

- `lib/push.ts` — client-side VAPID subscription registration
- `app/api/push/subscribe/route.ts` — stores PushSubscription in Supabase
- `app/api/push/send/route.ts` — broadcasts to all stored subscriptions (intended to be triggered by Supabase webhook)

### Environment Variables

Copy `.env.local.example` to `.env.local`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. For push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generate with `npx web-push generate-vapid-keys`).
