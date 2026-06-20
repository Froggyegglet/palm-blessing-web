import http from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(
  process.env.PALM_BLESSING_DATA_DIR || (process.env.VERCEL ? join(tmpdir(), "palm-blessing-data") : join(__dirname, ".data"))
);
const imageRoot = join(dataRoot, "images");
const readingRoot = join(dataRoot, "readings");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const openAiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || "palm-scans";
const supabaseTable = process.env.SUPABASE_TABLE || "palm_readings";

mkdirSync(imageRoot, { recursive: true });
mkdirSync(readingRoot, { recursive: true });

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function readApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  const file = process.env.OPENAI_API_KEY_FILE;
  if (!file || !existsSync(file)) return "";
  return readFileSync(file, "utf8").trim();
}

function hasSupabase() {
  return Boolean(supabaseUrl && supabaseKey);
}

async function supabaseRequest(path, options = {}) {
  if (!hasSupabase()) throw new Error("Supabase is not configured");
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    ...(options.headers || {}),
  };
  const result = await fetch(`${supabaseUrl}${path}`, { ...options, headers });
  const text = await result.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!result.ok) {
    const message = payload?.message || payload?.error || text || `Supabase request failed: ${result.status}`;
    throw new Error(message);
  }
  return payload;
}

function readingToRow(reading) {
  return {
    id: reading.id,
    device_id: reading.deviceId || "",
    shop_id: reading.shopId || "",
    language: reading.language || "en",
    payment_status: reading.paymentStatus || "pending",
    analysis_status: reading.analysisStatus || "pending",
    palm_image_path: reading.palmImagePath || "",
    analysis: reading.analysis || null,
    payment_id: reading.paymentId || "",
    print_status: reading.printStatus || "",
    created_at: reading.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: reading.expiresAt,
  };
}

