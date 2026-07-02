import type {
  ProductCardApi,
  ProductDetailApi,
  FilterPayloadApi,
  AiSummaryPayloadApi,
  VendorListingApi,
} from '@app/core/models/product-api.model';
import type {
  Product,
  ProductDetails,
  FilterMetadata,
  AiSummary,
  SpecGroup,
  VendorInfo,
} from '@app/core/services/product-listing.service';
import { formatEgpPrice, parsePriceAmount } from '@app/shared/utils/price.util';
import {
  buildPredictedFieldSet,
  isPredictedFlagKey,
  isSpecFieldPredicted,
} from '@app/shared/utils/spec-prediction.util';
import { extractMainProductSpecs } from '@app/shared/utils/product-card-specs.util';

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  phone: 'mobile',
  phones: 'mobile',
  laptop: 'laptops',
  chargers: 'chargers',
  charger: 'chargers',
  headsets: 'headsets',
  headphones: 'headsets',
  keyboards: 'keyboards',
  keyboard: 'keyboards',
  mice: 'mice',
  mouse: 'mice',
};

/** Maps legacy/UI category slugs to backend slugs at the service boundary. */
export function normalizeCategorySlug(slug: string): string {
  return CATEGORY_SLUG_ALIASES[slug] ?? slug;
}

const LIST_API_SPEC_CATEGORIES = new Set(['mobile', 'laptops']);

function formatListApiRamBadge(ram: string): string {
  const value = ram.split(',')[0]?.trim();
  if (!value) {
    return '';
  }
  return /\bRAM\b/i.test(value) ? value : `${value} RAM`;
}

function formatListApiStorageBadge(storage: string): string {
  return storage.split(',')[0]?.trim() ?? '';
}

/** Builds card badges from denormalized `ram` / `storage` on list/trending responses. */
function mainSpecsFromListApiFields(card: ProductCardApi): string[] | null {
  const category = normalizeCategorySlug(card.category_slug);
  if (!LIST_API_SPEC_CATEGORIES.has(category)) {
    return null;
  }

  const badges: string[] = [];

  if (card.ram?.trim()) {
    const ramBadge = formatListApiRamBadge(card.ram);
    if (ramBadge) {
      badges.push(ramBadge);
    }
  }

  if (card.storage?.trim()) {
    const storageBadge = formatListApiStorageBadge(card.storage);
    if (storageBadge) {
      badges.push(storageBadge);
    }
  }

  return badges.length > 0 ? badges.slice(0, 2) : null;
}

export function mapProductCardToProduct(card: ProductCardApi): Product {
  let specs: Record<string, unknown> = {};
  try {
    specs = card.specs ? JSON.parse(card.specs) : {};
  } catch {
    /* ignore malformed specs JSON */
  }

  let price = 'Check Price';
  let priceValue: number | null = null;

  if (card.price != null) {
    priceValue = parsePriceAmount(card.price);
    price = formatEgpPrice(card.price);
  } else if (typeof specs['price'] === 'number' || typeof specs['price'] === 'string') {
    priceValue = parsePriceAmount(specs['price'] as number | string);
    price = formatEgpPrice(specs['price'] as number | string);
  }

  const imageUrl =
    card.image ||
    (typeof specs['imageUrl'] === 'string' ? specs['imageUrl'] : null) ||
    (typeof specs['url_image'] === 'string' ? specs['url_image'] : null) ||
    'https://placehold.co/400x400?text=No+Image';

  const rating =
    (typeof specs['rating'] === 'string' || typeof specs['rating'] === 'number'
      ? String(specs['rating'])
      : null) ?? 'N/A';

  const apiMainSpecs = mainSpecsFromListApiFields(card);
  const mainSpecs =
    apiMainSpecs ??
    extractMainProductSpecs(specs, { categorySlug: card.category_slug });

  return {
    id: card.id,
    title: card.name || 'Unknown Product',
    subtitle: card.brand || card.category_name || '',
    type: card.category_slug,
    price,
    priceValue,
    rating,
    imageUrl,
    imageAlt: card.name || 'Product image',
    showMatchBadge: card.is_recommended,
    ram: card.ram ?? null,
    storage: card.storage ?? null,
    mainSpecs,
  };
}

export function mapProductCardsToProducts(cards: ProductCardApi[]): Product[] {
  return (cards ?? []).map(mapProductCardToProduct);
}

function collectVendorListings(detail: ProductDetailApi): VendorListingApi[] {
  const listings: VendorListingApi[] = [];

  for (const listable of detail.listables ?? []) {
    listings.push(...(listable.vendor_listings ?? []));
  }

  for (const variant of detail.variants ?? []) {
    for (const listable of variant.listables ?? []) {
      listings.push(...(listable.vendor_listings ?? []));
    }
  }

  return listings;
}

function sortVendorsByPrice(vendors: VendorInfo[]): VendorInfo[] {
  return [...vendors].sort((a, b) => {
    const aPrice = a.priceValue;
    const bPrice = b.priceValue;

    if (aPrice == null && bPrice == null) {
      return 0;
    }
    if (aPrice == null) {
      return 1;
    }
    if (bPrice == null) {
      return -1;
    }

    return aPrice - bPrice;
  });
}

