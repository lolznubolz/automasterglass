// Cloudflare Worker (advanced mode): принимает заявки с формы и шлёт в Telegram.
// Токен живёт только здесь, на стороне сервера — в браузер/на сайт не попадает.
const BOT_TOKEN = "8241958479:AAH5dUHOouWwwtxoiVb5otnf5klPoHrruTQ";
const CHAT_IDS = ["6969897116", "648928467"]; // куда приходят заявки

function esc(s){ return String(s == null ? "" : s).slice(0, 200).replace(/[<>&]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c])); }

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, error: "method" }), { status: 405, headers: { "content-type": "application/json" } });
      }
      let d = {};
      try { d = await request.json(); } catch (e) {}
      const name = esc(d.name);
      const phone = esc(d.phone);
      const service = esc(d.service);
      const page = esc(d.page);
      if (!phone && !name) {
        return new Response(JSON.stringify({ ok: false, error: "empty" }), { status: 400, headers: { "content-type": "application/json" } });
      }
      const text =
        "🚗 <b>Новая заявка с сайта AutoMasterGlass</b>\n\n" +
        "👤 Имя: " + (name || "—") + "\n" +
        "📞 Телефон: " + (phone || "—") + "\n" +
        "🛠 Услуга: " + (service || "—");
      try {
        await Promise.all(CHAT_IDS.map(id =>
          fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat_id: id, text, parse_mode: "HTML" })
          })
        ));
        return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "send" }), { status: 502, headers: { "content-type": "application/json" } });
      }
    }

    // всё остальное — статические файлы сайта
    if (env && env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  }
};
