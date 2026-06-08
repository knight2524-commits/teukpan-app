// 특판 재고관리 서비스워커
// HTML(화면)은 '네트워크 우선' → 새 버전을 올리면 온라인 사용자는 즉시 최신 화면을 받습니다.
// 정적 자원(아이콘/매니페스트 등)은 '캐시 우선' → 빠르게 로드.
// 캐시 버전을 올리면(activate 시) 이전 캐시는 자동 삭제됩니다.
var CACHE = 'teukpan-cache-v3';
var ASSETS = ['./', './index.html', './manifest.json', './icon-192.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);})); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url;
  try{ url = new URL(req.url); }catch(_){ return; }

  // 외부 도메인(파이어베이스/CDN/구글폰트 등)은 서비스워커가 가로채지 않음
  if(url.origin !== location.origin) return;

  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if(isHTML){
    // 화면(HTML): 네트워크 우선 → 항상 최신, 오프라인이면 캐시로 폴백
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
  } else {
    // 정적 자원: 캐시 우선, 없으면 네트워크 후 캐시에 저장
    e.respondWith(
      caches.match(req).then(function(r){
        return r || fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
          return res;
        });
      })
    );
  }
});
