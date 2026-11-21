# TECH STACK & LIBRARY REFERENCE — MOONDROP // SUPERLATIVE E-COMMERCE

Tài liệu này tổng hợp toàn bộ kiến trúc công nghệ (Tech Stack), danh sách các thư viện (Dependencies, DevDependencies, GSAP Plugins, Node.js Built-in Modules) cùng chức năng cụ thể mà từng thư viện đảm nhiệm trong dự án.

---

## 1. Tổng quan Kiến trúc (Architecture Overview)

Dự án được xây dựng theo mô hình **Full-Stack Monorepo (`frontend` + `backend`)** với RESTful API JSON và cơ sở dữ liệu MongoDB Atlas:

| Tầng (Layer) | Công nghệ cốt lõi | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 + TypeScript + Vite 6 | Single-Page Application (SPA) đa trang, giao diện theo hệ thiết kế **Superlative (`skills/audio.md`)** |
| **Styling Engine** | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility-first CSS thế hệ v4 với `@theme` tokens & `@layer components` |
| **Animation & Motion** | GSAP 3.15 + `@gsap/react` (6 Plugins) | Hoạt ảnh scroll pinning, text split/scramble, layout FLIP, vẽ đồ thị SVG và tương tác con trỏ 60fps |
| **Backend API** | Node.js + Express 4 + TypeScript | Cung cấp REST API, xác thực JWT phân quyền, kiểm tra tương thích mạch âm thanh & quản trị media |
| **Database** | MongoDB Atlas + Mongoose 8 ODM | Lưu trữ toàn bộ dữ liệu động (`products`: 112 SKUs, `presetbuilds`: 3, `users`: 2, `orders`) |
| **Typography** | Google Fonts (`Barlow Condensed` 400, `Inter` 300/400) | Hệ font kỹ thuật phòng thu nạp từ `frontend/index.html` |

---

## 2. Frontend Tech Stack & Thư viện (`frontend/package.json`)

### 2.1. Runtime Dependencies

#### 1) `react` (`^19.0.0`) & `react-dom` (`^19.0.0`)
Thư viện xây dựng giao diện component-based và quản lý vòng đời render.
- **Ứng dụng thực tế**:
  - **Custom SPA History Router (`frontend/src/context/StoreContext.tsx`)**: Điều hướng đa trang không reload (`/`, `/products`, `/product/:id`, `/chain-builder`, `/technology`, `/compare`, `/orders`, `/admin`) bằng `window.history.pushState` và lắng nghe sự kiện `popstate`.
  - **Global Store & State Persistence (`StoreContext.tsx`)**: Quản lý giỏ hàng (`cart`), cấu hình Signal Chain (`buildParts`), khay so sánh (`compareIds`), phiên đăng nhập JWT (`user`, `token`) đồng bộ với `localStorage`.
  - **Tổng hợp dữ liệu động bằng `useMemo` (`HomePage.tsx`, `CatalogPage.tsx`, `TechnologyPage.tsx`, `AdminPage.tsx`)**: Tạo Hero Banners, Split Bento Triplets, Campaign Lookbook, bộ lọc đa tiêu chí và thống kê Usage của 139 ảnh hoàn toàn từ danh sách sản phẩm MongoDB.
  - **Interactive Components**: Ngăn kéo giỏ hàng & checkout (`CartDrawer.tsx`), modal đăng nhập/đăng ký (`AuthModal.tsx`), bảng điều khiển Admin 5 phân hệ (`AdminPage.tsx`), xem trước đa góc ảnh sản phẩm (`ProductCard.tsx`, `ProductDetailPage.tsx`).

