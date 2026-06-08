// ══════════════════════════════════════════════════════
//  紫微斗數 App  v2  —  app.js
//  ⚠️  請將下方 API_KEY 換成您自己的 Anthropic API Key
// ══════════════════════════════════════════════════════
const API_KEY = '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'; // ← 換成您的 Key

const EXPIRE_DAYS = 3; // 連結有效天數

// ── 基礎資料 ──────────────────────────────────────────
const ZHI  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const PALACE_NAMES = ['命宮','父母','福德','田宅','官祿','奴僕','遷移','疾厄','財帛','子女','夫妻','兄弟'];
const HOUR_MAP = {子時:0,丑時:1,寅時:2,卯時:3,辰時:4,巳時:5,午時:6,未時:7,申時:8,酉時:9,戌時:10,亥時:11};

const STAR_TABLE = {
  子:{main:'貪狼',    aux:['陀羅'],        hua:''},
  丑:{main:'巨門',    aux:['天鉞'],        hua:''},
  寅:{main:'紫微 天府',aux:['擎羊'],      hua:'帝星入廟'},
  卯:{main:'太陰',    aux:['祿存'],        hua:'入廟'},
  辰:{main:'天府',    aux:['文昌'],        hua:''},
  巳:{main:'廉貞 天相',aux:['鈴星'],      hua:''},
  午:{main:'天機 太陰',aux:['右弼'],      hua:'廟旺'},
  未:{main:'天梁',    aux:['火星'],        hua:''},
  申:{main:'天同',    aux:['右弼'],        hua:'廟'},
  酉:{main:'七殺',    aux:['左輔'],        hua:''},
  戌:{main:'武曲 破軍',aux:['文曲'],      hua:''},
  亥:{main:'太陽',    aux:['天馬'],        hua:'廟旺'},
};

const SIHUA = {
  甲:{lu:'廉貞',quan:'破軍',ke:'武曲', ji:'太陽'},
  乙:{lu:'天機',quan:'天梁',ke:'紫微', ji:'太陰'},
  丙:{lu:'天同',quan:'天機',ke:'文昌', ji:'廉貞'},
  丁:{lu:'太陰',quan:'天同',ke:'天機', ji:'巨門'},
  戊:{lu:'貪狼',quan:'太陰',ke:'右弼', ji:'天機'},
  己:{lu:'武曲',quan:'貪狼',ke:'天梁', ji:'文曲'},
  庚:{lu:'太陽',quan:'武曲',ke:'太陰', ji:'天同'},
  辛:{lu:'巨門',quan:'太陽',ke:'文曲', ji:'文昌'},
  壬:{lu:'天梁',quan:'紫微',ke:'左輔', ji:'武曲'},
  癸:{lu:'破軍',quan:'巨門',ke:'太陰', ji:'貪狼'},
};

// ── 命盤計算 ──────────────────────────────────────────
function calcChart(year, month, day, hourStr) {
  const yearIdx = (year - 4) % 60;
  const ganIdx  = ((yearIdx % 10) + 10) % 10;
  const zhiIdx  = ((yearIdx % 12) + 12) % 12;
  const yearGan = GAN[ganIdx];
  const yearZhi = ZHI[zhiIdx];
  const sh = SIHUA[yearGan] || {lu:'—',quan:'—',ke:'—',ji:'—'};
  const hourNum   = HOUR_MAP[hourStr] ?? 8;
  const mingIdx   = ((14 - month - hourNum) % 12 + 12) % 12;
  const mingZhi   = ZHI[mingIdx];

  const palaces = PALACE_NAMES.map((name, i) => {
    const zhiIndex = (mingIdx + i) % 12;
    const zhi      = ZHI[zhiIndex];
    const stars    = STAR_TABLE[zhi] || {main:'天空',aux:[],hua:''};
    return { name, zhi, main: stars.main, aux: stars.aux, hua: stars.hua, isMing: i === 0 };
  });

  return { palaces, yearGan, yearZhi, mingZhi, sihua: sh };
}

