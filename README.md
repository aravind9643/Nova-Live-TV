<div align="center">

# 📺 Nova · Live TV

**A beautiful, blazing-fast web app for browsing and streaming 14,000+ free live TV channels from around the world.**

Browse by category, country, or language · star favorites · zap between channels — all in a rich, animated, fully responsive UI.

</div>

---

## ✨ Features

- **14,000+ live channels** streamed directly from the free, open [iptv-org](https://github.com/iptv-org/iptv) playlists.
- **Three ways to browse** — switch the whole catalogue between **Category**, **Country**, and **Language** from the sidebar menu; each axis is cached for instant switching.
- **In-app HLS player** powered by [hls.js](https://github.com/video-dev/hls.js) with a native fallback for Safari — includes mute, fullscreen, and a **LIVE** indicator.
- **Channel zapping** — jump to the previous/next channel with on-screen buttons or the **← / →** keys, without leaving the player.
- **Favorites & Recently watched** — star any channel; both lists persist to `localStorage` and appear at the top of the menu.
- **Instant search** — a header search over all channels (kept smooth with `useDeferredValue`) plus an in-menu filter for the group list.
- **Deep-linking** — the active axis, group, and playing channel are stored in the URL hash, so views are shareable and survive a refresh.
- **Virtualized grid** — only the visible rows of the 14k-channel list are rendered, so scrolling stays smooth with a near-constant DOM.
- **Resilient playback** — auto-recovers from transient network/media errors, times out dead streams after 15s, and offers **Try again / Next channel**.
- **Rich, responsive UI** — glassmorphism, animated ambient gradients, and a modern dark theme; a slide-in drawer on mobile, sidebar on desktop.
- **Fast & lean** — no animation library, no runtime blur filters, `rAF`-throttled scrolling, and the player (incl. hls.js) is **lazy-loaded** so the initial bundle is ~54 kB gzipped.
- **Accessible** — the player is a focus-trapped `role="dialog"`, icon buttons are labeled, and all animations respect `prefers-reduced-motion`.
- **Google AdSense ready** — display ad slots (header, in-grid, sidebar) wired to env-configured ad units, with themed placeholders when ads are off. See [Monetization](#-monetization-adsense).

## 🚀 Getting started

**Prerequisites:** [Node.js](https://nodejs.org) 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev          # → http://localhost:5173

# 3. Build for production (also regenerates public/sitemap.xml)
npm run build

# 4. Preview the production build
npm run preview

# Quality
npm run lint         # ESLint
npm run format       # Prettier
npm test             # unit (Vitest) + e2e (Playwright, phone + desktop)
npm run test:unit    # Vitest only
npm run test:e2e     # Playwright only; first run: npx playwright install chromium
npm run og           # re-render public/og.png (link-preview image)
npm run data         # fetch playlists → public/catalogue.json, sitemap, page data (HEALTH_CHECK=1 to probe streams)
```

> **Environment variables** are optional and only used for ads. Copy `.env.example` to `.env` to configure them — see [Monetization](#-monetization-adsense). Vite bakes env values in at **build time**, so restart the dev server / rebuild after editing `.env`.

## 🎮 Keyboard shortcuts (in the player)

| Key       | Action              |
| --------- | ------------------- |
| `←` / `→` | Previous / next channel |
| `F`       | Toggle fullscreen   |
| `M`       | Mute / unmute       |
| `P`       | Picture-in-picture  |
| `Esc`     | Close the player    |

## 🧱 Tech stack

- **[React 18](https://react.dev)** + **[Vite](https://vitejs.dev)** — UI and build tooling
- **[hls.js](https://github.com/video-dev/hls.js)** — HLS live-stream playback
- **[lucide-react](https://lucide.dev)** — icons
- **Plain CSS** — glassmorphism, gradients, and GPU-friendly animations (no CSS framework)

## 📂 Project structure

```
src/
├── App.jsx                  # Layout, header, sidebar/drawer, state orchestration
├── main.jsx                 # React entry point
├── styles.css               # All styling (theme, layout, responsive, animations)
├── components/
│   ├── Player.jsx           # Lazy-loaded HLS player modal (hls.js)
│   ├── ChannelCard.jsx      # Memoized channel tile
│   ├── VirtualGrid.jsx      # Windowed/virtualized channel grid
│   └── AdSlot.jsx           # Reusable AdSense display unit (+ placeholder)
└── lib/
    ├── m3u.js               # Tolerant M3U (extended) playlist parser
    ├── useChannels.js       # Fetches & parses a playlist axis (with cache)
    ├── useLibrary.js        # Favorites + recently-watched (localStorage)
    ├── useHashState.js      # Deep-linking via the URL hash
    └── ads.js               # AdSense config + lazy script loader
```

## 🌐 How the data works

Nova fetches iptv-org's aggregate M3U playlists at runtime and parses them in the browser:

| Axis     | Playlist |
| -------- | -------- |
| Category | `index.category.m3u` |
| Country  | `index.country.m3u` |
| Language | `index.language.m3u` |

In development, requests go through a small Vite proxy (`/iptv/…`) to avoid CORS; in production the raw `iptv-org.github.io` URLs are used directly (they serve permissive CORS headers).

## 💰 Monetization (AdSense)

The app ships with **Google AdSense display ad slots** in three placements — under the header, between the hero and the channel grid, and in the sidebar/drawer. Ads are **off by default**; when disabled (or before a real ad unit is configured), each slot renders a themed *"Ad space"* placeholder so the layout looks right in development.

**Configuration** lives in [`.env`](.env.example) (all vars are `VITE_`-prefixed so Vite exposes them to the client):

| Variable | Purpose |
| -------- | ------- |
| `VITE_ADS` | Master switch — `1`/`true` to enable, `0`/empty for ad-free |
| `VITE_ADSENSE_CLIENT` | Your AdSense client/publisher ID (`ca-pub-…`) |
| `VITE_ADSENSE_SLOT_HEADER` | Ad unit slot ID for the header banner |
| `VITE_ADSENSE_SLOT_SIDEBAR` | Ad unit slot ID for the sidebar unit |
| `VITE_ADSENSE_SLOT_GRID` | Ad unit slot ID for the in-grid unit |

**Going live:**

1. Get your site approved in [AdSense](https://adsense.google.com) (requires a live, public domain).
2. Create three **Display** ad units and copy each unit's `data-ad-slot` number.
3. Copy `.env.example` → `.env`, set `VITE_ADSENSE_CLIENT`, the three slot IDs, and `VITE_ADS=1`.
4. Rebuild (`npm run build`) — placeholders become real ads.

> The AdSense loader `<script>` (with the publisher ID) is included in [`index.html`](index.html) for site verification. `.env` is gitignored; only `.env.example` is committed.
>
> **Policy note:** AdSense prohibits monetizing copyrighted video you're not authorized to distribute. These are third-party IPTV streams — confirm your usage is authorized before enabling ads, or you risk ad-unit disapproval / account penalties.

## 🚢 Deploy checklist

These steps happen outside the code:

1. **Consent banner (EEA / UK / Switzerland).** In AdSense → *Privacy & messaging* → *European regulations*, create and publish a message. The page already sets Consent Mode v2 defaults; Google's CMP shows the banner and updates them. The *Privacy settings* link in the filters panel reopens it.
2. **Search Console.** Add the site at search.google.com/search-console, verify it (Vercel: DNS or HTML-tag method), then submit `https://nova-live-tv.vercel.app/sitemap.xml`. The build pre-renders every sitemap page (`dist/category|country|language/<name>/index.html`).
3. **Error reporting (optional).** Create a Sentry project and set `VITE_SENTRY_DSN` in Vercel's environment variables. Without it nothing is loaded or sent.
4. **CI.** `.github/workflows/ci.yml` runs lint, unit tests and the build, the Playwright suite (in Microsoft's Playwright container) and Lighthouse budgets (`lighthouserc.json`) on every push to `main` and on pull requests.
5. **Nightly data refresh.** Create a Vercel Deploy Hook (Project → Settings → Git → Deploy Hooks) and save its URL as the repository secret `VERCEL_DEPLOY_HOOK`. `.github/workflows/refresh.yml` then rebuilds the site daily, refreshing `catalogue.json`, the sitemap and the pre-rendered pages.
6. **Stream health check (optional).** Set `HEALTH_CHECK=1` in Vercel's environment variables to probe every stream during the build and sink unreachable ones (adds a few minutes to the build).
7. **Analytics.** Enable *Analytics* in the Vercel project dashboard. It's cookie-less; nothing is collected until it's enabled.
8. **Linux screenshot baselines.** The first CI run writes the missing Linux baselines for the visual tests and uploads them in the `playwright-report` artifact (`tests/__screenshots__/linux/`). Commit that folder so later runs compare against it.

## ⚠️ Notes & limitations

- Casting uses AirPlay on Safari and the browser Remote Playback API elsewhere. Chrome can't remote-play hls.js (MSE) streams, so the Cast button only appears where the browser reports a device is available for the current stream.
- The mini-player starts a fresh connection when you go back to the grid, so there's a brief re-buffer.


- **Stream availability varies.** These are free, community-maintained public streams — a portion are offline or geo-blocked at any given time. Nova detects fatal stream errors and prompts you to retry or pick another channel.
- **No EPG / program guide.** iptv-org does not host a ready-to-use program guide; a comprehensive EPG would require a backend to run their scraper. Nova is a live-channel browser, not a guide.
- **Favorites are per-browser.** They're stored in `localStorage` and do not sync across devices.

## 🙏 Credits

- Channel data & streams: **[iptv-org/iptv](https://github.com/iptv-org/iptv)** — free and open.
- This project is for personal, educational use. All streams belong to their respective broadcasters.

## 📄 License

MIT — see notes above regarding third-party stream ownership.
