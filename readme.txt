=== Ready POS for WooCommerce ===
Contributors: johuniq
Donate link: https://johuniq.tech/donate
Tags: pos, point of sale, woocommerce, retail, cash register
Requires at least: 5.8
Tested up to: 7.0
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Transform your WooCommerce store into a professional Point of Sale system. Fast checkout, inventory sync, and customer management for retail stores.

== Description ==

**Ready POS** transforms your WooCommerce store into a professional Point of Sale system designed for physical retail locations. Built with modern web technologies, it provides a fast, intuitive checkout experience that syncs seamlessly with your online store.

= Free Version Features =

Ready POS Free includes everything you need to start selling in-store:

* **Fast Checkout Terminal** - Distraction-free fullscreen POS interface optimized for speed
* **Real-time Inventory Sync** - All sales update WooCommerce inventory instantly
* **Single Outlet & Register** - Perfect for small stores and pop-up shops
* **Basic Customer Management** - Handle guest checkouts and quick customer selection
* **Cash & Card Payments** - Accept multiple payment methods
* **Receipt Printing** - Generate and print professional receipts
* **Barcode Scanner Support** - Quickly add products by scanning barcodes
* **Basic Sales Reports** - Track daily sales and transaction history
* **Cashier Accounts** - Support for up to 2 cashier users with role-based permissions
* **Register Sessions** - Track opening/closing cash drawer balances
* **Product Search & Filters** - Find products quickly with real-time search
* **Cart Management** - Hold/park orders to serve multiple customers
* **Order History** - View and manage all POS transactions

= Pro Version Features =

Upgrade to Ready POS Pro for advanced retail management:

**Multi-Location Management**
* Unlimited outlets and registers
* Location-based inventory tracking
* Inter-outlet stock transfers
* Outlet-specific pricing and tax settings

**Advanced Payments**
* Split payments (cash + card)
* Gift card support
* Store credit and layaway
* EMV card reader integration

**Customer Experience**
* Customer-facing display for second screen
* Loyalty points and rewards program
* Purchase history tracking
* Customer-specific pricing

**Hardware Integration**
* Thermal receipt printer support (ESC/POS)
* Cash drawer control (pulse commands)
* Weight scale integration
* USB barcode scanner optimization

**Inventory Management**
* Low stock alerts and notifications
* Barcode label printing
* Physical inventory counting
* Automated reorder suggestions

**Advanced Reporting**
* Cashier performance reports
* Product sales analytics
* Payment method breakdown
* Custom date range reports
* Export to CSV/PDF

**Operations**
* Employee shift tracking
* Custom receipt layouts
* Offline mode with sync
* Multi-currency support
* Custom tax classes
* POS-specific order prefixes

