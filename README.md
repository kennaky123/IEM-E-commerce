# MOONDROP // SUPERLATIVE — Multi-Page Audiophile IEM & DAC/AMP E-Commerce

> Full-stack multi-page audiophile e-commerce platform specializing in **In-Ear Monitors (IEMs), Portable & Desktop DAC/AMPs, Planar Magnetic Headphones, and Balanced Litz Cables**, styled after the **Superlative industrial monograph design system** ([skills/audio.md](skills/audio.md)).

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, History API Multi-Page Router
- **Backend:** Node.js, Express, TypeScript (`tsx`), JWT Authentication, `bcryptjs`
- **Database:** MongoDB + Mongoose ODM (with automatic persistent JSON fallback store + `docker-compose.yml` for MongoDB 7)

---

## Multi-Page Architecture

1. **`/` — Home Monograph**: Full-bleed dark studio hero (`#141414`), Pulp Cream (`#f6f4f2`) hardware category index, Flagship Reference Stack, interactive **VDSF Frequency Response SVG Vitrine** (`#232323`), and featured catalog grid.
2. **`/products` — Hardware Catalog**: Faceted search and filtering across 20 audio SKUs (`IEM`, `DAC_AMP`, `HEADPHONE`, `CABLE`, `ACCESSORY`), tuning signatures (*VDSF Neutral*, *Harman Sub-Bass*, *Studio Reference*, *Warm Musical*), pin/plug standards (`0.78mm 2-Pin`, `MMCX`, `4.4mm Balanced`, `3.5mm SE`), and stock availability.
3. **`/product/:id` — Product Monograph Page**: Dedicated studio product monograph with silkscreen faceplate tags, LED stock indicator, interactive 20Hz–16kHz Frequency Response SVG graph vs VDSF target, and 1px hairline specification plate.
4. **`/chain-builder` — Signal Chain & Impedance Synergy Lab**: Interactive configurator validating **Connector Pin compatibility** (`0.78mm 2-Pin` vs `MMCX`), **Output Jack match** (`4.4mm Balanced` vs `3.5mm SE`), **Damping Ratio** (`Z_load / Z_out >= 8:1`), and **Planar Drive Headroom (`mW @ 32Ω` & peak SPL)**.
5. **`/technology` — Acoustic Engineering Monograph**: VDSF Target Response science, `1DD + 2BA + 2EST` crossover waveguides, TAC diamond domes, and 500nm planar transducers.
6. **`/compare` — FR Curve & Spec Comparison Lab**: Side-by-side comparison of up to 3 units with overlaid multi-trace SVG Frequency Response plots.
7. **`/orders` — Customer Order Ledger**: Order tracking, applied promo discounts, and shipping details.

---

## Architecture: Separate Storefront vs. Admin Portal

- **Client Storefront (`frontend/` @ `http://127.0.0.1:5173`)**: Dành riêng cho khách hàng mua sắm, khám phá catalog, ráp dàn Signal Chain Lab, so sánh biểu đồ đáp tuyến FR, giỏ hàng & thanh toán.
- **Dedicated TailAdmin Portal (`admin/` @ `http://127.0.0.1:5174`)**: Cổng Quản trị Viên độc lập hoàn toàn bằng **TailAdmin** (https://tailadmin.com/), truy cập bằng liên kết riêng biệt với cổng bảo mật JWT Role-Based Access Control, quản lý SKU, cập nhật kho tức thì, xử lý giao vận đơn hàng, kho 139+ ảnh media và phân quyền người dùng.

---

## Quick Start

### 1. Start Backend API (`http://127.0.0.1:5000`)
```bash
cd backend
npm install
npm run dev
```

### 2. Start Customer Storefront (`http://127.0.0.1:5173`)
```bash
cd frontend
npm install
npm run dev
```

### 3. Start Dedicated TailAdmin Portal (`http://127.0.0.1:5174`)
```bash
cd admin
npm install
npm run dev
```

### 4. Run Automated Backend & Audio Synergy Tests
```bash
cd backend
npm test
```

---

## Demo Credentials & Promo Codes

| Role | Email | Password |
| :--- | :--- | :--- |
| **Customer** | `customer@moondrop.vn` | `Customer@123` |
| **Admin** | `admin@moondrop.vn` | `Admin@123` |

*(Or use **DEMO CUSTOMER / DEMO ADMIN** buttons inside the Sign In modal.)*

- **Promo Codes:** `MOONDROP10` (-10%), `VDSF500K` (-500,000₫ for orders ≥ 10,000,000₫)

---

## Suggested CV / Resume Descriptions

### Tiếng Việt
**MOONDROP // SUPERLATIVE — Nền tảng E-Commerce Tai nghe IEM, DAC/AMP & Signal Chain Lab**  
*Tech stack: React (Vite), TypeScript, Tailwind CSS, Node.js, Express, MongoDB (Mongoose), JWT*
- Xây dựng ứng dụng Full-stack đa trang (Multi-page SPA) kinh doanh thiết bị âm thanh audiophile (IEM, DAC/AMP, Planar Headphone, dây nâng cấp Litz) theo hệ thống thiết kế công nghiệp tối giản (Monochrome Pulp Cream / Ink Black, biểu đồ đáp tuyến tần số VDSF dạng SVG).
- Phát triển **Audio Signal Chain & Impedance Synergy Engine** kiểm tra tương thích chân cắm (`0.78mm 2-Pin` vs `MMCX`), chuẩn jack đầu ra (`4.4mm Balanced` vs `3.5mm SE`), hệ số giảm chấn **Damping Factor (`≥ 8:1`)** và công suất kéo tai nghe Planar (`mW @ 32Ω` / Peak SPL).
- Triển khai RESTful API bằng Node.js, Express, TypeScript & Mongoose ODM hỗ trợ lọc đa chiều, giỏ hàng + mã giảm giá (`MOONDROP10`, `VDSF500K`), trừ tồn kho khi đặt hàng, phân quyền JWT (Customer/Admin) và Dashboard quản trị.
- Viết bộ kiểm thử tự động (`npm test`) xác minh logic tương thích âm thanh và toàn bộ luồng API CRUD, Auth, Orders.

### English
**MOONDROP // SUPERLATIVE — Full-Stack Multi-Page Audiophile IEM & DAC/AMP Storefront**  
*Tech stack: React (Vite), TypeScript, Tailwind CSS, Node.js, Express, MongoDB (Mongoose), JWT*
- Architected a multi-page audiophile e-commerce platform selling IEMs, balanced DAC/AMPs, and planar headphones featuring an interactive SVG Frequency Response comparator (20Hz–16kHz vs VDSF target) and dedicated product monograph pages.
- Engineered an **Audio Signal Chain Compatibility Engine** validating transducer connector pins (`0.78mm 2-Pin` vs `MMCX`), balanced output terminations (`4.4mm` vs `3.5mm`), electrical damping ratio (`≥ 8:1`), and planar amplifier drive headroom.
- Built RESTful APIs using Node.js, Express, TypeScript, and Mongoose with JWT role-based access control, promo-code checkout with stock deduction, customer order tracking, and an Admin SKU/order management console.
- Authored automated verification tests (`npm test`) covering acoustic synergy diagnostics, JWT auth flows, faceted product queries, and order creation.
