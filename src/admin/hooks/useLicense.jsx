import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { api, onLicenseError } from "@/lib/api";

const LicenseContext = createContext(null);

const initialFromGlobal = () => {
  if (typeof readypos_admin !== "undefined" && readypos_admin.license) {
    return readypos_admin.license;
  }
  return {
    plan: "free",
    status: "free",
    isPro: false,
    isExpired: false,
    isGrace: false,
    expiresAt: null,
    daysRemaining: null,
    maskedKey: "",
    licenseType: "",
    sitesUsed: 0,
    sitesMax: -1,
    usageCount: 0,
    usageLimit: -1,
    validations: 0,
    billingInterval: "",
    renewsAt: "",
    renewalStatus: "",
    isTrial: false,
    trialStart: "",
    trialEnd: "",
    trialDaysRemaining: null,
    customer: {},
    portalUrl: "",
    isConfigured: false,
    features: {},
    limits: {},
    usage: {},
  };
};

export function LicenseProvider({ children }) {
  const [license, setLicense] = useState(initialFromGlobal);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState({
    feature: null,
    resource: null,
    limit: null,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/license/get");
      setLicense(data);
      if (typeof readypos_admin !== "undefined") {
        readypos_admin.license = data;
      }
    } catch (err) {
      
    }
  }, []);

  const can = useCallback(
    (feature) => {
      if (!feature) return true;
      if (!(feature in license.features)) return true;
      return !!license.features[feature];
    },
    [license],
  );

  const canCreate = useCallback(
    (resource) => {
      const limit = license.limits?.[resource];
      if (limit === undefined || limit < 0) return true;
      const used = license.usage?.[resource] || 0;
      return used < limit;
    },
    [license],
  );

  const getRemaining = useCallback(
    (resource) => {
      const limit = license.limits?.[resource];
      if (limit === undefined || limit < 0) return Infinity;
      const used = license.usage?.[resource] || 0;
      return Math.max(0, limit - used);
    },
    [license],
  );

  const requireFeature = useCallback(
    (feature) => {
      if (can(feature)) return true;
      setUpgradeReason({ feature, resource: null, limit: null });
      setUpgradeOpen(true);
      return false;
    },
    [can],
  );

  const requireQuota = useCallback(
    (resource) => {
      if (canCreate(resource)) return true;
      const limit = license.limits?.[resource] ?? 0;
      setUpgradeReason({ feature: null, resource, limit });
      setUpgradeOpen(true);
      return false;
    },
    [canCreate, license],
  );

  const closeUpgrade = useCallback(() => {
    setUpgradeOpen(false);
    setUpgradeReason({ feature: null, resource: null, limit: null });
  }, []);

  const openUpgrade = useCallback((feature) => {
    setUpgradeReason({ feature, resource: null, limit: null });
    setUpgradeOpen(true);
  }, []);

  // Auto-open upgrade modal on backend 402 errors.
  useEffect(() => {
    return onLicenseError(({ feature, resource, limit }) => {
      setUpgradeReason({ feature, resource, limit });
      setUpgradeOpen(true);
      refresh();
    });
  }, [refresh]);

  const activate = useCallback(async (key) => {
    const res = await api.post("/license/activate", { key });
    if (res?.success && res?.data) {
      setLicense(res.data);
      if (typeof readypos_admin !== "undefined") {
        readypos_admin.license = res.data;
      }
      return true;
    }
    return false;
  }, []);

  const deactivate = useCallback(async () => {
    const res = await api.post("/license/deactivate", {});
    if (res?.success && res?.data) {
      setLicense(res.data);
      if (typeof readypos_admin !== "undefined") {
        readypos_admin.license = res.data;
      }
      return true;
    }
    return false;
  }, []);

  const revalidate = useCallback(async () => {
    const res = await api.post("/license/revalidate", {});
    if (res?.success && res?.data) {
      setLicense(res.data);
      if (typeof readypos_admin !== "undefined") {
        readypos_admin.license = res.data;
      }
      return true;
    }
    return false;
  }, []);

  const fetchAudit = useCallback(async () => {
    try {
      return await api.get("/license/audit");
    } catch {
      return [];
    }
  }, []);

  const value = {
    license,
    plan: license.plan,
    status: license.status,
    isPro: license.isPro,
    isExpired: license.isExpired,
    isGrace: license.isGrace,
    expiresAt: license.expiresAt,
    daysRemaining: license.daysRemaining,
    maskedKey: license.maskedKey,
    licenseType: license.licenseType,
    sitesUsed: license.sitesUsed,
    sitesMax: license.sitesMax,
    usageCount: license.usageCount,
    usageLimit: license.usageLimit,
    validations: license.validations,
    billingInterval: license.billingInterval,
    renewsAt: license.renewsAt,
    renewalStatus: license.renewalStatus,
    isTrial: license.isTrial,
    trialStart: license.trialStart,
    trialEnd: license.trialEnd,
    trialDaysRemaining: license.trialDaysRemaining,
    customer: license.customer,
    portalUrl: license.portalUrl,
    isConfigured: license.isConfigured,
    features: license.features,
    limits: license.limits || {},
    usage: license.usage || {},
    can,
    canCreate,
    getRemaining,
    requireFeature,
    requireQuota,
    upgradeOpen,
    upgradeReason,
    openUpgrade,
    closeUpgrade,
    refresh,
    activate,
    deactivate,
    revalidate,
    fetchAudit,
  };

  return (
    <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    const fallback = initialFromGlobal();
    return {
      ...fallback,
      license: fallback,
      can: () => true,
      canCreate: () => true,
      getRemaining: () => Infinity,
      requireFeature: () => true,
      requireQuota: () => true,
      upgradeOpen: false,
      upgradeReason: { feature: null, resource: null, limit: null },
      openUpgrade: () => {},
      closeUpgrade: () => {},
      refresh: async () => {},
      activate: async () => false,
      deactivate: async () => false,
      revalidate: async () => false,
      fetchAudit: async () => [],
    };
  }
  return ctx;
}
