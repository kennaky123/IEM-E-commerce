import crypto from 'node:crypto';
import { AppConfig } from '../config/AppConfig';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { IProductRepository } from '../interfaces/repositories';
import { ICompatibilityService } from '../interfaces/services';
import { ComponentCategory, Product, ProductQueryFilters } from '../types';

export interface CreateProductInput {
  sku: string;
  name: string;
  brand?: string;
  category: ComponentCategory;
  price: number;
  originalPrice?: number;
  stock?: number;
  performanceScore?: number;
  image: string;
  gallery?: string[];
  summary?: string;
  longDescription?: string;
  highlights?: string[];
  specs?: Product['specs'];
  featured?: boolean;
}

export class ProductService {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly compatibilityService: ICompatibilityService,
    private readonly config: AppConfig
  ) {}

  async list(filters: ProductQueryFilters = {}): Promise<Product[]> {
    return this.productRepo.findAll(filters);
  }

  async count(): Promise<number> {
    return this.productRepo.count();
  }

  async getById(id: string): Promise<Product> {
    const product = await this.productRepo.findByIdOrSlug(id);
    if (!product) {
      throw new NotFoundError('Audio hardware component not found.');
    }
    return product;
  }

  async getPairings(id: string, limit = 3): Promise<Product[]> {
    const target = await this.getById(id);
    const catalog = await this.productRepo.findAll({ inStock: true });
    return this.compatibilityService.findCompatiblePairings(
      target,
      catalog,
      limit
    );
  }

  async create(input: CreateProductInput): Promise<Product> {
    if (
      !input?.name?.trim() ||
      !input?.sku?.trim() ||
      !input?.category ||
      typeof input?.price !== 'number' ||
      !input?.image?.trim()
    ) {
      throw new BadRequestError(
        'Required fields: name, sku, category, image, and numeric price.'
      );
    }

    const name = input.name.trim();
    const slugBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = crypto.randomBytes(2).toString('hex');
    const id = `${input.category.toLowerCase()}-${slugBase.slice(0, 24)}-${suffix}`;

    const product: Product = {
      id,
      sku: input.sku.trim(),
      name,
      slug: `${slugBase}-${suffix}`,
      brand: (input.brand || this.config.defaultBrand).trim(),
      category: input.category,
      price: Number(input.price),
      originalPrice: input.originalPrice
        ? Number(input.originalPrice)
        : undefined,
      stock: Number(input.stock ?? 10),
      performanceScore: Number(input.performanceScore ?? 88),
      image: input.image.trim(),
      gallery: Array.isArray(input.gallery) ? input.gallery : [],
      summary: (input.summary || '').trim(),
      longDescription: input.longDescription
        ? input.longDescription.trim()
        : undefined,
      highlights: Array.isArray(input.highlights) ? input.highlights : [],
      specs:
        input.specs && typeof input.specs === 'object' ? input.specs : {},
      featured: Boolean(input.featured),
      rating: 4.9,
      reviewCount: 1,
      createdAt: new Date().toISOString(),
    };

    return this.productRepo.create(product);
  }

  async update(id: string, patch: Partial<Product>): Promise<Product> {
    const updated = await this.productRepo.updateById(id, patch);
    if (!updated) {
      throw new NotFoundError('Product not found.');
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const ok = await this.productRepo.deleteById(id);
    if (!ok) {
      throw new NotFoundError('Product not found.');
    }
  }
}