// ── 連結產生與解析 ──────────────────────────────────────
function buildLink(name, gender, year, month, day, hour) {
  const expireTs = Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  const params = new URLSearchParams({
    n: name, g: gender,
    y: year, m: month, d: day, h: hour,
    exp: expireTs,
  });
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function parseLink() {
  const p = new URLSearchParams(location.search);
  if (!p.has('n') || !p.has('y')) return null;
  return {
    name:   p.get('n'),
    gender: p.get('g') || 'male',
    year:   parseInt(p.get('y')),
    month:  parseInt(p.get('m')),
    day:    parseInt(p.get('d')),
    hour:   p.get('h'),
    exp:    parseInt(p.get('exp') || '0'),
  };
}

function isExpired(exp) {
  return exp > 0 && Date.now() > exp;
}

function expireLabel(exp) {
  if (!exp) return '永久有效';
  const d = new Date(exp);
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `有效期限：${yy}/${mm}/${dd} ${hh}:${mi}`;
}

// ── 全域狀態 ──────────────────────────────────────────
let currentPerson = null;
let currentChart  = null;
let analysisCache = {};

// ── Grid 渲染 ──────────────────────────────────────────
const GRID_POS = [
  {r:1,c:1},{r:1,c:2},{r:1,c:3},{r:1,c:4},
  {r:2,c:4},{r:3,c:4},
  {r:4,c:4},{r:4,c:3},{r:4,c:2},{r:4,c:1},
  {r:3,c:1},{r:2,c:1},
];
const GRID_IDX = [1,2,3,4,5,6,7,8,9,10,11,0];

function renderGrid(chart) {
  const grid = document.getElementById('palace-grid');
  grid.innerHTML = '';

  // 中央
  const center = document.createElement('div');
  center.className = 'palace palace-center';
  center.style.gridColumn = '2/4';
  center.style.gridRow    = '2/4';
  const sh = chart.sihua;
  center.innerHTML = `
    <div class="center-title">紫微斗數</div>
    <div class="center-sub">${chart.yearGan}${chart.yearZhi}年生</div>
    <div class="center-sub">命宮：${chart.mingZhi}宮</div>
    <div style="height:5px"></div>
    <div class="center-sihua">
      化祿：${sh.lu}　化權：${sh.quan}<br>
      化科：${sh.ke}　化忌：${sh.ji}
    </div>
    <div class="center-hint">▸ 點擊宮位</div>
  `;
  grid.appendChild(center);

  GRID_POS.forEach((pos, i) => {
    const pal = chart.palaces[GRID_IDX[i]];
    const el  = document.createElement('div');
    el.className = 'palace' + (pal.isMing ? ' mingong' : '');
    el.style.gridColumn = pos.c;
    el.style.gridRow    = pos.r;
    const auxStr = pal.aux.join('・');
    el.innerHTML = `
      <div class="palace-name">${pal.name}${pal.isMing ? ' ★' : ''}</div>
      <div class="palace-zhi">${pal.zhi}宮</div>
      <div class="star-main">${pal.main}</div>
      ${pal.hua  ? `<div class="star-hua">${pal.hua}</div>`  : ''}
      ${auxStr   ? `<div class="star-aux">${auxStr}</div>`   : ''}
    `;
    el.addEventListener('click', () => analyzePalace(el, pal));
    grid.appendChild(el);
  });
}

// ── AI 呼叫 ────────────────────────────────────────────
async function callAI(prompt, maxTokens = 1200) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return json.content?.[0]?.text || '解析失敗，請稍後重試。';
}

function textToHtml(text) {
  return text.split('\n\n').map(p => {
    const line = p
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    return `<p>${line}</p>`;
  }).join('');
}

function showLoading(el) {
  el.innerHTML = `<div class="loading-dots">
    <div class="dot-anim"><span>●</span><span>●</span><span>●</span></div>
    <span style="color:#bbb;font-size:13px">AI 解析中，請稍候…</span>
  </div>`;
}
function showError(el) {
  el.innerHTML = '<p style="color:#c00;font-size:13px">連線失敗，請稍後重試。</p>';
}

