import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import LicenseBanner from "@/admin/components/LicenseBanner";

export default function LayoutOne() {
  // Determine context (admin vs frontend)
  const isAdmin =
    typeof readypos_admin !== "undefined" ? readypos_admin.isAdmin : true;
  const showApplicationLayout = !isAdmin;
  const isCashier =
    typeof readypos_admin !== "undefined" &&
    readypos_admin.userInfo?.roles?.includes("pos_cashier");

  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = location.pathname.split("/")[1];

  useEffect(() => {
    if (isCashier) {
      // Cashier role lockdown: lock cashiers in the terminal view
      const restrictedPaths = [
        "",
        "dashboard",
        "orders",
        "reports",
        "outlets",
        "settings",
        "customers",
        "hardware",
        "license",
        "staff",
      ];
      if (restrictedPaths.includes(pageTitle || "")) {
        navigate("terminal");
        if (
          pageTitle &&
          pageTitle !== "terminal" &&
          pageTitle !== "customer-display"
        ) {
          toast.error(
            "Access denied. Standard cashiers are restricted from back-office areas.",
          );
        }
      }
    } else {
      // Check if onboarding is needed
      const onboardingComplete =
        typeof readypos_admin !== "undefined"
          ? readypos_admin.onboardingComplete
          : true;

      if (!onboardingComplete && pageTitle !== "onboarding") {
        navigate("onboarding");
        return;
      }

      // Standard Shop Manager / Admin redirect
      if (!pageTitle || pageTitle === "") {
        navigate("dashboard");
      }
    }
  }, [pageTitle, navigate, isCashier]);

  // Handle full-screen layout styles for WP admin area
  useEffect(() => {
    if (isAdmin) {
      const isTerminal = location.pathname.includes("/terminal");
      const wpWrap = document.getElementById("wpwrap");

      if (isTerminal) {
        document.body.classList.add("readypos-terminal-active");
        if (wpWrap) wpWrap.classList.add("readypos-terminal-active-wrap");

        // Add absolute style overrides to completely hide WP UI elements
        const styleId = "readypos-fullscreen-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.innerHTML = `
                        .readypos-terminal-active #adminmenuback,
                        .readypos-terminal-active #adminmenuwrap,
                        .readypos-terminal-active #wpadminbar,
                        .readypos-terminal-active #wpfooter {
                            display: none !important;
                        }
                        .readypos-terminal-active #wpcontent {
                            margin-left: 0 !important;
                            padding: 0 !important;
                        }
                        .readypos-terminal-active #wpbody-content {
                            padding-bottom: 0 !important;
                        }
                        .readypos-terminal-active #wpbody {
                            padding-top: 0 !important;
                        }
                        /* Remove WordPress admin bottom padding globally */
                        #wpbody-content {
                            padding-bottom: 0 !important;
                        }
                        #wpfooter {
                            display: none !important;
                        }
                        .readypos-terminal-active .readypos-app, 
                        .readypos-terminal-active #myplugin {
                            height: 100vh !important;
                            width: 100vw !important;
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            z-index: 99999 !important;
                            background: hsl(var(--background)) !important;
                        }
                        /* Dark mode fullscreen override */
                        .dark.readypos-terminal-active .readypos-app {
                            background: hsl(var(--background)) !important;
                        }
                        
                        /* Ensure all Radix portals (Modals, Dropdowns, Selects), toasts, and overlays render on top of the fullscreen terminal (z-index 99999) */
                        [data-radix-portal] {
                            z-index: 100000 !important;
                        }
                        [data-sonner-toaster] {
                            z-index: 100001 !important;
                        }
                        .readypos-terminal-active .fixed.z-50 {
                            z-index: 100000 !important;
                        }
                    `;
          document.head.appendChild(style);
        }
      } else {
        document.body.classList.remove("readypos-terminal-active");
        if (wpWrap) wpWrap.classList.remove("readypos-terminal-active-wrap");
      }
    }
  }, [location.pathname, isAdmin]);

  return (
    <div className="w-full min-h-screen bg-background font-sans antialiased text-foreground flex flex-col">
      {/* Hide the banner inside the fullscreen POS terminal, where space is precious */}
      {!location.pathname.includes("/terminal") &&
        !location.pathname.includes("/customer-display") &&
        !location.pathname.includes("/onboarding") && <LicenseBanner />}
      <main className="w-full flex-1">
        <Outlet />
      </main>
      {/* App footer — hidden on terminal/onboarding */}
      {!location.pathname.includes("/terminal") &&
        !location.pathname.includes("/customer-display") &&
        !location.pathname.includes("/onboarding") && (
          <footer className="border-t px-6 py-3 flex items-center justify-between text-[11px] text-muted-foreground bg-background mt-auto">
            <span>
              Ready POS v
              {typeof readypos_admin !== "undefined" && readypos_admin.version
                ? readypos_admin.version
                : "1.0.0"}{" "}
              — Professional WooCommerce Point of Sale
            </span>
            <a
              href="https://johuniq.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-semibold">
              Built by Johuniq
            </a>
          </footer>
        )}
    </div>
  );
}
