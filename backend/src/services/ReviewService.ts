import crypto from 'node:crypto';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../errors/AppError';
import {
  IOrderRepository,
  IProductRepository,
  IReviewRepository,
} from '../interfaces/repositories';
import {
  Review,
  ReviewQueryOptions,
  ReviewReply,
  ReviewSummary,
  SafeUser,
} from '../types';

export class ReviewService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly productRepo: IProductRepository,
    private readonly orderRepo: IOrderRepository
  ) {}

  private validateRating(rating: unknown): number {
    if (
      typeof rating !== 'number' ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      throw new BadRequestError('Rating must be an integer between 1 and 5.');
    }
    return rating;
  }

  private validateText(
    text: unknown,
    fieldName: string,
    min: number,
    max: number
  ): string {
    if (typeof text !== 'string') {
      throw new BadRequestError(`${fieldName} must be a text string.`);
    }
    const trimmed = text.trim();
    if (trimmed.length < min || trimmed.length > max) {
      throw new BadRequestError(
        `${fieldName} must be between ${min} and ${max} characters.`
      );
    }
    return trimmed;
  }

  private async syncProductRating(productId: string): Promise<ReviewSummary> {
    const summary = await this.reviewRepo.aggregateProductStats(productId);
    await this.productRepo.updateById(productId, {
      rating: summary.totalReviews > 0 ? summary.averageRating : 0,
      reviewCount: summary.totalReviews,
    });
    return summary;
  }

  async listByProduct(
    productIdOrSlug: string,
    options: ReviewQueryOptions = {}
  ): Promise<{
    productId: string;
    reviews: Review[];
    summary: ReviewSummary;
  }> {
    const product = await this.productRepo.findByIdOrSlug(productIdOrSlug);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const [reviews, summary] = await Promise.all([
      this.reviewRepo.findByProduct(product.id, options),
      this.reviewRepo.aggregateProductStats(product.id),
    ]);

    return { productId: product.id, reviews, summary };
  }

  async createReview(
    productIdOrSlug: string,
    user: SafeUser,
    input: { rating?: number; comment?: string }
  ): Promise<{ review: Review; summary: ReviewSummary }> {
    const product = await this.productRepo.findByIdOrSlug(productIdOrSlug);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const rating = this.validateRating(input.rating);
    const comment = this.validateText(input.comment, 'Comment', 2, 2000);
    const verifiedPurchase = await this.orderRepo.hasUserPurchasedProduct(
      user.id,
      user.email,
      product.id
    );

    const now = new Date().toISOString();
    const review: Review = {
      id: `rev-${crypto.randomUUID().slice(0, 12)}`,
      productId: product.id,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      rating,
      comment,
      verifiedPurchase,
      replies: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.reviewRepo.create(review);
    const summary = await this.syncProductRating(product.id);

    return { review, summary };
  }

  async updateReview(
    reviewId: string,
    user: SafeUser,
    input: { rating?: number; comment?: string }
  ): Promise<{ review: Review; summary: ReviewSummary }> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) {
      throw new NotFoundError('Review not found.');
    }

    if (existing.userId !== user.id) {
      throw new ForbiddenError('You can only edit your own review.');
    }

    const patch: Partial<Pick<Review, 'rating' | 'comment' | 'updatedAt'>> = {};
    if (input.rating !== undefined) {
      patch.rating = this.validateRating(input.rating);
    }
    if (input.comment !== undefined) {
      patch.comment = this.validateText(input.comment, 'Comment', 2, 2000);
    }

    if (patch.rating === undefined && patch.comment === undefined) {
      throw new BadRequestError('Nothing to update.');
    }

    patch.updatedAt = new Date().toISOString();

    const updated = await this.reviewRepo.updateById(reviewId, patch);
    if (!updated) {
      throw new NotFoundError('Review not found.');
    }

    const summary = await this.syncProductRating(existing.productId);
    return { review: updated, summary };
  }

  async deleteReview(
    reviewId: string,
    user: SafeUser
  ): Promise<{ ok: true; summary: ReviewSummary }> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) {
      throw new NotFoundError('Review not found.');
    }

    if (existing.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Not authorized to delete this review.');
    }

    await this.reviewRepo.deleteById(reviewId);
    const summary = await this.syncProductRating(existing.productId);
    return { ok: true, summary };
  }

  async addReply(
    reviewId: string,
    user: SafeUser,
    content?: string
  ): Promise<{ review: Review; reply: ReviewReply }> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) {
      throw new NotFoundError('Review not found.');
    }

    const validatedContent = this.validateText(content, 'Reply', 2, 1000);
    const reply: ReviewReply = {
      id: `rep-${crypto.randomUUID().slice(0, 12)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      content: validatedContent,
      createdAt: new Date().toISOString(),
    };

    const updated = await this.reviewRepo.addReply(reviewId, reply);
    if (!updated) {
      throw new NotFoundError('Review not found.');
    }

    return { review: updated, reply };
  }

  async deleteReply(
    reviewId: string,
    replyId: string,
    user: SafeUser
  ): Promise<{ review: Review }> {
    const existing = await this.reviewRepo.findById(reviewId);
    if (!existing) {
      throw new NotFoundError('Review not found.');
    }

    const target = existing.replies.find((r) => r.id === replyId);
    if (!target) {
      throw new NotFoundError('Reply not found.');
    }

    if (target.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Not authorized to delete this reply.');
    }

    const updated = await this.reviewRepo.removeReply(reviewId, replyId);
    if (!updated) {
      throw new NotFoundError('Review not found.');
    }

    return { review: updated };
  }
}
