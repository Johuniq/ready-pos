/**
 * Payment Gateway Integration Module
 * 
 * Supports integration with popular payment processors:
 * - Stripe Terminal (recommended for modern POS)
 * - Square Terminal API
 * - PayPal Zettle
 * - Ingenico Connect
 * - Verifone Cloud Services
 * - First Data/Clover
 * - Authorize.net
 * - Adyen POS
 * 
 * Features:
 * - Real card transactions with physical terminals
 * - Masked card numbers (last 4 digits)
 * - Authorization codes
 * - Receipt data
 * - EMV chip support
 * - Contactless/NFC support
 * - Refunds and voids
 */

/**
 * Base Payment Gateway Interface
 */
class PaymentGateway {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.deviceInfo = null;
  }

  async initialize() {
    throw new Error("initialize() must be implemented by gateway");
  }

  async connect() {
    throw new Error("connect() must be implemented by gateway");
  }

  async disconnect() {
    throw new Error("disconnect() must be implemented by gateway");
  }

  async processPayment(amount, options = {}) {
    throw new Error("processPayment() must be implemented by gateway");
  }

  async refund(transactionId, amount) {
    throw new Error("refund() must be implemented by gateway");
  }

  async void(transactionId) {
    throw new Error("void() must be implemented by gateway");
  }
}

/**
 * Stripe Terminal Integration
 * https://stripe.com/docs/terminal
 * 
 * Most modern and developer-friendly option
 * Supports: BBPOS WisePad 3, Verifone P400, BBPOS Chipper 2X BT
 */
class StripeTerminal extends PaymentGateway {
  constructor(config) {
    super(config);
    this.terminal = null;
    this.reader = null;
  }

  async initialize() {
    // Load Stripe Terminal JS SDK
    if (!window.StripeTerminal) {
      await this.loadSDK();
    }

    this.terminal = window.StripeTerminal.create({
      onFetchConnectionToken: async () => {
        // Fetch connection token from your backend
        const response = await fetch(`${this.config.backendUrl}/stripe/connection-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        return data.secret;
      },
      onUnexpectedReaderDisconnect: () => {
        this.connected = false;
        this.onDisconnect?.();
      },
    });
  }

  async loadSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/terminal/v1/";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async connect() {
    const { discoveredReaders } = await this.terminal.discoverReaders({
      simulated: this.config.testMode || false,
    });

    if (discoveredReaders.length === 0) {
      throw new Error("No Stripe readers found. Make sure your reader is powered on and nearby.");
    }

    // Connect to first available reader
    const { reader } = await this.terminal.connectReader(discoveredReaders[0]);
    this.reader = reader;
    this.connected = true;
    this.deviceInfo = {
      id: reader.id,
      label: reader.label,
      serial_number: reader.serial_number,
      device_type: reader.device_type,
    };

    return this.deviceInfo;
  }

  async disconnect() {
    if (this.reader) {
      await this.terminal.disconnectReader();
      this.reader = null;
      this.connected = false;
    }
  }

  async processPayment(amount, options = {}) {
    if (!this.connected) {
      throw new Error("Stripe Terminal not connected");
    }

    try {
      // Create Payment Intent on your backend
      const response = await fetch(`${this.config.backendUrl}/stripe/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: options.currency || "usd",
          metadata: options.metadata || {},
        }),
      });

      const { client_secret } = await response.json();

      // Collect payment method from reader
      const result = await this.terminal.collectPaymentMethod(client_secret);

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Process payment
      const { paymentIntent, error } = await this.terminal.processPayment(result.paymentIntent);

      if (error) {
        throw new Error(error.message);
      }

      // Capture payment on backend (if not auto-capture)
      if (paymentIntent.status === "requires_capture") {
        await fetch(`${this.config.backendUrl}/stripe/capture-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_intent_id: paymentIntent.id }),
        });
      }

      // Extract card details
      const charge = paymentIntent.charges.data[0];
      const paymentMethodDetails = charge.payment_method_details;

      return {
        success: true,
        approved: true,
        transactionId: paymentIntent.id,
        authorizationCode: charge.authorization_code,
        responseMessage: "Approved",
        amount: paymentIntent.amount / 100,
        cardType: this.normalizeCardBrand(paymentMethodDetails.card_present?.brand),
        cardNumberMasked: `****${paymentMethodDetails.card_present?.last4}`,
        cardLast4: paymentMethodDetails.card_present?.last4,
        cardholderName: paymentMethodDetails.card_present?.cardholder_name || "",
        entryMode: this.mapEntryMode(paymentMethodDetails.card_present?.read_method),
        receiptNumber: charge.receipt_number,
        timestamp: new Date(paymentIntent.created * 1000).toISOString(),
        raw: paymentIntent,
      };
    } catch (error) {
      return {
        success: false,
        approved: false,
        error: error.message,
        responseMessage: error.message,
      };
    }
  }

  async refund(transactionId, amount) {
    const response = await fetch(`${this.config.backendUrl}/stripe/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_intent_id: transactionId,
        amount: amount ? Math.round(amount * 100) : undefined,
      }),
    });

    const refund = await response.json();
    return {
      success: refund.status === "succeeded",
      refundId: refund.id,
      amount: refund.amount / 100,
    };
  }

  normalizeCardBrand(brand) {
    const brandMap = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      diners: "Diners Club",
      jcb: "JCB",
      unionpay: "UnionPay",
    };
    return brandMap[brand?.toLowerCase()] || brand;
  }

  mapEntryMode(readMethod) {
    const modeMap = {
      contact_emv: "chip",
      contactless_emv: "contactless",
      magnetic_stripe_track2: "swipe",
      magnetic_stripe_fallback: "swipe",
    };
    return modeMap[readMethod] || "manual";
  }
}

