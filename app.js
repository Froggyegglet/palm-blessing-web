const app = document.querySelector("#app");
const receiptTemplate = document.querySelector("#receipt-template");

const choices = [
  { id: "full", label: "FULL READING", price: 5, hint: "Love, career, and life all included." },
];

const copy = {
  en: {
    brand: "Palm Blessing Studio",
    sideCopy: "Scan your palm. Get a lucky receipt. Share the moment.",
    priceTitle: "All readings included",
    priceNote: "LOVE + CAREER + LIFE",
    privacy: "No palm image stored after reading",
    footerLeft: "Android WebView / Chrome kiosk ready",
    footerRight: "Camera + API + receipt print flow",
    homeEyebrow: "Fortune receipt machine",
    homeTitle: "Scan your palm.",
    homeCopy: "Get a short AI palm blessing printed as a lucky receipt.",
    start: "Tap to Start",
    chooseEyebrow: "One simple price",
    chooseTitle: "A$5 unlocks everything",
    chooseCopy: "Love, career, and life are included in every palm receipt.",
    paymentEyebrow: "Payment",
    paymentTitle: "Tap card to begin",
    selected: "Selected",
    amount: "Amount",
    paymentCopy: "In production this screen connects to Square Tap to Pay or the card reader SDK. For this demo, continue after payment.",
    paid: "Payment Complete",
    scanEyebrow: "Palm scan",
    scanTitle: "Place your palm flat",
    scanCopy: "Keep still for 3 seconds. The camera should sit under the transparent scanner window.",
    startScan: "Start Scan",
    takePhoto: "Take Photo",
    demoScan: "Use Demo Palm",
    cameraReady: "Camera ready",
    cameraFallback: "Camera unavailable. Demo scan ready.",
    aiEyebrow: "AI reading",
    aiTitle: "Reading your palm energy...",
    aiCopy: "Generating your blessing and receipt.",
    captured: "Captured",
    processing: "Processing",
    preparing: "Preparing",
    palmImage: "Palm image",
    aiApi: "AI API",
    receipt: "Receipt",
    readyEyebrow: "Ready",
    readyTitle: "Your palm receipt is ready",
    print: "Print Receipt",
    detail: "Open Detail Page",
    reset: "New Reading",
    reportTitle: "Palm Analysis Report",
    reportSubtitle: "Based on visible palm features and cultural interpretation",
    scanMap: "Palm Scan Map",
    markerNote: "AI-estimated observation points. Entertainment only.",
    observations: "Key Observations",
    summary: "Overall Conclusion",
    type: "TODAY'S TYPE",
    love: "Love",
    career: "Career",
    life: "Life",
    action: "Lucky Action",
    direction: "Lucky Direction",
    coupon: "Shop Coupon",
    disclaimer: "For fun and inspiration only. Not medical, legal, or financial advice.",
    backDemo: "Start Kiosk Demo",
  },
  zh: {
    brand: "掌心祈福工作室",
    sideCopy: "扫描手掌，得到一张可分享的幸运小票。",
    priceTitle: "全部解析",
    priceNote: "爱情 + 事业 + 生命",
    privacy: "解析后不长期保存手掌图",
    footerLeft: "适配安卓 WebView / Chrome kiosk",
    footerRight: "摄像头 + AI API + 小票打印流程",
    homeEyebrow: "掌心祈福小票机",
    homeTitle: "扫描你的手掌",
    homeCopy: "生成一张简短、有仪式感、可分享的 AI 祈福小票。",
    start: "开始",
    chooseEyebrow: "一个价格",
    chooseTitle: "A$5 全部解锁",
    chooseCopy: "每张小票都包含爱情、事业和生命能量解析。",
    paymentEyebrow: "付款",
    paymentTitle: "刷卡后开始",
    selected: "项目",
    amount: "金额",
    paymentCopy: "正式版会连接 Square Tap to Pay 或刷卡器 SDK。当前 demo 可直接继续。",
    paid: "已付款，开始扫描",
    scanEyebrow: "手掌扫描",
    scanTitle: "请平放手掌",
    scanCopy: "保持 3 秒不动。摄像头应安装在透明扫描窗口下方。",
    startScan: "开始扫描",
    takePhoto: "手机拍照",
    demoScan: "使用示例手掌",
    cameraReady: "摄像头就绪",
    cameraFallback: "摄像头不可用，可使用示例扫描。",
    aiEyebrow: "AI 解读",
    aiTitle: "正在读取掌心能量...",
    aiCopy: "正在生成祈福结果和小票。",
    captured: "已采集",
    processing: "分析中",
    preparing: "准备中",
    palmImage: "手掌图像",
    aiApi: "AI 接口",
    receipt: "小票",
    readyEyebrow: "完成",
    readyTitle: "你的掌心小票已生成",
    print: "打印小票",
    detail: "打开详情页",
    reset: "重新开始",
    reportTitle: "手相面相算命报告",
    reportSubtitle: "基于可见手部特征的文化娱乐解读",
    scanMap: "手纹标注图",
    markerNote: "标注点由 AI 估算，仅作娱乐参考。",
    observations: "重点观察",
    summary: "综合结论",
    type: "今日类型",
    love: "爱情",
    career: "事业",
    life: "生命",
    action: "幸运行动",
    direction: "幸运方向",
    coupon: "店铺优惠",
    disclaimer: "仅供娱乐和灵感参考，不构成医疗、法律或金融建议。",
    backDemo: "返回机器演示",
  },
};

