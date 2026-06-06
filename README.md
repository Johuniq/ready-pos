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

- **WordPress.org:** [Download Free Version](https://wordpress.org/plugins/ready-pos/)
- **Website:** [readypos.johuniq.tech](https://readypos.johuniq.tech/)
- **Pro Version:** [Upgrade to Pro](https://readypos.johuniq.tech/)
- **Demo:** [Try Live Demo](https://readypos.johuniq.tech/)
- **Support:** [Get Help](https://wordpress.org/support/plugin/ready-pos/)

---

## ⚡ Features

### 🔄 **Offline Mode & Real-time Sync** ✨ NEW

- **Complete Offline Operation**: Continue selling during internet outages with local order queue and inventory cache
- **Intelligent Sync**: Automatic synchronization with exponential backoff retry and idempotency protection
- **Conflict Resolution**: User-friendly UI to resolve inventory conflicts with local/server/manual options
- **Sync Dashboard**: Full visibility into pending orders, failed operations, and sync status
- **Real-time Multi-Terminal Updates**: Register A sells → Register B updates instantly (<100ms with WebSocket)
- **Automatic Fallback**: Seamless switch between WebSocket (instant) and REST polling (5-second) modes
- **Zero Configuration**: Works out-of-the-box on any hosting with automatic fallback
- **Audit Trail**: Complete history of all sync operations and conflict resolutions

📚 **Documentation:**
- [Offline Mode Guide](docs/OFFLINE_MODE.md)
- [Real-time Sync Guide](docs/REALTIME_SYNC.md)
- [Quick Start](docs/OFFLINE_MODE_QUICK_START.md)
- [Complete Summary](OFFLINE_AND_REALTIME_COMPLETE.md)

### 🛒 High-Performance Fullscreen POS Terminal

- **Dynamic Inventory Grid**: Instant search, category filters, and quick-add support.
- **Product Variations**: Interactive modal to select product attributes (size, color, etc.) with real-time stock indicators.
- **Barcode Scanner Support**: Native keyboard listener that detects barcode sweeps and adds items directly to the checkout.
- **Cart Parking & Held Orders**: Save active cart sessions ("Hold/Park") and recall them instantly on any register.
- **Dynamic Discounts & Taxes**: Apply custom cart-level discounts, line-item adjustments, and auto-calculate WooCommerce taxes.
- **Flexible Checkout & Numpad**: Rapid cash/card splitting, quick-cash action buttons, change-due calculator, and integrated numeric keypad.
- **Thermal & Standard Receipt Printing**: Auto-generated custom thermal layouts with customizable header, footer, receipt info, and print preview.
- **Customer-Facing Display**: Real-time second screen showing cart items, prices, totals, and promotional messages for enhanced customer transparency.

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

## 📋 Free vs Pro Features

### ✅ Free Version

Perfect for small stores and getting started:

- **Single outlet with 1 register** - Great for single-location stores
- **Up to 2 cashiers** - Small team support
- **Up to 50 customers** - Customer management basics
- **Up to 100 products** - Suitable for boutiques and specialty shops
- **Full POS terminal** - Complete checkout interface
- **Barcode scanning** - USB/Bluetooth scanner support
- **Cash & card payments** - Accept multiple payment types
- **Receipt printing** - Browser-based printing
- **Register sessions** - Track opening/closing balances
- **Basic reporting** - Daily sales and transaction history
- **WooCommerce sync** - Real-time inventory updates

### 🌟 Pro Version

Scale your retail operations:

- **Unlimited outlets & registers** - Multi-location support
- **Unlimited cashiers & customers** - No limits as you grow
- **Multi-location inventory** - Track stock per outlet
- **Split payments** - Cash + card combinations
- **Gift cards & store credit** - Enhanced payment options
- **Thermal receipt printers** - ESC/POS printer support
- **Cash drawer control** - Automatic drawer opening
- **Weight scales** - For produce and bulk items
- **Customer-facing display** - Second screen for customers
- **Loyalty points** - Reward repeat customers
- **Advanced reports** - Cashier performance, product analytics
- **Offline mode** - Keep selling during internet outages
- **Employee shifts** - Track cashier work hours
- **Barcode labels** - Print product labels
- **Low stock alerts** - Automatic inventory notifications
- **Priority support** - Email, chat, and phone assistance

[Compare Plans](https://readypos.johuniq.tech/) | [View Pro Demo](https://readypos.johuniq.tech/)

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

### 📺 Customer Display

- **Real-time Second Screen Display** — Open customer-facing display via Terminal header button
- **Live Cart Synchronization** — Items, prices, and totals update instantly using BroadcastChannel API
- **Idle/Welcome Screen** — Displays store branding and rotating promotional messages when cart is empty
- **Customer Information** — Shows selected customer name and loyalty status
- **Configurable Messages** — Customize welcome message and up to 4 promotional messages in Settings
- **Adjustable Idle Timeout** — Set how long before promotional messages appear (10-120 seconds)
- **Theme-Aware Display** — Automatically matches light/dark theme from main terminal
- **Multi-Monitor Support** — Optimized for extended desktop setups with second monitor facing customer
- **Zero-Latency Updates** — Browser-based sync with no server requests required

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

---

## 🤝 Contributing

We welcome contributions from the community! Ready POS is open source (GPLv2) and benefits from developers like you.

### Ways to Contribute

1. **Report Bugs** - [Open an issue](https://github.com/johuniq/ready-pos/issues) with details
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
# Clone repository
git clone https://github.com/johuniq/ready-pos.git
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

### Free Support

- **WordPress.org Forums**: [Community support](https://wordpress.org/support/plugin/ready-pos/)
- **Website**: [readypos.johuniq.tech](https://readypos.johuniq.tech/)
- **GitHub Issues**: [Report bugs](https://github.com/johuniq/ready-pos/issues)
- **Video Tutorials**: [YouTube channel](https://youtube.com/@johuniq)

### Pro Support (License Holders)

- **Priority Email Support**: 24-hour response time (business days)
- **Live Chat**: Real-time assistance during business hours  
- **Phone Support**: Available for annual license holders
- **Implementation Assistance**: Help with setup and configuration
- **Custom Development**: Paid services for specific requirements

### Before Requesting Support

1. Check the [website](https://readypos.johuniq.tech/)
2. Search [support forum](https://wordpress.org/support/plugin/ready-pos/) for similar issues
3. Update WordPress, WooCommerce, and Ready POS to latest versions
4. Test with default theme and no other plugins
5. Check browser console for JavaScript errors

### Include in Support Requests

- WordPress version
- WooCommerce version
- Ready POS version (Free/Pro)
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

[View Contributors](https://github.com/johuniq/ready-pos/graphs/contributors)

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

- **Website**: [readypos.johuniq.tech](https://readypos.johuniq.tech/)
- **WordPress.org**: [wordpress.org/plugins/ready-pos](https://wordpress.org/plugins/ready-pos/)
- **Support Forum**: [wordpress.org/support/plugin/ready-pos](https://wordpress.org/support/plugin/ready-pos/)
- **GitHub**: [github.com/johuniq/ready-pos](https://github.com/johuniq/ready-pos)
- **Twitter**: [@johuniq](https://twitter.com/johuniq)

---

## ⭐ Show Your Support

If you find Ready POS helpful, please:

- ⭐ Star this repository
- 🐦 Tweet about it
- 📝 Write a review on [WordPress.org](https://wordpress.org/support/plugin/ready-pos/reviews/)
- 💬 Tell other store owners
- 🤝 Contribute to the project

---

## 📧 Contact

- **Email**: support@johuniq.tech
- **Website**: [johuniq.tech](https://johuniq.tech)
- **Twitter**: [@johuniq](https://twitter.com/johuniq)

For security issues, please email: security@johuniq.tech

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://johuniq.tech">Johuniq</a></strong>
</p>

<p align="center">
  <a href="https://wordpress.org/plugins/ready-pos/">Download from WordPress.org</a> •
  <a href="https://readypos.johuniq.tech/">Visit Website</a>
</p>
