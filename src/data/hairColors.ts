// Hair Extension Color System - Industry Standard Color Map

// UNIVERSAL COLORS - Natural and common tones (expanded)
export const UNIVERSAL_COLORS = [
  { id: '1', name: '1', hex: '#000000' },
  { id: '1B', name: '1B', hex: '#1b1b1b' },
  { id: '2', name: '2', hex: '#1a1a1a' },
  { id: '4', name: '4', hex: '#3b2219' },
  { id: '6', name: '6', hex: '#584039' },
  { id: '8', name: '8', hex: '#7a5a44' },
  { id: '10', name: '10', hex: '#9e7e56' },
  { id: '12', name: '12', hex: '#b08e5e' },
  { id: '14', name: '14', hex: '#c4a35a' },
  { id: '16', name: '16', hex: '#d4b96e' },
  { id: '18', name: '18', hex: '#b89c72' },
  { id: '20', name: '20', hex: '#c9a96e' },
  { id: '22', name: '22', hex: '#d6b97a' },
  { id: '24', name: '24', hex: '#e0c98e' },
  { id: '27', name: '27', hex: '#daa520' },
  { id: '30', name: '30', hex: '#8b5a2b' },
  { id: '33', name: '33', hex: '#4a1a00' },
  { id: '35', name: '35', hex: '#6b2d1a' },
  { id: '99J', name: '99J', hex: '#722f37' },
  { id: '130', name: '130', hex: '#9a3820' },
  { id: '144', name: '144', hex: '#c04020' },
  { id: '350', name: '350', hex: '#8b4513' },
  { id: '530', name: '530', hex: '#7a3b10' },
  { id: '613', name: '613', hex: '#faf0be' },
  { id: '900', name: '900', hex: '#0a0a0a' },
  { id: 'T1B/27', name: 'T1B/27', hex: '#1b1b1b', hex2: '#daa520' },
  { id: 'T1B/30', name: 'T1B/30', hex: '#1b1b1b', hex2: '#8b5a2b' },
  { id: 'T1B/33', name: 'T1B/33', hex: '#1b1b1b', hex2: '#4a1a00' },
  { id: 'T1B/99J', name: 'T1B/99J', hex: '#1b1b1b', hex2: '#722f37' },
  { id: 'T1B/613', name: 'T1B/613', hex: '#1b1b1b', hex2: '#faf0be' },
  { id: '1/350', name: '1/350', hex: '#000000', hex2: '#8b4513' },
  { id: '1/33', name: '1/33', hex: '#000000', hex2: '#4a1a00' },
  { id: '1/900', name: '1/900', hex: '#000000', hex2: '#0a0a0a' },
  { id: '2/30', name: '2/30', hex: '#1a1a1a', hex2: '#8b5a2b' },
  { id: '2/27', name: '2/27', hex: '#1a1a1a', hex2: '#daa520' },
  { id: '1/27', name: '1/27', hex: '#000000', hex2: '#daa520' },
  { id: '30/613', name: '30/613', hex: '#8b5a2b', hex2: '#faf0be' },
  { id: '27/613', name: '27/613', hex: '#daa520', hex2: '#faf0be' },
  { id: '4/27', name: '4/27', hex: '#3b2219', hex2: '#daa520' },
  { id: '4/30', name: '4/30', hex: '#3b2219', hex2: '#8b5a2b' },
] as const;

