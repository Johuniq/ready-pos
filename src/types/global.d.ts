// Global type declarations for WordPress plugin

interface UserInfo {
  username: string;
  avatar: string;
  roles: string[];
}

interface CurrencyData {
  symbol: string;
  code: string;
  position: string;
  decimals: number;
  thousand: string;
  decimal: string;
}

interface LicenseData {
  status: string;
  key?: string;
  expires?: string;
  [key: string]: any;
}

interface ReadyPosAdminData {
  isAdmin: boolean;
  apiUrl: string;
  restNonce: string;
  userInfo: UserInfo;
  currency: CurrencyData;
  onboardingComplete: boolean;
  license: LicenseData;
  upgradeUrl: string;
}

declare global {
  interface Window {
    readyPosAdmin: ReadyPosAdminData;
  }

  const readyPosAdmin: ReadyPosAdminData;
}

export {};
