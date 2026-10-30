import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"

export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const title =
      (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    const socialUrl =
      fileData.slug === "404" ? url.toString() : joinSegments(url.toString(), fileData.slug!)

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some((e) => e.name === "CustomOgImages")
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`

    const coreStylesheet = css[0]?.content
    const coreScript = js.find(
      (r) => r.loadTime === "beforeDOMReady" && r.contentType === "external",
    )

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {coreStylesheet && <link rel="preload" href={coreStylesheet} as="style" />}
        {coreScript && coreScript.contentType === "external" && (
          <link rel="preload" href={coreScript.src} as="script" />
        )}
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
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
            <meta
              property="og:image:type"
              content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`}
            />
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
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}

        {/* =========================================
            注入核心脚本 (100% 确保生效版)
            ========================================= */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 直接创建浮动球 DOM，不依赖 DOMContentLoaded
              const floatBtn = document.createElement('div');
              floatBtn.id = 'quartz-float-menu';
              floatBtn.innerHTML = '☰';
              document.documentElement.appendChild(floatBtn); // 挂载到 html 上，确保最高层级

              // 监听滚动 (修复滚动容器的问题)
              document.addEventListener('scroll', () => {
                // 兼容不同滚动容器
                const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
                
                // 如果滚动超过 200px，显示浮动球
                if (scrollY > 200) {
                  floatBtn.classList.add('show');
                } else {
                  floatBtn.classList.remove('show');
                }
              }, { passive: true, capture: true }); // capture: true 解决某些内部滚动容器不冒泡的问题

              // 浮动球点击事件
              floatBtn.addEventListener('click', () => {
                 if (window.parent !== window) {
                   window.parent.postMessage('open_main_menu', '*');
                 }
              });

              // 间隔轮询，确保接手了原生汉堡菜单的点击
              setInterval(() => {
                const menuBtn = document.querySelector('.explorer-toggle') || document.querySelector('.mobile-explorer-toggle');
                if (menuBtn && !menuBtn.dataset.injected) {
                  menuBtn.dataset.injected = 'true';
                  menuBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.parent !== window) window.parent.postMessage('open_main_menu', '*');
                  });
                }
              }, 1000);

              // 监听主站暗黑模式
              window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'main_darkmode') {
                  const isDark = event.data.isDark;
                  if (isDark) {
                    document.documentElement.setAttribute('saved-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('saved-theme', 'light');
                  }
                }
              });

              // 拦截原生暗黑按钮发送给主站
              setInterval(() => {
                const darkBtn = document.querySelector('.darkmode');
                if (darkBtn && !darkBtn.dataset.injected) {
                  darkBtn.dataset.injected = 'true';
                  darkBtn.addEventListener('click', () => {
                    setTimeout(() => {
                      const isDark = document.documentElement.getAttribute('saved-theme') === 'dark';
                      if (window.parent !== window) window.parent.postMessage({ type: 'wiki_darkmode', isDark: isDark }, '*');
                    }, 50);
                  });
                }
              }, 1000);
            `,
          }}
        />
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor