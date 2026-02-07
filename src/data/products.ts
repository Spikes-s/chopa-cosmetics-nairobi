// This file is deprecated - products are now stored in the database
// Keep only utility functions and type definitions

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
  colors?: { name: string; hex: string }[];
  inStock: boolean;
  stockQuantity?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: string[];
}

// DEPRECATED: Categories are now loaded from database
// This is kept for backwards compatibility with any code still referencing it
export const categories: Category[] = [];

// DEPRECATED: Products are now loaded from database
// This is kept for backwards compatibility with any code still referencing it
export const products: Product[] = [];

// Helper function to check if a product is a hair extension (braid)
export const isHairExtension = (product: { category: string }): boolean => {
  return product.category === 'Hair Extensions';
};
