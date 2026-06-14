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

interface ReadyPosAdminData {
  isAdmin: boolean;
  apiUrl: string;
  restNonce: string;
  userInfo: UserInfo;
  currency: CurrencyData;
  onboardingComplete: boolean;
  pluginUrl: string;
  assetsUrl: string;
  version?: string;
  logoutUrl?: string;
}

declare global {
  interface Window {
    readypos_admin: ReadyPosAdminData;
  }

  const readypos_admin: ReadyPosAdminData;
}

export {};
