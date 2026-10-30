// ... 前面 imports 不变 ...
import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"

export default (() => {
  const Head: QuartzComponent = ({ cfg, fileData, externalResources, ctx }: QuartzComponentProps) => {
    // ... 前面的变量提取保持不变 ...
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const title = (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
    const description = fileData.frontmatter?.socialDescription ?? fileData.frontmatter?.description ?? unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)
    const { css, js, additionalHead } = externalResources
    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")
    const socialUrl = fileData.slug === "404" ? url.toString() : joinSegments(url.toString(), fileData.slug!)
    const usesCustomOgImage = ctx.cfg.plugins.emitters.some((e) => e.name === "CustomOgImages")
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`
    const coreStylesheet = css[0]?.content
    const coreScript = js.find((r) => r.loadTime === "beforeDOMReady" && r.contentType === "external")

    return (
      <head>
        {/* ... 所有原本的 <head> 标签不变 ... */}
        <title>{title}</title>
        <meta charSet="utf-8" />
        {coreStylesheet && <link rel="preload" href={coreStylesheet} as="style" />}
        {coreScript && coreScript.contentType === "external" && (<link rel="preload" href={coreScript.src} as="script" />)}
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (<link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />)}
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />
        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta property="og:image:type" content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`} />
          </>
        )}
        {cfg.baseUrl && (
          <>
            <meta property="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={socialUrl}></meta>
            <meta property="twitter:url" content={socialUrl}></meta>
          </>
        )}
        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />
        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js.filter((resource) => resource.loadTime === "beforeDOMReady").map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => { if (typeof resource === "function") { return resource(fileData) } else { return resource } })}

        {/* =========================================
            注入核心脚本 (双向通信 + 悬浮球)
            ========================================= */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener("DOMContentLoaded", () => {
                // 1. 创建右下角低透明度悬浮球
                const floatBtn = document.createElement('div');
                floatBtn.id = 'quartz-float-menu';
                floatBtn.innerHTML = '☰';
                document.body.appendChild(floatBtn);

                // 2. 滚动控制 (控制悬浮球浮现 + 跨域同步滚动)
                let lastScroll = 0;
                window.addEventListener("scroll", () => {
                  const scrollY = window.scrollY;
                  
                  // 控制悬浮球 (滚动超过 200px 显示)
                  if (scrollY > 200) {
                    floatBtn.classList.add('show');
                  } else {
                    floatBtn.classList.remove('show');
                  }

                  // 节流通知主站顶栏
                  if (!window.requestAnimationFrame) {
                    if (window.parent !== window) window.parent.postMessage({ type: 'wiki_scroll', scrollY }, '*');
                  } else {
                    window.requestAnimationFrame(() => {
                      if (window.parent !== window) window.parent.postMessage({ type: 'wiki_scroll', scrollY }, '*');
                    });
                  }
                });

                // 3. 悬浮球点击事件 -> 唤起主站侧边栏 (承担双抽屉功能)
                floatBtn.addEventListener('click', () => {
                   if (window.parent !== window) {
                     window.parent.postMessage('open_main_menu', '*');
                   }
                });

                // 4. 接管原生菜单按钮 (左上角的汉堡)
                const injectMenuBtn = () => {
                  const menuBtn = document.querySelector('.explorer-toggle') || document.querySelector('.mobile-explorer-toggle');
                  if (menuBtn && !menuBtn.dataset.injected) {
                    menuBtn.dataset.injected = 'true';
                    menuBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // 点击原生菜单，也唤起主站
                      if (window.parent !== window) window.parent.postMessage('open_main_menu', '*');
                    });
                  } else if (!menuBtn) {
                    setTimeout(injectMenuBtn, 500);
                  }
                };
                setTimeout(injectMenuBtn, 300);

                // 5. 暗黑模式双向同步
                // A. 监听主站发来的暗黑信号
                window.addEventListener('message', (event) => {
                  if (event.data && event.data.type === 'main_darkmode') {
                    const isDark = event.data.isDark;
                    const htmlEl = document.documentElement;
                    // Quartz 通过 html 上的属性控制主题
                    if (isDark) {
                       htmlEl.setAttribute('saved-theme', 'dark');
                       localStorage.setItem('theme', 'dark');
                    } else {
                       htmlEl.setAttribute('saved-theme', 'light');
                       localStorage.setItem('theme', 'light');
                    }
                  }
                });

                // B. 拦截 Wiki 原生暗黑按钮，发给主站
                const interceptDarkmode = () => {
                  const darkBtns = document.querySelectorAll('.darkmode');
                  darkBtns.forEach(btn => {
                    if (!btn.dataset.injected) {
                      btn.dataset.injected = 'true';
                      btn.addEventListener('click', () => {
                         // 延迟一点获取切换后的状态
                         setTimeout(() => {
                            const isDark = document.documentElement.getAttribute('saved-theme') === 'dark';
                            if (window.parent !== window) {
                              window.parent.postMessage({ type: 'wiki_darkmode', isDark: isDark }, '*');
                            }
                         }, 50);
                      });
                    }
                  });
                };
                setTimeout(interceptDarkmode, 500);
                // 由于暗黑按钮可能在侧边栏被重新渲染，设置定时器保持监听
                setInterval(interceptDarkmode, 2000);
              });
            `,
          }}
        />
      </head>
    )
  }
  return Head
}) satisfies QuartzComponentConstructor