/**
 * AutoMasterGlass — Lead Worker
 * Принимает заявку с сайта (POST JSON {name, phone, service, page})
 * и пересылает её в Telegram личным сообщением.
 *
 * Секреты (задаются в Cloudflare, НЕ в коде):
 *   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
 *   TELEGRAM_CHAT_ID   — id личного чата (число), куда слать заявки
 *
 * Деплой:
 *   wrangler secret put TELEGRAM_BOT_TOKEN
 *   wrangler secret put TELEGRAM_CHAT_ID
 *   wrangler deploy
 * (или через дашборд Cloudflare → Workers → Settings → Variables and Secrets)
 */

// Разрешённые источники для CORS. '*' — принимать с любого домена.
const ALLOW_ORIGIN = "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

// Экранируем спецсимволы для Telegram HTML parse_mode
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMessage(d) {
  const lines = [
    "🟢 <b>Новая заявка — AutoMasterGlass</b>",
    "",
    `👤 <b>Имя:</b> ${esc(d.name) || "—"}`,
    `📞 <b>Телефон:</b> ${esc(d.phone) || "—"}`,
    `🛠 <b>Услуга:</b> ${esc(d.service) || "—"}`,
  ];
  if (d.page) lines.push(`🔗 <b>Страница:</b> ${esc(d.page)}`);
  lines.push("", `🕒 ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`);
  return lines.join("\n");
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    // Парсим тело
    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: "bad_json" }, 400);
    }

    const name = (data.name || "").toString().trim();
    const phone = (data.phone || "").toString().trim();
    const service = (data.service || "").toString().trim();
    const page = (data.page || "").toString().trim();

    // Минимальная валидация — нужен хотя бы телефон
    if (!phone && !name) {
      return json({ ok: false, error: "empty_lead" }, 400);
    }

    // Проверяем, что секреты заданы
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: "not_configured" }, 500);
    }

    const text = buildMessage({ name, phone, service, page });
    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
      const tgResp = await fetch(tgUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      if (!tgResp.ok) {
        const detail = await tgResp.text();
        return json({ ok: false, error: "telegram_failed", detail }, 502);
      }
    } catch (err) {
      return json({ ok: false, error: "telegram_error", detail: String(err) }, 502);
    }

    return json({ ok: true });
  },
};
