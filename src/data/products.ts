export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  wholesalePrice: number;
  category: string;
  subcategory: string;
  image: string;
  sizes?: string[];
  colors?: string[];
  inStock: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: string[];
}

export const categories: Category[] = [
  {
    id: '1',
    name: 'Braids',
    slug: 'braids',
    image: '/placeholder.svg',
    subcategories: ['Avvis Braids', 'Jibambe Braids', 'Rwandese Braids', 'Star Braids', 'Malkia Braids', 'Extra Long Braids', 'Kids Hair Extensions'],
  },
  {
    id: '2',
    name: 'Hair Care',
    slug: 'hair-care',
    image: '/placeholder.svg',
    subcategories: ['Shampoos', 'Hair Foods', 'Anti-Dandruff', 'Anti-Breakage', 'Hair Oils', 'Hair Gels', 'Hair Chemicals'],
  },
  {
    id: '3',
    name: 'Face & Skin Care',
    slug: 'face-skin-care',
    image: '/placeholder.svg',
    subcategories: ['Face Creams', 'Sun Creams', 'Serums'],
  },
  {
    id: '4',
    name: 'Makeup',
    slug: 'makeup',
    image: '/placeholder.svg',
    subcategories: ['Lipsticks', 'Lip Gloss', 'Compact Powders', 'Eye Palettes', 'Mascara', 'Eyeliner'],
  },
  {
    id: '5',
    name: 'Fashion Accessories',
    slug: 'fashion-accessories',
    image: '/placeholder.svg',
    subcategories: ['Bonnets', 'Shower Caps', 'Sunglasses', 'Fascinators'],
  },
  {
    id: '6',
    name: 'Jewelry',
    slug: 'jewelry',
    image: '/placeholder.svg',
    subcategories: ['Earrings', 'Rings', 'Nose Rings', 'Bracelets', 'Chains'],
  },
  {
    id: '7',
    name: 'Perfumes',
    slug: 'perfumes',
    image: '/placeholder.svg',
    subcategories: ['Body Splash', 'Body Mist', 'Elegant Perfumes', 'Designer Perfumes'],
  },
  {
    id: '8',
    name: 'Bath & Cleaning',
    slug: 'bath-cleaning',
    image: '/placeholder.svg',
    subcategories: ['Antiseptics', 'Body Wash', 'Bathing Gloves'],
  },
  {
    id: '9',
    name: 'Spa Tools',
    slug: 'spa-tools',
    image: '/placeholder.svg',
    subcategories: ['Hand Gels', 'Manicure Sets', 'Nippers', 'Eyelashes', 'Nail Tips', 'Press-on Nails'],
  },
  {
    id: '10',
    name: 'Machines',
    slug: 'machines',
    image: '/placeholder.svg',
    subcategories: ['UV Lamp Lights', 'Blow Dryers', 'Hair Straighteners'],
  },
  {
    id: '11',
    name: 'Personal Care',
    slug: 'personal-care',
    image: '/placeholder.svg',
    subcategories: ['Knitting Yarn', 'Sanitary Pads', 'Hair Removal Creams', 'Nail Cutters', 'Hair Pins'],
  },
];

export const braidColors = [
  '1', '2', '33', '1/33', '2/30', '30', '350', '27', '2/27', '900',
  '1/350', '1/900', '1/blue', '1/mint', '1/red', '1/pink', '1/grey',
  'red', 'blue', 'grey', 'green', '30/613'
];

export const extraLongColors = [
  ...braidColors,
  '30/tangerine', '27/613', 'Sunrise', 'Purple/Pink'
];

