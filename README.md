# Hellsoft Games

The website that catalogues the browser games built by Erik Hellman (Hellsoft).
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
- `pixelArt: true` renders screenshots with `image-rendering: pixelated`.
- `cover` is the card image (16:9 works best). Without a cover, `logo` is shown
  on a grid background instead.
- Image paths are relative to the YAML file, e.g. `../assets/games/<id>/shot.png`.

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
private repos) to refresh repo visibility, description, last push date and the
latest version. The version comes from the latest GitHub release, falling back
to the newest tag, then to `version` in the repo's `package.json`. The repo
link on a game page is only shown when the repo is public.

The sync is a manual step. Run it, review `git diff`, commit.

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
| `home-leaderboard` | Home page, under the hero              | 728×90, 320×50 on mobile  |
| `home-feed-1`      | Home page, in the grid after 4th card  | native card               |
| `game-bottom`      | Bottom of every game page              | 300×250                   |

Each slot has fixed dimensions so a real ad causes no layout shift. The
leaderboard unit is a responsive horizontal display ad; the other two are
300×250 display ads.

## Deploy

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the site and publishes it to GitHub Pages. The repository's
Pages source must be set to "GitHub Actions" (Settings → Pages) once.
