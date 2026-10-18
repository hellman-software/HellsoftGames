import { DEVICES } from '../content.config';
import type { Game } from './games';

export type ControlType = Game['data']['controls'][number]['type'];
export type DeviceType = Game['data']['devices'][number]['type'];
export type SupportType = ControlType | DeviceType;

export const SUPPORT_LABEL: Record<SupportType, string> = {
  'keyboard-mouse': 'Keyboard & mouse',
  keyboard: 'Keyboard',
  gamepad: 'Game controller',
  touch: 'Touch',
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone',
};

/** Inner SVG markup for a 24×24, stroked, currentColor icon. */
export const SUPPORT_ICON: Record<SupportType, string> = {
  'keyboard-mouse':
    '<rect x="1.5" y="7" width="14" height="10" rx="2"/><path d="M5 10.5h.01M8.5 10.5h.01M12 10.5h.01M5.5 14h6"/><rect x="17.5" y="6" width="5" height="9" rx="2.5"/><path d="M20 6v3"/>',
  keyboard:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>',
  gamepad:
    '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
  touch:
    '<path d="M10 13V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M13 11.5a1.5 1.5 0 0 1 3 0V13"/><path d="M16 12.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L5 16.3a1.5 1.5 0 0 1 2.3-1.9L10 17"/><path d="M6.5 6.5a5 5 0 0 1 2-3.6M16.5 6.5a5 5 0 0 0-2-3.6"/>',
  desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/>',
};

export interface SupportEntry {
  type: SupportType;
  label: string;
  note: string | undefined;
  supported: boolean;
}

/** The game's controls, in the order the YAML lists them. */
export function controlsOf(game: Game): SupportEntry[] {
  return game.data.controls.map(({ type, note }) => ({ type, label: SUPPORT_LABEL[type], note, supported: true }));
}

/**
 * Every device class, in a fixed order, with the ones the game leaves out marked unsupported. Empty when the
 * game lists no devices at all, since that means unknown rather than unsupported everywhere.
 */
export function devicesOf(game: Game): SupportEntry[] {
  if (game.data.devices.length === 0) return [];
  return DEVICES.map((type) => {
    const entry = game.data.devices.find((d) => d.type === type);
    return {
      type,
      label: SUPPORT_LABEL[type],
      note: entry ? entry.note : 'Not supported.',
      supported: Boolean(entry),
    };
  });
}
