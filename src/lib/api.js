/**
 * Centralized API helper for Ready POS.
 * Connects React frontend to WordPress REST API using localized credentials.
 *
 * Custom error class for consistent error handling.
 */

const getApiConfig = () => {
  if (typeof readypos_admin !== "undefined") {
    return {
      url: readypos_admin.apiUrl,
      nonce: readypos_admin.restNonce,
    };
  }

  // Fallback defaults for dev environments
  return {
    url: "/wp-json/readypos/v1",
    nonce: "",
  };
};

class ApiError extends Error {
  constructor(message, status, data, code) {
    super(message);
    this.status = status;
    this.data = data || {};
    this.code = code || "";
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
        const errorCode = errorData.code || "";

        throw new ApiError(errorMessage, response.status, errorPayload, errorCode);
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

  delete(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "DELETE",
      body: JSON.stringify(data),
    });
  },
};

export { ApiError };
