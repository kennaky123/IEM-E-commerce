import { IReviewRepository } from '../interfaces/repositories';
import { ReviewModel } from '../models/Review';
import {
  Review,
  ReviewQueryOptions,
  ReviewReply,
  ReviewSortOption,
  ReviewSummary,
} from '../types';
import { BaseMongoRepository } from './BaseMongoRepository';

const SORT_MAP: Record<ReviewSortOption, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

export class MongoReviewRepository
  extends BaseMongoRepository<Review>
  implements IReviewRepository
{
  async findByProduct(
    productId: string,
    options: ReviewQueryOptions = {}
  ): Promise<Review[]> {
    const filter: Record<string, unknown> = { productId };
    if (
      typeof options.rating === 'number' &&
      Number.isInteger(options.rating) &&
      options.rating >= 1 &&
      options.rating <= 5
    ) {
      filter.rating = options.rating;
    }

    const sortSpec = SORT_MAP[options.sort ?? 'newest'] ?? SORT_MAP.newest;
    const docs = await ReviewModel.find(filter).sort(sortSpec).lean();
    return this.stripDocs<Review>(docs);
  }

  async findById(id: string): Promise<Review | null> {
    const doc = await ReviewModel.findOne({ id }).lean();
    return this.stripDoc<Review>(doc);
  }

  async create(review: Review): Promise<Review> {
    await ReviewModel.create(review);
    return review;
  }

  async updateById(
    id: string,
    patch: Partial<Pick<Review, 'rating' | 'comment' | 'updatedAt'>>
  ): Promise<Review | null> {
    const doc = await ReviewModel.findOneAndUpdate(
      { id },
      { $set: patch },
      { new: true }
    ).lean();
    return this.stripDoc<Review>(doc);
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await ReviewModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async addReply(reviewId: string, reply: ReviewReply): Promise<Review | null> {
    const doc = await ReviewModel.findOneAndUpdate(
      { id: reviewId },
      {
        $push: { replies: reply },
        $set: { updatedAt: reply.createdAt },
      },
      { new: true }
    ).lean();
    return this.stripDoc<Review>(doc);
  }

  async removeReply(
    reviewId: string,
    replyId: string
  ): Promise<Review | null> {
    const doc = await ReviewModel.findOneAndUpdate(
      { id: reviewId },
      {
        $pull: { replies: { id: replyId } },
        $set: { updatedAt: new Date().toISOString() },
      },
      { new: true }
    ).lean();
    return this.stripDoc<Review>(doc);
  }

  async aggregateProductStats(productId: string): Promise<ReviewSummary> {
    const rows = await ReviewModel.aggregate<{ _id: number; count: number }>([
      { $match: { productId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalReviews = 0;
    let weightedSum = 0;

    for (const row of rows) {
      const star = row._id;
      if (star >= 1 && star <= 5) {
        const key = star as 1 | 2 | 3 | 4 | 5;
        distribution[key] = row.count;
        totalReviews += row.count;
        weightedSum += star * row.count;
      }
    }

    const averageRating =
      totalReviews > 0 ? Math.round((weightedSum / totalReviews) * 10) / 10 : 0;

    return {
      averageRating,
      totalReviews,
      distribution,
    };
  }

  async count(): Promise<number> {
    return ReviewModel.countDocuments();
  }
}