function rowToReading(row) {
  if (!row) return null;
  return {
    id: row.id,
    deviceId: row.device_id || "",
    shopId: row.shop_id || "",
    language: row.language || "en",
    paymentStatus: row.payment_status || "pending",
    analysisStatus: row.analysis_status || "pending",
    palmImagePath: row.palm_image_path || "",
    analysis: row.analysis || null,
    paymentId: row.payment_id || "",
    printStatus: row.print_status || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

function encodePostgrestValue(value) {
  return encodeURIComponent(String(value).replace(/,/g, "\\,"));
}

function jsonResponse(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function textResponse(response, status, payload) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(payload);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function createId() {
  const date = new Date().toISOString().slice(5, 10).replace("-", "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SYD-${date}-${suffix}`;
}

function readingPath(id) {
  const safe = normalizeReadingId(id);
  if (!safe) return "";
  return join(readingRoot, `${safe}.json`);
}

function normalizeReadingId(id) {
  const clean = String(id || "").trim().toUpperCase();
  if (!/^SYD-\d{4}-[A-F0-9]{6}$/.test(clean)) return "";
  return clean;
}

async function loadReading(id) {
  const file = readingPath(id);
  if (!file) return null;
  if (hasSupabase()) {
    const rows = await supabaseRequest(
      `/rest/v1/${supabaseTable}?id=eq.${encodePostgrestValue(normalizeReadingId(id))}&select=*`,
      { method: "GET" }
    );
    return rowToReading(Array.isArray(rows) ? rows[0] : null);
  }
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

async function saveReading(reading) {
  if (hasSupabase()) {
    const [row] = await supabaseRequest(`/rest/v1/${supabaseTable}?on_conflict=id&select=*`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(readingToRow(reading)),
    });
    return rowToReading(row) || reading;
  }
  writeFileSync(readingPath(reading.id), JSON.stringify(reading, null, 2), "utf8");
  return reading;
}

function publicReading(reading, request) {
  const base = getBaseUrl(request);
  const detailUrl = `${base}/?reading=${encodeURIComponent(reading.id)}`;
  return {
    id: reading.id,
    deviceId: reading.deviceId || "",
    shopId: reading.shopId || "",
    paymentStatus: reading.paymentStatus,
    analysisStatus: reading.analysisStatus,
    language: reading.language || "en",
    palmImageUrl: reading.palmImagePath || reading.palmImageFile ? `${base}/api/readings/${reading.id}/image` : "",
    detailUrl,
    printText: buildReceiptText(reading, detailUrl),
    analysis: reading.analysis || null,
    createdAt: reading.createdAt,
    expiresAt: reading.expiresAt,
  };
}

function getBaseUrl(request) {
  const proto = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host || `127.0.0.1:${port}`;
  return `${proto}://${host}`;
}

function defaultAnalysis() {
  return {
    typeEn: "Slow Burn Winner",
    typeZh: "慢热赢家",
    lineEn: "Less explaining. More moving.",
    lineZh: "少解释，多行动。",
    scores: { love: 82, career: 91, life: 88 },
    details: {
      en: {
        love: "You notice more than you admit. This week rewards one honest message, not three days of waiting.",
        career: "Your best move is a small prototype with real feedback. Momentum beats another perfect plan.",
        life: "Your energy returns when you simplify the day. Pick one thing, finish it, then let luck breathe.",
        action: "Buy something clear, cold, and sparkling. Then send the message you already drafted.",
        direction: "Walk 27 steps to the right-front of where you are now. Notice the first sign you see.",
        coupon: "Show this receipt today for a shop reward or surprise add-on.",
      },
      zh: {
        love: "你比自己表现出来更敏感。最近适合主动说一句真话，不适合反复等待。",
        career: "你最好的动作是先做小样，拿到真实反馈。行动节奏比完美计划更重要。",
        life: "你的能量会在生活变简单时回升。选一件事做完，再让运气慢慢靠近。",
        action: "买一杯透明、冰的、带气泡的饮品，然后发出你已经写好的那句话。",
        direction: "从现在的位置向右前方走 27 步，留意你看到的第一个标志。",
        coupon: "出示这张小票，可在店内领取今日惊喜或优惠。",
      },
    },
    traits: {
      en: [
        ["01", "Balanced palm shape", "Your hand shape suggests steady rhythm and practical taste."],
        ["02", "Full thumb base", "You carry warmth and persistence once you care about something."],
        ["03", "Natural life line", "Your recovery pattern is gradual. Routine matters more than sudden motivation."],
        ["04", "Calm wisdom line", "Your decisions improve when you write things down."],
        ["05", "Soft heart line", "You feel deeply but prefer controlled expression."],
        ["06", "Crossing center lines", "You are in a useful transition phase. Reduce noise before deciding."],
        ["07", "Light career line", "Long-term output beats short bursts. Pick one lane and repeat visibly."],
        ["08", "Moderate index proportion", "You cooperate well but still need ownership."],
        ["09", "Long ring finger", "You have visual instinct and presentation power."],
        ["10", "Clear little finger feature", "Your edge is communication. Package the result clearly."],
      ],
      zh: [
        ["01", "手型偏均衡", "掌形整体舒展，说明节奏感较稳，适合按步骤推进。"],
        ["02", "拇指根部较饱满", "执行力和责任感不弱，一旦在意某件事，会坚持得比自己想象更久。"],
        ["03", "生命线弧度自然", "恢复力偏稳定型，比起突然爆发，更需要作息和持续行动。"],
        ["04", "智慧线较平稳", "适合把想法写下来再判断，别让脑内推演拖慢决定。"],
        ["05", "感情线偏柔和", "重情但表达偏克制。关系里少猜，多直接沟通。"],
        ["06", "掌心纹路交会", "近期处在转换期，有压力也有机会，但需要减少干扰。"],
        ["07", "事业线可见度偏弱", "短期爆发不如长期积累。选一个方向持续输出。"],
        ["08", "食指比例适中", "合作意识强，但也需要掌控感和明确边界。"],
        ["09", "无名指较修长", "审美和表达能力不错，越早做出视觉样品越容易被理解。"],
        ["10", "小指特征清晰", "沟通是优势。少解释理念，多包装结果。"],
      ],
    },
    markers: [],
    aiSource: "fallback",
  };
  return {
    typeEn: "Slow Burn Winner",
    typeZh: "慢热发财型",
    lineEn: "Less explaining. More moving.",
    lineZh: "少解释，多行动。",
    scores: { love: 82, career: 91, life: 88 },
    details: {
      en: {
        love: "You notice more than you admit. This week rewards one honest message, not three days of waiting.",
        career: "Your best move is a small prototype with real feedback. Momentum beats another perfect plan.",
        life: "Your energy returns when you simplify the day. Pick one thing, finish it, then let luck breathe.",
        action: "Buy something clear, cold, and sparkling. Then send the message you already drafted.",
        direction: "Walk 27 steps to the right-front of where you are now. Notice the first sign you see.",
        coupon: "Show this receipt today for a shop reward or surprise add-on.",
      },
      zh: {
        love: "你比自己表现出来更敏感。最近适合主动说一句真话，不适合反复等待。",
        career: "你最好的动作是先做小样，拿到真实反馈。行动的节奏比完美计划更重要。",
        life: "你的能量会在生活变简单时回升。选一件事做完，再让运气慢慢靠近。",
        action: "买一杯透明、冰的、带气泡的饮品，然后发出你已经写好的那句话。",
        direction: "从现在的位置向右前方走 27 步，留意你看到的第一个标志。",
        coupon: "出示这张小票，可在店内领取今日惊喜或优惠。",
      },
    },
    traits: {
      en: [
        ["01", "Balanced palm shape", "Your hand shape suggests steady rhythm and practical taste."],
        ["02", "Full thumb base", "You carry warmth and persistence once you care about something."],
        ["03", "Natural life line", "Your recovery pattern is gradual. Routine matters more than sudden motivation."],
        ["04", "Calm wisdom line", "Your decisions improve when you write things down."],
        ["05", "Soft heart line", "You feel deeply but prefer controlled expression."],
        ["06", "Crossing center lines", "You are in a useful transition phase. Reduce noise before deciding."],
        ["07", "Light career line", "Long-term output beats short bursts. Pick one lane and repeat visibly."],
        ["08", "Moderate index proportion", "You cooperate well but still need ownership."],
        ["09", "Long ring finger", "You have visual instinct and presentation power."],
        ["10", "Clear little finger feature", "Your edge is communication. Package the result clearly."],
      ],
      zh: [
        ["01", "手型偏均衡", "掌形整体舒展，说明节奏感较稳，适合按步骤推进。"],
        ["02", "拇指根部较饱满", "执行力和责任感不弱，一旦在意某件事会坚持较久。"],
        ["03", "生命线弧度自然", "恢复力偏稳定型，比起突然爆发，更需要规律节奏。"],
        ["04", "智慧线较平稳", "适合把想法写下来再判断，别让脑内推演拖慢决定。"],
        ["05", "感情线偏柔和", "重情但表达偏克制，关系里少猜，多直接沟通。"],
        ["06", "掌心纹路交会", "近期处在转换期，有压力也有机会，需要减少干扰。"],
        ["07", "事业线可见度偏弱", "短期爆发不如长期积累，选一个方向持续输出。"],
        ["08", "食指比例适中", "合作意识强，但也需要掌控感和明确边界。"],
        ["09", "无名指较修长", "审美和表达能力不错，越早做视觉样品越容易被理解。"],
        ["10", "小指特征清晰", "沟通是优势，少解释理念，多包装结果。"],
      ],
    },
    markers: [],
    aiSource: "fallback",
  };
}

function createPrompt(language) {
  return `You are writing an entertainment-only palm blessing report for a kiosk in Sydney.

Analyze the visible palm image as a cultural/visual interpretation, not as medical, legal, financial, identity, biometric, or scientific advice.

Return ONLY valid JSON with this exact shape:
{
  "typeEn": "short catchy English type",
  "typeZh": "short catchy Chinese type",
  "lineEn": "one short English sentence",
  "lineZh": "one short Chinese sentence",
  "scores": {"love": 0-100, "career": 0-100, "life": 0-100},
  "details": {
    "en": {"love": "...", "career": "...", "life": "...", "action": "...", "direction": "...", "coupon": "..."},
    "zh": {"love": "...", "career": "...", "life": "...", "action": "...", "direction": "...", "coupon": "..."}
  },
  "traits": {
    "en": [["01","title","2 sentence observation"], ... exactly 10 items],
    "zh": [["01","标题","2句观察"], ... exactly 10 items]
  },
  "markers": [["01", 18, 35], ["02", 22, 55], ... exactly 10 items]
}

For markers, x and y are numbers from 0 to 100. They are percentage coordinates from the top-left of the uploaded image. Put each marker on the visible palm or finger feature described by the same trait number. Do not place markers on the background. If the exact line is unclear, choose the closest visible palm area and keep the interpretation cautious.

Tone: stylish, specific, positive, social-share friendly. Language preference: ${language}.`;
}

async function analyzeWithOpenAI(imageDataUrl, language) {
  if (process.env.PALM_BLESSING_MOCK_AI === "1") return defaultAnalysis();

  const apiKey = readApiKey();
  if (!apiKey) return { ...defaultAnalysis(), aiSource: "fallback_no_key" };

  const payload = {
    model: openAiModel,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: createPrompt(language) },
          { type: "input_image", image_url: imageDataUrl },
        ],
      },
    ],
    max_output_tokens: 2400,
  };

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await result.json();
      if (!result.ok) {
        lastError = `${result.status}: ${json.error?.message || "OpenAI request failed"}`;
        if (result.status >= 500 && attempt < 2) {
          await sleep(900);
          continue;
        }
        return { ...defaultAnalysis(), aiSource: "fallback_openai_error", aiError: lastError };
      }

      const outputText = json.output_text || extractOutputText(json);
      const parsed = extractJson(outputText);
      return normalizeAnalysis(parsed);
    } catch (error) {
      lastError = String(error.message || error);
      if (attempt < 2) await sleep(900);
    }
  }
  return { ...defaultAnalysis(), aiSource: "fallback_network_error", aiError: lastError };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractOutputText(json) {
  const parts = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function extractJson(text) {
  if (!text) return defaultAnalysis();
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    return defaultAnalysis();
  }
}

