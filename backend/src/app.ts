import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { AppContainer } from './container';
import { AppError } from './errors/AppError';
import { createAuthRouter } from './routes/authRoutes';
import { createBuildRouter } from './routes/buildRoutes';
import { createCouponRouter } from './routes/couponRoutes';
import { createMediaRouter } from './routes/mediaRoutes';
import { createOrderRouter } from './routes/orderRoutes';
import { createPaymentRouter } from './routes/paymentRoutes';
import { createProductRouter } from './routes/productRoutes';
import { createReviewRouter } from './routes/reviewRoutes';
import { createStatsRouter } from './routes/statsRoutes';

export function createApp(container: AppContainer) {
  const app = express();

  app.use(
    cors({
      origin: container.config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  // Serve static images directly so both storefront and admin portals can load assets
  const imageDirs = [
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'images'),
    path.resolve(process.cwd(), 'frontend', 'public', 'images'),
  ];
  for (const imgDir of imageDirs) {
    if (fs.existsSync(imgDir)) {
      app.use('/images', express.static(imgDir));
      break;
    }
  }

  app.get('/api/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const productCount = await container.productService.count();
      res.json({
        status: 'ok',
        service: 'MOONDROP // SUPERLATIVE ACOUSTIC API',
        dbMode: container.databaseManager.getMode(),
        productCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/auth', createAuthRouter(container.authController, container.authMiddleware));
  app.use('/api/products', createProductRouter(container.productController, container.authMiddleware));
  app.use('/api/builds', createBuildRouter(container.buildController));
  app.use('/api/orders', createOrderRouter(container.orderController, container.authMiddleware));
  app.use('/api/payment', createPaymentRouter(container.paymentController, container.authMiddleware));
  app.use('/api/coupons', createCouponRouter(container.couponController));
  app.use('/api/reviews', createReviewRouter(container.reviewController, container.authMiddleware));
  app.use('/api/stats', createStatsRouter(container.statsController, container.authMiddleware));
  app.use('/api/media', createMediaRouter(container.mediaController, container.authMiddleware));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }
    console.error('[API Error]', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  });

  return app;
}
