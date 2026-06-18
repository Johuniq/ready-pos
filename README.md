# Ready POS — Point of Sale for WooCommerce

[![WordPress Plugin Version](https://img.shields.io/wordpress/plugin/v/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/)
[![WordPress Plugin Rating](https://img.shields.io/wordpress/plugin/stars/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/#reviews)
[![WordPress Plugin Downloads](https://img.shields.io/wordpress/plugin/dt/ready-pos?style=flat-square)](https://wordpress.org/plugins/ready-pos/advanced/)
[![License: GPL v2+](https://img.shields.io/badge/license-GPL--2.0%2B-blue.svg?style=flat-square)](LICENSE)

A modern Point of Sale system for WooCommerce. Fast checkout, real-time inventory sync, and multi-outlet management for physical retail stores.

[Install from WordPress.org](https://wordpress.org/plugins/ready-pos/) | [Support Forum](https://wordpress.org/support/plugin/ready-pos/)

---

## About This Repository

This repository contains the **source code** for the Ready POS WordPress plugin published on [WordPress.org](https://wordpress.org/plugins/ready-pos/). It is provided in compliance with the [WordPress.org plugin guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#4-code-must-be-mostly-human-readable) requiring human-readable source code for all compiled assets.

The `src/` directory contains the unminified React/JSX source files used to build the production bundles in `assets/`.

---

## Building from Source

### Requirements

- Node.js 18+
- PHP 7.4+
- Composer

### Setup

```bash
git clone https://github.com/Johuniq/ready-pos.git
cd ready-pos
npm install
composer install
```

### Development

```bash
npm run dev
```

Starts Vite dev servers with hot reload:
- Admin dashboard: `http://localhost:5174`
- Frontend: `http://localhost:5173`

### Production Build

```bash
npm run build
```

Compiles all assets into `assets/admin/dist/`, `assets/frontend/dist/`, and `assets/blocks/`.

### Release Package

```bash
npm run release
```

Builds assets, installs production PHP dependencies, and creates a distributable `.zip` in `release/`.

---

## Project Structure

```
src/                    # Source code (compiled to assets/)
  admin/                #   Admin dashboard React app
  frontend/             #   Public-facing React app
  components/           #   Shared UI components
  lib/                  #   Shared utilities
  blocks/               #   Gutenberg block source
assets/                 # Compiled production assets
  admin/dist/           #   Admin app bundle
  frontend/dist/        #   Frontend app bundle
  blocks/               #   Gutenberg block bundle
includes/               # PHP backend (WordPress plugin logic)
database/               # Database migrations and seeders
views/                  # PHP templates
libs/                   # Shared PHP libraries
```

---

## Tech Stack

- **Frontend:** React 18, Tailwind CSS, Radix UI, Jotai, React Router
- **Backend:** WordPress REST API, Laravel Eloquent ORM
- **Build:** Vite, @wordpress/scripts, Grunt

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run format:check` and `vendor/bin/phpcs`
5. Submit a pull request

Please follow [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/) for PHP, JavaScript, and CSS.

---

## License

Licensed under the [GNU General Public License v2 or later](LICENSE).

---

<p align="center">
  <a href="https://wordpress.org/plugins/ready-pos/">Download from WordPress.org</a>
</p>
