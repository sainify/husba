const config = window.HUSBA_CONFIG || {
  API_BASE: "",
  DEMO_MODE: true,
};

const apiBase = String(config.API_BASE || "").replace(/\/$/, "");
const ADMIN_TOKEN_KEY = "husba_admin_session";
let memoryAdminToken = "";

const openSessionDatabase = () => new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) {
    resolve(null);
    return;
  }
  const request = indexedDB.open("husba_admin", 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains("session")) request.result.createObjectStore("session");
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const readSessionBackup = async () => {
  const db = await openSessionDatabase();
  if (!db) return "";
  return new Promise((resolve, reject) => {
    const request = db.transaction("session", "readonly").objectStore("session").get(ADMIN_TOKEN_KEY);
    request.onsuccess = () => resolve(String(request.result || ""));
    request.onerror = () => reject(request.error);
  });
};

const writeSessionBackup = async (token) => {
  const db = await openSessionDatabase();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const store = db.transaction("session", "readwrite").objectStore("session");
    const request = token ? store.put(token, ADMIN_TOKEN_KEY) : store.delete(ADMIN_TOKEN_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getAdminToken = () => {
  if (memoryAdminToken) return memoryAdminToken;
  try {
    const persistentToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    if (persistentToken) {
      memoryAdminToken = persistentToken;
      return persistentToken;
    }
    const legacyToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
    if (legacyToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, legacyToken);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    memoryAdminToken = legacyToken;
    return legacyToken;
  } catch {
    return "";
  }
};

const sessionReady = readSessionBackup().then((backupToken) => {
  if (!getAdminToken() && backupToken) {
    memoryAdminToken = backupToken;
    try { localStorage.setItem(ADMIN_TOKEN_KEY, backupToken); } catch { /* IndexedDB remains the fallback. */ }
  }
}).catch(() => {});

export const setAdminToken = (token) => {
  memoryAdminToken = String(token || "");
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Private browsing may block browser storage.
  }
  writeSessionBackup(memoryAdminToken).catch(() => {});
};

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const request = async (pathname, options = {}) => {
  if (pathname.startsWith("/api/admin")) await sessionReady;
  const headers = new Headers(options.headers || {});

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  if (
    pathname.startsWith("/api/admin") &&
    getAdminToken()
  ) {
    headers.set(
      "Authorization",
      `Bearer ${getAdminToken()}`
    );
  }

  let response;

  try {
    response = await fetch(`${apiBase}${pathname}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    throw new ApiError(
      "The website service is temporarily unreachable. Please try again.",
      0,
      error
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  const body = contentType.includes("application/json")
    ? await response.json()
    : null;

  // The Worker refreshes the long-lived admin session when /session is checked.
  // Persist that refreshed token so reopening the PWA does not sign the admin out.
  if (response.ok && pathname === "/api/admin/session" && body?.token) {
    setAdminToken(body.token);
  }

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ||
        "The request could not be completed.",
      response.status,
      body?.error?.details
    );
  }

  return body;
};

let demoPromise;

const getDemo = () => {
  demoPromise ||= fetch("/data/demo.json").then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          "Demo catalogue is unavailable."
        );
      }

      return response.json();
    }
  );

  return demoPromise;
};

const withDemoFallback = async (
  apiCall,
  select
) => {
  try {
    return await apiCall();
  } catch (error) {
    if (
      !config.DEMO_MODE ||
      (error.status && error.status !== 404)
    ) {
      throw error;
    }

    const demo = await getDemo();

    return {
      ...select(demo),
      source: "demo",
    };
  }
};

export const api = {
  getBootstrap() {
    return withDemoFallback(
      () => request("/api/bootstrap"),
      (demo) => ({
        settings: demo.settings,
        categories: demo.categories,
        products: demo.products.filter(
          (product) => product.is_featured
        ),
        videos: demo.videos,
        reviews: demo.reviews,
      })
    );
  },

  getProducts(filters = {}) {
    const query = new URLSearchParams();

    Object.entries(filters).forEach(
      ([key, value]) => {
        if (
          value !== "" &&
          value !== null &&
          value !== undefined
        ) {
          query.set(key, String(value));
        }
      }
    );

    return withDemoFallback(
      () =>
        request(
          `/api/products${
            query.size ? `?${query}` : ""
          }`
        ),
      (demo) => {
        let products = [...demo.products];

        if (filters.category) {
          products = products.filter(
            (item) =>
              item.category_slug ===
              filters.category
          );
        }

        if (filters.search) {
          const needle = String(
            filters.search
          ).toLowerCase();

          products = products.filter(
            (item) =>
              `${item.name} ${
                item.product_code
              } ${item.description}`
                .toLowerCase()
                .includes(needle)
          );
        }

        if (filters.featured) {
          products = products.filter(
            (item) => item.is_featured
          );
        }

        return {
          products,
          total: products.length,
          categories: demo.categories,
        };
      }
    );
  },

  getProduct(slug) {
    return withDemoFallback(
      () =>
        request(
          `/api/products/${encodeURIComponent(
            slug
          )}`
        ),
      (demo) => {
        const product = demo.products.find(
          (item) => item.slug === slug
        );

        if (!product) {
          throw new ApiError(
            "Product not found.",
            404
          );
        }

        const related = demo.products
          .filter(
            (item) =>
              item.id !== product.id &&
              item.category_slug ===
                product.category_slug
          )
          .slice(0, 3);

        return {
          product,
          related,
        };
      }
    );
  },

  getVideos() {
    return withDemoFallback(
      () => request("/api/videos"),
      (demo) => ({
        videos: demo.videos,
      })
    );
  },

  submitEnquiry(payload) {
    return request("/api/enquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  admin(pathname, options = {}) {
    return request(
      `/api/admin${pathname}`,
      options
    );
  },

  login(email, password) {
    return request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });
  },

  logout() {
    return request("/api/admin/logout", {
      method: "POST",
    });
  },
};

export const isApiConfigured = () =>
  Boolean(apiBase) || !config.DEMO_MODE;
