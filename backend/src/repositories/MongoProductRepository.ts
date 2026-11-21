import {
  CategoryBreakdownItem,
  IProductRepository,
  LowStockProductSummary,
  ProductMatchingSummary,
} from '../interfaces/repositories';
import { ProductModel } from '../models/Product';
import { Product, ProductQueryFilters } from '../types';
import { BaseMongoRepository } from './BaseMongoRepository';

export class MongoProductRepository
  extends BaseMongoRepository<Product>
  implements IProductRepository
{
  async findAll(filters: ProductQueryFilters = {}): Promise<Product[]> {
    const query: Record<string, unknown> = {};
    const andClauses: Array<Record<string, unknown>> = [];

    if (filters.category && filters.category !== 'ALL') {
      query.category = filters.category;
    }

    if (filters.brand && filters.brand !== 'ALL') {
      query.brand = { $regex: new RegExp(this.escapeRegex(filters.brand), 'i') };
    }

    if (filters.search && filters.search.trim()) {
      const regex = new RegExp(this.escapeRegex(filters.search.trim()), 'i');
      andClauses.push({
        $or: [
          { name: { $regex: regex } },
          { sku: { $regex: regex } },
          { brand: { $regex: regex } },
          { summary: { $regex: regex } },
          { 'specs.driverConfig': { $regex: regex } },
          { 'specs.dacChip': { $regex: regex } },
          { 'specs.soundSignature': { $regex: regex } },
          { 'specs.pinType': { $regex: regex } },
          { 'specs.plugType': { $regex: regex } },
        ],
      });
    }

    if (filters.plugType && filters.plugType !== 'ALL') {
      andClauses.push({
        $or: [
          { 'specs.plugType': filters.plugType },
          { 'specs.supportedOutputs': filters.plugType },
        ],
      });
    }

    if (andClauses.length === 1) {
      Object.assign(query, andClauses[0]);
    } else if (andClauses.length > 1) {
      query.$and = andClauses;
    }

    if (
      (typeof filters.minPrice === 'number' && !Number.isNaN(filters.minPrice)) ||
      (typeof filters.maxPrice === 'number' && !Number.isNaN(filters.maxPrice))
    ) {
      const priceQuery: Record<string, number> = {};
      if (typeof filters.minPrice === 'number' && !Number.isNaN(filters.minPrice)) {
        priceQuery.$gte = filters.minPrice;
      }
      if (typeof filters.maxPrice === 'number' && !Number.isNaN(filters.maxPrice)) {
        priceQuery.$lte = filters.maxPrice;
      }
      query.price = priceQuery;
    }

    if (filters.inStock) {
      query.stock = { $gt: 0 };
    }

    if (filters.soundSignature && filters.soundSignature !== 'ALL') {
      query['specs.soundSignature'] = filters.soundSignature;
    }

    if (filters.pinType && filters.pinType !== 'ALL') {
      query['specs.pinType'] = filters.pinType;
    }

    const sortOption = this.buildSortOption(filters.sort);
    const docs = await ProductModel.find(query).sort(sortOption).lean();
    return this.stripDocs<Product>(docs);
  }

  private buildSortOption(
    sort?: ProductQueryFilters['sort']
  ): Record<string, 1 | -1> {
    switch (sort) {
      case 'price-asc':
        return { price: 1 };
      case 'price-desc':
        return { price: -1 };
      case 'score-desc':
        return { performanceScore: -1 };
      case 'rating-desc':
        return { rating: -1 };
      case 'featured':
      default:
        return { featured: -1, performanceScore: -1 };
    }
  }

  async findByIdOrSlug(id: string): Promise<Product | null> {
    const doc = await ProductModel.findOne({ $or: [{ id }, { slug: id }] }).lean();
    return this.stripDoc<Product>(doc);
  }

  async findByIds(ids: string[]): Promise<Map<string, Product>> {
    const map = new Map<string, Product>();
    if (ids.length === 0) return map;

    const docs = await ProductModel.find({ id: { $in: ids } }).lean();
    for (const product of this.stripDocs<Product>(docs)) {
      map.set(product.id, product);
    }
    return map;
  }

  async findMinimalForMatching(): Promise<ProductMatchingSummary[]> {
    const docs = await ProductModel.find(
      {},
      'id name slug sku price rating'
    ).lean();
    return this.stripDocs<ProductMatchingSummary>(docs);
  }

  async count(): Promise<number> {
    return ProductModel.countDocuments();
  }

  async aggregateCategoryBreakdown(): Promise<CategoryBreakdownItem[]> {
    const rows = await ProductModel.aggregate<{
      _id: string;
      count: number;
      stockValue: number;
    }>([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          stockValue: { $sum: { $multiply: ['$price', '$stock'] } },
        },
      },
    ]);

    return rows.map((row) => ({
      category: row._id,
      count: row.count,
      stockValue: row.stockValue,
    }));
  }

  async findLowStock(threshold: number): Promise<LowStockProductSummary[]> {
    const docs = await ProductModel.find(
      { stock: { $lte: threshold } },
      'id sku name category stock'
    )
      .sort({ stock: 1 })
      .lean();
    return this.stripDocs<LowStockProductSummary>(docs);
  }

  async create(product: Product): Promise<Product> {
    await ProductModel.create(product);
    return product;
  }

  async updateById(id: string, patch: Partial<Product>): Promise<Product | null> {
    const updated = await ProductModel.findOneAndUpdate(
      { id },
      { $set: patch },
      { new: true }
    ).lean();
    return this.stripDoc<Product>(updated);
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await ProductModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async deductStock(productId: string, quantity: number): Promise<boolean> {
    const updated = await ProductModel.findOneAndUpdate(
      { id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );
    return Boolean(updated);
  }

  async restoreStock(productId: string, quantity: number): Promise<void> {
    await ProductModel.updateOne(
      { id: productId },
      { $inc: { stock: quantity } }
    );
  }
}
