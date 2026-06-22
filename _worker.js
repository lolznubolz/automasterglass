// Cloudflare Worker: отдаёт статические файлы сайта AutoMasterGlass.
// Обработка заявок вынесена в отдельный воркер amg-lead (токен — в секретах).
export default {
  async fetch(request, env) {
    if (env && env.ASSETS && env.ASSETS.fetch) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  }
};