function mapVendorListingsToVendorInfo(
  listings: VendorListingApi[],
  fallbackPrice: string,
): VendorInfo[] {
  if (!listings.length) {
    return [];
  }

  const vendors = listings.map((listing) => {
    const vendorName = listing.vendor?.name || 'Official Store';
    const priceValue = parsePriceAmount(listing.price);
    const price =
      priceValue != null ? formatEgpPrice(priceValue) : fallbackPrice;

    return {
      name: vendorName,
      letter: vendorName.charAt(0).toUpperCase(),
      price,
      priceValue,
      url: listing.url || '#',
      availability: 'In Stock',
    };
  });

  return sortVendorsByPrice(vendors);
}

function buildSpecGroups(parsed: Record<string, unknown>): SpecGroup[] {
  const groupsMap = new Map<string, SpecGroup>();
  const predictedFields = buildPredictedFieldSet(parsed);

  const getGroup = (name: string, icon: string): SpecGroup => {
    if (!groupsMap.has(name)) {
      groupsMap.set(name, { name, icon, items: [] });
    }
    return groupsMap.get(name)!;
  };

  const ignoreKeys = new Set(['url', 'source', 'price', 'id', 'name', 'brand']);

  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === '' || Array.isArray(value)) continue;
    if (ignoreKeys.has(key.toLowerCase())) continue;
    if (isPredictedFlagKey(key)) continue;

    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    let groupName = 'General';
    let icon = 'info';

    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('camera')) {
      groupName = 'Camera';
      icon = 'photo_camera';
    } else if (lowerKey.includes('battery')) {
      groupName = 'Battery';
      icon = 'battery_charging_full';
    } else if (lowerKey.includes('display') || lowerKey.includes('screen')) {
      groupName = 'Display';
      icon = 'smartphone';
    } else if (lowerKey.includes('os') || lowerKey.includes('processor')) {
      groupName = 'Platform';
      icon = 'memory';
    } else if (lowerKey.includes('width') || lowerKey.includes('height')) {
      groupName = 'Design';
      icon = 'straighten';
    } else if (lowerKey.includes('usb') || lowerKey.includes('sim')) {
      groupName = 'Connectivity';
      icon = 'wifi';
    }

    getGroup(groupName, icon).items.push({
      label,
      value: String(value),
      isEstimated: isSpecFieldPredicted(key, predictedFields),
    });
  }

  return Array.from(groupsMap.values());
}

export function mapProductDetailToProductDetails(detail: ProductDetailApi): ProductDetails {
  const cardLike: ProductCardApi = {
    id: detail.id,
    name: detail.name,
    brand: detail.brand,
    category_name: detail.product_category?.name ?? '',
    category_slug: detail.product_category?.slug ?? '',
    release_date: detail.release_date,
    image: detail.image,
    source_url: detail.source_url,
    specs: detail.specs,
    has_variants: detail.has_variants,
    price: null,
    is_recommended: false,
    ram: null,
    storage: null,
  };

  const baseProduct = mapProductCardToProduct(cardLike);

  let parsed: Record<string, unknown> = {};
  try {
    parsed = detail.specs ? JSON.parse(detail.specs) : {};
  } catch {
    /* ignore malformed specs JSON */
  }

  const variantSpecs = (detail.variants ?? []).map((variant) => variant.specs);
  baseProduct.mainSpecs = extractMainProductSpecs(parsed, {
    categorySlug: detail.product_category?.slug ?? cardLike.category_slug,
    variantSpecs,
  });

  const vendorListings = collectVendorListings(detail);
  let vendors = mapVendorListingsToVendorInfo(vendorListings, baseProduct.price);

  if (!vendors.length && (parsed['source'] || parsed['url'] || parsed['price'])) {
    const vendorName = String(parsed['source'] ?? 'Official Store');
    const priceValue = parsePriceAmount(parsed['price'] as number | string);
    vendors = [
      {
        name: vendorName,
        letter: vendorName.charAt(0).toUpperCase(),
        price: priceValue != null ? formatEgpPrice(priceValue) : baseProduct.price,
        priceValue,
        url: String(parsed['url'] ?? '#'),
        availability: 'In Stock',
      },
    ];
  }

  if (vendors.length && baseProduct.price === 'Check Price') {
    const lowest = vendorListings
      .map((l) => l.price)
      .filter((p): p is number => p != null)
      .sort((a, b) => a - b)[0];

    if (lowest != null) {
      baseProduct.priceValue = lowest;
      baseProduct.price = formatEgpPrice(lowest);
    }
  }

  return {
    ...baseProduct,
    reviews: 0,
    specGroups: buildSpecGroups(parsed),
    vendors,
  };
}

export function mapFilterPayloadToMetadata(payload: FilterPayloadApi): FilterMetadata {
  return {
    brands: payload.brands ?? [],
    minPrice: payload.min_price ?? 0,
    maxPrice: payload.max_price ?? 5000,
    specs: payload.specs ?? {},
  };
}

export function mapAiSummaryPayload(payload: AiSummaryPayloadApi): AiSummary {
  return {
    summaryText: payload.summary_text || 'AI summary unavailable.',
  };
}
