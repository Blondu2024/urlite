import type { Theme } from './types';

export interface Palette extends Theme {
  id: string;
  name: string;
}

/**
 * Curated palettes. Every pair used for body text keeps ≥4.5:1 on its surface.
 * `accent` appears exactly twice in a generated site: primary CTA + one band.
 */
export const PALETTES: Palette[] = [
  {
    id: 'forest',
    name: 'Forest & Honey',
    brand: '#466E50',
    ink: '#16241B',
    accent: '#F2C230',
    paper: '#F4F2EC',
    paper2: '#EAE7DE',
    onAccent: '#20190A',
  },
  {
    id: 'ocean',
    name: 'Harbour Blue',
    brand: '#2C5C74',
    ink: '#12222C',
    accent: '#F2A03D',
    paper: '#F3F4F2',
    paper2: '#E6E9E6',
    onAccent: '#221604',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    brand: '#A4502F',
    ink: '#2A160D',
    accent: '#E9B44C',
    paper: '#F7F2EA',
    paper2: '#EFE6D8',
    onAccent: '#241705',
  },
  {
    id: 'plum',
    name: 'Plum & Rose',
    brand: '#6D3B5D',
    ink: '#241119',
    accent: '#E8A0A6',
    paper: '#F6F1F3',
    paper2: '#EDE3E8',
    onAccent: '#2A1216',
  },
  {
    id: 'slate',
    name: 'Slate & Lime',
    brand: '#45524E',
    ink: '#171D1B',
    accent: '#C9E265',
    paper: '#F2F3F1',
    paper2: '#E7E9E5',
    onAccent: '#1B2208',
  },
  {
    id: 'espresso',
    name: 'Espresso',
    brand: '#6B4A32',
    ink: '#211710',
    accent: '#E3B23C',
    paper: '#F5F0E8',
    paper2: '#ECE4D6',
    onAccent: '#231803',
  },
  {
    id: 'midnight',
    name: 'Midnight & Coral',
    brand: '#33415C',
    ink: '#121826',
    accent: '#F27059',
    paper: '#F2F3F5',
    paper2: '#E6E8EC',
    onAccent: '#2B0F08',
  },
  {
    id: 'olive',
    name: 'Olive Grove',
    brand: '#5F6B3A',
    ink: '#1C2113',
    accent: '#EFCB68',
    paper: '#F5F4EC',
    paper2: '#EBEADD',
    onAccent: '#241B05',
  },
];

export const paletteById = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];
