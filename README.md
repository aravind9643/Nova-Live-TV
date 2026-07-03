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

## 🚀 Getting started

**Prerequisites:** [Node.js](https://nodejs.org) 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev          # → http://localhost:5173

# 3. Build for production
npm run build

# 4. Preview the production build
npm run preview
```

## 🎮 Keyboard shortcuts (in the player)

| Key       | Action              |
| --------- | ------------------- |
| `←` / `→` | Previous / next channel |
| `F`       | Toggle fullscreen   |
| `M`       | Mute / unmute       |
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
│   └── VirtualGrid.jsx      # Windowed/virtualized channel grid
└── lib/
    ├── m3u.js               # Tolerant M3U (extended) playlist parser
    ├── useChannels.js       # Fetches & parses a playlist axis (with cache)
    ├── useLibrary.js        # Favorites + recently-watched (localStorage)
    └── useHashState.js      # Deep-linking via the URL hash
```

## 🌐 How the data works

Nova fetches iptv-org's aggregate M3U playlists at runtime and parses them in the browser:

| Axis     | Playlist |
| -------- | -------- |
| Category | `index.category.m3u` |
| Country  | `index.country.m3u` |
| Language | `index.language.m3u` |

In development, requests go through a small Vite proxy (`/iptv/…`) to avoid CORS; in production the raw `iptv-org.github.io` URLs are used directly (they serve permissive CORS headers).

## ⚠️ Notes & limitations

- **Stream availability varies.** These are free, community-maintained public streams — a portion are offline or geo-blocked at any given time. Nova detects fatal stream errors and prompts you to retry or pick another channel.
- **No EPG / program guide.** iptv-org does not host a ready-to-use program guide; a comprehensive EPG would require a backend to run their scraper. Nova is a live-channel browser, not a guide.
- **Favorites are per-browser.** They're stored in `localStorage` and do not sync across devices.

## 🙏 Credits

- Channel data & streams: **[iptv-org/iptv](https://github.com/iptv-org/iptv)** — free and open.
- This project is for personal, educational use. All streams belong to their respective broadcasters.

## 📄 License

MIT — see notes above regarding third-party stream ownership.
