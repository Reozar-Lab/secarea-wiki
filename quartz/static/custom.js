// quartz/static/custom.js
(function() {
    function sendPathToMain() {
        // 获取当前 URL 路径，例如 /人物设定/法登
        let path = window.location.pathname;
        
        // 处理根路径
        if (path === '/' || path.endsWith('/')) {
            path += 'index';
        }
        
        // Quartz 的路由有时不带 .md，如果你 GitHub 里存在 .md，这里自动补上
        if (!path.endsWith('.md')) {
            path += '.md';
        }

        // 去掉开头的斜杠，匹配 GitHub 仓库路径
        path = path.replace(/^\//, '');

        // 将当前路径发送给父级窗口（主站）
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'wiki_path_change', path: path }, '*');
        }
    }

    // 1. 页面首次加载时发送
    window.addEventListener('load', sendPathToMain);
    
    // 2. 监听浏览器的前进/后退
    window.addEventListener('popstate', sendPathToMain);
    
    // 3. 兼容 Quartz 的 SPA 内部路由（使用 MutationObserver 监听页面变化）
    // 如果开启了 SPA，URL 变了但页面没刷新，我们需要定时检查 URL 变化
    let lastPath = window.location.pathname;
    setInterval(() => {
        if (window.location.pathname !== lastPath) {
            lastPath = window.location.pathname;
            sendPathToMain();
        }
    }, 500);
})();