[Upgrade to Pro](https://readypos.johuniq.tech/) | [View Pro Demo](https://readypos.johuniq.tech/)

= Perfect for =

* Retail stores
* Cafes and restaurants
* Boutiques and gift shops
* Grocery and convenience stores
* Pop-up shops and markets
* Service businesses
* Any physical retail location

= Technical Highlights =

* **Modern Stack** - Built with React, REST API, and Laravel-inspired backend
* **Fast Performance** - Vite-powered bundling and optimized assets
* **Responsive Design** - Works on desktop, tablet, and touch screens
* **Accessibility** - WCAG-compliant interface
* **Secure** - Role-based access control, PIN authentication, audit logging
* **Extensible** - Filter hooks and REST API for custom integrations

= Requirements =

* WordPress 5.8 or higher
* WooCommerce 6.0 or higher
* PHP 7.4 or higher (PHP 8.0+ recommended)
* Modern web browser (Chrome, Firefox, Safari, Edge)

= Support & Documentation =

* [Visit Website](https://readypos.johuniq.tech/)
* [Support Forum](https://wordpress.org/support/plugin/ready-pos/)
* [GitHub Repository](https://github.com/johuniq/ready-pos)

= Privacy & Data =

Ready POS stores all customer and transaction data locally in your WordPress database. No data is sent to external servers except:
* When using WooCommerce payment gateways (follows WooCommerce privacy policy)
* When checking for plugin updates (follows WordPress.org privacy policy)
* When activating a Pro license (license key validation only)

The plugin does NOT:
* Track users across sites
* Use cookies for tracking purposes
* Send data to third-party analytics
* Share data with external parties

= Translations =

Ready POS is translation-ready and includes:
* Full .pot file for translators
* RTL (Right-to-Left) language support
* Internationalized date and currency formats

Help translate Ready POS into your language on [WordPress.org](https://translate.wordpress.org/projects/wp-plugins/ready-pos)!

== Installation ==

= Automatic Installation (Recommended) =

1. Log in to your WordPress dashboard
2. Navigate to **Plugins > Add New**
3. Search for "Ready POS"
4. Click **Install Now** and then **Activate**
5. Ensure WooCommerce is installed and activated
6. Navigate to **WooCommerce > POS** to start the setup wizard

= Manual Installation =

1. Download the plugin zip file
2. Log in to your WordPress dashboard
3. Navigate to **Plugins > Add New > Upload Plugin**
4. Choose the downloaded zip file and click **Install Now**
5. Click **Activate Plugin**
6. Navigate to **WooCommerce > POS** to start the setup wizard

= After Installation =

1. **Setup Wizard** - Complete the quick onboarding to configure your first outlet and register
2. **Add Products** - Ensure your WooCommerce products have stock quantities set
3. **Create Cashiers** - Add user accounts with the "POS Cashier" role
4. **Configure Settings** - Customize receipt layout, payment options, and more
5. **Open Register** - Start selling! Open the POS terminal and begin a register session

= Minimum Server Requirements =

* PHP 7.4 or higher (PHP 8.0+ recommended)
* MySQL 5.6 or higher / MariaDB 10.0 or higher
* WordPress 5.8 or higher
* WooCommerce 6.0 or higher
* HTTPS recommended for production use

= Recommended Setup =

* Dedicated tablet or touch-screen device
* Thermal receipt printer (ESC/POS compatible)
* USB or Bluetooth barcode scanner
* Stable internet connection
* Cash drawer with RJ11 or USB connection

== Frequently Asked Questions ==

= Does Ready POS require WooCommerce? =

Yes, Ready POS is built specifically for WooCommerce and requires it to be installed and active. It extends WooCommerce to add point-of-sale functionality to your physical retail locations.

= Does it sync with my online store? =

Absolutely! All POS transactions create WooCommerce orders and update inventory in real-time. Your online and in-store sales stay perfectly synchronized.

= Can I use this on a tablet? =

Yes! Ready POS is fully responsive and optimized for tablets and touchscreen devices. We recommend using a tablet with at least a 10" screen for the best experience.

= How many users can access the POS? =

The free version supports up to 2 cashier users. Upgrade to Pro for unlimited cashiers and advanced user management features.

= Can I use multiple registers? =

The free version includes 1 outlet with 1 register, perfect for small shops. Pro version supports unlimited outlets and registers for multi-location businesses.

= What hardware is supported? =

**Free Version:**
* USB and Bluetooth barcode scanners (keyboard emulation mode)
* Standard printers (using browser print)

**Pro Version:**
* ESC/POS thermal receipt printers (USB/Ethernet/Bluetooth)
* Cash drawers with RJ11 or USB connection
* Customer-facing displays (pole displays)
* Electronic scales with USB/serial connection
* Advanced barcode scanner features

= Does it work offline? =

Basic functionality works offline in both versions. The Pro version includes advanced offline mode with automatic sync and conflict resolution when the connection is restored.

= How do I print receipts? =

Free version supports browser-based printing to any printer. Pro version adds thermal printer support with custom ESC/POS templates for faster, more professional receipts.

= Can I process refunds? =

Yes! Cashiers with appropriate permissions can process full or partial refunds directly through the POS interface. Refunds update inventory and WooCommerce order status automatically.

= Is customer data secure? =

Yes. Ready POS follows WordPress and WooCommerce security best practices:
* PIN-based cashier authentication
* Role-based access control (RBAC)
* Audit logging for all transactions
* Nonce verification for all AJAX requests
* Input sanitization and output escaping
* HTTPS support for encrypted communication

= Can I customize receipts? =

Yes! You can customize:
* Receipt header and footer text
* Store logo
* Paper width settings (thermal printers in Pro)
* Contact information
* Custom messages and promotions

= Does it support multiple currencies? =

Ready POS uses your WooCommerce currency settings. Multi-currency support (for border stores or tourist locations) is available in the Pro version.

= Can I import my existing customers? =

Yes! Ready POS automatically uses your existing WooCommerce customers. No import needed - they're instantly available in the POS customer search.

= What payment methods are supported? =

**Free Version:**
* Cash
* Card (manual entry)

**Pro Version:**
* Split payments (cash + card combination)
* Gift cards
* Store credit
* Layaway/deposits
* EMV card reader integration
* Custom payment types

= How do I handle inventory? =

Ready POS syncs with WooCommerce inventory:
* Stock decreases automatically on POS sales
* Low stock warnings (Pro)
* Inter-outlet transfers (Pro)
* Physical inventory counting (Pro)
* Barcode label printing (Pro)

= Can I sell variable products? =

Yes! Ready POS fully supports WooCommerce variable products. When a customer selects a variable product, an interactive modal displays all attribute options with real-time stock indicators.

= Does it track cash drawer balances? =

Yes! Register session management includes:
* Opening cash float entry
* Automatic transaction tracking
* Closing balance reconciliation
* Cash vs. expected reports
* Cashier accountability

= Can I get sales reports? =

**Free Version:**
* Daily sales summary
* Transaction history
* Basic order details

**Pro Version:**
* Cashier performance analytics
* Product sales breakdown
* Payment method reports
* Custom date range reports
* Multi-outlet comparisons
* Export to CSV/PDF

= Is there a demo? =

Yes! Visit [our website](https://readypos.johuniq.tech/) to try Ready POS Pro with full features. Contact us for a personalized demo of your specific use case.

= How do I upgrade to Pro? =

1. Visit [our website](https://readypos.johuniq.tech/) to purchase a license
2. You'll receive a license key via email
3. In your WordPress dashboard, go to **WooCommerce > POS > Settings > License**
4. Enter your license key and click **Activate**
5. Pro features unlock immediately!

= Do I need to reinstall for Pro? =

No! Simply enter your Pro license key in the settings. All your data, settings, and configurations remain intact.

= What support is provided? =

**Free Version:**
* Community support via WordPress.org forums
* Documentation and guides
* GitHub issue tracking

**Pro Version:**
* Priority email support
* Live chat support
* Phone support for annual plans
* Custom implementation assistance
* Dedicated account manager for enterprise

= Can I use this in multiple locations? =

The free version is limited to 1 outlet. Pro version supports unlimited locations with separate inventory, registers, and staff for each outlet.

= Is it translation-ready? =

Yes! Ready POS is fully translation-ready with:
* Complete .pot file included
* RTL language support
* Date/currency format localization
* Translation contributions welcome on WordPress.org

= Can developers extend this? =

Absolutely! Ready POS includes:
* WordPress filter and action hooks
* REST API endpoints
* React component library
* Developer documentation
* Open source on GitHub (GPLv2)

= How do I uninstall? =

**To deactivate (keeps data):**
1. Navigate to **Plugins**
2. Click **Deactivate** under Ready POS

**To fully remove:**
1. Deactivate the plugin first
2. Click **Delete**
3. This removes plugin files but keeps POS data in your database

**To remove all data:**
Before deleting the plugin, go to **WooCommerce > POS > Settings > Advanced** and click **Reset All Data**. This removes all POS outlets, registers, sessions, and settings (WooCommerce products and orders are preserved).

= Where can I get help? =

* **Website:** [readypos.johuniq.tech](https://readypos.johuniq.tech/)
* **Support Forum:** [WordPress.org Support](https://wordpress.org/support/plugin/ready-pos/)
* **Pro Support:** [support.johuniq.tech](https://support.johuniq.tech)
* **GitHub Issues:** [github.com/johuniq/ready-pos](https://github.com/johuniq/ready-pos)

== Screenshots ==

1. **POS Terminal Interface** - Fast, distraction-free checkout screen with product grid, cart, and payment options
2. **Product Selection** - Search, filter by category, and quick-add products to cart with barcode scanner support
3. **Payment Processing** - Split tender, cash calculator, and change due display
4. **Register Session Management** - Track opening float, sales, and closing reconciliation
5. **Dashboard Analytics** - Sales overview, top products, and performance metrics
6. **Customer Management** - Quick customer search, add new customers, and view purchase history
7. **Settings Panel** - Customize receipts, payment options, hardware, and POS preferences
8. **Order History** - View all transactions with filters, search, and export options
9. **Variable Product Selection** - Interactive modal for product variations with stock indicators
10. **Customer-Facing Display** - Second screen showing cart items and totals for customers

== Changelog ==

= 1.0.0 - 2024-06-02 =
**Initial Release**

* Fast fullscreen POS terminal interface
* WooCommerce inventory synchronization
* Single outlet & register support
* Customer management (up to 50 customers in free version)
* Register session management with cash tracking
* Cash and card payment support
* Receipt generation and printing
* Barcode scanner support (keyboard emulation)
* Variable product support with attribute selection
* Cart hold/park functionality
* Basic sales dashboard
* Order history and management
* Full or partial refund processing
* Role-based user access (POS Cashier, POS Manager)
* PIN authentication for cashiers
* Customizable receipt header/footer
* Product search and category filters
* Real-time stock level indicators
* Tax calculation (WooCommerce settings)
* Discount application (cart-level and line-item)
* Audit logging for security
* Translation-ready with .pot file
* RTL language support
* Responsive tablet-optimized design
* WordPress 6.7 compatibility
* PHP 8.2 compatibility
* WooCommerce 9.0+ compatibility
* Built with React 18 and modern web technologies
* REST API endpoints for extensibility
* GPLv2 licensed - open source

**Pro Features Available:**
* Unlimited outlets and registers
* Unlimited cashiers
* Multi-location inventory
* Split payments
* Gift cards and store credit
* Thermal receipt printer support
* Cash drawer control
* Weight scale integration
* Customer-facing display
* Loyalty points program
* Advanced reporting and analytics
* Offline mode with sync
* Barcode label printing
* Low stock alerts
* Employee shift tracking
* Custom receipt templates
* And much more!

[View Pro Features](https://readypos.johuniq.tech/)

= Future Roadmap =

* Kitchen Display System (KDS)
* Table management for restaurants
* Appointment booking integration
* Mobile app for Android/iOS
* Self-checkout kiosk mode
* Advanced inventory forecasting
* Multi-warehouse support
* Integration with popular accounting software

== Upgrade Notice ==

= 1.0.0 =
Initial release of Ready POS for WooCommerce. Transform your store into a professional point of sale system!

== Privacy Policy ==

Ready POS is committed to protecting your privacy and the privacy of your customers.

= Data Storage =

Ready POS stores all data locally in your WordPress database:
* Customer information (names, emails, phone numbers)
* Transaction records and order history
* Register session data (cash drawer balances, cashier information)
* Inventory and product data (synced with WooCommerce)
* User authentication data (encrypted PINs for cashiers)
* Audit logs (who did what, when)

= Data Sharing =

Ready POS does **NOT** send data to external servers except in these specific cases:

**WordPress.org (for plugin updates only)**
* Update checks follow the standard WordPress.org privacy policy
* No customer or transaction data is transmitted

**WooCommerce Payment Gateways**
* When processing card payments through WooCommerce gateways
* Follows the privacy policy of each configured payment gateway
* Only payment data is transmitted - no additional POS data

**License Validation (Pro version only)**
* License key validation when activating Pro features
* Only sends: license key, site URL, and WordPress version
* No customer data, transaction data, or personal information is transmitted
* Managed through Polar.sh with secure, encrypted connections

= Third-Party Services =

Ready POS does **NOT**:
* Track users across multiple websites
* Use cookies for advertising or tracking
* Send data to analytics services (Google Analytics, etc.)
* Share or sell data to third parties
* Use customer data for marketing purposes
* Access data from other plugins or services

= Data You Control =

As the site owner, you have complete control:
* All data is stored in your WordPress database
* You can export transaction data anytime
* You can delete customer data upon request (GDPR compliance)
* Uninstalling the plugin optionally removes all POS data
* No vendor lock-in - your data stays with you

= Security Measures =

Ready POS implements enterprise-grade security:
* Role-based access control (RBAC)
* PIN authentication for cashiers
* Encrypted data transmission (HTTPS recommended)
* Nonce verification for all requests
* Input sanitization and validation
* Output escaping to prevent XSS
* SQL injection prevention through prepared statements
* Audit logging for accountability
* Regular security updates

= GDPR Compliance =

Ready POS is designed to help you comply with GDPR:
* Minimal data collection (only what's necessary for POS operations)
* Data portability (export customer data)
* Right to erasure (delete customer data)
* Data processing records (audit logs)
* No automated decision-making or profiling
* Clear consent mechanisms
* Data breach notification capability

**Note:** While Ready POS provides tools for GDPR compliance, you as the data controller are responsible for ensuring your overall GDPR compliance, including having appropriate privacy policies and consent mechanisms in place.

= Children's Privacy =

Ready POS does not knowingly collect information from children under 13. The plugin is designed for retail business operations and requires adult supervision.

= Contact =

For privacy concerns or data deletion requests:
* Email: privacy@johuniq.tech
* Support: https://wordpress.org/support/plugin/ready-pos/

For Pro license and validation privacy:
* Powered by Polar.sh
* Privacy policy: https://polar.sh/legal/privacy

= Changes to Privacy Policy =

We may update this privacy policy from time to time. Changes will be posted in plugin updates and on our website.

Last updated: June 2, 2024

== Support ==

= Free Support =

* **Website:** [readypos.johuniq.tech](https://readypos.johuniq.tech/)
* **WordPress.org Forums:** Community support at [wordpress.org/support/plugin/ready-pos](https://wordpress.org/support/plugin/ready-pos/)
* **GitHub Issues:** Report bugs and request features at [github.com/johuniq/ready-pos](https://github.com/johuniq/ready-pos)
* **Video Tutorials:** Step-by-step guides on our YouTube channel

= Pro Support (License Holders) =

* **Priority Email Support:** Response within 24 hours (business days)
* **Live Chat Support:** Real-time assistance during business hours
* **Phone Support:** Available for annual license holders
* **Implementation Assistance:** Help with setup and configuration
* **Custom Development:** Paid services for specific requirements
* **Dedicated Account Manager:** For enterprise licenses

= Before Requesting Support =

1. **Check Documentation:** Most questions are answered in our comprehensive docs
2. **Search Forums:** Someone may have already solved your issue
3. **Update Everything:** Ensure WordPress, WooCommerce, and Ready POS are up to date
4. **Check Requirements:** Verify your server meets minimum requirements
5. **Disable Conflicts:** Test with other plugins disabled to identify conflicts

= What to Include in Support Requests =

* WordPress version
* WooCommerce version
* Ready POS version (Free or Pro)
* PHP version
* Description of the issue
* Steps to reproduce
* Screenshots or screen recordings (if applicable)
* Browser console errors (if applicable)
* Any error messages from debug.log

= Response Times =

* **Free Support:** 2-5 business days (community-based)
* **Pro Support:** 24 hours (priority queue)
* **Enterprise Support:** 4 hours (dedicated team)

== Credits ==

Ready POS is built with modern web technologies and open-source libraries:

= Core Technologies =
* **React 18** - UI library by Facebook
* **WordPress REST API** - WordPress core
* **WooCommerce REST API** - WooCommerce core
* **Vite** - Next generation frontend tooling
* **Tailwind CSS** - Utility-first CSS framework

= UI Components =
* **Radix UI** - Unstyled, accessible component primitives
* **Headless UI** - Unstyled, accessible UI components
* **Lucide React** - Beautiful & consistent icon set
* **Recharts** - Composable charting library

= State Management =
* **Jotai** - Primitive and flexible state management

= Form Handling =
* **React Hook Form** - Performant forms with easy validation
* **Zod** - TypeScript-first schema validation

= Routing =
* **React Router** - Declarative routing for React

= Backend =
* **Laravel Eloquent ORM** (via wp-eloquent) - Elegant database interactions
* **Custom REST Router** - Laravel-style routing for WordPress

= Build & Development =
* **@kucrut/vite-for-wp** - Vite integration for WordPress
* **WordPress Scripts** - Official WordPress build tools
* **Prettier** - Code formatter
* **Grunt** - Task runner for releases

= Hardware Support =
* **ESC/POS** - Thermal printer protocol
* **WebUSB API** - Direct hardware communication
* **Web Serial API** - Serial device communication

= License Management =
* **Polar.sh** - Modern software licensing platform

= Special Thanks =

* WordPress and WooCommerce communities
* All open-source contributors
* Early adopters and beta testers
* Translation contributors
* Everyone who provided feedback

= Contributing =

Ready POS is open source (GPLv2)! Contributions are welcome:
* **Code:** Submit pull requests on GitHub
* **Translations:** Help translate on WordPress.org
* **Documentation:** Improve guides and tutorials
* **Bug Reports:** Report issues on GitHub
* **Feature Requests:** Suggest improvements

Visit [github.com/johuniq/ready-pos](https://github.com/johuniq/ready-pos) to get started!

== License ==

Ready POS is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 2 of the License, or any later version.

Ready POS is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Ready POS. If not, see [https://www.gnu.org/licenses/gpl-2.0.html](https://www.gnu.org/licenses/gpl-2.0.html).

= Third-Party Licenses =

This plugin includes third-party libraries and components, each with their own licenses:
* React (MIT License)
* Tailwind CSS (MIT License)
* Radix UI (MIT License)
* Other dependencies as listed in package.json and composer.json

All third-party licenses are compatible with GPL and are included in the plugin distribution.
