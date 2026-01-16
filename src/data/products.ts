import { getColorNamesByType } from './hairColors';

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
  colorType?: 'universal' | 'extra' | 'both'; // For hair extensions
  inStock: boolean;
  stockQuantity?: number; // Default stock level
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
    name: 'Hair Extensions',
    slug: 'hair-extensions',
    image: '/placeholder.svg',
    subcategories: ['Braids', 'Crotchets', 'Weaves', 'Wigs', 'Brazilian Wool', 'Extensions'],
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

// All braids use BOTH color sets (universal + extra)
const allColors = getColorNamesByType('both');

// Standard pricing: Ksh 55 for all braids
// Exception: Avvis Braids and Star Braids are Ksh 65
const STANDARD_PRICE = 55;
const PREMIUM_PRICE = 65;
const DEFAULT_STOCK = 1000;

// Helper to create braid product
const createBraid = (
  id: string,
  name: string,
  description: string,
  isPremium: boolean = false
): Product => ({
  id,
  name,
  description,
  price: isPremium ? PREMIUM_PRICE : STANDARD_PRICE,
  wholesalePrice: isPremium ? 50 : 45, // Wholesale slightly below retail
  category: 'Hair Extensions',
  subcategory: 'Braids',
  image: '/placeholder.svg',
  colors: allColors,
  colorType: 'both',
  inStock: true,
  stockQuantity: DEFAULT_STOCK,
});

// ============= HAIR EXTENSIONS - BRAIDS =============
// All braid products with Long and Short variants
// Pricing: Ksh 55 for all, except Avvis & Star Braids which are Ksh 65

