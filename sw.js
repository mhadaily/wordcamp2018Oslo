var CACHE_STATIC_NAME = 'wp-pwa-static_v1';
var CACHE_DYNAMIC_NAME = 'wp-pwa-dynamic_v1';

var STATIC_ASSETS = [
  '/',
  '/home.html',
  '/whatever.html',
  '/cssfile.css',
  '/jsfile.js',
  `${__myconfig.themeUrl}/scripts/jsfile.js`,
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
];

self.addEventListener('install', (event) => {
  // console.log('[SW] Installing Service Worker ...', event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
    .then((cache) => {
      console.log('[SW] Precaching App Shell');
      return cache.addAll(STATIC_ASSETS);
    })
    .catch((e) => {
      console.error('[SW] Precaching Error!', e);
    })
  );
});

self.addEventListener('activate', function (event) {
  // console.log('[SW] Activating Service Worker ....', event);
  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            // console.log('[SW] Removing old cache.', key);
            return caches.delete(key);
          }
        }));
    }));
  return self.clients.claim();
});

function isIncluded(string, array) {
  var path;
  if (string.indexOf(self.origin) === 0) {
    // request for same domain (i.e. NOT a CDN)
    path = string.substring(self.origin.length);
  } else {
    // for CDNs
    path = string;
  }
  return array.includes(path);
}

var isGoogleFont = function (request) {
  return request.url.indexOf(GOOGLE_FONT_URL) === 0;
};

var cacheGFonts = function (request) {
  return fetch(request)
    .then(function (newRes) {
      caches
        .open(CACHE_DYNAMIC_NAME)
        .then(function (cache) {
          // you can also Remove other old fonts here if you want
          cache.put(request, newRes);
        });
      return newRes.clone();
    });
};


self.addEventListener('fetch', (event) => {
  var request = event.request;
  // cacheOnly for statics assets
  if (isIncluded(request.url, STATIC_ASSETS)) {
    event.respondWith(caches.match(request));
  }
  // Runtime or Dynamic cache for google fonts
  if (isGoogleFont(request)) {
    event.respondWith(
      caches.match(request)
      .then(function (res) {
        return res || cacheGFonts(request);
      })
    );
  }
});

// Example to check request url
function isPluginRequest(event) {
  return new URL(event.request.url).pathname.startsWith('/wp-content/plugins');
}

function isWpRequest(event) {
  const parsedUrl = new URL(event.request.url);
  return /^\/wp-/i.test(parsedUrl.pathname) && !parsedUrl.pathname.startsWith('/wp-content');
}

function isCommentRequest(event) {
  return event.request.method === 'POST' &&
    new URL(event.request.url).pathname === '/wp-comments-post.php';
}