#### 2) `tailwindcss` (`^4.0.6`) & `@tailwindcss/vite` (`^4.0.6`)
Framework CSS Tailwind thế hệ v4 tích hợp trực tiếp vào Vite không cần `tailwind.config.js` hay `postcss.config.js`.
- **Cấu hình**: Nạp plugin `tailwindcss()` trong `frontend/vite.config.ts` và import qua `@import "tailwindcss";` ở dòng đầu `frontend/src/index.css`.
- **Ứng dụng thực tế (`frontend/src/index.css`)**:
  - **Design Tokens qua `@theme`**: Định nghĩa bảng màu chuẩn Superlative (`--color-pulp-cream: #f6f4f2`, `--color-graphite-veil: #e4e3e2`, `--color-mid-ash: #8c8c8c`, `--color-ink-black: #141414`, `--color-charcoal-press: #232323`, `--color-vapor: #ffffff`, `--color-null: #000000`, `--color-ember-diode: #e66f27`) và bộ font (`--font-sl-condensed`, `--font-sl-light`, `--font-sl-regular`).
  - **`@layer base` & `@layer components`**: Chuẩn hóa Typography (`sl-label`, `sl-heading`, `sl-subheading`, `sl-display`, `sl-body`), nút ghost viền mảnh `3px` (`sl-btn-dark`, `sl-btn-light`), nhãn trạng thái `15px` (`sl-badge-dark`, `sl-badge-light`) và liên kết `sl-link`, đảm bảo các utility classes ở `@layer utilities` ghi đè chính xác khi kết hợp.
  - **Layout Responsive & Tỷ lệ ảnh**: Xây dựng lưới 4 cột căn giữa cho catalog, bố cục 3-Tile Split Bento (`aspect-[874/400]` + `aspect-[476/196]`) và khung ảnh studio 1:1 `object-contain`.

#### 3) `gsap` (`^3.15.1`) & `@gsap/react` (`^2.1.2`)
Thư viện animation chuyên sâu được đăng ký tập trung tại `frontend/src/utils/gsapSetup.ts`. Toàn bộ hiệu ứng đều bọc trong `gsap.matchMedia()` kiểm tra `prefers-reduced-motion: reduce` để đảm bảo khả năng tiếp cận (accessibility).

| Plugin / Tiện ích GSAP | Cách dùng / API | Chức năng & Vị trí ứng dụng trong Website |
| :--- | :--- | :--- |
| **`useGSAP`** (`@gsap/react`) | Hook vòng đời theo `scope` & `dependencies` | Tự động clean-up timeline/ScrollTrigger khi chuyển trang hoặc đổi bộ lọc trên `HomePage.tsx`, `CatalogPage.tsx`, `ProductDetailPage.tsx`, `TechnologyPage.tsx`, `AudioChainPage.tsx`, `ComparePage.tsx`, `AdminPage.tsx`, `FrequencyResponseChart.tsx`. |
| **`ScrollTrigger`** (`gsap/ScrollTrigger`) | `pin: true`, `scrub: 1`, `ScrollTrigger.batch()` | • Ghim màn hình và cuộn ngang các flagship (`horizSectionRef`, `horizTrackRef`) kèm thanh tiến trình `.js-horiz-bar` trên `HomePage.tsx` và `TechnologyPage.tsx`.<br>• Tạo hiệu ứng xuất hiện tuần tự khi cuộn (`ScrollTrigger.batch`) cho thẻ danh mục, thông số kỹ thuật (`ProductDetailPage.tsx`), sản phẩm & campaign. |
| **`SplitText`** (`gsap/SplitText`) | `SplitText.create(..., { type: 'words,lines', mask: 'lines' })` | Tách từng dòng/từ trên tiêu đề display lớn (`90px` / `64px`) và trượt lộ diện mượt từ dưới mask khi vừa tải trang (`HomePage.tsx`, `CatalogPage.tsx`, `ProductDetailPage.tsx`, `TechnologyPage.tsx`, `AudioChainPage.tsx`, `ComparePage.tsx`, `AdminPage.tsx`). |
| **`ScrambleTextPlugin`** (`gsap/ScrambleTextPlugin`) | `runScrambleTargets()` | Giải mã ký tự kỹ thuật (`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/-+Ω.`) cho mã SKU, thông số driver, trạng thái `SIGNAL LOCKED`, bộ đếm số lượng kết quả lọc (`HomePage.tsx`, `CatalogPage.tsx`, `ProductDetailPage.tsx`, `TechnologyPage.tsx`, `AudioChainPage.tsx`, `AdminPage.tsx`). |
| **`Flip`** (`gsap/Flip`) | `Flip.getState()` & `Flip.from()` | Tạo hiệu ứng chuyển vị trí mượt mà giữa các thẻ sản phẩm (`.js-catalog-item[data-flip-id]`) khi người dùng bấm lọc danh mục, gõ tìm kiếm hoặc đổi thứ tự sắp xếp trong `CatalogPage.tsx`. |
| **`DrawSVGPlugin`** (`gsap/DrawSVGPlugin`) | `gsap.fromTo(..., { drawSVG: '0% 0%' }, { drawSVG: '0% 100%' })` | Vẽ đường đáp tuyến tần số (Frequency Response 20Hz–16kHz) theo chuẩn B&K 5128 như máy hiện sóng (oscilloscope) trong `FrequencyResponseChart.tsx`. |
| **`gsap.quickTo()` & `gsap.utils`** | `gsap.quickTo`, `gsap.utils.clamp`, `gsap.utils.toArray` | • Di chuyển mượt trục crosshair (`.vLine`, `.hLine`, điểm giao `.dot`) bám theo con trỏ chuột ở tần số 60fps không gây React re-render (`FrequencyResponseChart.tsx`).<br>• Tạo hiệu ứng nút từ tính `useMagneticButtons` (`.js-magnetic`, kích hoạt khi `(pointer: fine)`) hút nhẹ theo con trỏ chuột trong `gsapSetup.ts`.<br>• Đếm số động cho Tổng tiền, Damping Factor, SPL (dB) và Output Power (mW) khi lắp ghép Signal Chain trong `AudioChainPage.tsx`. |

