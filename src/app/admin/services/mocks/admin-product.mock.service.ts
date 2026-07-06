import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { PagedResponse } from '@app/core/models/product-api.model';
import {
  AdminProductListItemDto,
  CreateProductRequest,
  UpdateProductRequest,
} from '@app/admin/models/admin-product.model';

function toPagedResponse<T>(
  allItems: T[],
  page: number,
  size: number,
): PagedResponse<T> {
  const totalElements = allItems.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const start = page * size;

  return {
    content: allItems.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: totalPages === 0 || page >= totalPages - 1,
  };
}

const PRODUCTS: AdminProductListItemDto[] = [
  // ── The "Perfect" Product ──
  {
    id: 101,
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    categorySlug: 'mobile',
    categoryName: 'Mobile',
    image: 'https://placehold.co/400x400?text=iPhone+15+Pro',
    hasVariants: true,
    releaseDate: '2023-09-22',
    sourceUrl: 'https://www.apple.com/iphone-15-pro/',
    specs: JSON.stringify({
      RAM: '8GB',
      Storage: '256GB',
      Display: '6.1-inch Super Retina XDR',
      Processor: 'A17 Pro',
      Battery: '3274 mAh',
      Color: 'Natural Titanium',
      '5G Bands': 'Sub-6 GHz, mmWave',
      WaterResistance: 'IP68',
    }),
  },
  // ── The "Text Heavy" Product ──
  {
    id: 102,
    name: 'Samsung Galaxy S24 Ultra Enterprise Edition with S Pen, 5G Dual-SIM, International Unlocked Model for Academic Research Departments and Large-Scale Institutional Procurement Programs (2024 Refresh)',
    brand: 'Samsung Electronics Co., Ltd. — Mobile Communications Division, Enterprise & Education Solutions Group',
    categorySlug: 'mobile',
    categoryName: 'Mobile',
    image: 'https://placehold.co/400x400?text=Galaxy+S24+Ultra',
    hasVariants: true,
    releaseDate: '2024-01-17',
    sourceUrl: 'https://www.samsung.com/galaxy-s24-ultra/',
    specs: JSON.stringify({
      RAM: '12GB',
      Storage: '512GB',
      Display: '6.8-inch Dynamic AMOLED 2X',
      Processor: 'Snapdragon 8 Gen 3',
      Battery: '5000 mAh',
      'S Pen': 'Included',
      Color: 'Titanium Gray',
    }),
  },
  // ── The "Spec Monster" ──
  {
    id: 103,
    name: 'ASUS ROG Strix SCAR 18 G834',
    brand: 'ASUS',
    categorySlug: 'laptops',
    categoryName: 'Laptops',
    image: 'https://placehold.co/400x400?text=ROG+Strix+SCAR+18',
    hasVariants: true,
    releaseDate: '2024-02-15',
    sourceUrl: 'https://rog.asus.com/laptops/rog-strix-series/',
    specs: JSON.stringify({
      RAM: '64GB DDR5-5600 (2x32GB, dual-channel, upgradeable to 96GB)',
      Storage: '2TB PCIe 4.0 NVMe SSD (RAID 0 capable) + empty M.2 slot',
      Display:
        '18-inch ROG Nebula 16:10 QHD+ 240Hz Mini LED, 1100 nits peak, 100% DCI-P3, Dolby Vision, G-SYNC, Pantone Validated, 3ms response, anti-glare coating for classroom projector environments',
      Processor: 'Intel Core i9-14900HX (24 cores, 32 threads, up to 5.8 GHz)',
      GPU: 'NVIDIA GeForce RTX 4090 Laptop GPU 16GB GDDR6, 175W TGP with Dynamic Boost',
      Weight: '3.1 kg (6.83 lbs) — not ideal for carrying across campus all day',
      Color: 'Off Black with customizable RGB Aura Sync light bar',
      Ports: '["2x USB-A 3.2","2x USB-C Thunderbolt 4","HDMI 2.1","RJ-45 2.5G","3.5mm combo","DC-in"]',
      Wireless: 'Wi-Fi 6E (802.11ax), Bluetooth 5.3, no cellular modem',
      Keyboard: 'Per-key RGB, 1.7mm travel, numeric pad, Copilot key, 30-key rollover',
      Cooling: 'Tri-fan design, liquid metal on CPU, 7 heat pipes, dust filter removable',
      Audio: 'Dual 2W tweeters + dual 2W woofers, Smart Amp, Hi-Res, AI noise cancel mic array',
      Webcam: '1080p IR with Windows Hello, physical privacy shutter',
      Battery: '90Wh, 330W AC adapter, USB-C PD 100W passthrough charging supported',
      OS: 'Windows 11 Pro for Workstations',
      Warranty: '1-year international, optional 3-year on-site campus deployment package',
      BenchmarkNotes:
        'Cinebench R23 multi-core score ~38,000; ideal for ML inference demos, CAD lectures, and 4K video grading. Thermal throttling observed after 45 min sustained GPU load in fan-silent mode.',
      IncludedAccessories: 'ROG backpack, compact 280W travel adapter, premium HDMI 2.1 cable',
      SustainabilityRating: 'EPEAT Gold, 30% post-consumer recycled plastics in chassis',
      CampusDeploymentNotes:
        'Recommended for faculty engineering labs only; exceeds standard undergrad carry-weight guidelines issued by campus ergonomics office.',
    }),
  },
  // ── The "Incomplete" Product ──
  {
    id: 104,
    name: 'Unknown Budget Tablet',
    brand: 'Generic',
    categorySlug: 'tablet',
    categoryName: 'Tablets',
    image: null,
    hasVariants: false,
    releaseDate: null,
    sourceUrl: null,
    specs: JSON.stringify({
      RAM: '4GB',
      Storage: '64GB',
      Display: '10.1-inch IPS',
      OS: 'Android 12',
    }),
  },
  {
    id: 105,
    name: 'Google Pixel 8 Pro',
    brand: 'Google',
    categorySlug: 'mobile',
    categoryName: 'Mobile',
    image: 'https://placehold.co/400x400?text=Pixel+8+Pro',
    hasVariants: false,
    releaseDate: '2023-10-04',
    sourceUrl: 'https://store.google.com/pixel-8-pro',
    specs: JSON.stringify({
      RAM: '12GB',
      Storage: '128GB',
      Display: '6.7-inch LTPO OLED',
      Processor: 'Google Tensor G3',
      Battery: '5050 mAh',
      Color: 'Bay',
      'AI Features': 'Magic Eraser, Best Take, Audio Magic Eraser',
    }),
  },
  {
    id: 106,
    name: 'OnePlus 12',
    brand: 'OnePlus',
    categorySlug: 'mobile',
    categoryName: 'Mobile',
    image: 'https://placehold.co/400x400?text=OnePlus+12',
    hasVariants: true,
    releaseDate: '2024-01-23',
    sourceUrl: 'https://www.oneplus.com/12',
    specs: JSON.stringify({
      RAM: '16GB',
      Storage: '256GB',
      Display: '6.82-inch LTPO AMOLED 120Hz',
      Processor: 'Snapdragon 8 Gen 3',
      Battery: '5400 mAh',
      'Fast Charge': '100W wired, 50W wireless',
      Color: 'Flowy Emerald',
    }),
  },
  {
    id: 201,
    name: 'MacBook Pro 14"',
    brand: 'Apple',
    categorySlug: 'laptops',
    categoryName: 'Laptops',
    image: 'https://placehold.co/400x400?text=MacBook+Pro+14',
    hasVariants: true,
    releaseDate: '2023-10-30',
    sourceUrl: 'https://www.apple.com/macbook-pro-14/',
    specs: JSON.stringify({
      RAM: '16GB',
      Storage: '512GB SSD',
      Display: '14.2-inch Liquid Retina XDR',
      Processor: 'Apple M3 Pro',
      GPU: '18-core GPU',
      Weight: '1.55 kg',
      Color: 'Space Black',
    }),
  },
  {
    id: 202,
    name: 'Dell XPS 15 9530',
    brand: 'Dell',
    categorySlug: 'laptops',
    categoryName: 'Laptops',
    image: 'https://placehold.co/400x400?text=Dell+XPS+15',
    hasVariants: true,
    releaseDate: '2024-01-04',
    sourceUrl: 'https://www.dell.com/xps-15',
    specs: JSON.stringify({
      RAM: '32GB',
      Storage: '1TB SSD',
      Display: '15.6-inch OLED 3.5K',
      Processor: 'Intel Core i7-13700H',
      GPU: 'NVIDIA RTX 4050',
      Weight: '1.86 kg',
      Color: 'Platinum Silver',
    }),
  },
  {
    id: 203,
    name: 'Lenovo ThinkPad X1 Carbon Gen 11',
    brand: 'Lenovo',
    categorySlug: 'laptops',
    categoryName: 'Laptops',
    image: 'https://placehold.co/400x400?text=ThinkPad+X1',
    hasVariants: false,
    releaseDate: '2023-06-12',
    sourceUrl: 'https://www.lenovo.com/thinkpad-x1-carbon',
    specs: JSON.stringify({
      RAM: '16GB',
      Storage: '512GB SSD',
      Display: '14-inch WUXGA IPS',
      Processor: 'Intel Core i7-1355U',
      Weight: '1.12 kg',
      Color: 'Black',
      'MIL-STD': '810H certified',
    }),
  },
  {
    id: 301,
    name: 'iPad Pro 13" M4',
    brand: 'Apple',
    categorySlug: 'tablet',
    categoryName: 'Tablets',
    image: 'https://placehold.co/400x400?text=iPad+Pro+13',
    hasVariants: true,
    releaseDate: '2024-05-15',
    sourceUrl: 'https://www.apple.com/ipad-pro/',
    specs: JSON.stringify({
      RAM: '8GB',
      Storage: '256GB',
      Display: '13-inch Ultra Retina XDR Tandem OLED',
      Processor: 'Apple M4',
      Battery: 'Up to 10 hours',
      'Apple Pencil': 'Pro supported',
      Keyboard: 'Magic Keyboard compatible',
      Color: 'Space Black',
    }),
  },
  {
    id: 302,
    name: 'Samsung Galaxy Tab S9 Ultra',
    brand: 'Samsung',
    categorySlug: 'tablet',
    categoryName: 'Tablets',
    image: 'https://placehold.co/400x400?text=Tab+S9+Ultra',
    hasVariants: true,
    releaseDate: '2023-08-11',
    sourceUrl: 'https://www.samsung.com/galaxy-tab-s9-ultra/',
    specs: JSON.stringify({
      RAM: '12GB',
      Storage: '512GB',
      Display: '14.6-inch Dynamic AMOLED 2X 120Hz',
      Processor: 'Snapdragon 8 Gen 2',
      'S Pen': 'Included in box',
      Battery: '11200 mAh',
      DeX: 'Samsung DeX desktop mode supported',
      Color: 'Graphite',
    }),
  },
];