export const products: Product[] = [
  // Braids
  {
    id: 'braid-1',
    name: 'Avvis Braids (Angels) - Short',
    description: 'Premium quality Avvis braids by Angels, perfect for elegant styling.',
    price: 350,
    wholesalePrice: 280,
    category: 'Braids',
    subcategory: 'Avvis Braids',
    image: '/placeholder.svg',
    colors: braidColors,
    inStock: true,
  },
  {
    id: 'braid-2',
    name: 'Avvis Braids (Angels) - Long',
    description: 'Long version of our premium Avvis braids for stunning looks.',
    price: 450,
    wholesalePrice: 360,
    category: 'Braids',
    subcategory: 'Avvis Braids',
    image: '/placeholder.svg',
    colors: braidColors,
    inStock: true,
  },
  {
    id: 'braid-3',
    name: 'Jibambe Braids (Angels)',
    description: 'Beautiful Jibambe braids from Angels collection.',
    price: 380,
    wholesalePrice: 300,
    category: 'Braids',
    subcategory: 'Jibambe Braids',
    image: '/placeholder.svg',
    colors: braidColors,
    inStock: true,
  },
  {
    id: 'braid-4',
    name: 'Rwandese Braids (Olivia)',
    description: 'Authentic Rwandese braids from Olivia collection.',
    price: 400,
    wholesalePrice: 320,
    category: 'Braids',
    subcategory: 'Rwandese Braids',
    image: '/placeholder.svg',
    colors: braidColors,
    inStock: true,
  },
  {
    id: 'braid-5',
    name: 'Star Braids (Sistar)',
    description: 'Trendy Star braids from Sistar brand.',
    price: 420,
    wholesalePrice: 340,
    category: 'Braids',
    subcategory: 'Star Braids',
    image: '/placeholder.svg',
    colors: braidColors,
    inStock: true,
  },
  {
    id: 'braid-6',
    name: 'Malkia Braids (Afro Beauty)',
    description: 'Royal Malkia braids from Afro Beauty.',
    price: 450,
    wholesalePrice: 360,
    category: 'Braids',
    subcategory: 'Malkia Braids',
    image: '/placeholder.svg',
    colors: braidColors,
    inStock: true,
  },
  {
    id: 'braid-7',
    name: 'Amigo Extra Long Braids',
    description: 'Extra long Amigo braids for dramatic styling.',
    price: 550,
    wholesalePrice: 440,
    category: 'Braids',
    subcategory: 'Extra Long Braids',
    image: '/placeholder.svg',
    colors: extraLongColors,
    inStock: true,
  },
  {
    id: 'braid-8',
    name: 'Diani Extra Long Braids',
    description: 'Luxurious Diani extra long braids.',
    price: 580,
    wholesalePrice: 460,
    category: 'Braids',
    subcategory: 'Extra Long Braids',
    image: '/placeholder.svg',
    colors: extraLongColors,
    inStock: true,
  },

  // Sun Creams
  {
    id: 'sun-1',
    name: 'Dr Rashel Sun Cream',
    description: 'Premium sun protection cream by Dr Rashel.',
    price: 1200,
    wholesalePrice: 950,
    category: 'Face & Skin Care',
    subcategory: 'Sun Creams',
    image: '/placeholder.svg',
    sizes: ['50g', '125g'],
    inStock: true,
  },
  {
    id: 'sun-2',
    name: 'Garnier Sun Cream',
    description: 'Trusted sun protection from Garnier.',
    price: 1500,
    wholesalePrice: 1200,
    category: 'Face & Skin Care',
    subcategory: 'Sun Creams',
    image: '/placeholder.svg',
    sizes: ['50g', '125g', '250g'],
    inStock: true,
  },
  {
    id: 'sun-3',
    name: 'Nivea Sun Cream',
    description: 'Classic Nivea sun protection formula.',
    price: 1350,
    wholesalePrice: 1080,
    category: 'Face & Skin Care',
    subcategory: 'Sun Creams',
    image: '/placeholder.svg',
    sizes: ['50g', '125g', '250g', '500g'],
    inStock: true,
  },

  // Anti-Dandruff
  {
    id: 'anti-1',
    name: 'Black Essential Anti-Dandruff',
    description: 'Powerful anti-dandruff treatment from Black Essential.',
    price: 850,
    wholesalePrice: 680,
    category: 'Hair Care',
    subcategory: 'Anti-Dandruff',
    image: '/placeholder.svg',
    sizes: ['125g', '250g'],
    inStock: true,
  },
  {
    id: 'anti-2',
    name: 'TCB Anti-Dandruff Treatment',
    description: 'Professional TCB anti-dandruff solution.',
    price: 780,
    wholesalePrice: 620,
    category: 'Hair Care',
    subcategory: 'Anti-Dandruff',
    image: '/placeholder.svg',
    sizes: ['125g', '250g', '500g'],
    inStock: true,
  },
  {
    id: 'anti-3',
    name: 'Beula Anti-Dandruff',
    description: 'Natural Beula anti-dandruff formula.',
    price: 650,
    wholesalePrice: 520,
    category: 'Hair Care',
    subcategory: 'Anti-Dandruff',
    image: '/placeholder.svg',
    sizes: ['125g', '250g'],
    inStock: true,
  },
  {
    id: 'anti-4',
    name: 'Bamsi Baby Love Anti-Dandruff',
    description: 'Gentle anti-dandruff for sensitive scalps.',
    price: 550,
    wholesalePrice: 440,
    category: 'Hair Care',
    subcategory: 'Anti-Dandruff',
    image: '/placeholder.svg',
    sizes: ['50g', '125g'],
    inStock: true,
  },

  // Kids Hair Extensions
  {
    id: 'kids-1',
    name: 'Ombre Kids Hair Extensions',
    description: 'Fun ombre hair extensions for kids.',
    price: 280,
    wholesalePrice: 220,
    category: 'Braids',
    subcategory: 'Kids Hair Extensions',
    image: '/placeholder.svg',
    colors: extraLongColors,
    inStock: true,
  },
  {
    id: 'kids-2',
    name: 'Shanilia Kids Extensions',
    description: 'Playful Shanilia hair extensions for children.',
    price: 250,
    wholesalePrice: 200,
    category: 'Braids',
    subcategory: 'Kids Hair Extensions',
    image: '/placeholder.svg',
    colors: extraLongColors,
    inStock: true,
  },
  {
    id: 'kids-3',
    name: 'Barbie Kids Extensions',
    description: 'Adorable Barbie-style hair extensions.',
    price: 300,
    wholesalePrice: 240,
    category: 'Braids',
    subcategory: 'Kids Hair Extensions',
    image: '/placeholder.svg',
    colors: extraLongColors,
    inStock: true,
  },

  // Perfumes
  {
    id: 'perf-1',
    name: 'Elegant Rose Perfume',
    description: 'Sophisticated rose fragrance for special occasions.',
    price: 2500,
    wholesalePrice: 2000,
    category: 'Perfumes',
    subcategory: 'Elegant Perfumes',
    image: '/placeholder.svg',
    inStock: true,
  },
  {
    id: 'perf-2',
    name: 'Tropical Body Splash',
    description: 'Refreshing tropical body splash.',
    price: 450,
    wholesalePrice: 360,
    category: 'Perfumes',
    subcategory: 'Body Splash',
    image: '/placeholder.svg',
    inStock: true,
  },

  // Makeup
  {
    id: 'makeup-1',
    name: 'Velvet Matte Lipstick',
    description: 'Long-lasting velvet matte finish lipstick.',
    price: 650,
    wholesalePrice: 520,
    category: 'Makeup',
    subcategory: 'Lipsticks',
    image: '/placeholder.svg',
    inStock: true,
  },
  {
    id: 'makeup-2',
    name: 'Shimmer Eye Palette',
    description: '12-shade shimmer eye palette for stunning looks.',
    price: 1800,
    wholesalePrice: 1440,
    category: 'Makeup',
    subcategory: 'Eye Palettes',
    image: '/placeholder.svg',
    inStock: true,
  },

  // Machines
  {
    id: 'machine-1',
    name: 'Professional UV Lamp',
    description: 'Professional-grade UV lamp for nail treatments.',
    price: 3500,
    wholesalePrice: 2800,
    category: 'Machines',
    subcategory: 'UV Lamp Lights',
    image: '/placeholder.svg',
    inStock: true,
  },
  {
    id: 'machine-2',
    name: 'Ionic Blow Dryer',
    description: 'High-power ionic blow dryer with multiple settings.',
    price: 4500,
    wholesalePrice: 3600,
    category: 'Machines',
    subcategory: 'Blow Dryers',
    image: '/placeholder.svg',
    inStock: true,
  },
];
