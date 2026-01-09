// Service Worker placeholder
// This file prevents 404 errors for /sw.js requests
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
