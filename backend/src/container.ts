import { AppConfig } from './config/AppConfig';
import { DatabaseManager } from './config/DatabaseManager';
import { AuthController } from './controllers/AuthController';
import { BuildController } from './controllers/BuildController';
import { CouponController } from './controllers/CouponController';
import { MediaController } from './controllers/MediaController';
import { OrderController } from './controllers/OrderController';
import { PaymentController } from './controllers/PaymentController';
import { ProductController } from './controllers/ProductController';
import { ReviewController } from './controllers/ReviewController';
import { StatsController } from './controllers/StatsController';
import { AuthMiddleware } from './middleware/AuthMiddleware';
import { MongoCouponRepository } from './repositories/MongoCouponRepository';
import { MongoOrderRepository } from './repositories/MongoOrderRepository';
import { MongoPresetRepository } from './repositories/MongoPresetRepository';
import { MongoProductRepository } from './repositories/MongoProductRepository';
import { MongoReviewRepository } from './repositories/MongoReviewRepository';
import { MongoUserRepository } from './repositories/MongoUserRepository';
import { AuthService } from './services/AuthService';
import { BuildService } from './services/BuildService';
import { CompatibilityService } from './services/compatibility/CompatibilityService';
import { MediaService } from './services/MediaService';
import { OrderService } from './services/OrderService';
import { VnpayService } from './services/payment/VnpayService';
import {
  FixedAmountDiscountStrategy,
  PercentageDiscountStrategy,
} from './services/pricing/DiscountStrategy';
import { PricingService } from './services/pricing/PricingService';
import { ProductService } from './services/ProductService';
import { ReviewService } from './services/ReviewService';
import { BcryptPasswordHasher } from './services/security/BcryptPasswordHasher';
import { GoogleOAuthService } from './services/security/GoogleOAuthService';
import { JwtTokenService } from './services/security/JwtTokenService';
import { StatsService } from './services/StatsService';

export class AppContainer {
  readonly config: AppConfig;
  readonly databaseManager: DatabaseManager;

  // Repositories
  readonly productRepository: MongoProductRepository;
  readonly userRepository: MongoUserRepository;
  readonly orderRepository: MongoOrderRepository;
  readonly presetRepository: MongoPresetRepository;
  readonly couponRepository: MongoCouponRepository;
  readonly reviewRepository: MongoReviewRepository;

  // Services
  readonly tokenService: JwtTokenService;
  readonly googleOAuthService: GoogleOAuthService;
  readonly vnpayService: VnpayService;
  readonly passwordHasher: BcryptPasswordHasher;
  readonly pricingService: PricingService;
  readonly compatibilityService: CompatibilityService;
  readonly productService: ProductService;
  readonly authService: AuthService;
  readonly orderService: OrderService;
  readonly buildService: BuildService;
  readonly reviewService: ReviewService;
  readonly statsService: StatsService;
  readonly mediaService: MediaService;

  // Middleware
  readonly authMiddleware: AuthMiddleware;

  // Controllers
  readonly authController: AuthController;
  readonly productController: ProductController;
  readonly orderController: OrderController;
  readonly paymentController: PaymentController;
  readonly buildController: BuildController;
  readonly couponController: CouponController;
  readonly reviewController: ReviewController;
  readonly statsController: StatsController;
  readonly mediaController: MediaController;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.config = new AppConfig(env);
    this.databaseManager = new DatabaseManager();

    // Wire Repositories
    this.productRepository = new MongoProductRepository();
    this.userRepository = new MongoUserRepository();
    this.orderRepository = new MongoOrderRepository();
    this.presetRepository = new MongoPresetRepository();
    this.couponRepository = new MongoCouponRepository();
    this.reviewRepository = new MongoReviewRepository();

    // Wire Security & Domain Engines
    this.tokenService = new JwtTokenService(this.config);
    this.googleOAuthService = new GoogleOAuthService(this.config);
    this.vnpayService = new VnpayService(this.config);
    this.passwordHasher = new BcryptPasswordHasher();
    this.pricingService = new PricingService(
      this.couponRepository,
      [new PercentageDiscountStrategy(), new FixedAmountDiscountStrategy()],
      this.config
    );
    this.compatibilityService = new CompatibilityService();

    // Wire Application Services
    this.productService = new ProductService(
      this.productRepository,
      this.compatibilityService,
      this.config
    );
    this.authService = new AuthService(
      this.userRepository,
      this.passwordHasher,
      this.tokenService,
      this.googleOAuthService
    );
    this.orderService = new OrderService(
      this.orderRepository,
      this.productRepository,
      this.pricingService
    );
    this.buildService = new BuildService(
      this.productRepository,
      this.presetRepository,
      this.compatibilityService
    );
    this.reviewService = new ReviewService(
      this.reviewRepository,
      this.productRepository,
      this.orderRepository
    );
    this.statsService = new StatsService(
      this.productRepository,
      this.orderRepository,
      this.config
    );
    this.mediaService = new MediaService(this.productRepository);

    // Wire Middleware & Controllers
    this.authMiddleware = new AuthMiddleware(this.tokenService);
    this.authController = new AuthController(this.authService, this.config);
    this.productController = new ProductController(this.productService);
    this.orderController = new OrderController(this.orderService);
    this.paymentController = new PaymentController(
      this.vnpayService,
      this.orderService,
      this.config
    );
    this.buildController = new BuildController(this.buildService);
    this.couponController = new CouponController(this.pricingService);
    this.reviewController = new ReviewController(this.reviewService);
    this.statsController = new StatsController(this.statsService);
    this.mediaController = new MediaController(this.mediaService);
  }

  async init(): Promise<void> {
    await this.databaseManager.connect(this.config.mongoUri);
    await this.couponRepository.ensureInitialCoupons();
    await this.databaseManager.verifyCollections();
  }

  async shutdown(): Promise<void> {
    await this.databaseManager.disconnect();
  }
}
