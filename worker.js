export default {
  async fetch(request, env, ctx) {
    // 直接把对网站的请求，交给 Cloudflare 的静态资源引擎处理
    return env.ASSETS.fetch(request);
  }
};