@Injectable({ providedIn: 'root' })
export class AdminProductMockService {
  private readonly products = [...PRODUCTS];

  listProducts(
    categorySlug: string,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<AdminProductListItemDto>> {
    const filtered = this.products.filter((p) => p.categorySlug === categorySlug);
    return of(toPagedResponse(filtered, page, size)).pipe(delay(300));
  }

  getProduct(id: number): Observable<AdminProductListItemDto> {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      return throwError(() => new Error(`Product with id ${id} not found.`)).pipe(delay(200));
    }
    return of({ ...product }).pipe(delay(200));
  }

  createProduct(body: CreateProductRequest): Observable<AdminProductListItemDto> {
    const categoryName =
      { mobile: 'Mobile', laptops: 'Laptops', tablet: 'Tablets' }[body.categorySlug] ??
      body.categorySlug;

    if (
      this.products.some(
        (product) => product.sourceUrl != null && product.sourceUrl === body.sourceUrl,
      )
    ) {
      return throwError(() => new Error('Product sourceUrl already exists')).pipe(delay(200));
    }

    try {
      JSON.parse(body.specs);
    } catch {
      return throwError(() => new Error('specs must be valid JSON')).pipe(delay(200));
    }

    const nextId = this.products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
    const created: AdminProductListItemDto = {
      id: nextId,
      name: body.name,
      brand: body.brand,
      categorySlug: body.categorySlug,
      categoryName,
      image: body.image ?? null,
      hasVariants: body.hasVariants,
      specs: body.specs,
      releaseDate: body.releaseDate ?? null,
      sourceUrl: body.sourceUrl,
    };

    this.products.push(created);
    return of({ ...created }).pipe(delay(400));
  }

  updateProduct(id: number, body: UpdateProductRequest): Observable<AdminProductListItemDto> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Product with id ${id} not found.`)).pipe(delay(200));
    }

    const existing = this.products[index];
    const updated: AdminProductListItemDto = {
      ...existing,
      name: body.name,
      brand: body.brand,
      releaseDate: body.releaseDate ?? null,
      image: body.image ?? null,
      sourceUrl: body.sourceUrl ?? null,
      hasVariants: body.hasVariants,
      specs: body.specs,
    };

    this.products[index] = updated;
    return of({ ...updated }).pipe(delay(400));
  }

  deleteProduct(id: number): Observable<void> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Product with id ${id} not found.`)).pipe(delay(200));
    }

    this.products.splice(index, 1);
    return of(void 0).pipe(delay(300));
  }
}
