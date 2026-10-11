import { getCollection, type CollectionEntry } from 'astro:content';

export type Game = CollectionEntry<'games'>;

export async function getListedGames(): Promise<Game[]> {
  const games = await getCollection('games', ({ data }) => data.listed);
  return games.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export const STATUS_LABEL: Record<Game['data']['status'], string> = {
  released: 'Released',
  playable: 'Playable',
  playtest: 'Playtest',
  prototype: 'Prototype',
  archived: 'Archived',
};

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dateFormat.format(d);
}

/** Split a block-scalar description into paragraphs. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

export function repoUrl(game: Game): string | null {
  if (game.data.sync?.isPrivate !== false) return null;
  return `https://github.com/${game.data.repo.owner}/${game.data.repo.name}`;
}