const reading = {
  id: `SYD-${new Date().toISOString().slice(5, 10).replace("-", "")}-${Math.floor(100 + Math.random() * 900)}`,
  palmImageUrl: "",
  markers: [],
  type: "SLOW BURN WINNER",
  typeZh: "慢热发财型",
  line: "Less explaining. More moving.",
  lineZh: "少解释，多行动。",
  scores: {
    love: 82,
    career: 91,
    life: 88,
  },
  detail: {
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
      ["01", "Balanced palm shape", "Your hand shape suggests steady rhythm and practical taste. You do better with clear steps than dramatic leaps."],
      ["02", "Full thumb base", "You carry warmth and persistence. Once you care, you tend to hold on longer than you admit."],
      ["03", "Natural life line", "Your recovery pattern is gradual. Rest and routine matter more than sudden motivation."],
      ["04", "Calm wisdom line", "Your decisions improve when you write things down instead of keeping everything in your head."],
      ["05", "Soft heart line", "You feel deeply but prefer controlled expression. Direct communication works better than guessing."],
      ["06", "Crossing center lines", "You are in a transition phase: useful pressure, but too much noise can scatter your focus."],
      ["07", "Career line needs depth", "Long-term output beats short bursts. Pick one lane and repeat visibly."],
      ["08", "Moderate index proportion", "You are cooperative but still want ownership. Choose partners who respect your pace."],
      ["09", "Long ring finger", "You have visual instinct and presentation power. Make the thing look good early."],
      ["10", "Clear little finger feature", "Your edge is communication. Explain less, package better, ask clearly."],
    ],
    zh: [
      ["01", "手型偏均衡", "掌形整体舒展，说明节奏感较稳，适合按步骤推进，不适合情绪化冲刺。"],
      ["02", "拇指根部较饱满", "执行力和责任感不弱，一旦在意某件事，往往会坚持得比自己想象更久。"],
      ["03", "生命线弧度自然", "恢复力偏稳定型。最近比起突然爆发，更需要作息、节奏和持续行动。"],
      ["04", "智慧线较平稳", "适合把想法写下来再判断。脑内反复推演，反而会拖慢决定。"],
      ["05", "感情线偏柔和", "重情但表达偏克制。关系里少猜，多直接沟通，结果会更好。"],
      ["06", "掌心中心纹路交会", "近期处在转换期，有压力也有机会，但环境太吵会分散判断。"],
      ["07", "事业线可见度偏弱", "短期爆发不如长期积累。选一个方向持续输出，回报会更稳。"],
      ["08", "食指比例适中", "合作意识强，但也需要掌控感。适合找尊重你节奏的伙伴。"],
      ["09", "无名指较修长", "审美和表达能力不错，项目越早做出视觉样品，越容易被理解。"],
      ["10", "小指特征清晰", "沟通是你的优势。少解释理念，多包装结果，直接提出请求。"],
    ],
  },
};

