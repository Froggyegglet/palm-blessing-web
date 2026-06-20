import http from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createReadStream } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataRoot = resolve(process.env.PALM_BLESSING_DATA_DIR || join(__dirname, ".data"));
const imageRoot = join(dataRoot, "images");
const readingRoot = join(dataRoot, "readings");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const openAiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 8 * 1024 * 1024);

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

function loadReading(id) {
  const file = readingPath(id);
  if (!file || !existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function saveReading(reading) {
  writeFileSync(readingPath(reading.id), JSON.stringify(reading, null, 2), "utf8");
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
    palmImageUrl: reading.palmImageFile ? `${base}/api/readings/${reading.id}/image` : "",
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

function saveImageFromDataUrl(readingId, imageDataUrl) {
  const match = imageDataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp|svg\+xml));base64,(.+)$/);
  if (!match) {
    if (imageDataUrl.startsWith("data:image/svg+xml")) {
      const svg = decodeURIComponent(imageDataUrl.split(",", 2)[1] || "");
      const file = join(imageRoot, `${readingId}.svg`);
      writeFileSync(file, svg, "utf8");
      return file;
    }
    throw new Error("Invalid image data URL");
  }
  const ext = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg";
  const file = join(imageRoot, `${readingId}.${ext}`);
  writeFileSync(file, Buffer.from(match[2], "base64"));
  return file;
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
      dataRoot,
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
    saveReading(reading);
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
  const reading = loadReading(id);
  if (!reading) {
    jsonResponse(response, 404, { error: "Reading not found" });
    return;
  }

  if (request.method === "GET" && !action) {
    jsonResponse(response, 200, { reading: publicReading(reading, request) });
    return;
  }

  if (request.method === "GET" && action === "image") {
    if (!reading.palmImageFile || !existsSync(reading.palmImageFile)) {
      jsonResponse(response, 404, { error: "Palm image not found" });
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(reading.palmImageFile)] || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    });
    createReadStream(reading.palmImageFile).pipe(response);
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
    saveReading(reading);
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
    reading.palmImageFile = saveImageFromDataUrl(reading.id, body.imageData);
    saveReading(reading);

    const analysis = await analyzeWithOpenAI(body.imageData, reading.language);
    reading.analysis = analysis;
    reading.analysisStatus = analysis.aiSource?.startsWith("fallback") ? "fallback" : "complete";
    reading.analyzedAt = new Date().toISOString();
    saveReading(reading);
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

const server = http.createServer(async (request, response) => {
  try {
    if ((request.url || "").startsWith("/api/")) await handleApi(request, response);
    else serveStatic(request, response);
  } catch (error) {
    jsonResponse(response, 500, { error: String(error.message || error) });
  }
});

server.listen(port, host, () => {
  console.log(`Palm Blessing system running at http://${host}:${port}/`);
});
