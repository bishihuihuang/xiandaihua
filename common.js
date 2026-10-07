/* 现代化学习站 - 公共脚本
 * 仅负责 Service Worker 注册（离线缓存支持）。
 * 注意：本站是教学站，课程包含 F12 开发者工具与右键查看源码等操作，
 * 因此不做任何"禁右键/禁 F12"限制——以身作则。 */
(function () {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('service-worker.js').catch(function (err) {
                // 本地 file:// 打开时 SW 不可用，属正常情况，静默忽略
            });
        });
    }
})();