const braidProducts: Product[] = [
  // Rwandese Braids (Olivia)
  createBraid('braid-rwandese-short', 'Rwandese Braids (Olivia) – Short', 'Authentic Rwandese braids from Olivia collection. Short length for elegant styling.'),
  createBraid('braid-rwandese-long', 'Rwandese Braids (Olivia) – Long', 'Authentic Rwandese braids from Olivia collection. Long length for dramatic looks.'),

  // Jibambe Braids (Angels)
  createBraid('braid-jibambe-short', 'Jibambe Braids (Angels) – Short', 'Beautiful Jibambe braids from Angels collection. Short length.'),
  createBraid('braid-jibambe-long', 'Jibambe Braids (Angels) – Long', 'Beautiful Jibambe braids from Angels collection. Long length.'),

  // Avvis Braids (Angels) - PREMIUM Ksh 65
  createBraid('braid-avvis-short', 'Avvis Braids (Angels) – Short', 'Premium quality Avvis braids by Angels. Short length.', true),
  createBraid('braid-avvis-long', 'Avvis Braids (Angels) – Long', 'Premium quality Avvis braids by Angels. Long length.', true),

  // Malkia Braids (Afro Prima)
  createBraid('braid-malkia-short', 'Malkia Braids (Afro Prima) – Short', 'Royal Malkia braids from Afro Prima. Short length.'),
  createBraid('braid-malkia-long', 'Malkia Braids (Afro Prima) – Long', 'Royal Malkia braids from Afro Prima. Long length.'),

  // Star Braids (Sistar) - PREMIUM Ksh 65
  createBraid('braid-star-short', 'Star Braids (Sistar) – Short', 'Trendy Star braids from Sistar brand. Short length.', true),
  createBraid('braid-star-long', 'Star Braids (Sistar) – Long', 'Trendy Star braids from Sistar brand. Long length.', true),

  // Jumbo Braids
  createBraid('braid-jumbo-short', 'Jumbo Braids – Short', 'Classic Jumbo braids for bold styling. Short length.'),
  createBraid('braid-jumbo-long', 'Jumbo Braids – Long', 'Classic Jumbo braids for bold styling. Long length.'),

  // Lagos Jumbo
  createBraid('braid-lagos-jumbo-short', 'Lagos Jumbo – Short', 'Premium Lagos Jumbo braids. Short length.'),
  createBraid('braid-lagos-jumbo-long', 'Lagos Jumbo – Long', 'Premium Lagos Jumbo braids. Long length.'),

  // Bonjour Curl
  createBraid('braid-bonjour-curl-short', 'Bonjour Curl – Short', 'Elegant Bonjour Curl braids. Short length.'),
  createBraid('braid-bonjour-curl-long', 'Bonjour Curl – Long', 'Elegant Bonjour Curl braids. Long length.'),

  // Bonsoir Curls
  createBraid('braid-bonsoir-curls-short', 'Bonsoir Curls – Short', 'Luxurious Bonsoir Curls. Short length.'),
  createBraid('braid-bonsoir-curls-long', 'Bonsoir Curls – Long', 'Luxurious Bonsoir Curls. Long length.'),

  // Princess Curl
  createBraid('braid-princess-curl-short', 'Princess Curl – Short', 'Beautiful Princess Curl braids. Short length.'),
  createBraid('braid-princess-curl-long', 'Princess Curl – Long', 'Beautiful Princess Curl braids. Long length.'),

  // Ponytail
  createBraid('braid-ponytail-short', 'Ponytail – Short', 'Stylish Ponytail extension. Short length.'),
  createBraid('braid-ponytail-long', 'Ponytail – Long', 'Stylish Ponytail extension. Long length.'),

  // Pony Curl
  createBraid('braid-pony-curl-short', 'Pony Curl – Short', 'Elegant Pony Curl braids. Short length.'),
  createBraid('braid-pony-curl-long', 'Pony Curl – Long', 'Elegant Pony Curl braids. Long length.'),

  // Pony Braid
  createBraid('braid-pony-braid-short', 'Pony Braid – Short', 'Classic Pony Braid. Short length.'),
  createBraid('braid-pony-braid-long', 'Pony Braid – Long', 'Classic Pony Braid. Long length.'),

  // Daisy
  createBraid('braid-daisy-short', 'Daisy – Short', 'Fresh Daisy braids. Short length.'),
  createBraid('braid-daisy-long', 'Daisy – Long', 'Fresh Daisy braids. Long length.'),

  // Konjo
  createBraid('braid-konjo-short', 'Konjo – Short', 'Premium Konjo braids. Short length.'),
  createBraid('braid-konjo-long', 'Konjo – Long', 'Premium Konjo braids. Long length.'),

  // Spanish Bulk
  createBraid('braid-spanish-bulk-short', 'Spanish Bulk – Short', 'Quality Spanish Bulk braids. Short length.'),
  createBraid('braid-spanish-bulk-long', 'Spanish Bulk – Long', 'Quality Spanish Bulk braids. Long length.'),

  // Spanish Long
  createBraid('braid-spanish-long-short', 'Spanish Long – Short', 'Elegant Spanish Long braids. Short length.'),
  createBraid('braid-spanish-long-long', 'Spanish Long – Long', 'Elegant Spanish Long braids. Long length.'),

  // Italian
  createBraid('braid-italian-short', 'Italian – Short', 'Premium Italian braids. Short length.'),
  createBraid('braid-italian-long', 'Italian – Long', 'Premium Italian braids. Long length.'),

  // Italiana French Curl (Darling)
  createBraid('braid-italiana-french-curl-short', 'Italiana French Curl (Darling) – Short', 'Luxurious Italiana French Curl by Darling. Short length.'),
  createBraid('braid-italiana-french-curl-long', 'Italiana French Curl (Darling) – Long', 'Luxurious Italiana French Curl by Darling. Long length.'),
];

// ============= OTHER PRODUCTS =============

const otherProducts: Product[] = [
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

// Combined products array
export const products: Product[] = [...braidProducts, ...otherProducts];

// Helper function to check if a product is a hair extension (braid)
export const isHairExtension = (product: Product): boolean => {
  return product.category === 'Hair Extensions';
};

// Get mutable categories for admin section management
export const getMutableCategories = () => [...categories];

// Add a new subcategory to Hair Extensions (for admin use)
export const addHairExtensionSubcategory = (subcategory: string): boolean => {
  const hairExtensions = categories.find(c => c.name === 'Hair Extensions');
  if (hairExtensions && !hairExtensions.subcategories.includes(subcategory)) {
    hairExtensions.subcategories.push(subcategory);
    return true;
  }
  return false;
};
