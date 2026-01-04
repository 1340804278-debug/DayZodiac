// 365 Pony Diary - Service Worker
const CACHE_NAME = 'pony-diary-v3';
const ASSETS = [
    '/',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 安装事件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 正在缓存应用资源...');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('✅ 资源缓存完成');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ 缓存失败:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('🗑️ 清理旧缓存:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('🔄 Service Worker 激活完成');
            return self.clients.claim();
        })
    );
});

// 拦截请求
self.addEventListener('fetch', event => {
    // 只处理同源请求
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // 忽略非GET请求
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果缓存中有，直接返回
                if (response) {
                    return response;
                }
                
                // 否则从网络获取
                return fetch(event.request)
                    .then(networkResponse => {
                        // 检查是否有效的响应
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        
                        // 克隆响应并缓存
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return networkResponse;
                    })
                    .catch(() => {
                        // 网络失败，返回离线页面
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // 返回自定义离线消息
                        return new Response(
                            '<h3>🐴 离线模式</h3><p>请检查网络连接</p>',
                            {
                                headers: { 'Content-Type': 'text/html' }
                            }
                        );
                    });
            })
    );
});

// 监听消息
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});