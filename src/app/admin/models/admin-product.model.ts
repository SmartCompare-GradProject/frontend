export interface AdminProductListItemDto {
  id: number;
  name: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  image: string | null;
  hasVariants: boolean;
  specs: string;
  releaseDate: string | null;
  sourceUrl: string | null;
}

export interface UpdateProductRequest {
  name: string;
  brand: string;
  categorySlug: string;
  releaseDate?: string | null;
  image?: string | null;
  sourceUrl?: string | null;
  hasVariants: boolean;
  specs: string;
}

/** Matches backend AdminCreateProductRequest */
export interface CreateProductRequest {
  name: string;
  brand: string;
  categorySlug: string;
  releaseDate?: string | null;
  image?: string | null;
  sourceUrl: string;
  hasVariants: boolean;
  specs: string;
}

export interface DynamicFieldEntry {
  key: string;
  value: string;
  isNew?: boolean;
  markedForRemoval?: boolean;
}
