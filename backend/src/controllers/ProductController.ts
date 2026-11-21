import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { ComponentCategory, ProductQueryFilters } from '../types';
import { BaseController } from './BaseController';

export class ProductController extends BaseController {
  constructor(private readonly productService: ProductService) {
    super();
  }

  list = this.handle(async (req: Request, res: Response) => {
    const {
      category,
      brand,
      search,
      q,
      minPrice,
      maxPrice,
      inStock,
      soundSignature,
      pinType,
      plugType,
      sort,
    } = req.query as Record<string, string | undefined>;

    const searchTerm = search || q;

    const filters: ProductQueryFilters = {
      category: (category as ComponentCategory | 'ALL') || 'ALL',
      brand,
      search: searchTerm?.trim(),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock === 'true',
      soundSignature,
      pinType,
      plugType,
      sort: (sort as ProductQueryFilters['sort']) || 'featured',
    };

    const products = await this.productService.list(filters);
    res.json({
      products,
      total: products.length,
      filters: {
        category: filters.category,
        search: filters.search || '',
        sort: filters.sort,
      },
      source: 'mongodb',
    });
  });

  getById = this.handle(async (req: Request, res: Response) => {
    const product = await this.productService.getById(String(req.params.id));
    res.json({ product });
  });

  getPairings = this.handle(async (req: Request, res: Response) => {
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 3));
    const pairings = await this.productService.getPairings(
      String(req.params.id),
      limit
    );
    res.json({ pairings, total: pairings.length });
  });

  create = this.handle(async (req: Request, res: Response) => {
    const created = await this.productService.create(req.body);
    res.status(201).json({ product: created });
  });

  update = this.handle(async (req: Request, res: Response) => {
    const updated = await this.productService.update(
      String(req.params.id),
      req.body
    );
    res.json({ product: updated });
  });

  remove = this.handle(async (req: Request, res: Response) => {
    await this.productService.delete(String(req.params.id));
    res.json({ ok: true });
  });
}
