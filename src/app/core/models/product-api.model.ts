/** Raw API shapes — field names match the backend contract exactly (snake_case where documented). */

export interface ProductCardApi {
  id: number;
  name: string;
  brand: string;
  category_name: string;
  category_slug: string;
  release_date: string | null;
  image: string | null;
  source_url: string | null;
  specs: string;
  has_variants: boolean;
  price: number | null;
  is_recommended: boolean;
  /** Denormalized from product + variant specs (mobile/laptops list responses). */
  ram: string | null;
  storage: string | null;
}

export interface ProductCategoryApi {
  id: number;
  name: string;
  slug: string;
}

export interface VendorApi {
  id: number;
  name: string;
}

export interface VendorListingApi {
  id: number;
  price: number | null;
  url: string | null;
  vendor: VendorApi;
}

export interface ListableApi {
  id: number;
  vendor_listings: VendorListingApi[];
}

export interface VariantApi {
  id: number;
  specs: string;
  listables: ListableApi[];
}

export interface ProductDetailApi {
  id: number;
  name: string;
  brand: string;
  release_date: string | null;
  image: string | null;
  source_url: string | null;
  specs: string;
  has_variants: boolean;
  product_category: ProductCategoryApi;
  variants: VariantApi[];
  listables: ListableApi[];
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface FilterPayloadApi {
  brands: string[];
  min_price: number | null;
  max_price: number | null;
  specs: Record<string, string[]>;
}

export interface AiSummaryPayloadApi {
  summary_text: string;
}
