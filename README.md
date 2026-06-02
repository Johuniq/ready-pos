# Ready POS — Modern WooCommerce Point of Sale (POS)

Ready POS is a professional, high-performance, and beautifully designed WooCommerce Point of Sale (POS) plugin. It bridges the gap between physical retail and online commerce, offering store managers a seamless, distraction-free checkout experience that synchronizes directly with their WooCommerce backend in real time.

Built on a powerful decoupled architecture—featuring a **Laravel-inspired Eloquent ORM + Custom REST Router** backend and a **Tailwind-powered React client**—Ready POS is fast, extensible, and optimized for physical operations.

---

## ⚡ Main Features

### 🛒 High-Performance Fullscreen POS Terminal

- **Dynamic Inventory Grid**: Instant search, category filters, and quick-add support.
- **Product Variations**: Interactive modal to select product attributes (size, color, etc.) with real-time stock indicators.
- **Barcode Scanner Support**: Native keyboard listener that detects barcode sweeps and adds items directly to the checkout.
- **Cart Parking & Held Orders**: Save active cart sessions ("Hold/Park") and recall them instantly on any register.
- **Dynamic Discounts & Taxes**: Apply custom cart-level discounts, line-item adjustments, and auto-calculate WooCommerce taxes.
- **Flexible Checkout & Numpad**: Rapid cash/card splitting, quick-cash action buttons, change-due calculator, and integrated numeric keypad.
- **Thermal & Standard Receipt Printing**: Auto-generated custom thermal layouts with customizable header, footer, receipt info, and print preview.

### 🏪 Store, Outlet & Register Management

- **Multi-Outlet Support**: Map physical store locations to distinct inventories, tax zones, and operational guidelines.
- **Register Controls**: Define specific cash drawers/registers per outlet.
- **Cashier Register Sessions**: Full drawer tracking. Keep record of initial cash balances, cashier logins, session statuses, and closing drawer cash reconciliation reports.
- **POS Customers Manager**: Seamless customer selection (guest checkouts, typeahead search, and rapid "Quick Add Customer" drawer form).

### 📊 Back-Office Admin & Analytics

- **Dynamic Dashboard**: Modern interactive charts showing net sales, order volume, cashier statistics, and recent POS sales.
- **Visual Analytics**: Interactive Recharts detailing sales trends, checkout type split, cashier performance metrics, top-selling products, and payment methods.
- **Order Manager**: Paginated view of all transaction histories, itemized invoices, cashier logs, and immediate refund/return handlers.
- **Granular Settings**: Customize thermal receipt layout, payment options, register restrictions, and cashier workflows.

---

## 📂 Project Structure

```text
📂 ready-pos
├── 📂 assets                 # Static image assets and localized icons
├── 📂 config                 # Backend global configurations
│   └── 📄 plugin.php
├── 📂 database               # Database Layer (Eloquent migrations & seeders)
│   ├── 📂 Migrations         # POSSessions, POSOrderMeta, POSCustomers, POSOutlets, POSRegisters
│   └── 📂 Seeders            # Default physical store locations and initial registers
├── 📂 includes               # Core Plugin Logic
│   ├── 📂 Admin              # WordPress admin menu registration
│   ├── 📂 Assets             # Dynamic Vite build asset enqueueing & localization injection
│   ├── 📂 Controllers        # REST Controllers (Products, Orders, Customers, Sessions, Reports, Settings)
│   ├── 📂 Core               # WooCommerce integration checks, Custom POS page routers, and User Roles
│   ├── 📂 Models             # Eloquent Models mapping database tables to active records
│   ├── 📂 Routes             # Custom Laravel-like REST API router
│   └── 📄 functions.php
├── 📂 libs                   # Shared libraries (Custom Routing classes, Shortcode engines)
├── 📂 src                    # React Client (Vite development and build paths)
│   ├── 📂 admin              # Admin app codebase
│   │   ├── 📂 hooks          # Custom hooks (e.g., useCart.js)
│   │   ├── 📂 pages          # Dashboard, Orders, Reports, Outlets, Settings, POS Terminal
│   │   ├── 📂 stores         # State stores powered by Jotai (posStore.js)
│   │   └── 📄 main.jsx
│   ├── 📂 components         # Custom UI library built on Shadcn primitives and Tailwind
│   └── 📂 lib                # Shared client utilities (axios instance, currency filters, printer engines)
├── 📂 views                  # Backend raw views and shortcode outputs
├── 📄 ready-pos.php          # Plugin bootstrap file (WooCommerce verification wrapper)
├── 📄 plugin-config.json     # Declarative namespace, class, text-domain configuration
└── 📄 package.json           # Scripts, bundler triggers, and node dependencies
```