function normalizeAnalysis(input) {
  const fallback = defaultAnalysis();
  const analysis = {
    typeEn: input.typeEn || fallback.typeEn,
    typeZh: input.typeZh || fallback.typeZh,
    lineEn: input.lineEn || fallback.lineEn,
    lineZh: input.lineZh || fallback.lineZh,
    scores: {
      love: clampScore(input.scores?.love ?? fallback.scores.love),
      career: clampScore(input.scores?.career ?? fallback.scores.career),
      life: clampScore(input.scores?.life ?? fallback.scores.life),
    },
    details: {
      en: { ...fallback.details.en, ...(input.details?.en || {}) },
      zh: { ...fallback.details.zh, ...(input.details?.zh || {}) },
    },
    traits: {
      en: normalizeTraits(input.traits?.en, fallback.traits.en),
      zh: normalizeTraits(input.traits?.zh, fallback.traits.zh),
    },
    markers: normalizeMarkers(input.markers),
    aiSource: "openai",
  };
  return analysis;
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 80;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeTraits(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item) => Array.isArray(item) && item.length >= 3)
    .slice(0, 10)
    .map((item, index) => [
      String(item[0] || `${index + 1}`.padStart(2, "0")).padStart(2, "0"),
      String(item[1] || fallback[index]?.[1] || "Palm feature"),
      String(item[2] || fallback[index]?.[2] || "A visible feature was interpreted for entertainment."),
    ]);
  while (cleaned.length < 10) cleaned.push(fallback[cleaned.length]);
  return cleaned;
}