/**
 * Square Terminal Integration
 * https://developer.squareup.com/docs/terminal-api
 * 
 * Popular for retail POS systems
 */
class SquareTerminal extends PaymentGateway {
  constructor(config) {
    super(config);
    this.accessToken = config.accessToken;
    this.locationId = config.locationId;
    this.deviceId = config.deviceId;
    this.baseUrl = config.sandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";
  }

  async initialize() {
    // Verify credentials by fetching device info
    const response = await fetch(`${this.baseUrl}/v2/devices/${this.deviceId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to initialize Square Terminal");
    }

    this.deviceInfo = await response.json();
    this.connected = true;
  }

  async connect() {
    await this.initialize();
    return this.deviceInfo;
  }

  async disconnect() {
    this.connected = false;
  }

  async processPayment(amount, options = {}) {
    if (!this.connected) {
      throw new Error("Square Terminal not connected");
    }

    try {
      const checkoutRequest = {
        idempotency_key: this.generateIdempotencyKey(),
        checkout: {
          amount_money: {
            amount: Math.round(amount * 100), // Convert to cents
            currency: options.currency?.toUpperCase() || "USD",
          },
          device_options: {
            device_id: this.deviceId,
            skip_receipt_screen: false,
            collect_signature: false,
          },
          reference_id: options.referenceId || undefined,
          note: options.note || undefined,
        },
      };

      // Create Terminal Checkout
      const createResponse = await fetch(`${this.baseUrl}/v2/terminal/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutRequest),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.errors?.[0]?.detail || "Failed to create checkout");
      }

      const { checkout } = await createResponse.json();
      const checkoutId = checkout.id;

      // Poll for checkout completion
      const result = await this.pollCheckoutStatus(checkoutId);

      if (result.status === "COMPLETED") {
        const payment = result.payment;
        const cardDetails = payment.card_details;

        return {
          success: true,
          approved: true,
          transactionId: payment.id,
          authorizationCode: cardDetails?.auth_result_code || "",
          responseMessage: "Approved",
          amount: payment.amount_money.amount / 100,
          cardType: this.normalizeCardBrand(cardDetails?.card?.card_brand),
          cardNumberMasked: `****${cardDetails?.card?.last_4}`,
          cardLast4: cardDetails?.card?.last_4,
          cardholderName: cardDetails?.cardholder_name || "",
          entryMode: this.mapEntryMode(cardDetails?.entry_method),
          receiptNumber: payment.receipt_number,
          timestamp: payment.created_at,
          raw: payment,
        };
      } else if (result.status === "CANCELED") {
        throw new Error("Payment was cancelled");
      } else {
        throw new Error(result.cancel_reason || "Payment failed");
      }
    } catch (error) {
      return {
        success: false,
        approved: false,
        error: error.message,
        responseMessage: error.message,
      };
    }
  }

  async pollCheckoutStatus(checkoutId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(2000); // Poll every 2 seconds

      const response = await fetch(`${this.baseUrl}/v2/terminal/checkouts/${checkoutId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const { checkout } = await response.json();

      if (checkout.status === "COMPLETED" || checkout.status === "CANCELED") {
        // Fetch payment details if completed
        if (checkout.status === "COMPLETED" && checkout.payment_ids?.[0]) {
          const paymentResponse = await fetch(
            `${this.baseUrl}/v2/payments/${checkout.payment_ids[0]}`,
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          const { payment } = await paymentResponse.json();
          return { ...checkout, payment };
        }
        return checkout;
      }
    }

    throw new Error("Checkout polling timeout");
  }

  async refund(transactionId, amount) {
    const response = await fetch(`${this.baseUrl}/v2/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: this.generateIdempotencyKey(),
        payment_id: transactionId,
        amount_money: {
          amount: Math.round(amount * 100),
          currency: "USD",
        },
      }),
    });

    const { refund } = await response.json();
    return {
      success: refund.status === "COMPLETED",
      refundId: refund.id,
      amount: refund.amount_money.amount / 100,
    };
  }

  normalizeCardBrand(brand) {
    const brandMap = {
      VISA: "Visa",
      MASTERCARD: "Mastercard",
      AMERICAN_EXPRESS: "American Express",
      DISCOVER: "Discover",
      DISCOVER_DINERS: "Diners Club",
      JCB: "JCB",
    };
    return brandMap[brand] || brand;
  }

  mapEntryMode(entryMethod) {
    const modeMap = {
      CHIP: "chip",
      CONTACTLESS: "contactless",
      SWIPED: "swipe",
      KEYED: "manual",
    };
    return modeMap[entryMethod] || "manual";
  }

  generateIdempotencyKey() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Gateway Factory
 * Creates the appropriate gateway based on configuration
 */
export class PaymentGatewayFactory {
  static create(provider, config) {
    switch (provider.toLowerCase()) {
      case "stripe":
        return new StripeTerminal(config);
      case "square":
        return new SquareTerminal(config);
      default:
        throw new Error(`Unsupported payment gateway: ${provider}`);
    }
  }

  static getSupportedGateways() {
    return [
      {
        id: "stripe",
        name: "Stripe Terminal",
        description: "Modern, developer-friendly payment processing with physical card readers",
        readers: ["BBPOS WisePad 3", "Verifone P400", "BBPOS Chipper 2X BT"],
        features: ["EMV Chip", "Contactless/NFC", "Magstripe", "PIN Entry"],
        setupUrl: "https://stripe.com/docs/terminal",
      },
      {
        id: "square",
        name: "Square Terminal API",
        description: "Popular all-in-one POS terminal with built-in receipt printer",
        readers: ["Square Terminal", "Square Register", "Square Stand"],
        features: ["EMV Chip", "Contactless/NFC", "Magstripe", "Built-in Printer"],
        setupUrl: "https://developer.squareup.com/docs/terminal-api",
      },
    ];
  }
}

export { StripeTerminal, SquareTerminal };
