/**
 * Centralized API helper for Ready POS.
 * Connects React frontend to WordPress REST API using localized credentials.
 *
 * Custom error class so license-related rejections (HTTP 402) carry the
 * feature/resource metadata for upgrade-modal triggering.
 */

const getApiConfig = () => {
  if (typeof readyPosAdmin !== "undefined") {
    return {
      url: readyPosAdmin.apiUrl,
      nonce: readyPosAdmin.restNonce,
    };
  }

  // Fallback defaults for dev environments
  return {
    url: "/wp-json/ready-pos/v1",
    nonce: "",
  };
};

/**
 * Subscribe to license errors (HTTP 402) globally so a centralized handler
 * (e.g. the LicenseProvider) can open the upgrade modal automatically.
 */
const licenseErrorListeners = new Set();

export function onLicenseError(callback) {
  licenseErrorListeners.add(callback);
  return () => licenseErrorListeners.delete(callback);
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
    this.feature = data?.feature || null;
    this.resource = data?.resource || null;
    this.limit = data?.limit ?? null;
  }
}

export const api = {
  async request(endpoint, options = {}) {
    const config = getApiConfig();
    const baseUrl = config.url;
    const [endpointPath, endpointQuery] = endpoint.split("?");
    const cleanEndpointPath = endpointPath.replace(/^\/+/, "");

    let url;
    if (baseUrl.includes("?")) {
      const [baseLeft, baseQuery] = baseUrl.split("?");
      const params = new URLSearchParams(baseQuery);
      const restRoute = params.get("rest_route");

      if (restRoute) {
        const cleanRestRoute = restRoute.replace(/\/+$/, "") + "/" + cleanEndpointPath;
        params.set("rest_route", cleanRestRoute);
      }

      if (endpointQuery) {
        const endpointParams = new URLSearchParams(endpointQuery);
        endpointParams.forEach((value, key) => {
          params.set(key, value);
        });
      }

      const queryParts = [];
      params.forEach((value, key) => {
        if (key === "rest_route") {
          const encodedValue = value
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
          queryParts.push(`${key}=${encodedValue}`);
        } else {
          queryParts.push(`${key}=${encodeURIComponent(value)}`);
        }
      });

      url = `${baseLeft.replace(/\/+$/, "")}?${queryParts.join("&")}`;
    } else {
      const base = baseUrl.replace(/\/+$/, "");
      url = `${base}/${cleanEndpointPath}`;
      if (endpointQuery) {
        url += `?${endpointQuery}`;
      }
    }

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (config.nonce) {
      headers["X-WP-Nonce"] = config.nonce;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || 30000,
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `Request failed with status ${response.status}`;
        const errorPayload = errorData.data || {};

        // 402 = Payment Required — license / quota error. Notify subscribers
        // before throwing so they can open the upgrade modal.
        if (response.status === 402 && !options.skipLicenseTrigger) {
          for (const cb of licenseErrorListeners) {
            try {
              cb({
                feature: errorPayload.feature || null,
                resource: errorPayload.resource || null,
                limit: errorPayload.limit ?? null,
                message: errorMessage,
              });
            } catch {
              // Swallow listener errors so they don't mask the API error.
            }
          }
        }

        throw new ApiError(errorMessage, response.status, errorPayload);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error.name === "AbortError") {
        throw new ApiError("Request timeout", 408, {});
      }

      throw error;
    }
  },

  get(endpoint, params = {}) {
    const query = Object.keys(params)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: "GET" });
  },

  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export { ApiError };
