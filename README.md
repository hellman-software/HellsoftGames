# Hellsoft Games

The website that catalogues the games built by Erik Hellman (Hellsoft).
Live at <https://games.hellsoft.se/>.

Built with [Astro](https://astro.build) as a fully static site. No client-side
framework; the only JavaScript is the dark/light theme toggle.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321/
npm run build      # static output in dist/
npm run preview    # serve dist/
npm run check      # astro check (types)
npm test           # unit tests for the sync script
```

Node 22.12 or newer is required.

## Adding or editing a game

All catalogue data lives in [`src/data/games.yaml`](src/data/games.yaml). Each
entry has hand-written fields (title, blurb, description, genre, status, tech,
tags, images, play URL) and a `sync:` block that is generated. Edit the
hand-written fields freely; never edit `sync:` by hand.

- `id` is the URL slug (`/games/<id>/`) and must be unique.
- `listed: false` keeps a game in the data but off the site.
- `status` is one of `released`, `playable`, `playtest`, `prototype`, `archived`.
- `browserPlayable` is required: use `true` for games that run in a browser and `false`
  for games that require installation. Cards and game pages show this explicitly,
  independently of device support. `playUrl` links to the game or its download/store
  page; games requiring installation use a “Get game” button.
- `pixelArt: true` renders screenshots with `image-rendering: pixelated`.
- `cover` is the card image (16:9 works best). Without a cover, `logo` is shown
  on a grid background instead.
- Image paths are relative to the YAML file, e.g. `../assets/games/<id>/shot.png`.
- Optional `video: {src: /videos/<id>/gameplay.mp4, label: Gameplay description}`
  replaces the details hero image with a muted, looping autoplay video with controls.
  Store MP4 files in `public/videos/<id>/`; the cover serves as the video poster.
- `controls` lists the supported inputs: `keyboard-mouse`, `keyboard` (no mouse
  needed), `gamepad` and `touch`. `devices` lists `desktop`, `tablet` and
  `phone`; a device left out is shown crossed out as unsupported. Each entry
  takes an optional `note`, shown as the icon's tooltip on the cards and in
  full on the game page. Quote notes that contain commas.

The schema is enforced at build time by [`src/content.config.ts`](src/content.config.ts),
so a typo in a field name or a missing image fails `npm run build` rather than
the deploy.

### Images

Screenshots live in `src/assets/games/<id>/` and are optimised by Astro at
build time. To copy an image out of a game repo (works for private repos too):

```bash
gh api repos/ErikHellman/<repo>/contents/<path/to/image.png> --jq .content | base64 -d > src/assets/games/<id>/image.png
```

### Syncing from GitHub

```bash
npm run sync        # refresh every game's sync: block
npm run sync:dry    # show what would change without writing
npm run sync -- --only fimbulvetr
```

The script uses the `gh` CLI (which must be logged in with access to the
private repos) to refresh repo visibility, license metadata, description, last push
date and the latest version. The version comes from the latest GitHub release, falling back
to the newest tag, then to `version` in the repo's `package.json`.

Cards and details show a “Source” link to GitHub and the license only for
open-source games: public repositories with a detected OSI-approved SPDX license
(using `spdx-license-list`). Details also link to the license file when available.
Other games show no source or license information, including private repositories,
public repositories without an OSI-approved license, and missing or older snapshots.
Keep `spdx-license-list` updated as SPDX adds licenses.

The sync is a manual step. Run it, review `git diff`, commit.

## Favicons and social sharing

The favicon uses the header's gradient H mark. `public/favicon.svg` is the
source for the PNG, ICO and Apple touch icon fallbacks. The homepage's social
card is `public/social/hellsoft-games.png` (1200×630), composed from the brand
and existing game screenshots. Regenerate these checked-in assets with:

```bash
npm run assets:brand
```

Edit `scripts/generate-brand-assets.mjs` to change the card's artwork or copy.
`src/layouts/Base.astro` supplies Open Graph and Twitter card metadata with
absolute URLs, image dimensions and alt text. Each game page uses its title,
blurb and a PNG of its cover (or first screenshot), generated during the Astro
build at the same aspect ratio, up to 1200×630 without upscaling. Pages without
artwork use the branded card.

## Ads

Ads are Google AdSense units rendered by
[`src/components/AdSlot.astro`](src/components/AdSlot.astro). The publisher id and
the unit id for each slot live in [`src/lib/ads.ts`](src/lib/ads.ts); the script
is loaded from [`Base.astro`](src/layouts/Base.astro) and
[`public/ads.txt`](public/ads.txt) authorises the publisher. Ads load in
production builds only (`npm run build`), so `npm run dev` shows dashed
placeholders. A slot with no unit id in `ads.ts` also stays a placeholder.
There are three slots:

| Slot id            | Where                                  | Size                      |
| ------------------ | -------------------------------------- | ------------------------- |
| `home-leaderboard` | Home page, below the featured game     | 728×90, 320×50 on mobile  |
| `home-feed-1`      | Home page, in the grid after 4th card  | native card               |
| `game-bottom`      | Bottom of every game page              | 300×250                   |

Each slot has fixed dimensions so a real ad causes no layout shift. The
leaderboard unit is a responsive horizontal display ad; the other two are
300×250 display ads.

## Deploy

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the site and publishes it to GitHub Pages. The repository's
Pages source must be set to "GitHub Actions" (Settings → Pages) once.