function normalizeMarkers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => Array.isArray(item) && item.length >= 3)
    .slice(0, 10)
    .map((item, index) => [
      String(item[0] || `${index + 1}`).replace(/[^\d]/g, "").padStart(2, "0").slice(-2),
      clampPercent(item[1]),
      clampPercent(item[2]),
    ])
    .filter((item) => item[0] && item[1] !== null && item[2] !== null);
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function parseImageDataUrl(imageDataUrl) {
  const match = imageDataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp|svg\+xml));base64,(.+)$/);
  if (!match) {
    if (imageDataUrl.startsWith("data:image/svg+xml")) {
      const svg = decodeURIComponent(imageDataUrl.split(",", 2)[1] || "");
      return { buffer: Buffer.from(svg, "utf8"), contentType: "image/svg+xml", ext: "svg" };
    }
    throw new Error("Invalid image data URL");
  }
  const contentType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return { buffer: Buffer.from(match[2], "base64"), contentType, ext };
}

async function saveImageFromDataUrl(readingId, imageDataUrl) {
  const image = parseImageDataUrl(imageDataUrl);
  if (hasSupabase()) {
    const path = `${readingId}.${image.ext}`;
    await supabaseRequest(`/storage/v1/object/${supabaseBucket}/${encodeURIComponent(path)}`, {
      method: "POST",
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "3600",
        "x-upsert": "true",
      },
      body: image.buffer,
    });
    return { path, file: "" };
  }
  const file = join(imageRoot, `${readingId}.${image.ext}`);
  writeFileSync(file, image.buffer);
  return { path: "", file };
}

