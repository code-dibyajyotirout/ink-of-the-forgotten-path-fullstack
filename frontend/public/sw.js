const isLocalhost = 
  self.location.hostname === "localhost" || 
  self.location.hostname === "127.0.0.1" || 
  self.location.hostname.startsWith("192.168.") ||
  self.location.hostname.startsWith("172.");

if (isLocalhost) {
  self.addEventListener("install", () => {
    self.skipWaiting();
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).then(() => {
        return self.registration.unregister();
      }).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          try {
            client.navigate(client.url);
          } catch {
            // Ignore navigation issues
          }
        });
      })
    );
  });
} else {
  const CACHE_NAME = "ink-path-cache-v1";
  const STATIC_ASSETS = [
    "/",
    "/game",
    "/create",
    "/manifest.json",
    "/favicon.ico",
    "/favicon.png",
    "/icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/apple-touch-icon.png",
    "/og-image.png"
  ];

  // Install Service Worker
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log("[Service Worker] Caching app shell");
        return cache.addAll(STATIC_ASSETS);
      })
    );
    self.skipWaiting();
  });

  // Activate Service Worker and clear old caches
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("[Service Worker] Clearing old cache:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
    );
    self.clients.claim();
  });

  // Fetch Interceptor
  self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    // Exclude non-GET requests and external API/Dev-Server hot reloading requests
    if (
      event.request.method !== "GET" ||
      requestUrl.pathname.startsWith("/_next/webpack-hmr") ||
      event.request.url.includes("webpack")
    ) {
      return;
    }

    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch in background to update cache (Stale-While-Revalidate)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background fetch errors
            });
          return cachedResponse;
        }

        // Network Fallback with Runtime Caching
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
              return networkResponse;
            }

            // Cache valid resources on the fly
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // If offline and request is page navigation, return cached root/home
            if (event.request.mode === "navigate") {
              return caches.match("/");
            }
          });
      })
    );
  });
}
