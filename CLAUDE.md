# CLAUDE.md

This file provides guidance and developer instructions when working with the **Ready POS** codebase.

## Overview

**Ready POS** is a professional, feature-rich WooCommerce Point of Sale (POS) plugin built using a React (Vite) frontend and a WordPress/PHP backend communicating via custom REST API routes. It features full store/register management, physical terminal workflows (barcode scanning, cart parking, discounts, custom customer selection, payment split/numpad, and receipt printing), and an interactive back-office dashboard (reports, orders, outlets, settings).

## Commands

```bash
# Install dependencies
npm install
composer install

# Development (runs both frontend and admin Vite dev servers)
npm run dev            # frontend :5173, admin :5174
npm run dev:admin      # admin only
npm run dev:frontend   # frontend only
npm run dev:all        # dev + block:start
npm run dev:server     # dev + wp-now local server

# Build for production
npm run build          # builds frontend, admin, and blocks

# Gutenberg Blocks
npm run block:start    # start block dev (webpack via @wordpress/scripts)
npm run block:build

# Formatting
npm run format:check   # Prettier check
npm run format:fix     # Prettier fix

# Release (build + packaging into a zip)
npm run release        # outputs to release/ folder

# Plugin renaming (Optional - configuration in plugin-config.json)
npm run rename

# Internationalization
npm run i18n           # generate .pot file

# Storybook UI components
npm run storybook      # port 6006

# PHP Linting
vendor/bin/phpcs --standard=phpcs.xml.dist
```

## Architecture

Ready POS uses a decoupled architecture with a PHP-based Laravel-like ORM/API routing engine and a modern React client.

### 1. PHP Backend (`includes/`, `libs/`, `database/`)

- **Plugin Entry**: `ready-pos.php` -> checks WooCommerce dependency -> loads `plugin.php` (main class `Readypos`).
- **Design Pattern**: Singleton pattern via `Traits\Base` (`get_instance()`).
- **Database Migrations (`database/Migrations/`)**:
  - `POSSessions`: Manages cashier register opening/closing, initial cash, and closing reconciliation.
  - `POSOrderMeta`: Tracks POS-specific metadata for orders (outlet, register, cashier, change amount).
  - `POSCustomers`: Manages POS-specific customer records.
  - `POSOutlets`: Outlets representing physical storefronts.
  - `POSRegisters`: Individual checkout lanes/terminals per outlet.
- **Eloquent Models (`includes/Models/`)**:
  - Extend `Prappo\WpEloquent\Database\Eloquent\Model`.
  - `POSSession`, `POSOrderMeta`, `POSCustomer`, `POSOutlet`, `POSRegister`.
- **API Routing (`includes/Routes/Api.php`)**:
  - Uses a declarative custom router matching standard REST verbs.
  - Handles namespaces, API endpoint prefixes, and auth checks.
- **REST Controllers (`includes/Controllers/`)**:
  - `Products\Actions`: Dynamic inventory fetching, variation search, and barcode lookups.
  - `Orders\Actions`: POS order placement, cash/card handling, receipt generation, and refunds.
  - `Customers\Actions`: Typeahead search, listing, and direct customer insertion.
  - `Sessions\Actions`: Register session opening, closing, status verification, and reconciliation.
  - `Reports\Actions`: Sales trends, payment methods, cashier performance, and high-margin products.
  - `Settings\Actions`: Receipt configuration, payment gateways, and tax rules.
- **Admin Pages & Assets**:
  - `includes/Admin/Menu.php`: Registers the WordPress admin menus for the dashboard and the dedicated POS terminal screen.
  - `includes/Assets/Admin.php`: Enqueues Vite-built assets for the admin dashboards. Passes data (routes, nonces, store configuration) to React using `wp_localize_script`.
  - `includes/Core/POSTerminalPage.php`: Implements the distraction-free fullscreen checkout screen bypassing standard WordPress admin wraps.

### 2. React Frontend (`src/`)

- **Admin App (`src/admin/`)**:
  - Entry point: `src/admin/main.jsx` and `src/admin/routes.jsx`.
  - **Terminal (`src/admin/pages/terminal/`)**: The cash-register frontend. Consists of a responsive multi-column layout, grid navigation, cart panel, variation selectors, hold/park list, and transaction settlement wizard.
  - **Dashboard (`src/admin/pages/dashboard/`)**: Dynamic financial charts, performance statistics, and quick navigation.
  - **Orders (`src/admin/pages/orders/`)**: Order browser, receipt viewing, and refund processing.
  - **Reports (`src/admin/pages/reports/`)**: Visual analytics (recharts) detailing sales performance, cashiers, payment methods, and products.
  - **Outlets (`src/admin/pages/outlets/`)**: Operations manager for physical stores, registers, and Cashier sessions.
  - **Settings (`src/admin/pages/settings/`)**: Terminal behaviors, layout controls, and customized thermal receipt builder.
- **Shared Components (`src/components/`)**:
  - Customized Shadcn/ui elements styled via standard CSS variables and Tailwind.
- **State Management & Helpers (`src/lib/` & `src/admin/stores/`)**:
  - State stores powered by **Jotai** (`posStore.js`) and encapsulated react hooks (`useCart.js`).
  - `api.js`: Unified axios instance utilizing WordPress REST API nonces.
  - `currency.js` & `receipt.js`: Utility helpers for locale-specific money formatting and direct-to-device receipt layout rendering.

## Code Style

- **PHP**: Strictly adheres to the **WordPress Coding Standards (WPCS)**. Use `vendor/bin/phpcs` to audit prior to committing.
- **JS/JSX**: Prettier-enforced formatting. Run `npm run format:fix` before commit.
- **Vite Path Aliases**: `@/` maps directly to the `src/` directory. Prefer using `@/` relative paths for all component and utility imports.