#### 4) `lucide-react` (`^0.475.0`)
- Đã khai báo trong `frontend/package.json` dependencies; hiện tại giao diện theo phong cách tối giản của hệ thiết kế **Superlative (`skills/audio.md`)** nên sử dụng trực tiếp inline SVG (logo hình học ở `Navbar.tsx`, biểu đồ SVG ở `FrequencyResponseChart.tsx`) và typography ký tự kỹ thuật thay cho icon pack.

### 2.2. Frontend DevDependencies & Tooling
- **`vite` (`^6.1.0`) & `@vitejs/plugin-react` (`^4.3.4`)**: Bundler và dev server chạy tại cổng `5173`, cấu hình proxy `/api` → `http://127.0.0.1:5000` (`frontend/vite.config.ts`) để gọi backend liền mạch không vướng CORS khi phát triển.
- **`typescript` (`^5.7.3`)**, **`@types/react` (`^19.0.8`)**, **`@types/react-dom` (`^19.0.3`)**: Kiểm tra kiểu tĩnh nghiêm ngặt (`tsc -b && vite build`) cho toàn bộ `Product`, `ComponentSpecs`, `BuildValidationResult`, `Order`, `User`.

---

## 3. Backend Tech Stack & Thư viện (`backend/package.json`)

### 3.1. Runtime Dependencies

#### 1) `express` (`^4.21.2`)
Web framework xây dựng RESTful API server (`backend/src/app.ts` & `backend/src/index.ts`).
- **Ứng dụng thực tế**:
  - Parse JSON dung lượng tới `10mb` (`express.json({ limit: '10mb' })`) phục vụ upload ảnh base64 từ trang Admin.
  - Tổ chức 6 nhóm router API chuyên biệt:
    - `/api/products` ([productRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/productRoutes.ts)): Truy vấn, tìm kiếm, lọc theo dải giá/chân cắm/chất âm và CRUD sản phẩm cho Admin.
    - `/api/builds` ([buildRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/buildRoutes.ts)): Kiểm tra tương thích phối ghép (`POST /validate`) và trả danh sách preset từ MongoDB (`GET /presets`).
    - `/api/orders` ([orderRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/orderRoutes.ts)): Tạo đơn hàng, tính mã giảm giá (`MOONDROP10`, `VDSF500K`), cập nhật trạng thái đơn và lịch sử mua hàng.
    - `/api/auth` ([authRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/authRoutes.ts)): Đăng ký, đăng nhập, Demo Admin/Customer login, quản lý danh sách & phân quyền người dùng.
    - `/api/stats` ([statsRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/statsRoutes.ts)): Tổng hợp doanh thu, đơn chờ xử lý, cảnh báo tồn kho thấp (`<= 8`) và tỷ trọng kho theo danh mục.
    - `/api/media` ([mediaRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/mediaRoutes.ts)): Đọc danh sách ảnh thực tế tại `frontend/public/images/tainghe` và upload ảnh mới trực tiếp từ giao diện Admin.
  - Endpoint `/api/health` kiểm tra trạng thái kết nối MongoDB và số lượng SKU đang hoạt động.