// EXTRA COLORS - Vibrant and fashion shades (expanded)
export const EXTRA_COLORS = [
  { id: 'blue', name: 'Blue', hex: '#0066cc' },
  { id: '1/blue', name: '1/Blue', hex: '#000000', hex2: '#0066cc' },
  { id: 'navy', name: 'Navy', hex: '#001f5b' },
  { id: 'royal-blue', name: 'Royal Blue', hex: '#4169e1' },
  { id: 'red', name: 'Red', hex: '#cc0000' },
  { id: '1/red', name: '1/Red', hex: '#000000', hex2: '#cc0000' },
  { id: 'burgundy', name: 'Burgundy', hex: '#800020' },
  { id: 'wine', name: 'Wine', hex: '#722f37' },
  { id: 'mint', name: 'Mint', hex: '#98ff98' },
  { id: '1/mint', name: '1/Mint', hex: '#000000', hex2: '#98ff98' },
  { id: 'grey', name: 'Grey', hex: '#808080' },
  { id: '1/grey', name: '1/Grey', hex: '#000000', hex2: '#808080' },
  { id: 'silver', name: 'Silver', hex: '#c0c0c0' },
  { id: 'green', name: 'Green', hex: '#228b22' },
  { id: '1/green', name: '1/Green', hex: '#000000', hex2: '#228b22' },
  { id: 'emerald', name: 'Emerald', hex: '#50c878' },
  { id: '1/emerald', name: '1/Emerald', hex: '#000000', hex2: '#50c878' },
  { id: 'purple', name: 'Purple', hex: '#800080' },
  { id: '1/purple', name: '1/Purple', hex: '#000000', hex2: '#800080' },
  { id: 'd-purple', name: 'D Purple', hex: '#4b0082' },
  { id: 'lavender', name: 'Lavender', hex: '#b57edc' },
  { id: 'pink', name: 'Pink', hex: '#ffc0cb' },
  { id: '1/pink', name: '1/Pink', hex: '#000000', hex2: '#ffc0cb' },
  { id: 'hot-pink', name: 'Hot Pink', hex: '#ff69b4' },
  { id: '1/hot-pink', name: '1/Hot Pink', hex: '#000000', hex2: '#ff69b4' },
  { id: 'rose-gold', name: 'Rose Gold', hex: '#b76e79' },
  { id: 'orange', name: 'Orange', hex: '#ff8c00' },
  { id: '1/orange', name: '1/Orange', hex: '#000000', hex2: '#ff8c00' },
  { id: 'copper', name: 'Copper', hex: '#b87333' },
  { id: 'gold', name: 'Gold', hex: '#ffd700' },
  { id: 'platinum', name: 'Platinum', hex: '#e5e4e2' },
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: '1/950', name: '1/950', hex: '#000000', hex2: '#0d0d0d' },
  { id: 'teal', name: 'Teal', hex: '#008080' },
  { id: 'coral', name: 'Coral', hex: '#ff7f50' },
  { id: 'ombre-blonde', name: 'Ombré Blonde', hex: '#3b2219', hex2: '#faf0be' },
  { id: 'ombre-red', name: 'Ombré Red', hex: '#1b1b1b', hex2: '#cc0000' },
] as const;

// Type definitions
export interface HairColor {
  id: string;
  name: string;
  hex: string;
  hex2?: string; // Second color for dual-shade/ombre
}

// Combined array of all colors
export const ALL_COLORS: HairColor[] = [...UNIVERSAL_COLORS, ...EXTRA_COLORS] as unknown as HairColor[];

// Color type for product assignment
export type ColorType = 'universal' | 'extra' | 'both';

// Get colors by type
export const getColorsByType = (type: ColorType): HairColor[] => {
  switch (type) {
    case 'universal':
      return UNIVERSAL_COLORS as unknown as HairColor[];
    case 'extra':
      return EXTRA_COLORS as unknown as HairColor[];
    case 'both':
    default:
      return ALL_COLORS;
  }
};

// Get color names for display
export const getColorNamesByType = (type: ColorType): string[] => {
  return getColorsByType(type).map(c => c.name);
};

// Find color by id or name (case-insensitive)
export const findColor = (idOrName: string): HairColor | undefined => {
  const normalized = idOrName.trim().toLowerCase();
  return ALL_COLORS.find(c => c.id.toLowerCase() === normalized || c.name.toLowerCase() === normalized);
};

// Auto-match a color code string to hex values
export const autoMatchColor = (code: string): { hex: string; hex2?: string } | null => {
  const color = findColor(code);
  if (color) {
    return { hex: color.hex, hex2: color.hex2 };
  }
  return null;
};
