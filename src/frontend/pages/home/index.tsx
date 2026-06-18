import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
  TrendingUp,
  Zap,
  Shield,
  Smartphone,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function ReadyPOSLanding() {
  const features = [
    {
      icon: Store,
      title: "Multi-Outlet Management",
      description:
        "Manage multiple store locations, registers, and staff from a unified dashboard.",
    },
    {
      icon: ShoppingCart,
      title: "Fast Checkout",
      description:
        "Lightning-fast POS terminal with barcode scanning and quick checkout.",
    },
    {
      icon: Users,
      title: "Customer Management",
      description:
        "Build customer profiles, track purchase history, and manage loyalty programs.",
    },
    {
      icon: CreditCard,
      title: "Flexible Payments",
      description:
        "Accept cash, cards, and digital payments with integrated WooCommerce gateways.",
    },
    {
      icon: Package,
      title: "Inventory Control",
      description:
        "Real-time stock tracking, low-stock alerts, and automated inventory management.",
    },
  ];

  const benefits = [
    "Seamless WooCommerce Integration",
    "Receipt Printing",
    "Discount & Coupon Support",
    "Refund Processing",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Ready POS</h1>
              <p className="text-[10px] text-muted-foreground">
                WooCommerce Point of Sale
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a
              className="text-sm font-medium hover:text-primary transition-colors"
              href="#features">
              Features
            </a>
            <a
              className="text-sm font-medium hover:text-primary transition-colors"
              href="#benefits">
              Benefits
            </a>
            <a
              className="text-sm font-medium hover:text-primary transition-colors"
              href="https://wordpress.org/support/plugin/ready-pos/"
              target="_blank"
              rel="noopener noreferrer">
              Support
            </a>
          </nav>
          <Button size="sm" className="font-bold">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              <Badge
                variant="secondary"
                className="text-xs font-bold uppercase px-4 py-1.5">
                <Zap className="mr-1.5 h-3 w-3" />
                Professional WooCommerce POS Solution
              </Badge>

              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Transform Your Retail Operations
                </h1>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
                  A complete Point of Sale system built for WooCommerce. Manage
                  sales, inventory, and customers with enterprise-grade features
                  in a modern, intuitive interface.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="font-bold text-base px-8">
                  <Store className="mr-2 h-5 w-5" />
                  Access Dashboard
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold text-base px-8">
                  <Store className="mr-2 h-5 w-5" />
                  Get Started
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8 border-t w-full max-w-2xl">
                <div>
                  <div className="text-3xl font-black text-primary">v1.0</div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Stable Release
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-primary">GPLv2</div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Open Source
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-primary">Free</div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Forever
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                Features
              </Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl mb-4">
                Everything You Need to Run Your Store
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built with modern technology and designed for performance,
                scalability, and ease of use.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-bold">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <Badge variant="outline">Benefits</Badge>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                  Built for Modern Retail
                </h2>
                <p className="text-muted-foreground text-lg">
                  Ready POS combines the power of WooCommerce with professional
                  point-of-sale features, giving you complete control over your
                  retail operations.
                </p>

                <div className="grid gap-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button size="lg" className="font-bold mt-4">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4">
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle>Enterprise Security</CardTitle>
                        <CardDescription>
                          Bank-level encryption and data protection
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle>Mobile Responsive</CardTitle>
                        <CardDescription>
                          Works perfectly on tablets and mobile devices
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle>Scalable Architecture</CardTitle>
                        <CardDescription>
                          Grows with your business from 1 to 100+ locations
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl max-w-3xl">
                Ready to Modernize Your Point of Sale?
              </h2>
              <p className="max-w-2xl text-lg text-primary-foreground/90">
                Join hundreds of retailers who trust Ready POS for their daily
                operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="font-bold text-base px-8">
                  <Store className="mr-2 h-5 w-5" />
                  Get Started Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold text-base px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Store className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-black text-lg">Ready POS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional WooCommerce Point of Sale solution for modern
                retailers.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#features"
                    className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#benefits"
                    className="hover:text-foreground transition-colors">
                    Benefits
                  </a>
                </li>

                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://wordpress.org/plugins/ready-pos/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors">
                    License
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © 2024 Ready POS. Released under the{" "}
              <a
                href="https://wordpress.org/plugins/ready-pos/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors font-semibold">
                GPLv2 or later
              </a>
              .
            </p>
            <div className="flex gap-4">
              <Badge variant="outline" className="text-xs">
                v1.0.0
              </Badge>
              <Badge variant="outline" className="text-xs">
                GPLv2 License
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