#### 2) `mongoose` (`^8.10.0`)
ODM kết nối và thao tác trực tiếp với cơ sở dữ liệu **MongoDB Atlas (`moondrop_audio`)**.
- **Ứng dụng thực tế**:
  - **Kết nối DB (`backend/src/config/db.ts`)**: Kết nối strict với `serverSelectionTimeoutMS: 10000`, quản lý `DbMode` (`'mongodb' | 'disconnected'`).
  - **4 Schema & Model chuẩn hóa**:
    - `ProductModel` (`backend/src/models/Product.ts`): Lưu 112 sản phẩm, Gallery đa ảnh, `longDescription`, `specs` (`Mixed` cho FR curve, `tonalNotes`, `boxContents`, trở kháng, độ nhạy), cùng Text Index trên `name`, `brand`, `summary`, `sku`.
    - `PresetBuildModel` (`backend/src/models/PresetBuild.ts`): Lưu 3 cấu hình Signal Chain mẫu trên MongoDB.
    - `UserModel` (`backend/src/models/User.ts`): Lưu thông tin tài khoản, email chuẩn hóa chữ thường (`unique`), `passwordHash`, `role` (`admin` / `customer`).
    - `OrderModel` (`backend/src/models/Order.ts`): Lưu đơn hàng với sub-schema `OrderItemSchema`, `ShippingAddressSchema`, trạng thái giao vận và giá trị chiết khấu.
  - **Thao tác nguyên tử & Rollback (`backend/src/services/dataStore.ts`)**: Khi tạo đơn hàng (`createOrderAndDeductStock`), trừ tồn kho có điều kiện `stock: { $gte: item.quantity }` bằng `findOneAndUpdate`; nếu bất kỳ món nào thiếu kho sẽ tự động hoàn tác (rollback) số lượng đã trừ của các món trước đó.

#### 3) `jsonwebtoken` (`^9.0.2`)
Thư viện tạo và xác thực JSON Web Token (`backend/src/middleware/auth.ts`).
- **Ứng dụng thực tế**:
  - Tạo token có thời hạn `7d` chứa `{ id, email, name, role }` qua hàm `signToken`.
  - Middleware `requireAuth` xác thực `Bearer <token>` cho các thao tác người dùng/quản trị; `requireAdmin` chặn truy cập trái phép nếu `role !== 'admin'`; `optionalAuth` cho phép đặt hàng dưới dạng khách vãng lai hoặc tự gắn tài khoản nếu đã đăng nhập.

#### 4) `bcryptjs` (`^2.4.3`)
Thư viện băm mật khẩu một chiều an toàn.
- **Ứng dụng thực tế**:
  - Mã hóa mật khẩu khi tạo tài khoản mới bằng `bcrypt.hashSync(password, 10)` trong `createUser` ([dataStore.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/services/dataStore.ts)).
  - So sánh mật khẩu đăng nhập bằng `bcrypt.compareSync(password, user.passwordHash)` trong `POST /api/auth/login` ([authRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/authRoutes.ts)).

#### 5) `cors` (`^2.8.5`)
Middleware bật Cross-Origin Resource Sharing (`backend/src/app.ts`) cho phép frontend (`CORS_ORIGIN`, mặc định `http://localhost:5173`) gọi API kèm thông tin xác thực (`credentials: true`).

