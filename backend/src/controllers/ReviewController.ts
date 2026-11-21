import { Response } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { AuthRequest } from '../middleware/AuthMiddleware';
import { ReviewService } from '../services/ReviewService';
import { ReviewSortOption } from '../types';
import { BaseController } from './BaseController';

const VALID_SORTS = new Set<ReviewSortOption>(['newest', 'highest', 'lowest']);

export class ReviewController extends BaseController {
  constructor(private readonly reviewService: ReviewService) {
    super();
  }

  listByProduct = this.handle(async (req, res: Response) => {
    const sortParam = String(req.query.sort ?? 'newest');
    const sort: ReviewSortOption = VALID_SORTS.has(sortParam as ReviewSortOption)
      ? (sortParam as ReviewSortOption)
      : 'newest';

    const rawRating = req.query.rating;
    const parsedRating =
      typeof rawRating === 'string' && rawRating.trim() !== ''
        ? Number.parseInt(rawRating, 10)
        : undefined;
    const rating =
      parsedRating !== undefined && Number.isInteger(parsedRating)
        ? parsedRating
        : undefined;

    const result = await this.reviewService.listByProduct(
      String(req.params.productId),
      { sort, rating }
    );
    res.json(result);
  });

  create = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }
    const body = req.body as { rating?: number; comment?: string };
    const result = await this.reviewService.createReview(
      String(req.params.productId),
      req.user,
      body
    );
    res.status(201).json(result);
  });

  update = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }
    const body = req.body as { rating?: number; comment?: string };
    const result = await this.reviewService.updateReview(
      String(req.params.id),
      req.user,
      body
    );
    res.json(result);
  });

  remove = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }
    const result = await this.reviewService.deleteReview(
      String(req.params.id),
      req.user
    );
    res.json(result);
  });

  addReply = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }
    const { content } = req.body as { content?: string };
    const result = await this.reviewService.addReply(
      String(req.params.id),
      req.user,
      content
    );
    res.status(201).json(result);
  });

  removeReply = this.handle<AuthRequest>(async (req, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }
    const result = await this.reviewService.deleteReply(
      String(req.params.id),
      String(req.params.replyId),
      req.user
    );
    res.json(result);
  });
}
