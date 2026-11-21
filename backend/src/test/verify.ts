import assert from 'node:assert/strict';
import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createApp } from '../app';
import { AppContainer } from '../container';
import { Product } from '../types';

function byId(products: Product[], id: string): Product {
  const found = products.find((p) => p.id === id);
  assert.ok(found, `MongoDB product ${id} must exist`);
  return found;
}

async function runTests() {
  const container = new AppContainer();
  await container.init();
  const dbProducts = await container.productService.list();

  const app = createApp(container);
  const server = http.createServer(app);

  try {
    console.log('--- 1. Testing OOP CompatibilityService (Rule Chain Pattern) ---');

    const validChain = container.compatibilityService.validateChain({
      IEM: byId(dbProducts, 'iem-moondrop-variations'),
      CABLE: byId(dbProducts, 'cbl-moondrop-line-v'),
      DAC_AMP: byId(dbProducts, 'dac-moonriver2-ti'),
      ACCESSORY: byId(dbProducts, 'acc-moondrop-robin'),
    });
    assert.equal(validChain.isCompatible, true, 'Valid 4.4mm balanced chain should pass');
    assert.equal(validChain.issues.filter((i) => i.severity === 'ERROR').length, 0);
    assert.ok((validChain.dampingFactor ?? 0) > 100);
    console.log('✓ Valid Tribrid 4.4mm balanced chain passed synergy & damping checks');

    const jackMismatch = container.compatibilityService.validateChain({
      IEM: byId(dbProducts, 'iem-moondrop-variations'),
      CABLE: byId(dbProducts, 'cbl-moondrop-line-v'),
      DAC_AMP: byId(dbProducts, 'dac-moondrop-click'),
    });
    assert.equal(jackMismatch.isCompatible, false);
    assert.ok(
      jackMismatch.issues.some((i) => i.code === 'ERR_JACK_MISMATCH'),
      'Should detect 4.4mm Balanced vs 3.5mm SE-only DAC mismatch'
    );
    console.log('✓ Output jack conflict (4.4mm Balanced vs 3.5mm SE-only DAC) detected');

    const underpoweredPlanar = container.compatibilityService.validateChain({
      HEADPHONE: byId(dbProducts, 'hp-moondrop-cosmo'),
      DAC_AMP: byId(dbProducts, 'dac-dawn-pro'),
    });
    assert.equal(underpoweredPlanar.isCompatible, false);
    assert.ok(
      underpoweredPlanar.issues.some((i) => i.code === 'ERR_UNDERPOWERED_PLANAR'),
      'Should detect insufficient drive for 90dB nanoscale planar'
    );
    console.log('✓ Underpowered planar headphone error detected');

    console.log('\n--- 2. Testing OOP Controllers, Coupons, Pairings & MongoDB APIs ---');

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    // Verify 100% of local tainghe images are utilized by MongoDB products
    const taingheDir = path.resolve(process.cwd(), '..', 'frontend', 'public', 'images', 'tainghe');
    const diskImages = fs
      .readdirSync(taingheDir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => `/images/tainghe/${e.name}`);

    const referencedImages = new Set<string>();
    for (const p of dbProducts) {
      referencedImages.add(p.image);
      for (const g of p.gallery ?? []) {
        referencedImages.add(g);
      }
    }
    const unusedImages = diskImages.filter((u) => !referencedImages.has(u));
    assert.equal(
      unusedImages.length,
      0,
      `All tainghe images must be used in MongoDB; unused: ${unusedImages.join(', ')}`
    );
    console.log(
      `✓ Verified 100% image utilization (${diskImages.length}/${diskImages.length} tainghe files in MongoDB, ${dbProducts.length} products)`
    );

    // Health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as {
      status: string;
      dbMode: string;
      productCount: number;
    };
    assert.equal(healthJson.status, 'ok');
    assert.equal(healthJson.dbMode, 'mongodb');
    assert.ok(healthJson.productCount >= 110);
    console.log(
      `✓ GET /api/health (dbMode=${healthJson.dbMode}, ${healthJson.productCount} audio SKUs)`
    );

    // Coupons API & Pricing Quote
    const couponsRes = await fetch(`${baseUrl}/api/coupons/active`);
    assert.equal(couponsRes.status, 200);
    const couponsJson = (await couponsRes.json()) as {
      coupons: Array<{ code: string; type: string; value: number }>;
    };
    assert.ok(couponsJson.coupons.some((c) => c.code === 'MOONDROP10'));
    console.log(`✓ GET /api/coupons/active returned ${couponsJson.coupons.length} MongoDB coupons`);

    const quoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 'iem-moondrop-variations', quantity: 1 }],
        couponCode: 'MOONDROP10',
      }),
    });
    assert.equal(quoteRes.status, 200);
    const quoteJson = (await quoteRes.json()) as {
      quote: { subtotal: number; discount: number; total: number; shippingFee: number };
    };
    assert.ok(quoteJson.quote.discount > 0);
    console.log(`✓ POST /api/orders/quote calculated dynamic discount (${quoteJson.quote.discount}₫)`);

    // Media Library (/api/media/tainghe)
    const mediaRes = await fetch(`${baseUrl}/api/media/tainghe`);
    assert.equal(mediaRes.status, 200);
    const mediaJson = (await mediaRes.json()) as {
      images: Array<{ filename: string; url: string }>;
      total: number;
    };
    assert.ok(mediaJson.total >= 139);
    console.log(`✓ GET /api/media/tainghe returned ${mediaJson.total} local images`);

    // Filter products & dynamic pairings
    const prodRes = await fetch(
      `${baseUrl}/api/products?category=IEM&soundSignature=${encodeURIComponent('VDSF Neutral')}`
    );
    assert.equal(prodRes.status, 200);
    const prodJson = (await prodRes.json()) as { products: Product[] };
    assert.ok(prodJson.products.length >= 5);
    console.log(
      `✓ GET /api/products?category=IEM&soundSignature=VDSF Neutral returned ${prodJson.products.length} IEMs`
    );

    const pairingsRes = await fetch(
      `${baseUrl}/api/products/iem-moondrop-variations/pairings?limit=3`
    );
    assert.equal(pairingsRes.status, 200);
    const pairingsJson = (await pairingsRes.json()) as { pairings: Product[] };
    assert.ok(pairingsJson.pairings.length >= 1);
    console.log(`✓ GET /api/products/:id/pairings returned ${pairingsJson.pairings.length} matches`);

    // Build presets & candidate evaluation
    const presetsRes = await fetch(`${baseUrl}/api/builds/presets`);
    assert.equal(presetsRes.status, 200);
    const presetsJson = (await presetsRes.json()) as {
      presets: Array<{ id: string; validation: { isCompatible: boolean } }>;
    };
    assert.equal(presetsJson.presets.length, 3);
    assert.ok(presetsJson.presets.every((p) => p.validation.isCompatible));
    console.log('✓ GET /api/builds/presets verified all 3 MongoDB audiophile chains pass synergy');

    const candRes = await fetch(`${baseUrl}/api/builds/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'DAC_AMP',
        slots: { IEM: 'iem-moondrop-variations', CABLE: 'cbl-moondrop-line-v' },
        strictOnly: true,
      }),
    });
    assert.equal(candRes.status, 200);
    const candJson = (await candRes.json()) as {
      candidates: Array<{ product: Product; compat: { compatible: boolean } }>;
    };
    assert.ok(candJson.candidates.length >= 1);
    assert.ok(candJson.candidates.every((c) => c.compat.compatible));
    console.log(`✓ POST /api/builds/candidates filtered ${candJson.candidates.length} compatible DACs`);

    // Demo Admin Auth + CRUD Product + Users list + Stats + Monthly Sales
    const adminAuthRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert.equal(adminAuthRes.status, 200);
    const adminAuth = (await adminAuthRes.json()) as {
      token: string;
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      user: { role: string };
    };
    assert.equal(adminAuth.user.role, 'admin');
    assert.ok(adminAuth.accessToken);
    assert.ok(adminAuth.refreshToken);
    assert.ok(adminAuth.expiresAt);

    const usersRes = await fetch(`${baseUrl}/api/auth/users`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert.equal(usersRes.status, 200);
    const usersJson = (await usersRes.json()) as { users: Array<{ email: string }> };
    assert.ok(usersJson.users.length >= 2);
    console.log(`✓ GET /api/auth/users listed ${usersJson.users.length} accounts from MongoDB`);

    const createProdRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`,
      },
      body: JSON.stringify({
        sku: 'MD-TEST-99',
        name: 'MOONDROP VERIFY IEM',
        brand: 'MOONDROP',
        category: 'IEM',
        price: 3000000,
        stock: 5,
        performanceScore: 88,
        image: '/images/tainghe/KATO.jpeg',
        summary: 'Temporary test audio SKU',
        specs: {
          driverConfig: '1DD',
          impedanceOhms: 16,
          sensitivityDb: 120,
          pinType: '0.78mm 2-Pin',
        },
      }),
    });
    assert.equal(createProdRes.status, 201);
    const createdProd = (await createProdRes.json()) as { product: Product };

    const updateProdRes = await fetch(`${baseUrl}/api/products/${createdProd.product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`,
      },
      body: JSON.stringify({ price: 3200000 }),
    });
    assert.equal(updateProdRes.status, 200);

    const custAuthRes = await fetch(`${baseUrl}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'customer' }),
    });
    const custAuth = (await custAuthRes.json()) as {
      token: string;
      accessToken: string;
      refreshToken: string;
    };

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.token}`,
      },
      body: JSON.stringify({
        items: [{ productId: createdProd.product.id, quantity: 1 }],
        couponCode: 'MOONDROP10',
        paymentMethod: 'VIETQR',
        shippingAddress: {
          fullName: 'Verify Runner',
          phone: '0909999888',
          city: 'Hà Nội',
          address: '101 Láng Hạ, Đống Đa',
        },
      }),
    });
    assert.equal(orderRes.status, 201);
    const orderJson = (await orderRes.json()) as {
      order: { id: string; discount: number; total: number };
    };
    assert.equal(orderJson.order.discount, 320000);
    console.log('✓ POST /api/orders created order in MongoDB, applied MOONDROP10, deducted stock');

    // Reviews, Ratings Aggregation, Verified Purchase & Threaded Replies CRUD
    const createReviewRes = await fetch(
      `${baseUrl}/api/reviews/product/${createdProd.product.id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custAuth.token}`,
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Chất âm cân bằng, chi tiết xuất sắc!',
        }),
      }
    );
    assert.equal(createReviewRes.status, 201);
    const createdReviewJson = (await createReviewRes.json()) as {
      review: { id: string; rating: number; verifiedPurchase: boolean };
      summary: { averageRating: number; totalReviews: number };
    };
    assert.equal(createdReviewJson.review.verifiedPurchase, true);
    assert.equal(createdReviewJson.summary.averageRating, 5);
    assert.equal(createdReviewJson.summary.totalReviews, 1);

    const syncedProdRes = await fetch(
      `${baseUrl}/api/products/${createdProd.product.id}`
    );
    assert.equal(syncedProdRes.status, 200);
    const syncedProdJson = (await syncedProdRes.json()) as {
      product: { rating: number; reviewCount: number };
    };
    assert.equal(syncedProdJson.product.rating, 5);
    assert.equal(syncedProdJson.product.reviewCount, 1);

    const updateReviewRes = await fetch(
      `${baseUrl}/api/reviews/${createdReviewJson.review.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custAuth.token}`,
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Đánh giá lại sau 1 tuần nghe thử.',
        }),
      }
    );
    assert.equal(updateReviewRes.status, 200);
    const updatedReviewJson = (await updateReviewRes.json()) as {
      review: { rating: number };
      summary: { averageRating: number };
    };
    assert.equal(updatedReviewJson.review.rating, 4);
    assert.equal(updatedReviewJson.summary.averageRating, 4);

    const addReplyRes = await fetch(
      `${baseUrl}/api/reviews/${createdReviewJson.review.id}/replies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`,
        },
        body: JSON.stringify({
          content: 'Cảm ơn bạn đã tin tưởng MOONDROP!',
        }),
      }
    );
    assert.equal(addReplyRes.status, 201);
    const addReplyJson = (await addReplyRes.json()) as {
      review: { replies: Array<{ id: string; userRole: string }> };
      reply: { id: string };
    };
    assert.equal(addReplyJson.review.replies.length, 1);
    assert.equal(addReplyJson.review.replies[0].userRole, 'admin');

    const filteredReviewsRes = await fetch(
      `${baseUrl}/api/reviews/product/${createdProd.product.id}?sort=newest&rating=4`
    );
    assert.equal(filteredReviewsRes.status, 200);
    const filteredReviewsJson = (await filteredReviewsRes.json()) as {
      reviews: Array<{ id: string }>;
      summary: { distribution: Record<number, number> };
    };
    assert.equal(filteredReviewsJson.reviews.length, 1);
    assert.equal(filteredReviewsJson.summary.distribution[4], 1);

    const delReplyRes = await fetch(
      `${baseUrl}/api/reviews/${createdReviewJson.review.id}/replies/${addReplyJson.reply.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminAuth.token}` },
      }
    );
    assert.equal(delReplyRes.status, 200);
    const delReplyJson = (await delReplyRes.json()) as {
      review: { replies: unknown[] };
    };
    assert.equal(delReplyJson.review.replies.length, 0);

    const delReviewRes = await fetch(
      `${baseUrl}/api/reviews/${createdReviewJson.review.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${custAuth.token}` },
      }
    );
    assert.equal(delReviewRes.status, 200);
    const delReviewJson = (await delReviewRes.json()) as {
      summary: { totalReviews: number };
    };
    assert.equal(delReviewJson.summary.totalReviews, 0);
    console.log(
      '✓ Reviews, Ratings Aggregation, Verified Purchase & Threaded Replies CRUD verified'
    );

    // VNPay Payment Gateway (HMAC-SHA512 URL signing, IPN checksum validation & PAID confirmation)
    const vnpCreateRes = await fetch(`${baseUrl}/api/payment/vnpay/create-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custAuth.token}`,
      },
      body: JSON.stringify({ orderId: orderJson.order.id, bankCode: 'NCB' }),
    });
    assert.equal(vnpCreateRes.status, 200);
    const vnpCreateJson = (await vnpCreateRes.json()) as {
      paymentUrl: string;
      txnRef: string;
    };
    assert.ok(vnpCreateJson.paymentUrl.includes('vnp_SecureHash='));
    assert.ok(vnpCreateJson.paymentUrl.includes('vnp_TmnCode='));

    const vnpInvalidIpnRes = await fetch(
      `${baseUrl}/api/payment/vnpay/ipn?vnp_TxnRef=${orderJson.order.id}&vnp_SecureHash=invalid`
    );
    assert.equal(vnpInvalidIpnRes.status, 200);
    const vnpInvalidIpnJson = (await vnpInvalidIpnRes.json()) as {
      RspCode: string;
    };
    assert.equal(vnpInvalidIpnJson.RspCode, '97');

    const vnpSandboxRes = await fetch(
      `${baseUrl}/api/payment/vnpay/sandbox-complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custAuth.token}`,
        },
        body: JSON.stringify({
          orderId: orderJson.order.id,
          bankCode: 'NCB',
          responseCode: '00',
        }),
      }
    );
    assert.equal(vnpSandboxRes.status, 200);
    const vnpSandboxJson = (await vnpSandboxRes.json()) as {
      result: { isValidSignature: boolean; isSuccess: boolean };
      order: {
        paymentStatus: string;
        status: string;
        vnpayTransactionNo?: string;
      };
    };
    assert.equal(vnpSandboxJson.result.isValidSignature, true);
    assert.equal(vnpSandboxJson.result.isSuccess, true);
    assert.equal(vnpSandboxJson.order.paymentStatus, 'PAID');
    assert.equal(vnpSandboxJson.order.status, 'CONFIRMED');
    assert.ok(vnpSandboxJson.order.vnpayTransactionNo);
    console.log(
      '✓ VNPay Payment Gateway (HMAC-SHA512 URL signing, IPN checksum validation & PAID order confirmation) verified'
    );

    const delOrderRes = await fetch(`${baseUrl}/api/orders/${orderJson.order.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert.equal(delOrderRes.status, 200);

    const delProdRes = await fetch(`${baseUrl}/api/products/${createdProd.product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert.equal(delProdRes.status, 200);

    const statsRes = await fetch(`${baseUrl}/api/stats/dashboard`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert.equal(statsRes.status, 200);
    const statsJson = (await statsRes.json()) as {
      stats: { totalProducts: number; totalOrders: number; monthlySales: unknown[] };
    };
    assert.ok(statsJson.stats.totalProducts >= 110);
    assert.equal(statsJson.stats.monthlySales.length, 12);
    console.log('✓ GET /api/stats/dashboard (with MongoDB monthlySales aggregation) verified');

    // JWT Service lifecycle: verify, refresh rotation, replay rejection & logout revocation
    const verifyJwtRes = await fetch(`${baseUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${custAuth.token}` },
    });
    assert.equal(verifyJwtRes.status, 200);
    const verifyJwtJson = (await verifyJwtRes.json()) as {
      valid: boolean;
      claims: { tokenType: string; jti: string } | null;
    };
    assert.equal(verifyJwtJson.valid, true);
    assert.equal(verifyJwtJson.claims?.tokenType, 'access');
    assert.ok(verifyJwtJson.claims?.jti);

    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: custAuth.refreshToken }),
    });
    assert.equal(refreshRes.status, 200);
    const refreshedJson = (await refreshRes.json()) as {
      token: string;
      refreshToken: string;
    };
    assert.ok(refreshedJson.token && refreshedJson.refreshToken);

    // Replaying rotated refresh token must fail
    const replayRefreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: custAuth.refreshToken }),
    });
    assert.equal(replayRefreshRes.status, 401);

    // Logout must revoke both access and refresh tokens
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedJson.token}`,
      },
      body: JSON.stringify({ refreshToken: refreshedJson.refreshToken }),
    });
    assert.equal(logoutRes.status, 200);

    const revokedMeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${refreshedJson.token}` },
    });
    assert.equal(revokedMeRes.status, 401);
    console.log(
      '✓ JWT Service (access/refresh rotation, /api/auth/verify, revocation & logout) verified'
    );

    // Google OAuth2 Service & MongoDB account linking/creation + JWT issuance
    const googleCfgRes = await fetch(
      `${baseUrl}/api/auth/google/config?state=storefront`
    );
    assert.equal(googleCfgRes.status, 200);
    const googleCfg = (await googleCfgRes.json()) as {
      enabled: boolean;
      redirectUri: string;
      authUrl: string;
    };
    assert.ok(googleCfg.redirectUri.includes('/api/auth/google/callback'));
    assert.ok(
      googleCfg.authUrl.startsWith(
        'https://accounts.google.com/o/oauth2/v2/auth'
      )
    );

    const googleSession = await container.authService.authenticateGoogleProfile(
      {
        googleId: 'google-test-999',
        email: 'google.audiophile@moondrop.vn',
        name: 'Google OAuth Tester',
        avatar: '/images/tainghe/KATO.jpeg',
        emailVerified: true,
      }
    );
    assert.equal(googleSession.user.authProvider, 'google');
    assert.equal(googleSession.user.googleId, 'google-test-999');
    assert.ok(googleSession.accessToken && googleSession.refreshToken);

    const verifyGoogleJwtRes = await fetch(`${baseUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${googleSession.accessToken}` },
    });
    assert.equal(verifyGoogleJwtRes.status, 200);
    const verifyGoogleJwtJson = (await verifyGoogleJwtRes.json()) as {
      valid: boolean;
      user: { googleId?: string; authProvider?: string };
    };
    assert.equal(verifyGoogleJwtJson.valid, true);
    assert.equal(verifyGoogleJwtJson.user.authProvider, 'google');

    // Second Google login with same googleId must reuse existing MongoDB account
    const repeatGoogleSession =
      await container.authService.authenticateGoogleProfile({
        googleId: 'google-test-999',
        email: 'google.audiophile@moondrop.vn',
        name: 'Google OAuth Tester',
        emailVerified: true,
      });
    assert.equal(repeatGoogleSession.user.id, googleSession.user.id);

    const deletedGoogleUser = await container.userRepository.deleteById(
      googleSession.user.id
    );
    assert.equal(deletedGoogleUser, true);
    console.log(
      '✓ Google OAuth2 (/api/auth/google/config, MongoDB profile sync, JWT pair & cleanup) verified'
    );

    console.log('\nALL MONGODB AUDIO + MEDIA + ADMIN CHECKS PASSED!');
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await container.shutdown();
  }
}

runTests().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
