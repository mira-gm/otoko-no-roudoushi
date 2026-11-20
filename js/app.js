const DATA_URL = "data/works.json";

async function loadWorks() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("作品一覧を読み込めませんでした");
  return response.json();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function getQueryId() {
  return new URLSearchParams(location.search).get("id");
}

function renderWorkCards(works) {
  const list = document.getElementById("works-list");
  if (!list) return;
  list.innerHTML = works
    .sort((a, b) => a.order - b.order)
    .map(work => {
      const portrait = work.portrait
        ? `<img src="${escapeHtml(work.portrait)}" alt="${escapeHtml(work.era + " " + work.occupation)}">`
        : `<div class="portrait-placeholder">顔イラスト準備中</div>`;
      return `
        <a class="work-card" href="work.html?id=${encodeURIComponent(work.id)}">
          <div class="portrait-wrap">${portrait}</div>
          <p class="work-meta">${escapeHtml(work.era)}｜${escapeHtml(work.occupation)}</p>
          <h2 class="work-title">${escapeHtml(work.title)}</h2>
        </a>`;
    }).join("");
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (quoted) {
      if (c === '"' && next === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== "\r") cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const headers = (rows.shift() || []).map(h => h.replace(/^\uFEFF/, ""));
  return rows.filter(r => r.some(v => v.trim() !== "")).map(r =>
    Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))
  );
}

function renderStory(work, scenes) {
  const main = document.getElementById("story-main");
  if (!main) return;
  const first = scenes[0] || {};
  const intro = first.description || "";
  const sorted = scenes.sort((a, b) => Number(a.index) - Number(b.index));

  const sceneHtml = sorted.map((scene, index) => {
    const isLast = index === sorted.length - 1;
    const title = scene.title || `場面 ${index + 1}`;
    const image = scene.image ? `${work.id}/${scene.image}` : "";
    return `
      <section class="scene ${isLast ? "scene-final" : ""}" id="scene-${index + 1}">
        <p class="scene-number">SCENE ${String(index + 1).padStart(2, "0")} / ${sorted.length}</p>
        <h2>${escapeHtml(title)}</h2>
        ${image ? `<img class="scene-image" src="works/${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="${index === 0 ? "eager" : "lazy"}">` : ""}
        ${scene.description ? `<p class="scene-description">${escapeHtml(scene.description)}</p>` : ""}
        <p class="dialogue">${escapeHtml(scene.dialogue || "")}</p>
        ${!isLast ? `<a class="scene-next" href="#scene-${index + 2}">次の場面へ <span aria-hidden="true">↓</span></a>` : ""}
      </section>`;
  }).join("");

  main.innerHTML = `
    <header class="story-heading">
      <p class="story-meta">${escapeHtml(work.era)}｜${escapeHtml(work.occupation)}${work.period ? "｜" + escapeHtml(work.period) : ""}</p>
      <h1>${escapeHtml(work.title)}</h1>
      ${intro ? `<p class="story-description">${escapeHtml(intro)}</p>` : ""}
    </header>
    ${sceneHtml}
    <div class="story-end"><a href="index.html">作品一覧へ戻る</a></div>
  `;
  document.title = `${work.title}｜男たちの労働史`;
}

async function init() {
  try {
    const works = await loadWorks();
    const list = document.getElementById("works-list");
    if (list) renderWorkCards(works);

    const main = document.getElementById("story-main");
    if (main) {
      const id = getQueryId();
      const work = works.find(item => item.id === id);
      if (!work) {
        main.innerHTML = '<p>作品が見つかりませんでした。</p><p><a href="index.html">作品一覧へ戻る</a></p>';
        return;
      }
      const response = await fetch(work.csv);
      if (!response.ok) throw new Error("作品データを読み込めませんでした");
      const csvText = await response.text();
      renderStory(work, parseCSV(csvText));
    }
  } catch (error) {
    const target = document.getElementById("works-list") || document.getElementById("story-main");
    if (target) target.innerHTML = `<p class="loading">${escapeHtml(error.message)}</p>`;
  }
}
init();