---

## 🛠️ Installation & Setup

### Prerequisites

- WordPress v6.0+
- WooCommerce v7.0+
- PHP v7.4+
- Node.js v18+ & npm

### Development Installation

1. Clone the repository into your WordPress plugins directory:

   ```bash
   cd wp-content/plugins
   git clone <repository-url> ready-pos
   cd ready-pos
   ```

2. Install dependencies:

   ```bash
   npm install
   composer install
   ```

3. Enable the plugin through your WordPress Plugins screen. Activation automatically runs:
   - Database migrations (creating POS sessions, outlets, registers, etc.)
   - Table seeding (setting up the default POS Outlet and main register)
   - Registering a dedicated "POS Cashier" user role.

---

## 💻 Development Workflow

Run both frontend (public shortcodes/blocks) and admin panel Vite servers concurrently:

```bash
npm run dev
```

- **Frontend Dev Server**: [http://localhost:5173](http://localhost:5173)
- **Admin Dashboard Dev Server**: [http://localhost:5174](http://localhost:5174)

### Target Core Commands

- `npm run dev:admin` — Run only the back-office admin dashboard Vite builder.
- `npm run build` — Build all production assets (admin panel, terminal, public blocks) in the optimized formats.
- `npm run release` — Automatically packages the built files into a clean `.zip` distribution in the `release/` folder.
- `npm run format:fix` — Formats the frontend javascript code using custom Prettier configurations.
- `vendor/bin/phpcs` — Verify and format check the PHP files matching WordPress Coding Standards.

---

## 🗃️ Backend Custom API Endpoints

All custom REST API endpoints are registered under `includes/Routes/Api.php` and map to specific Controller Actions:

### 🛍️ Products (`includes/Controllers/Products/Actions.php`)

- `GET /readypos/v1/products` — Fetches a paginated, search-filtered lists of active products with inventory and variable listings.

### 💰 Orders (`includes/Controllers/Orders/Actions.php`)

- `POST /readypos/v1/orders` — Submits a checkout cart. Creates WooCommerce orders, handles custom metadata, decrements stock, calculates change, and records cashier details.
- `POST /readypos/v1/orders/refund/{id}` — Triggers partial or full item returns, updating inventory registers.

### 👥 Customers (`includes/Controllers/Customers/Actions.php`)

- `GET /readypos/v1/customers` — Typeahead query endpoint returning WordPress/WooCommerce customers.
- `POST /readypos/v1/customers` — Instantly creates a new customer profile directly from the terminal checkout queue.

### 🚪 Cashier Sessions (`includes/Controllers/Sessions/Actions.php`)

- `POST /readypos/v1/sessions/open` — Opens a new register session, recording active outlet, register, cashier, and starting float cash.
- `POST /readypos/v1/sessions/close` — Closes a session, records cash drawer reconciliations, and logs transaction counts.
- `GET /readypos/v1/sessions/status` — Checks current cashier session status.

### 📈 Reports (`includes/Controllers/Reports/Actions.php`)

- `GET /readypos/v1/reports/summary` — Analytics details providing graphs, top items, cash vs card shares, and totals.
