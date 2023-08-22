const staticCacheName = 'site-static-v2';
const dynamicCacheName = 'site-dynamic-v1';
const assets = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/ui.js',
  '/js/materialize.min.js',
  '/css/styles.css',
  '/css/materialize.min.css',
  '/img/dish.png',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v47/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
  '/pages/fallback.html'
];


// cache size limit function
const limitCacheSize = (name, size) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if(keys.length > size){
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    });
  });
};

// install event
self.addEventListener('install', evt => {
  //console.log('service worker installed');
  evt.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      console.log('caching shell assets');
      cache.addAll(assets);
    })
  );
});

// activate event
self.addEventListener('activate', evt => {
  //console.log('service worker activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      //console.log(keys);
      return Promise.all(keys
        .filter(key => key !== staticCacheName && key !== dynamicCacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});

// fetch event
self.addEventListener('fetch', evt => {
  //console.log('fetch event', evt);
  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      return cacheRes || fetch(evt.request).then(fetchRes => {
        return caches.open(dynamicCacheName).then(cache => {
          cache.put(evt.request.url, fetchRes.clone());
          // check cached items size
          limitCacheSize(dynamicCacheName, 15);
          return fetchRes;
        })
      });
    }).catch(() => {
      if(evt.request.url.indexOf('.html') > -1){
        return caches.match('/pages/fallback.html');
      } 
    })
  );
});


// Function to request subscription permission
function askForSubscriptionPermission() {
  return new Promise((resolve, reject) => {
      if (!('showNotification' in self.registration) || !('PushManager' in self)) {
          return reject(new Error('Notifications or Push API are not supported in this browser.'));
      }

      self.registration.showNotification('Permission Request', {
          body: 'Allow notifications?',
          tag: 'permission-request',
          actions: [
              { action: 'allow', title: 'Allow', icon: 'path/to/allow-icon.png' },
              { action: 'deny', title: 'Deny', icon: 'path/to/deny-icon.png' }
          ]
      });

      // Listen for the user's response to the notification
      self.addEventListener('notificationclick', function(event) {
          const action = event.action;
          if (action === 'allow') {
              resolve();
          } else {
              reject(new Error('Permission denied for notifications.'));
          }
          event.notification.close();
      });
  });
}

// Check permission and ask for subscription if not granted
if (Notification.permission !== 'granted') {
  askForSubscriptionPermission()
      .then(() => {
          // Subscription permission granted, you can now proceed with other notification logic
      })
      .catch(error => {
          console.error('Error while requesting subscription permission:', error);
      });
}

// Rest of the code (push event and notificationclick event) remains unchanged...


// notification
if (Notification.permission !== 'granted') {
  Notification.requestPermission();
}

self.addEventListener('push', function (e) {
  const data = e.data.json();
  const { title, body, icon, vibrate, actions } = data;

  const options = {
      body,
      icon,
      vibrate,
      data: {
          dateOfArrival: Date.now(),
          primaryKey: '2'
      },
      actions,
  };

  e.waitUntil(
      self.registration.showNotification(title, options)
  );
});


// Notification click action (To open AskAnjlee website)
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('https://app.askanjlee.com')
  )
});

// Cancel the subscription
self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
      fetch('/unsubscribe', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              endpoint: event.newSubscription.endpoint
          })
      })
      .then((response) => response.json())
      .then((data) => {
          console.log('Subscription canceled:', data.message);
      })
      .catch((error) => {
          console.error('Failed to cancel subscription:', error);
      })
  );
});