const state = {
  step: "home",
  selected: choices[0],
  stream: null,
  imageData: "",
  lang: localStorage.getItem("pb-lang") || "en",
  backendReadingCreated: false,
};

function t(key) {
  return copy[state.lang][key] || copy.en[key] || key;
}

function isZh() {
  return state.lang === "zh";
}

function languageToggle() {
  return `
    <div class="lang-toggle" role="group" aria-label="Language">
      <button class="${state.lang === "en" ? "is-active" : ""}" data-action="lang" data-lang="en">EN</button>
      <button class="${state.lang === "zh" ? "is-active" : ""}" data-action="lang" data-lang="zh">中文</button>
    </div>
  `;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

async function ensureReading() {
  if (state.backendReadingCreated) return;
  const payload = await apiRequest("/api/readings", {
    method: "POST",
    body: { language: state.lang, deviceId: "demo-kiosk", shopId: "demo-shop" },
  });
  applyServerReading(payload.reading);
  state.backendReadingCreated = true;
}

async function markPaymentSuccess() {
  await ensureReading();
  await apiRequest(`/api/readings/${encodeURIComponent(reading.id)}/payment-success`, {
    method: "POST",
    body: { paymentId: `demo-${Date.now()}` },
  });
}

async function submitPalmScan() {
  await ensureReading();
  if (!state.imageData) state.imageData = demoPalmImage();
  const payload = await apiRequest(`/api/readings/${encodeURIComponent(reading.id)}/scan`, {
    method: "POST",
    body: { imageData: state.imageData, language: state.lang },
  });
  applyServerReading(payload.reading);
}

async function loadReadingForDetail(id) {
  reading.id = id;
  try {
    const payload = await apiRequest(`/api/readings/${encodeURIComponent(id)}`);
    applyServerReading(payload.reading);
    state.backendReadingCreated = true;
  } catch {
    state.imageData = localStorage.getItem(`pb-palm-${reading.id}`) || state.imageData || "";
  }
  renderDetailPage();
}

function applyServerReading(serverReading) {
  if (!serverReading) return;
  reading.id = serverReading.id || reading.id;
  reading.palmImageUrl = serverReading.palmImageUrl || reading.palmImageUrl || "";
  const analysis = serverReading.analysis;
  if (!analysis) return;
  reading.type = (analysis.typeEn || reading.type).toUpperCase();
  reading.typeZh = analysis.typeZh || reading.typeZh;
  reading.line = analysis.lineEn || reading.line;
  reading.lineZh = analysis.lineZh || reading.lineZh;
  reading.scores = { ...reading.scores, ...(analysis.scores || {}) };
  if (analysis.details) {
    reading.detail = {
      en: { ...reading.detail.en, ...(analysis.details.en || {}) },
      zh: { ...reading.detail.zh, ...(analysis.details.zh || {}) },
    };
  }
  if (analysis.traits) {
    reading.traits = {
      en: Array.isArray(analysis.traits.en) ? analysis.traits.en : reading.traits.en,
      zh: Array.isArray(analysis.traits.zh) ? analysis.traits.zh : reading.traits.zh,
    };
  }
  reading.markers = Array.isArray(analysis.markers) ? analysis.markers : [];
}

function shell(content, stepIndex = 0) {
  return `
    <section class="kiosk">
      <aside class="side-panel">
        <div>
          <div class="brand-mark"><span class="sigil">PB</span><span>${t("brand")}</span></div>
          <div class="headline">Palm<br>Blessing</div>
          <p class="side-copy">${t("sideCopy")}</p>
          <div class="price-strip">
            <div class="price-pill">${t("priceTitle")}<b>A$5</b><span>${t("priceNote")}</span></div>
          </div>
        </div>
        <div class="status-bar">
          <span>${t("privacy")}</span>
          <span>${reading.id}</span>
        </div>
      </aside>
      <section class="work-panel">
        <div class="top-bar">${languageToggle()}</div>
        <div class="progress" aria-label="Progress">
          ${[0, 1, 2, 3, 4].map((item) => `<span class="${item <= stepIndex ? "is-active" : ""}"></span>`).join("")}
        </div>
        <div class="screen">${content}</div>
        <div class="status-bar">
          <span>${t("footerLeft")}</span>
          <span>${t("footerRight")}</span>
        </div>
      </section>
    </section>
  `;
}

function palmSvg() {
  return `
    <svg class="palm-lines" viewBox="0 0 160 210" role="img" aria-label="Palm scan guide">
      <path d="M78 192c-31-5-50-28-50-63V76c0-8 5-13 12-13 6 0 11 5 11 13v39" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path d="M51 93V34c0-9 6-15 13-15s13 6 13 15v73" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path d="M77 101V26c0-9 6-15 13-15s13 6 13 15v78" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path d="M103 106V42c0-8 6-14 13-14s12 6 12 14v79c0 45-20 70-50 71" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path d="M43 133c24-8 47-8 73 0M50 155c18-12 40-17 61-12M67 77c12 6 25 6 37 0M64 122c13-20 32-27 55-24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".75"/>
    </svg>
  `;
}

function renderHome() {
  state.step = "home";
  stopCamera();
  app.innerHTML = shell(`
    <p class="eyebrow">${t("homeEyebrow")}</p>
    <h1>${t("homeTitle")}</h1>
    <p>${t("homeCopy")}</p>
    <button class="primary-action" data-action="choose">${t("start")}</button>
  `, 0);
}

function renderChoose() {
  state.step = "choose";
  app.innerHTML = shell(`
    <p class="eyebrow">${t("chooseEyebrow")}</p>
    <h2>${t("chooseTitle")}</h2>
    <p>${t("chooseCopy")}</p>
    <div class="choice-grid">
      ${choices.map((choice) => `
        <button class="choice-button ${choice.id === "full" ? "full" : ""}" data-action="select" data-id="${choice.id}">
          <b>${choice.label}</b>
          <span>${choice.hint}</span>
        </button>
      `).join("")}
    </div>
  `, 1);
}

function renderPayment() {
  state.step = "payment";
  app.innerHTML = shell(`
    <p class="eyebrow">${t("paymentEyebrow")}</p>
    <h2>${t("paymentTitle")}</h2>
    <div class="payment-card">
      <div class="payment-row"><span>${t("selected")}</span><b>${state.selected.label}</b></div>
      <div class="payment-row"><span>${t("amount")}</span><b>A$${state.selected.price}</b></div>
      <p>${t("paymentCopy")}</p>
      <button class="primary-action" data-action="paid">${t("paid")}</button>
    </div>
  `, 2);
}

function renderScan() {
  state.step = "scan";
  app.innerHTML = shell(`
    <p class="eyebrow">${t("scanEyebrow")}</p>
    <h2>${t("scanTitle")}</h2>
    <p>${t("scanCopy")}</p>
    <div class="scanner" data-scanner>
      <div class="scanner-placeholder">${palmSvg()}<span>${t("cameraReady")}</span></div>
    </div>
    <div class="actions">
      <button class="primary-action" data-action="start-scan">${t("startScan")}</button>
      <label class="secondary-action file-action">
        ${t("takePhoto")}
        <input data-palm-file type="file" accept="image/*" capture="environment" />
      </label>
      <button class="secondary-action" data-action="demo-scan">${t("demoScan")}</button>
    </div>
  `, 3);
  startCamera();
}

function renderAnalyzing() {
  state.step = "analyzing";
  app.innerHTML = shell(`
    <p class="eyebrow">${t("aiEyebrow")}</p>
    <h2>${t("aiTitle")}</h2>
    <p>${t("aiCopy")}</p>
    <div class="loading-bar"><span></span></div>
    <div class="analysis-stack">
      <div class="analysis-line"><span>${t("palmImage")}</span><b>${t("captured")}</b></div>
      <div class="analysis-line"><span>${t("aiApi")}</span><b>${t("processing")}</b></div>
      <div class="analysis-line"><span>${t("receipt")}</span><b>${t("preparing")}</b></div>
    </div>
  `, 4);
  submitPalmScan()
    .catch((error) => {
      console.warn("Palm scan analysis failed, using local fallback.", error);
      if (!state.imageData) state.imageData = demoPalmImage();
    })
    .finally(() => renderResult());
}

function renderResult() {
  state.step = "result";
  stopCamera();
  persistReading();
  app.innerHTML = shell(`
    <p class="eyebrow">${t("readyEyebrow")}</p>
    <h2>${t("readyTitle")}</h2>
    <div class="result-layout">
      <div class="result-summary">
        <div class="type-card"><span>${t("type")}</span><b>${isZh() ? reading.typeZh : reading.type}</b></div>
        <div class="score-card">
          ${scoreRow(t("love").toUpperCase(), reading.scores.love)}
          ${scoreRow(t("career").toUpperCase(), reading.scores.career)}
          ${scoreRow(t("life").toUpperCase(), reading.scores.life)}
        </div>
        <p>${isZh() ? reading.lineZh : reading.line}</p>
      </div>
      <div class="receipt-preview">${receiptHtml()}</div>
    </div>
    <div class="actions">
      <button class="primary-action" data-action="print">${t("print")}</button>
      <button class="secondary-action" data-action="detail">${t("detail")}</button>
      <button class="secondary-action" data-action="reset">${t("reset")}</button>
    </div>
  `, 4);
  hydrateQr();
}

function renderDetailPage() {
  state.step = "detail";
  stopCamera();
  document.body.classList.add("detail-mode");
  app.innerHTML = `
    <section class="detail-page">
      <section class="report-card">
        <header class="report-header">
          <div class="brand-mark"><span class="sigil">PB</span><span>Palm Blessing Sydney</span></div>
          ${languageToggle()}
          <h1>${t("reportTitle")}</h1>
          <p>${t("reportSubtitle")}</p>
        </header>
        <div class="palm-map">
          <div class="palm-map-title">${t("scanMap")}</div>
          <div class="palm-image-frame">
            <img src="${palmImageForDetail()}" alt="User palm scan" />
            ${markerHtml()}
          </div>
          <p class="palm-map-note">${t("markerNote")}</p>
        </div>
        <div class="report-type">
          <span>${t("type")}</span>
          <b>${isZh() ? reading.typeZh : reading.type}</b>
          <p>${isZh() ? reading.lineZh : reading.line}</p>
        </div>
        <div class="share-scores report-scores">
          <div><span>${t("love").toUpperCase()}</span><b>${stars(reading.scores.love)} ${reading.scores.love}</b></div>
          <div><span>${t("career").toUpperCase()}</span><b>${stars(reading.scores.career)} ${reading.scores.career}</b></div>
          <div><span>${t("life").toUpperCase()}</span><b>${stars(reading.scores.life)} ${reading.scores.life}</b></div>
        </div>
        <p class="detail-disclaimer">${t("disclaimer")}</p>
      </section>
      <section class="detail-card">
        <div class="section-heading">${t("observations")}</div>
        <div class="trait-grid">${traitHtml()}</div>
        <div class="section-heading">${t("summary")}</div>
        ${detailBlock(t("love"), detailCopy("love"))}
        ${detailBlock(t("career"), detailCopy("career"))}
        ${detailBlock(t("life"), detailCopy("life"))}
        ${detailBlock(t("action"), detailCopy("action"))}
        ${detailBlock(t("direction"), detailCopy("direction"))}
        <div class="reading-block coupon"><h2>${t("coupon")}</h2><p>${detailCopy("coupon")}</p></div>
        <button class="primary-action" data-action="reset">${t("backDemo")}</button>
      </section>
    </section>
  `;
}

function detailCopy(key) {
  return reading.detail[state.lang][key] || reading.detail.en[key];
}

function traitHtml() {
  return reading.traits[state.lang].map(([number, title, text]) => `
    <article class="trait-card">
      <span>${number}</span>
      <h2>${title}</h2>
      <p>${text}</p>
    </article>
  `).join("");
}

function markerHtml() {
  const markers = Array.isArray(reading.markers) ? reading.markers : [];
  return markers
    .filter((marker) => Array.isArray(marker) && marker.length >= 3)
    .map(([number, x, y]) => {
      const left = percentStyle(x);
      const top = percentStyle(y);
      const label = String(number || "").replace(/[^\d]/g, "").padStart(2, "0").slice(-2);
      if (!left || !top || !label) return "";
      return `<span class="palm-marker" style="left:${left};top:${top}">${label}</span>`;
    })
    .join("");
}

function percentStyle(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return `${Math.max(3, Math.min(97, number))}%`;
}

function palmImageForDetail() {
  return reading.palmImageUrl || state.imageData || localStorage.getItem(`pb-palm-${reading.id}`) || demoPalmImage();
}

function persistReading() {
  if (!state.imageData) state.imageData = demoPalmImage();
  try {
    localStorage.setItem(`pb-palm-${reading.id}`, state.imageData);
    localStorage.setItem("pb-last-reading-id", reading.id);
  } catch {
    // Storage may be unavailable in locked-down kiosk contexts.
  }
}

function demoPalmImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 980">
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffd9c8"/>
          <stop offset="1" stop-color="#eaa98f"/>
        </linearGradient>
      </defs>
      <rect width="800" height="980" fill="#f7efe0"/>
      <path d="M353 900c-111-19-177-104-177-232V391c0-34 21-56 50-56 27 0 47 22 47 56v159V199c0-38 27-66 60-66 34 0 59 28 59 66v333V149c0-39 27-67 61-67s59 28 59 67v376V208c0-38 26-65 59-65s58 27 58 65v400c0 182-88 281-276 292z" fill="url(#skin)" stroke="#d58d77" stroke-width="8" stroke-linejoin="round"/>
      <path d="M251 584c113-39 223-38 342 3M278 674c83-58 183-74 280-54M333 417c59 29 118 30 177 2M318 543c62-94 153-126 267-113M379 770c45-61 96-79 167-58" fill="none" stroke="#bc7b5e" stroke-width="9" stroke-linecap="round" opacity=".55"/>
      <path d="M245 591c116-24 229-16 350 20M327 552c70-69 151-91 259-82M298 682c75-39 161-54 253-33" fill="none" stroke="#caa85d" stroke-width="4" stroke-linecap="round" opacity=".88"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function detailBlock(title, text) {
  return `<div class="reading-block"><h2>${title}</h2><p>${text}</p></div>`;
}

function scoreRow(label, score) {
  return `<div class="score-row"><b>${label}</b><span class="stars">${stars(score)}</span><b>${score}</b></div>`;
}

/* Disabled legacy star renderer with corrupted encoding.
function stars(score) {
  const count = Math.round(score / 20);
  return "★★★★★".slice(0, count) + "☆☆☆☆☆".slice(0, 5 - count);
}

}
*/

function legacyStars(score) {
  const count = Math.max(0, Math.min(5, Math.round(score / 20)));
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function receiptHtml() {
  const node = receiptTemplate.content.cloneNode(true);
  const wrap = document.createElement("div");
  wrap.appendChild(node);
  const receipt = wrap.querySelector(".receipt-paper");
  receipt.querySelector("[data-receipt-type]").textContent = reading.type;
  receipt.querySelector("[data-love-stars]").textContent = receiptStars(receiptScore("love"));
  receipt.querySelector("[data-career-stars]").textContent = receiptStars(receiptScore("career"));
  receipt.querySelector("[data-life-stars]").textContent = receiptStars(receiptScore("life"));
  receipt.querySelector("[data-love-score]").textContent = reading.scores.love;
  receipt.querySelector("[data-career-score]").textContent = reading.scores.career;
  receipt.querySelector("[data-life-score]").textContent = reading.scores.life;
  receipt.querySelector("[data-receipt-line]").textContent = reading.line;
  return receipt.outerHTML;
}

function receiptScore(key) {
  return reading.scores[key];
}

function receiptStars(score) {
  const count = Math.max(0, Math.min(5, Math.round(score / 20)));
  return "*".repeat(count) + "-".repeat(5 - count);
}

function hydrateQr() {
  document.querySelectorAll("[data-qr]").forEach((qr) => {
    const image = new Image();
    image.alt = "QR code";
    image.loading = "lazy";
    image.src = `/api/readings/${encodeURIComponent(reading.id)}/qr.svg`;
    image.onerror = () => renderDecorativeQr(qr);
    qr.replaceChildren(image);
  });
}

function renderDecorativeQr(qr) {
  qr.innerHTML = "";
  const seed = reading.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  for (let i = 0; i < 81; i += 1) {
    const block = document.createElement("span");
    const inCorner =
      (i < 21 && i % 9 < 3) ||
      (i < 27 && i % 9 > 5) ||
      (i > 53 && i % 9 < 3);
    const shouldFill = inCorner || ((i * 17 + seed) % 5 < 2);
    block.style.opacity = shouldFill ? "1" : "0";
    qr.appendChild(block);
  }
}

async function startCamera() {
  const scanner = document.querySelector("[data-scanner]");
  if (!scanner || !navigator.mediaDevices?.getUserMedia) return;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = state.stream;
    scanner.replaceChildren(video);
  } catch {
    scanner.querySelector(".scanner-placeholder span").textContent = t("cameraFallback");
  }
}

function stopCamera() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
}