async function loadPalmImage(reading) {
  if (hasSupabase() && reading.palmImagePath) {
    const result = await fetch(`${supabaseUrl}/storage/v1/object/${supabaseBucket}/${encodeURIComponent(reading.palmImagePath)}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    if (!result.ok) return null;
    const contentType = result.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await result.arrayBuffer());
    return { contentType, buffer };
  }
  if (!reading.palmImageFile || !existsSync(reading.palmImageFile)) return null;
  return {
    contentType: contentTypes[extname(reading.palmImageFile)] || "image/jpeg",
    stream: createReadStream(reading.palmImageFile),
  };
}

function buildReceiptText(reading, detailUrl = `/?reading=${reading.id}`) {
  const analysis = reading.analysis || defaultAnalysis();
  const score = analysis.scores || defaultAnalysis().scores;
  return [
    "PALM BLESSING",
    "",
    "TODAY'S TYPE",
    analysis.typeEn || "Slow Burn Winner",
    "",
    `LOVE   ${score.love}`,
    `CAREER ${score.career}`,
    `LIFE   ${score.life}`,
    "",
    analysis.lineEn || "Less explaining. More moving.",
    "",
    `SCAN: ${detailUrl}`,
    "",
    "#PalmBlessingSydney",
    "FOR FUN & INSPIRATION",
  ].join("\n");
}

async function qrSvg(text) {
  const qrcode = await import("qrcode");
  return qrcode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const cleanPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(join(__dirname, cleanPath === "/" ? "index.html" : cleanPath));

  if (!filePath.startsWith(__dirname)) {
    textResponse(response, 403, "Forbidden");
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(__dirname, "index.html");

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}

async function handleApi(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    jsonResponse(response, 200, {
      ok: true,
      openaiConfigured: Boolean(readApiKey()),
      model: openAiModel,
      storage: hasSupabase() ? "supabase" : "local",
      supabaseConfigured: hasSupabase(),
    });
    return;
  }

  if (request.method === "POST" && path === "/api/readings") {
    const body = await readJson(request);
    const now = Date.now();
    const reading = {
      id: createId(),
      deviceId: body.deviceId || "demo-device",
      shopId: body.shopId || "demo-shop",
      language: body.language || "en",
      paymentStatus: "pending",
      analysisStatus: "waiting",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
    };
    await saveReading(reading);
    jsonResponse(response, 200, { reading: publicReading(reading, request) });
    return;
  }

  const match = path.match(/^\/api\/readings\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) {
    jsonResponse(response, 404, { error: "Not found" });
    return;
  }

  const id = decodeURIComponent(match[1]);
  const action = match[2] || "";
  const reading = await loadReading(id);
  if (!reading) {
    jsonResponse(response, 404, { error: "Reading not found" });
    return;
  }

  if (request.method === "GET" && !action) {
    jsonResponse(response, 200, { reading: publicReading(reading, request) });
    return;
  }

  if (request.method === "GET" && action === "image") {
    const image = await loadPalmImage(reading);
    if (!image) {
      jsonResponse(response, 404, { error: "Palm image not found" });
      return;
    }
    response.writeHead(200, {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=3600",
    });
    if (image.stream) image.stream.pipe(response);
    else response.end(image.buffer);
    return;
  }

  if (request.method === "GET" && action === "qr.svg") {
    try {
      const svg = await qrSvg(publicReading(reading, request).detailUrl);
      response.writeHead(200, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
      });
      response.end(svg);
    } catch (error) {
      jsonResponse(response, 503, { error: "QR generator dependency is not installed" });
    }
    return;
  }

  if (request.method === "POST" && action === "payment-success") {
    const body = await readJson(request);
    reading.paymentStatus = "paid";
    reading.paymentId = body.paymentId || `mock-${Date.now()}`;
    reading.paidAt = new Date().toISOString();
    await saveReading(reading);
    jsonResponse(response, 200, { reading: publicReading(reading, request) });
    return;
  }

  if (request.method === "POST" && action === "scan") {
    const body = await readJson(request);
    if (!body.imageData) {
      jsonResponse(response, 400, { error: "imageData is required" });
      return;
    }
    reading.language = body.language || reading.language || "en";
    reading.analysisStatus = "processing";
    const image = await saveImageFromDataUrl(reading.id, body.imageData);
    reading.palmImagePath = image.path;
    reading.palmImageFile = image.file;
    await saveReading(reading);

    const analysis = await analyzeWithOpenAI(body.imageData, reading.language);
    reading.analysis = analysis;
    reading.analysisStatus = analysis.aiSource?.startsWith("fallback") ? "fallback" : "complete";
    reading.analyzedAt = new Date().toISOString();
    await saveReading(reading);
    jsonResponse(response, 200, { reading: publicReading(reading, request) });
    return;
  }

  if (request.method === "POST" && action === "print") {
    const publicData = publicReading(reading, request);
    jsonResponse(response, 200, {
      readingId: reading.id,
      detailUrl: publicData.detailUrl,
      printText: buildReceiptText(reading, publicData.detailUrl),
    });
    return;
  }

  jsonResponse(response, 404, { error: "Unknown reading action" });
}

function normalizeVercelRequest(request) {
  const queryPath = request.query?.path;
  if (!queryPath) return;
  const path = Array.isArray(queryPath) ? queryPath.join("/") : String(queryPath);
  const current = new URL(request.url || "/", "http://vercel.local");
  if (!current.pathname.startsWith("/api/[...]")) return;
  current.pathname = `/api/${path}`;
  current.searchParams.delete("path");
  request.url = `${current.pathname}${current.search}`;
}

export default async function handler(request, response) {
  normalizeVercelRequest(request);
  try {
    if ((request.url || "").startsWith("/api/")) await handleApi(request, response);
    else serveStatic(request, response);
  } catch (error) {
    jsonResponse(response, 500, { error: String(error.message || error) });
  }
}

if (!process.env.VERCEL) {
  const server = http.createServer(handler);
  server.listen(port, host, () => {
    console.log(`Palm Blessing system running at http://${host}:${port}/`);
  });
}