// ── 宮位解析 ────────────────────────────────────────────
async function analyzePalace(elClicked, palace) {
  document.querySelectorAll('.palace').forEach(el => el.classList.remove('selected'));
  elClicked.classList.add('selected');

  const p   = currentPerson;
  const ch  = currentChart;
  const key = `palace-${palace.name}-${palace.zhi}`;
  const titleEl = document.getElementById('analysis-title');
  const bodyEl  = document.getElementById('analysis-body');

  titleEl.textContent = `${palace.name}（${palace.zhi}宮）`;
  if (analysisCache[key]) { bodyEl.innerHTML = analysisCache[key]; return; }
  showLoading(bodyEl);

  const prompt = `你是資深紫微斗數命理師，請用繁體中文詳細解析以下宮位。

命主：${p.name}（${p.gender === 'male' ? '男' : '女'}）
出生：${p.year}年${p.month}月${p.day}日 ${p.hour}
生年天干：${ch.yearGan}（化祿${ch.sihua.lu}、化權${ch.sihua.quan}、化科${ch.sihua.ke}、化忌${ch.sihua.ji}）
命宮：${ch.mingZhi}宮，主星：${ch.palaces[0].main}

解析宮位：${palace.name}（${palace.zhi}宮）
主星：${palace.main}
輔星：${palace.aux.join('、') || '無'}
特殊：${palace.hua || '無'}

請分析：
1. 此宮位星曜組合對命主的具體影響與性格特質
2. 吉凶判斷與注意事項
3. 實際人生建議

風格：專業但易懂，自然段落，約350字，不需要標題列表。`;

  try {
    const text = await callAI(prompt);
    const html = textToHtml(text);
    analysisCache[key] = html;
    bodyEl.innerHTML = html;
  } catch (e) { showError(bodyEl); }
}

// ── 流年查詢 ────────────────────────────────────────────
async function queryLiunian() {
  const lyYear = parseInt(document.getElementById('ly-year').value);
  if (!lyYear || lyYear < 2000 || lyYear > 2060) { alert('請輸入正確年份（2000–2060）'); return; }

  const btn     = document.getElementById('btn-liunian');
  const titleEl = document.getElementById('ly-title');
  const bodyEl  = document.getElementById('ly-body');
  const p       = currentPerson;
  const ch      = currentChart;
  const age     = lyYear - p.year;
  const key     = `liunian-${lyYear}`;

  titleEl.textContent = `${lyYear} 年流年運勢（${age} 歲）`;
  if (analysisCache[key]) { bodyEl.innerHTML = analysisCache[key]; return; }
  btn.disabled = true;
  showLoading(bodyEl);

  const prompt = `你是資深紫微斗數命理師，請用繁體中文分析以下命主的流年運勢。

命主：${p.name}（${p.gender === 'male' ? '男' : '女'}，${age} 歲）
出生：${p.year}年${p.month}月${p.day}日 ${p.hour}
生年：${ch.yearGan}${ch.yearZhi}年
命宮：${ch.mingZhi}宮，主星：${ch.palaces[0].main}
生年四化：化祿${ch.sihua.lu}、化權${ch.sihua.quan}、化科${ch.sihua.ke}、化忌${ch.sihua.ji}

查詢流年：${lyYear} 年

請依序分析（每項加粗小標題）：
**整體運勢總評**、**事業財運**、**感情婚姻**、**健康注意**、**本年重點建議**

約 450 字，自然段落。`;

  try {
    const text = await callAI(prompt, 1400);
    const html = textToHtml(text);
    analysisCache[key] = html;
    bodyEl.innerHTML = html;
  } catch (e) { showError(bodyEl); }
  finally { btn.disabled = false; }
}

// ── 相似人物 ────────────────────────────────────────────
async function loadPersonMatch() {
  const bodyEl = document.getElementById('person-body');
  const p      = currentPerson;
  const ch     = currentChart;
  const key    = 'person-match';

  if (analysisCache[key]) { bodyEl.innerHTML = analysisCache[key]; return; }

  const prompt = `你是紫微斗數命理師，根據以下命盤特質分析命主最像哪位歷史或知名人物。

命主：${p.name}（${p.gender === 'male' ? '男' : '女'}）
出生：${p.year}年${p.month}月${p.day}日 ${p.hour}
命宮：${ch.mingZhi}宮，主星：${ch.palaces[0].main}
生年：${ch.yearGan}${ch.yearZhi}，四化：化祿${ch.sihua.lu}、化權${ch.sihua.quan}、化科${ch.sihua.ke}、化忌${ch.sihua.ji}

請分析：
1. 最相似的歷史或知名人物（第一名）並詳細說明相似之處
2. 第二、三名相似人物與簡要說明
3. 命主與這些人物最關鍵的不同點與獨特之處

約 380 字，自然段落。`;

  try {
    const text = await callAI(prompt);
    const html = `<div class="match-badge">命盤人物比對</div>` + textToHtml(text);
    analysisCache[key] = html;
    bodyEl.innerHTML = html;
  } catch (e) { showError(bodyEl); }
}

