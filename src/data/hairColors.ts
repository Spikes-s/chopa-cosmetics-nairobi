// Universal and Extra Colors for Hair Extensions

export const UNIVERSAL_COLORS = [
  { id: '1', name: '1', hex: '#000000' },
  { id: '2', name: '2', hex: '#1a1a1a' },
  { id: '33', name: '33', hex: '#4a1a00' },
  { id: '350', name: '350', hex: '#8b4513' },
  { id: '1/350', name: '1/350', hex: '#2d1810' },
  { id: '1/33', name: '1/33', hex: '#2d0f00' },
  { id: '900', name: '900', hex: '#0a0a0a' },
  { id: '1/900', name: '1/900', hex: '#050505' },
  { id: '2/30', name: '2/30', hex: '#3d2817' },
  { id: '30', name: '30', hex: '#8b5a2b' },
  { id: '2/27', name: '2/27', hex: '#4a3728' },
  { id: '1/27', name: '1/27', hex: '#2d1f15' },
  { id: '27', name: '27', hex: '#daa520' },
  { id: '99J', name: '99J', hex: '#722f37' },
  { id: '30/613', name: '30/613', hex: '#c4a35a' },
  { id: '613', name: '613', hex: '#faf0be' },
] as const;

export const EXTRA_COLORS = [
  { id: 'blue', name: 'Blue', hex: '#0066cc' },
  { id: '1/blue', name: '1/Blue', hex: '#001a33' },
  { id: 'red', name: 'Red', hex: '#cc0000' },
  { id: '1/red', name: '1/Red', hex: '#330000' },
  { id: 'mint', name: 'Mint', hex: '#98ff98' },
  { id: '1/mint', name: '1/Mint', hex: '#264d26' },
  { id: 'grey', name: 'Grey', hex: '#808080' },
  { id: '1/grey', name: '1/Grey', hex: '#404040' },
  { id: '1/green', name: '1/Green', hex: '#003300' },
  { id: '1/emerald', name: '1/Emerald', hex: '#004d40' },
  { id: '1/950', name: '1/950', hex: '#0d0d0d' },
  { id: '1/purple', name: '1/Purple', hex: '#1a0033' },
  { id: 'purple', name: 'Purple', hex: '#800080' },
  { id: 'd-purple', name: 'D Purple', hex: '#4b0082' },
  { id: 'pink', name: 'Pink', hex: '#ffc0cb' },
  { id: '1/pink', name: '1/Pink', hex: '#4d3a3d' },
  { id: 'hot-pink', name: 'Hot Pink', hex: '#ff69b4' },
  { id: '1/hot-pink', name: '1/Hot Pink', hex: '#4d1f36' },
] as const;

export type UniversalColor = typeof UNIVERSAL_COLORS[number];
export type ExtraColor = typeof EXTRA_COLORS[number];
export type HairColor = UniversalColor | ExtraColor;

export const ALL_COLORS = [...UNIVERSAL_COLORS, ...EXTRA_COLORS];

export type ColorType = 'universal' | 'extra' | 'both';

export const getColorsByType = (type: ColorType): typeof ALL_COLORS => {
  switch (type) {
    case 'universal':
      return [...UNIVERSAL_COLORS];
    case 'extra':
      return [...EXTRA_COLORS];
    case 'both':
    default:
      return ALL_COLORS;
  }
};