function captureFrame() {
  const video = document.querySelector("video");
  const scanner = document.querySelector("[data-scanner]");
  if (!scanner) return;
  if (!video) {
    document.querySelector("[data-palm-file]")?.click();
    return;
  }
  const counter = document.createElement("div");
  counter.className = "countdown";
  scanner.appendChild(counter);
  let value = 3;
  counter.textContent = value;
  const timer = setInterval(() => {
    value -= 1;
    counter.textContent = value || "";
    if (value === 0) {
      clearInterval(timer);
      if (video) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        state.imageData = canvas.toDataURL("image/jpeg", 0.78);
      }
      renderAnalyzing();
    }
  }, 650);
}

function printReceipt() {
  window.print();
}

function goDetail() {
  const url = new URL(window.location.href);
  url.searchParams.set("reading", reading.id);
  window.history.pushState({}, "", url);
  renderDetailPage();
}

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "lang") {
    state.lang = button.dataset.lang || "en";
    localStorage.setItem("pb-lang", state.lang);
    renderCurrentStep();
  }
  if (action === "choose") renderChoose();
  if (action === "select") {
    state.selected = choices.find((choice) => choice.id === button.dataset.id) || choices[0];
    renderPayment();
  }
  if (action === "paid") {
    button.disabled = true;
    button.textContent = t("processing");
    await markPaymentSuccess().catch((error) => console.warn("Payment callback failed in demo mode.", error));
    renderScan();
  }
  if (action === "start-scan") captureFrame();
  if (action === "demo-scan") {
    state.imageData = demoPalmImage();
    renderAnalyzing();
  }
  if (action === "print") printReceipt();
  if (action === "detail") goDetail();
  if (action === "reset") {
    document.body.classList.remove("detail-mode");
    window.history.pushState({}, "", window.location.pathname);
    renderHome();
  }
});

app.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-palm-file]");
  if (!input?.files?.[0]) return;
  const file = input.files[0];
  state.imageData = await fileToDataUrl(file);
  showCapturedImage(state.imageData);
  setTimeout(renderAnalyzing, 500);
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function showCapturedImage(imageData) {
  const scanner = document.querySelector("[data-scanner]");
  if (!scanner) return;
  scanner.innerHTML = `<img class="captured-palm" src="${imageData}" alt="Captured palm" />`;
}

function renderCurrentStep() {
  if (state.step === "choose") renderChoose();
  else if (state.step === "payment") renderPayment();
  else if (state.step === "scan") renderScan();
  else if (state.step === "analyzing") renderAnalyzing();
  else if (state.step === "result") renderResult();
  else if (state.step === "detail") renderDetailPage();
  else renderHome();
}

function stars(score) {
  const count = Math.max(0, Math.min(5, Math.round(score / 20)));
  const filled = String.fromCharCode(9733);
  const empty = String.fromCharCode(9734);
  return filled.repeat(count) + empty.repeat(5 - count);
}

const initialReadingId = new URLSearchParams(window.location.search).get("reading");
if (initialReadingId) {
  loadReadingForDetail(initialReadingId);
} else {
  renderHome();
}
