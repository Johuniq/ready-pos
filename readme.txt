=== Ready POS ===
Contributors: johuniq
Tags: pos, point of sale, woocommerce, cash register, retail
Requires at least: 5.8
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A modern Point of Sale (POS) system for WooCommerce stores. Manage sales, inventory, and customers with ease.

== Description ==

Ready POS transforms your WooCommerce store into a professional Point of Sale system designed for physical retail locations.

**Key Features:**

* Fast checkout interface optimized for retail
* Real-time inventory synchronization with WooCommerce
* Customer management and profiles
* Cash register session management
* Multiple payment methods (Cash, Card)
* Receipt printing
* Barcode scanning support
* Sales reporting and analytics
* Multi-outlet support
* Cash drawer management
* Employee/Cashier accounts with PIN authentication

**Perfect for:**

* Retail stores
* Cafes and restaurants
* Boutiques
* Supermarkets
* Any business with physical locations

**Requirements:**

* WordPress 5.8 or higher
* WooCommerce 6.0 or higher
* PHP 7.4 or higher

**Technical Features:**

* Built with React for a fast, modern interface
* REST API integration
* Responsive design for tablets and touch screens
* Offline-ready architecture
* Hardware support (receipt printers, barcode scanners, cash drawers)

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/ready-pos/`, or install through WordPress plugins screen
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Ensure WooCommerce is installed and activated
4. Navigate to WooCommerce → POS to configure your first outlet
5. Follow the onboarding wizard to set up registers and cashiers

== Frequently Asked Questions ==

= Does this work with WooCommerce? =

Yes! Ready POS is built specifically for WooCommerce and requires it to be installed and active.

= Does it sync with my online store? =

Yes. All POS transactions create WooCommerce orders and update inventory in real-time.

= Can I use this on a tablet? =

Yes. Ready POS is fully responsive and optimized for tablets and touchscreen devices.

= Does it work offline? =

The plugin includes offline capabilities for continued operation during internet outages. Orders sync when connection is restored.

= What hardware is supported? =

Ready POS supports:
* ESC/POS thermal receipt printers (USB/Ethernet)
* USB and Bluetooth barcode scanners
* Cash drawers (RJ11/USB)
* Customer displays
* Electronic scales

= How many registers can I have? =

The free version supports 1 outlet with 1 register. Upgrade options are available for multiple locations.

= Is it secure? =

Yes. Ready POS follows WordPress and WooCommerce security best practices, including:
* PIN-based cashier authentication
* Role-based access control
* Audit logging
* Nonce verification for all requests
* Input sanitization and output escaping

= Can I customize receipts? =

Yes. You can customize receipt header, footer, and logo from the settings panel.

= Does it support refunds? =

Yes. Cashiers with appropriate permissions can process refunds through the POS interface.

== Screenshots ==

1. Modern POS terminal interface
2. Product selection and cart management
3. Payment processing screen
4. Register session management
5. Dashboard with sales analytics
6. Customer management
7. Settings panel

== Changelog ==

= 1.0.0 - 2024-06-02 =
* Initial release
* Fast checkout terminal interface
* WooCommerce integration
* Customer management
* Register session control
* Cash and card payment support
* Receipt printing
* Basic reporting
* Barcode scanning
* Multi-user support with PIN authentication
* Inventory synchronization

== Upgrade Notice ==

= 1.0.0 =
Initial release of Ready POS for WooCommerce.

== Privacy Policy ==

Ready POS stores customer and transaction data locally in your WordPress database. No data is sent to external servers except when:
* Using WooCommerce payment gateways (follows WooCommerce privacy policy)
* Checking for plugin updates (follows WordPress.org privacy policy)

The plugin does not:
* Track users across sites
* Use cookies for tracking
* Send data to third-party analytics services
* Share data with external parties

== Support ==

For support requests, please use the WordPress.org support forums.

== Credits ==

Built with modern web technologies:
* React
* WordPress REST API
* WooCommerce REST API