// ── 載入命盤畫面 ─────────────────────────────────────────
function loadChartScreen(person) {
  currentPerson = person;
  currentChart  = calcChart(person.year, person.month, person.day, person.hour);
  analysisCache = {};

  // 人物欄
  document.getElementById('pi-avatar').textContent  = person.name[0];
  document.getElementById('pi-name').textContent    = person.name;
  document.getElementById('pi-info').textContent    =
    `${person.year}年${person.month}月${person.day}日・${person.hour}・命宮${currentChart.mingZhi}宮`;
  document.getElementById('pi-expire').textContent  = expireLabel(person.exp);

  // 預設流年
  document.getElementById('ly-year').value = new Date().getFullYear();

  // 重置面板
  document.getElementById('analysis-title').textContent = '宮位解析';
  document.getElementById('analysis-body').innerHTML =
    '<div class="placeholder-text">點擊上方任一宮位<br>AI 將為您深度解析星曜意涵</div>';
  document.getElementById('ly-body').innerHTML =
    '<div class="placeholder-text">輸入年份後點擊查詢<br>AI 將分析該年整體運勢</div>';
  document.getElementById('person-body').innerHTML = `<div class="loading-dots">
    <div class="dot-anim"><span>●</span><span>●</span><span>●</span></div>
    <span style="color:#bbb;font-size:13px">比對分析中…</span>
  </div>`;

  // 重置 tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="chart"]').classList.add('active');
  document.getElementById('tab-chart').style.display   = 'block';
  document.getElementById('tab-liunian').style.display = 'none';
  document.getElementById('tab-person').style.display  = 'none';

  renderGrid(currentChart);
  showScreen('screen-chart');
  loadPersonMatch();
}

// ── 畫面切換 ─────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── 初始化：判斷是否帶參數 ───────────────────────────────
(function init() {
  const person = parseLink();

  if (person) {
    // 從連結進來的使用者
    if (isExpired(person.exp)) {
      showScreen('screen-expired');
    } else {
      loadChartScreen(person);
    }
  } else {
    // 管理者（輸入畫面）
    showScreen('screen-input');
  }
})();

// ── 產生連結 ─────────────────────────────────────────────
document.getElementById('btn-generate').addEventListener('click', () => {
  const name   = document.getElementById('inp-name').value.trim() || '命主';
  const gender = document.getElementById('inp-gender').value;
  const year   = parseInt(document.getElementById('inp-year').value);
  const month  = parseInt(document.getElementById('inp-month').value);
  const day    = parseInt(document.getElementById('inp-day').value);
  const hour   = document.getElementById('inp-hour').value;

  if (!year || !month || !day || !hour) { alert('請填寫完整出生資訊'); return; }
  if (year < 1920 || year > 2010)       { alert('請輸入正確年份（1920–2010）'); return; }
  if (day < 1 || day > 31)              { alert('請輸入正確日期'); return; }

  const link    = buildLink(name, gender, year, month, day, hour);
  const expireTs = Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000;

  document.getElementById('link-url').textContent    = link;
  document.getElementById('link-expire').textContent = `⏱ 有效期限：3 天（${expireLabel(expireTs).replace('有效期限：','')} 到期）`;
  document.getElementById('link-box').style.display  = 'block';
  document.getElementById('copy-ok').style.display   = 'none';

  // 儲存供預覽用
  document.getElementById('btn-preview')._person = {
    name, gender, year, month, day, hour, exp: expireTs
  };
});

// ── 複製連結 ─────────────────────────────────────────────
document.getElementById('btn-copy').addEventListener('click', () => {
  const url = document.getElementById('link-url').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const ok = document.getElementById('copy-ok');
    ok.style.display = 'inline';
    setTimeout(() => { ok.style.display = 'none'; }, 2000);
  });
});

// ── 預覽命盤 ─────────────────────────────────────────────
document.getElementById('btn-preview').addEventListener('click', function() {
  if (this._person) loadChartScreen(this._person);
});

// ── 返回（命盤畫面中隱藏，對方看到的版本不需要返回）──
// 如需測試可在 console 呼叫 showScreen('screen-input')

// ── 流年查詢按鈕 ─────────────────────────────────────────
document.getElementById('btn-liunian').addEventListener('click', queryLiunian);

// ── Tab 切換 ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-chart').style.display   = tab === 'chart'   ? 'block' : 'none';
    document.getElementById('tab-liunian').style.display = tab === 'liunian' ? 'block' : 'none';
    document.getElementById('tab-person').style.display  = tab === 'person'  ? 'block' : 'none';
  });
});
