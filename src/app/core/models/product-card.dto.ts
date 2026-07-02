export interface ProductCardDto {
  title: string;
  subtitle: string;
  price: string;
  priceValue?: number | null;
  rating: string;
  imageUrl: string;
  imageAlt: string;
  showMatchBadge: boolean;
  mainSpecs?: string[];
  /** Raw list API field — comma-joined variant RAM values (e.g. "8GB, 12GB"). */
  ram?: string | null;
  /** Raw list API field — comma-joined variant storage values (e.g. "128GB, 256GB"). */
  storage?: string | null;
}
