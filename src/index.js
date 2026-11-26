/**
 * AMMU MUSIC BOT — Cloudflare Worker
 * WhatsApp Cloud API webhook + iTunes metadata/artwork search.
 *
 * Required Worker secrets/variables:
 *   VERIFY_TOKEN       Webhook verification token
 *   WHATSAPP_TOKEN     Meta WhatsApp Cloud API permanent/access token
 *   PHONE_NUMBER_ID    WhatsApp phone number ID
 * Optional:
 *   GRAPH_API_VERSION  Defaults to v27.0
 */

const DEFAULT_GRAPH_VERSION = "v27.0";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/webhook") {
      return verifyWebhook(url, env);
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      return receiveWebhook(request, env);
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        name: "AMMU MUSIC BOT",
        status: "running",
        endpoints: ["/webhook"],
        help: "Send /help to the connected WhatsApp number."
      });
    }

    return new Response("Not found", { status: 404 });
  }
};

function verifyWebhook(url, env) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === env.VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return new Response("Verification failed", { status: 403 });
}

async function receiveWebhook(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Acknowledge Meta quickly; ignore delivery/status events.
  const changes = body?.entry?.flatMap(entry => entry.changes || []) || [];
  for (const change of changes) {
    const message = change?.value?.messages?.[0];
    if (!message || !message.from) continue;

    try {
      if (message.type === "text") {
        await handleText(message.from, message.text?.body || "", env);
      } else {
        await sendText(message.from,
          "Vanakkam! 🎵 Song name type pannunga. Help-ku /help anuppunga.", env);
      }
    } catch (error) {
      console.error("Message handling failed:", error);
      await sendText(message.from,
        "Sorry, ippodhu request process panna mudiyavillai. Konjam neram kazhithu try pannunga.", env);
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

async function handleText(to, rawText, env) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (!text || ["/help", "help", "hi", "hello", "வணக்கம்"].includes(lower)) {
    return sendText(to, helpMessage(), env);
  }

  if (lower === "/about") {
    return sendText(to,
      "🎶 AMMU MUSIC BOT\nTamil • Sinhala • English\nSong details and album artwork search.\n\nAudio downloads are available only for music you own or are authorized to distribute.", env);
  }

  const query = lower.startsWith("/song ")
    ? text.slice(6).trim()
    : lower.startsWith("search ")
      ? text.slice(7).trim()
      : text;

  if (!query || query.startsWith("/")) {
    return sendText(to, "Song name anuppunga. Example: /song Anirudh Hukum", env);
  }

  await sendText(to, `🔎 "${query}" song search pannuren...`, env);
  const results = await searchSongs(query);

  if (!results.length) {
    return sendText(to, "Indha song kidaikkavillai. Vera spelling/name try pannunga. 🎵", env);
  }

  const best = results[0];
  const details = [
    "🎵 AMMU MUSIC BOT — SONG RESULT",
    `🎧 Title: ${best.trackName || "Unknown"}`,
    `🎤 Artist: ${best.artistName || "Unknown"}`,
    `💿 Album: ${best.collectionName || "Unknown"}`,
    best.releaseDate ? `📅 Release: ${best.releaseDate.slice(0, 10)}` : null,
    best.primaryGenreName ? `🎼 Genre: ${best.primaryGenreName}` : null,
    best.trackViewUrl ? `🔗 Details: ${best.trackViewUrl}` : null,
    "",
    "Innum song search panna song name anuppunga.",
    "Note: Copyright permission illamal audio download provide panna mudiyadhu."
  ].filter(Boolean).join("\n");

  if (best.artworkUrl100) {
    const imageUrl = best.artworkUrl100.replace("100x100bb", "600x600bb");
    await sendImage(to, imageUrl, details, env);
  } else {
    await sendText(to, details, env);
  }
}

async function searchSongs(query) {
  const endpoint = new URL("https://itunes.apple.com/search");
  endpoint.searchParams.set("term", query);
  endpoint.searchParams.set("media", "music");
  endpoint.searchParams.set("entity", "song");
  endpoint.searchParams.set("limit", "5");
  endpoint.searchParams.set("country", "LK");

  const response = await fetch(endpoint.toString(), {
    headers: { "User-Agent": "AMMU-MUSIC-BOT/1.0" }
  });
  if (!response.ok) throw new Error(`iTunes search failed: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

async function sendText(to, text, env) {
  return sendWhatsApp({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text }
  }, env);
}

async function sendImage(to, link, caption, env) {
  return sendWhatsApp({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: { link, caption: caption.slice(0, 1024) }
  }, env);
}

async function sendWhatsApp(payload, env) {
  if (!env.WHATSAPP_TOKEN || !env.PHONE_NUMBER_ID) {
    console.error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID");
    return;
  }

  const version = env.GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const endpoint = `https://graph.facebook.com/${version}/${env.PHONE_NUMBER_ID}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("WhatsApp API error:", response.status, detail);
    throw new Error("WhatsApp message could not be sent");
  }
  return response.json();
}

function helpMessage() {
  return [
    "🌟 Welcome to AMMU MUSIC BOT!",
    "",
    "🎵 Song search:",
    "• /song song name",
    "• search song name",
    "• Or just send the song name",
    "",
    "We support Tamil, Sinhala and English song metadata and album artwork.",
    "",
    "Audio files can be provided only when you own them or have distribution permission.",
    "",
    "Example: /song Hukum Anirudh"
  ].join("\n");
}

function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
