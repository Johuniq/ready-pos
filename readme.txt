=== Ready POS for WooCommerce ===
Contributors: johuniqlabs
Tags: pos, point of sale, woocommerce, retail, cash register
Requires at least: 5.8
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 7.4
Requires Plugins: woocommerce
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Transform your WooCommerce store into a Point of Sale system. Fast checkout, inventory sync, and customer management for retail stores.

== Description ==

**Ready POS** adds a point-of-sale interface to your WooCommerce store. Process in-person sales from a fullscreen terminal that syncs inventory and orders with your online store in real time.

= Source Code =

The source code for all compiled JavaScript and CSS assets is publicly available on GitHub:

**https://github.com/Johuniq/ready-pos**

The unminified source files are located in the `src/` directory of the repository. To build from source:

1. Clone: `git clone https://github.com/Johuniq/ready-pos.git`
2. Install: `npm install && composer install`
3. Build: `npm run build`

= Features =

* **POS Terminal** - Fullscreen checkout interface with product grid, cart, and payment
* **Inventory Sync** - POS sales update WooCommerce stock in real time
* **Multi-Outlet** - Create outlets and registers for each location
* **Register Sessions** - Track opening cash, sales, and closing reconciliation
* **Customer Management** - Guest checkout and quick customer search
* **Cash & Card Payments** - Accept multiple payment methods
* **Receipt Printing** - Browser-based receipt printing with customizable layout
* **Barcode Scanning** - Keyboard-emulation barcode scanner support
* **Variable Products** - Select product variations with attribute picker
* **Multi-Cart** - Hold and switch between multiple carts
* **Order History** - View and manage POS transactions
* **Refunds** - Process full or partial refunds from the POS
* **Discounts & Tax** - Cart-level discounts and per-outlet tax rates
* **Audit Logging** - Track POS actions for accountability

= Requirements =

* WordPress 5.8 or higher
* WooCommerce 6.0 or higher
* PHP 7.4 or higher
* Modern web browser

== Installation ==

= Automatic Installation =

1. Log in to your WordPress dashboard
2. Navigate to **Plugins > Add New**
3. Search for "Ready POS"
4. Click **Install Now** and then **Activate**

= Manual Installation =

1. Download the plugin zip file
2. Navigate to **Plugins > Add New > Upload Plugin**
3. Choose the zip file and click **Install Now**
4. Click **Activate Plugin**

= After Activation =

1. Complete the onboarding wizard to configure your first outlet and register
2. Ensure your WooCommerce products have stock quantities set
3. Navigate to the POS terminal to start selling

== Frequently Asked Questions ==

= Does Ready POS require WooCommerce? =

Yes. Ready POS extends WooCommerce with point-of-sale functionality. WooCommerce must be installed and active.

= Does it sync with my online store? =

Yes. All POS orders are WooCommerce orders. Inventory updates in real time across online and in-store sales.

= How many registers can I create? =

Unlimited. Create as many outlets and registers as your business needs. Each register tracks its own sessions and sales.

= What payment methods are supported? =

Cash and card (manual entry). Payments are processed through your existing WooCommerce payment gateways.

= Can I process refunds? =

Yes. Cashiers with appropriate permissions can process full or partial refunds from the POS interface.

= Can I sell variable products? =

Yes. Ready POS supports WooCommerce variable products with an interactive attribute selection modal.

= Can I customize receipts? =

Yes. Customize the receipt header, footer, store logo, and paper width from the settings page.

= Does it work offline? =

No. An active connection to your WordPress site is required. Local caching speeds up product loading on slower connections.

= Is it translation-ready? =

Yes. All PHP strings use WordPress i18n functions. A .pot file is included for translators.

== Screenshots ==

1. POS Terminal - Checkout interface with product grid and cart
2. Payment Processing - Cash payment with change calculation
3. Register Sessions - Opening and closing cash tracking
4. Settings Panel - Receipt, payment, and POS configuration

== Changelog ==

= 1.0.0 =
* Initial release
* POS terminal with product search and cart
* WooCommerce inventory synchronization
* Multi-outlet and register management
* Register session tracking
* Cash and card payment support
* Receipt printing
* Barcode scanner support (keyboard emulation)
* Variable product support
* Multi-cart functionality
* Order history and refund processing
* Role-based access control
* Audit logging
* Per-outlet tax configuration
* Cart-level discounts

== Privacy Policy ==

Ready POS stores all data locally in your WordPress database. No customer or transaction data is sent to external servers. Plugin update checks follow the standard WordPress.org privacy policy.

== Credits ==

Ready POS is built with React, Tailwind CSS, Radix UI, Jotai, Laravel Eloquent ORM (via wp-eloquent), and Vite.

== License ==

Ready POS is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 2 of the License, or any later version.

Ready POS is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Ready POS. If not, see https://www.gnu.org/licenses/gpl-2.0.html.