#### 6) `dotenv` (`^16.4.7`)
Nạp biến môi trường từ `backend/.env` (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`) khi khởi động server ([index.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/index.ts)) và khi chạy test suite ([verify.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/test/verify.ts)).

### 3.2. Node.js Built-in Modules & Backend DevDependencies
- **Node.js Built-in (`node:fs`, `node:path`, `node:crypto`, `node:http`, `node:assert/strict`)**:
  - `node:fs` & `node:path` ([mediaRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/mediaRoutes.ts)): Quét toàn bộ file ảnh (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) trong `frontend/public/images/tainghe`, đọc dung lượng file và ghi file ảnh mới từ base64 upload của Admin.
  - `node:crypto` ([dataStore.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/services/dataStore.ts), [orderRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/orderRoutes.ts)): Sinh mã `id` và `slug` ngẫu nhiên an toàn cho sản phẩm, user và đơn hàng mới.
  - `node:http` & `node:assert/strict` ([verify.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/test/verify.ts)): Chạy bộ kiểm thử tích hợp API Express + MongoDB + đối soát 100% ảnh `tainghe`.
- **`tsx` (`^4.19.2`), `typescript` (`^5.7.3`), `@types/node` (`^22.10.0`), `@types/express`, `@types/cors`, `@types/bcryptjs`, `@types/jsonwebtoken`**: Hỗ trợ hot-reload dev (`tsx watch`), thực thi trực tiếp TypeScript cho test (`npm test`) và biên dịch production (`tsc`).

---

## 4. Ma trận Tổng hợp Chức năng ↔ Thư viện ↔ File áp dụng

| Chức năng chính trên Web | Công nghệ / Thư viện sử dụng | File mã nguồn tiêu biểu |
| :--- | :--- | :--- |
| **Giao diện Superlative & Token v4** | Tailwind CSS v4 (`@theme`, `@layer components`), Google Fonts | [index.css](file:///d:/VScode/pc-parts-ecommerce/frontend/src/index.css), [index.html](file:///d:/VScode/pc-parts-ecommerce/frontend/index.html) |
| **Cuộn ngang ghim & Xuất hiện thẻ** | GSAP `ScrollTrigger`, `ScrollTrigger.batch`, `SplitText`, `ScrambleTextPlugin` | [HomePage.tsx](file:///d:/VScode/pc-parts-ecommerce/frontend/src/pages/HomePage.tsx), [TechnologyPage.tsx](file:///d:/VScode/pc-parts-ecommerce/frontend/src/pages/TechnologyPage.tsx) |
| **Lọc & Sắp xếp 112 sản phẩm mượt** | React `useMemo`, GSAP `Flip`, Express query filter | [CatalogPage.tsx](file:///d:/VScode/pc-parts-ecommerce/frontend/src/pages/CatalogPage.tsx), [productRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/productRoutes.ts) |
| **Đồ thị đáp tuyến tần số FR 20Hz–16kHz** | SVG + GSAP `DrawSVGPlugin` + `gsap.quickTo` (crosshair 60fps) | [FrequencyResponseChart.tsx](file:///d:/VScode/pc-parts-ecommerce/frontend/src/components/FrequencyResponseChart.tsx) |
| **Tính toán phối ghép Signal Chain** | Pure TS Compatibility Engine + GSAP Number Counters | [compatibility.ts](file:///d:/VScode/pc-parts-ecommerce/frontend/src/utils/compatibility.ts), [AudioChainPage.tsx](file:///d:/VScode/pc-parts-ecommerce/frontend/src/pages/AudioChainPage.tsx) |
| **Lưu trữ Catalog, Preset, Đơn hàng** | MongoDB Atlas + Mongoose 8 ODM (4 Models) + Rollback tồn kho | [db.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/config/db.ts), [dataStore.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/services/dataStore.ts) |
| **Đăng nhập, Đăng ký & Phân quyền Admin** | `jsonwebtoken`, `bcryptjs`, Express middleware (`requireAuth`, `requireAdmin`) | [auth.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/middleware/auth.ts), [authRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/authRoutes.ts) |
| **Quản trị Kho ảnh `tainghe` (139 file)** | Node `node:fs` / `node:path` + Express `10mb` JSON Base64 Upload | [mediaRoutes.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/routes/mediaRoutes.ts), [AdminPage.tsx](file:///d:/VScode/pc-parts-ecommerce/frontend/src/pages/AdminPage.tsx) |
| **Kiểm thử tự động E2E API & Image Audit** | `tsx`, `node:http`, `node:assert/strict`, Mongoose | [verify.ts](file:///d:/VScode/pc-parts-ecommerce/backend/src/test/verify.ts) |
