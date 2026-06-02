# Bugfix Requirements Document

## Introduction

This document addresses two critical issues in the Ready POS plugin:

1. **HTML Entity Encoding Issue**: Currency symbols and special characters are displaying as HTML entities (e.g., `&#2547;` instead of the actual Bangladeshi Taka symbol `৳`) in the Operations Overview dashboard and throughout the frontend interface.

2. **Plugin Index Professionalization**: The plugin index files (`ready-pos.php` and `plugin.php`) lack proper structure, documentation, and industry-standard patterns required for professional WordPress plugin development.

The HTML entity bug affects user experience by making currency displays unreadable, while the unprofessional plugin structure impacts maintainability, security, and adherence to WordPress coding standards.

## Bug Analysis

### Current Behavior (Defect)

#### HTML Entity Encoding Issue

1.1 WHEN the system retrieves currency symbols from WooCommerce using `get_woocommerce_currency_symbol()` THEN the system receives HTML entities (e.g., `&#2547;` for Bangladeshi Taka)

1.2 WHEN the system passes currency data to the React frontend via `wp_localize_script()` THEN the system transmits HTML entities without decoding them

1.3 WHEN the React frontend displays currency symbols in the Operations Overview dashboard THEN the system renders raw HTML entity codes (e.g., `0.00&#2547;&nbsp;`) instead of actual currency symbols

1.4 WHEN the React frontend uses the `formatPrice()` function with currency symbols THEN the system concatenates HTML entities with formatted numbers, producing unreadable output

#### Plugin Index Structure Issues

1.5 WHEN the plugin is activated THEN the system lacks proper dependency validation before initialization

1.6 WHEN WordPress loads the plugin THEN the system does not verify required PHP version or WordPress version compatibility

1.7 WHEN the plugin encounters errors during initialization THEN the system lacks proper error handling and logging mechanisms

1.8 WHEN developers review the plugin code THEN the system lacks comprehensive inline documentation and PHPDoc blocks

1.9 WHEN the plugin is deactivated THEN the system does not provide proper cleanup hooks

1.10 WHEN the plugin constants are defined THEN the system lacks validation to prevent redefinition conflicts

### Expected Behavior (Correct)

#### HTML Entity Encoding Fix

2.1 WHEN the system retrieves currency symbols from WooCommerce using `get_woocommerce_currency_symbol()` THEN the system SHALL decode HTML entities using `html_entity_decode()` before storing or transmitting

2.2 WHEN the system passes currency data to the React frontend via `wp_localize_script()` THEN the system SHALL transmit decoded Unicode characters that can be properly rendered

2.3 WHEN the React frontend displays currency symbols in the Operations Overview dashboard THEN the system SHALL render actual currency symbols (e.g., `৳` for Bangladeshi Taka) correctly

2.4 WHEN the React frontend uses the `formatPrice()` function with currency symbols THEN the system SHALL display properly formatted prices with readable currency symbols (e.g., `0.00৳` or `৳0.00`)

#### Plugin Index Professionalization

2.5 WHEN the plugin is activated THEN the system SHALL validate all required dependencies (WooCommerce, PHP version, WordPress version) before proceeding with initialization

2.6 WHEN WordPress loads the plugin THEN the system SHALL verify minimum PHP version (7.4+) and WordPress version (5.8+) compatibility

2.7 WHEN the plugin encounters errors during initialization THEN the system SHALL implement proper try-catch blocks, error logging, and user-friendly admin notices

2.8 WHEN developers review the plugin code THEN the system SHALL provide comprehensive PHPDoc blocks for all classes, methods, and functions following WordPress coding standards

2.9 WHEN the plugin is deactivated THEN the system SHALL provide proper deactivation hooks for cleanup operations

2.10 WHEN the plugin constants are defined THEN the system SHALL check if constants are already defined before defining them to prevent conflicts

### Unchanged Behavior (Regression Prevention)

#### Currency Functionality Preservation

3.1 WHEN the system formats prices for products with positive amounts THEN the system SHALL CONTINUE TO format numbers with correct decimal places and thousand separators

3.2 WHEN the system displays currency in different positions (left, right, left_space, right_space) THEN the system SHALL CONTINUE TO respect WooCommerce currency position settings

3.3 WHEN the system retrieves currency configuration from WooCommerce THEN the system SHALL CONTINUE TO use all existing currency settings (decimals, thousand separator, decimal separator)

3.4 WHEN the system displays prices in the terminal, cart, and payment modals THEN the system SHALL CONTINUE TO show formatted prices in all existing locations

#### Plugin Initialization Preservation

3.5 WHEN WordPress loads the plugin on the `plugins_loaded` hook THEN the system SHALL CONTINUE TO initialize the Readypos singleton instance

3.6 WHEN the plugin activation hook fires THEN the system SHALL CONTINUE TO execute the Install class initialization for database migrations

3.7 WHEN the plugin initializes core modules (API, Menu, Assets, Template) THEN the system SHALL CONTINUE TO load all modules in the correct order

3.8 WHEN the plugin loads text domain for translations THEN the system SHALL CONTINUE TO support internationalization (i18n)

3.9 WHEN the plugin defines constants (READYPOS_VERSION, READYPOS_DIR, READYPOS_URL, etc.) THEN the system SHALL CONTINUE TO make these constants available throughout the plugin

3.10 WHEN the plugin checks for WooCommerce dependency THEN the system SHALL CONTINUE TO display admin notices when WooCommerce is not active
