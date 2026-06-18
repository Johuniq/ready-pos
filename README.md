# Ready POS — Modern WooCommerce Point of Sale

[![WordPress Plugin Version](https://img.shields.io/wordpress/plugin/v/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/)
[![WordPress Plugin Rating](https://img.shields.io/wordpress/plugin/stars/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/#reviews)
[![WordPress Plugin Downloads](https://img.shields.io/wordpress/plugin/dt/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/advanced/)
[![License](https://img.shields.io/badge/license-GPL--2.0%2B-blue.svg?style=flat-square)](LICENSE)

Transform your WooCommerce store into a professional Point of Sale system. Ready POS bridges the gap between physical retail and online commerce, offering a seamless, distraction-free checkout experience that synchronizes directly with your WooCommerce backend in real time.

Built on a powerful decoupled architecture featuring a **Laravel-inspired Eloquent ORM + Custom REST Router** backend and a **React + Tailwind CSS** frontend—Ready POS is fast, extensible, and optimized for retail operations.

[Features](#features) • [Installation](#installation) • [Documentation](#documentation) • [Contributing](#contributing) • [Support](#support)

---

## 🚀 Quick Links

- **WordPress.org:** [Download from WordPress.org](https://wordpress.org/plugins/ready-pos/)
- **Source Code:** [View on GitHub](https://github.com/Johuniq/ready-pos)
- **Support:** [Get Help](https://wordpress.org/support/plugin/ready-pos/)

---

## ⚡ Features

### 🔄 Real-time Multi-Terminal Sync

- **Real-time Multi-Terminal Updates**: Register A sells → Register B updates instantly (<100ms with WebSocket)
- **Automatic Fallback**: Seamless switch between WebSocket (instant) and REST polling (5-second) modes
- **Local Caching**: Fast product and inventory loading via local cache to keep the terminal responsive on slower connections
- **Zero Configuration**: Works out-of-the-box on any hosting with automatic fallback

📚 **Documentation:**
- [Real-time Sync Guide](docs/REALTIME_SYNC.md)

### 🛒 High-Performance Fullscreen POS Terminal

- **Dynamic Inventory Grid**: Instant search, category filters, and quick-add support.
- **Product Variations**: Interactive modal to select product attributes (size, color, etc.) with real-time stock indicators.
- **Barcode Scanner Support**: Native keyboard listener that detects barcode sweeps and adds items directly to the checkout.
- **Dynamic Discounts & Taxes**: Apply custom cart-level discounts, line-item adjustments, and auto-calculate WooCommerce taxes.
- **Flexible Checkout & Numpad**: Quick-cash action buttons, change-due calculator, and integrated numeric keypad.
- **Thermal & Standard Receipt Printing**: Auto-generated custom thermal layouts with customizable header, footer, receipt info, and print preview.
- **Customer-Facing Display**: Real-time second screen showing cart items, prices, totals, and promotional messages for enhanced customer transparency.

### 🏪 Store, Outlet & Register Management

- **Multi-Outlet Support**: Map physical store locations to distinct inventories, tax zones, and operational guidelines.
- **Register Controls**: Define specific cash drawers/registers per outlet.
- **Cashier Register Sessions**: Full drawer tracking. Keep record of initial cash balances, cashier logins, session statuses, and closing drawer cash reconciliation reports.
- **POS Customers Manager**: Seamless customer selection (guest checkouts, typeahead search, and rapid "Quick Add Customer" drawer form).

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
│   ├── 📂 Controllers        # REST Controllers (Products, Orders, Customers, Sessions, Settings)
│   ├── 📂 Core               # WooCommerce integration checks, Custom POS page routers, and User Roles
│   ├── 📂 Models             # Eloquent Models mapping database tables to active records
│   ├── 📂 Routes             # Custom Laravel-like REST API router
│   └── 📄 functions.php
├── 📂 libs                   # Shared libraries (Custom Routing classes, Shortcode engines)
├── 📂 src                    # React Client (Vite development and build paths)
│   ├── 📂 admin              # Admin app codebase
│   │   ├── 📂 hooks          # Custom hooks (e.g., useCart.js)
│   │   ├── 📂 pages          # Dashboard, Orders, Outlets, Settings, POS Terminal
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
   git clone https://github.com/Johuniq/ready-pos.git ready-pos
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

### Building Assets from Source

The plugin includes pre-built production assets in `assets/admin/dist/` and `assets/frontend/dist/`. To rebuild them from the source code in `src/`:

```bash
# Development mode (hot-reload on ports 5173/5174)
npm run dev

# Production build
npm run build
```

The build uses:
- **Vite** for admin and frontend React applications
- **@wordpress/scripts** (Webpack) for Gutenberg blocks
- **Tailwind CSS** for styling
- **React 18** with JSX

---

## 📋 Features

Ready POS includes everything you need to run a modern point-of-sale operation:

- **Multi-outlet & multi-register** - Map physical store locations to distinct inventories, tax zones, and operational guidelines
- **Unlimited cashiers & customers** - Role-based access for cashiers and managers; integrates with all your existing WooCommerce customers
- **Full POS terminal** - Complete checkout interface with cart, payment, and receipt
- **Barcode scanning** - USB/Bluetooth scanner support
- **Cash & card payments** - Accept multiple payment types
- **Receipt printing** - Browser-based and ESC/POS thermal printer support
- **Register sessions** - Track opening/closing cash drawer balances
- **WooCommerce sync** - Real-time inventory updates
- **Multi-location inventory** - Track stock per outlet
- **Cash drawer control** - Automatic drawer opening
- **Real-time sync** - Keep all terminals updated across the store

---

## 💻 Development Workflow

Run both frontend (public shortcodes/blocks) and admin panel Vite servers concurrently:

```bash
npm run dev
```

- **Frontend Dev Server**: [http://localhost:5173](http://localhost:5173)
- **Admin Dashboard Dev Server**: [http://localhost:5174](http://localhost:5174)

### Building for Production

To create a production-ready distribution package:

```bash
npm run release
```

This command will:
1. Build all frontend assets (admin, frontend, blocks)
2. Install optimized PHP dependencies (`composer install --no-dev --optimize-autoloader`)
3. Package everything into a clean `.zip` file in the `release/` directory

**Important:** The `vendor/` directory must be included in production builds. Never upload the plugin to production without running `npm run release` or manually running `composer install --no-dev` first.

### Available Commands

- `npm run dev` — Run both frontend and admin dev servers concurrently
- `npm run dev:admin` — Run only the admin dashboard Vite server
- `npm run dev:frontend` — Run only the frontend Vite server
- `npm run build` — Build all production assets (admin, frontend, blocks)
- `npm run release` — **Build and package plugin with dependencies into a production-ready `.zip`**
- `npm run format:check` — Check code formatting with Prettier
- `npm run format:fix` — Auto-fix code formatting with Prettier
- `npm run block:start` — Start Gutenberg block development
- `npm run block:build` — Build Gutenberg blocks
- `npm run i18n` — Generate translation .pot file
- `vendor/bin/phpcs` — Check PHP code against WordPress Coding Standards

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

---

## 🤝 Contributing

We welcome contributions from the community! Ready POS is open source (GPLv2) and benefits from developers like you.

### Ways to Contribute

1. **Report Bugs** - Open an issue on the WordPress.org support forum with details
2. **Suggest Features** - Share your ideas for improvements
3. **Submit Pull Requests** - Fix bugs or add features
4. **Improve Documentation** - Help make our docs better
5. **Translate** - Help translate at [translate.wordpress.org](https://translate.wordpress.org/projects/wp-plugins/ready-pos)
6. **Share Feedback** - Use the plugin and let us know your experience

### Development Guidelines

- Follow WordPress Coding Standards
- Test thoroughly before submitting PRs
- Include clear commit messages
- Update documentation for new features
- Add translation strings for new text

### Setting Up Development Environment

```bash
# Download the latest release from WordPress.org
# https://wordpress.org/plugins/ready-pos/
cd ready-pos

# Install dependencies
composer install
npm install

# Start development servers
npm run dev

# Run code quality checks
npm run format:check
vendor/bin/phpcs
```

### Coding Standards

- **PHP**: Follow [WordPress PHP Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- **JavaScript**: Follow [WordPress JavaScript Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/javascript/)
- **CSS**: Follow [WordPress CSS Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/css/)
- **React**: Use functional components and hooks
- **Security**: Always sanitize input, escape output, verify nonces

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request with clear description

---

## 💬 Support

- **WordPress.org Forums**: [Community support](https://wordpress.org/support/plugin/ready-pos/)

### Before Requesting Support

1. Search the [support forum](https://wordpress.org/support/plugin/ready-pos/) for similar issues
2. Update WordPress, WooCommerce, and Ready POS to latest versions
3. Test with default theme and no other plugins
4. Check browser console for JavaScript errors

### Include in Support Requests

- WordPress version
- WooCommerce version
- Ready POS version
- PHP version
- Browser and OS
- Steps to reproduce the issue
- Screenshots or error messages
- What you've already tried

---

## 📄 License

Ready POS is licensed under the **GNU General Public License v2 or later**.

```
Ready POS - Modern WooCommerce Point of Sale
Copyright (C) 2024 Johuniq

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
```

See [LICENSE](LICENSE) file for full text.

### Third-Party Licenses

This plugin includes third-party libraries, each with their own licenses:

- **React** (MIT License)
- **Tailwind CSS** (MIT License)
- **Radix UI** (MIT License)
- **Vite** (MIT License)
- **wp-eloquent** (MIT License)

All third-party licenses are compatible with GPL.

---

## 🙏 Credits

### Built With

- [React](https://reactjs.org/) - UI library
- [WordPress](https://wordpress.org/) - CMS platform
- [WooCommerce](https://woocommerce.com/) - E-commerce platform
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [Jotai](https://jotai.org/) - State management
- [React Hook Form](https://react-hook-form.com/) - Form handling
- [Recharts](https://recharts.org/) - Charts and analytics
- [wp-eloquent](https://github.com/prappo/wp-eloquent) - Laravel Eloquent for WordPress

### Special Thanks

- WordPress and WooCommerce communities
- All open-source contributors
- Beta testers and early adopters
- Everyone who provided feedback

### Contributing

Thank you to everyone who contributes to making Ready POS better!

---

## 🗺️ Roadmap

### Upcoming Features

- **Kitchen Display System (KDS)** - For restaurants and cafes
- **Table Management** - Restaurant-specific features
- **Self-Checkout Kiosk Mode** - Customer-operated terminals
- **Mobile Apps** - iOS and Android companion apps
- **Advanced Inventory Forecasting** - AI-powered stock predictions
- **Multi-Warehouse Support** - Advanced inventory distribution
- **Accounting Integration** - QuickBooks, Xero, FreshBooks
- **Advanced Hardware** - More printer types, payment terminals

### Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 📊 Stats & Badges

[![WordPress Plugin Active Installs](https://img.shields.io/wordpress/plugin/installs/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/advanced/)
[![WordPress Plugin Required WP Version](https://img.shields.io/wordpress/plugin/wp-version/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/)
[![WordPress Plugin Required PHP Version](https://img.shields.io/wordpress/plugin/required-php/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/)
[![WordPress Plugin Last Updated](https://img.shields.io/wordpress/plugin/last-updated/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/)

---

## 🔗 Links

- **WordPress.org**: [wordpress.org/plugins/ready-pos](https://wordpress.org/plugins/ready-pos/)
- **Support Forum**: [wordpress.org/support/plugin/ready-pos](https://wordpress.org/support/plugin/ready-pos/)

---

<p align="center">
  <a href="https://wordpress.org/plugins/ready-pos/">Download from WordPress.org</a>
</p>
