const EXPIRE_DAYS = 3;
const UNKNOWN_HOUR = '時辰不詳';
const ZHI  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GAN  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const PALACE_NAMES = ['命宮','父母','福德','田宅','官祿','奴僕','遷移','疾厄','財帛','子女','夫妻','兄弟'];
const HOUR_MAP = {子時:0,丑時:1,寅時:2,卯時:3,辰時:4,巳時:5,午時:6,未時:7,申時:8,酉時:9,戌時:10,亥時:11};
const STAR_TABLE = {
  子:{main:'貪狼',aux:['陀羅'],hua:''},丑:{main:'巨門',aux:['天鉞'],hua:''},
  寅:{main:'紫微 天府',aux:['擎羊'],hua:'帝星入廟'},卯:{main:'太陰',aux:['祿存'],hua:'入廟'},
  辰:{main:'天府',aux:['文昌'],hua:''},巳:{main:'廉貞 天相',aux:['鈴星'],hua:''},
  午:{main:'天機 太陰',aux:['右弼'],hua:'廟旺'},未:{main:'天梁',aux:['火星'],hua:''},
  申:{main:'天同',aux:['右弼'],hua:'廟'},酉:{main:'七殺',aux:['左輔'],hua:''},
  戌:{main:'武曲 破軍',aux:['文曲'],hua:''},亥:{main:'太陽',aux:['天馬'],hua:'廟旺'},
};
const SIHUA = {
  甲:{lu:'廉貞',quan:'破軍',ke:'武曲',ji:'太陽'},乙:{lu:'天機',quan:'天梁',ke:'紫微',ji:'太陰'},
  丙:{lu:'天同',quan:'天機',ke:'文昌',ji:'廉貞'},丁:{lu:'太陰',quan:'天同',ke:'天機',ji:'巨門'},
  戊:{lu:'貪狼',quan:'太陰',ke:'右弼',ji:'天機'},己:{lu:'武曲',quan:'貪狼',ke:'天梁',ji:'文曲'},
  庚:{lu:'太陽',quan:'武曲',ke:'太陰',ji:'天同'},辛:{lu:'巨門',quan:'太陽',ke:'文曲',ji:'文昌'},
  壬:{lu:'天梁',quan:'紫微',ke:'左輔',ji:'武曲'},癸:{lu:'破軍',quan:'巨門',ke:'太陰',ji:'貪狼'},
};

// ── 密碼輸入 ──────────────────────────────────────────
let pinValue = '';
window.pinInput = function(n) {
  if (pinValue.length >= 4) return;
  pinValue += n;
  updatePinDots();
  if (pinValue.length === 4) verifyPin();
};
window.pinDelete = function() {
  pinValue = pinValue.slice(0,-1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
};
window.pinClear = function() {
  pinValue = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
};
function updatePinDots() {
  for(let i=0;i<4;i++) {
    document.getElementById(`dot-${i}`).classList.toggle('filled', i < pinValue.length);
  }
}
async function verifyPin() {
  try {
    const res = await fetch(`/api/chat?action=verify&pwd=${pinValue}`);
    const data = await res.json();
    if (data.ok) {
      sessionStorage.setItem('admin_ok','1');
      showScreen('screen-input');
    } else {
      document.getElementById('pin-error').textContent = '密碼錯誤，請重試';
      pinValue = '';
      updatePinDots();
    }
  } catch(e) {
    document.getElementById('pin-error').textContent = '連線失敗，請重試';
    pinValue = '';
    updatePinDots();
  }
}

// ── 性別切換 ──────────────────────────────────────────
let selectedGender = 'male';
window.setGender = function(g) {
  selectedGender = g;
  document.getElementById('inp-gender').value = g;
  document.getElementById('gbtn-male').classList.toggle('active', g==='male');
  document.getElementById('gbtn-female').classList.toggle('active', g==='female');
};

// ── 功能勾選 ──────────────────────────────────────────
const featureState = {liunian:false, person:false};
window.toggleFeature = function(key) {
  featureState[key] = !featureState[key];
  document.getElementById(`feat-${key}`).classList.toggle('checked', featureState[key]);
  document.getElementById(`check-${key}`).textContent = featureState[key] ? '✓' : '';
};

// ── 時辰不詳推算 ──────────────────────────────────────
function guessMingCandidates(year, month) {
  const results = [];
  [0,4,8].forEach(h => {
    const mi = ((14-month-h)%12+12)%12;
    const mz = ZHI[mi];
    const s  = STAR_TABLE[mz]||{main:'天空'};
    results.push({mingZhi:mz, mainStar:s.main});
  });
  const seen = new Set();
  return results.filter(r=>{ if(seen.has(r.mingZhi)) return false; seen.add(r.mingZhi); return true; });
}

// ── 命盤計算 ──────────────────────────────────────────
function calcChart(year, month, day, hourStr) {
  const yi = (year-4)%60;
  const gi = ((yi%10)+10)%10;
  const zi = ((yi%12)+12)%12;
  const yg = GAN[gi], yz = ZHI[zi];
  const sh = SIHUA[yg]||{lu:'—',quan:'—',ke:'—',ji:'—'};
  const unk = hourStr===UNKNOWN_HOUR;
  const hn  = unk ? 6 : (HOUR_MAP[hourStr]??8);
  const mi  = ((14-month-hn)%12+12)%12;
  const mz  = ZHI[mi];
  const palaces = PALACE_NAMES.map((name,i)=>{
    const z = ZHI[(mi+i)%12];
    const s = STAR_TABLE[z]||{main:'天空',aux:[],hua:''};
    return {name, zhi:z, main:s.main, aux:s.aux, hua:s.hua, isMing:i===0};
  });
  return {palaces, yearGan:yg, yearZhi:yz, mingZhi:mz, sihua:sh, isUnknown:unk};
}

// ── 連結處理 ──────────────────────────────────────────
function buildLink(name, gender, year, month, day, hour, features) {
  const exp = Date.now()+EXPIRE_DAYS*24*60*60*1000;
  const p = new URLSearchParams({n:name,g:gender,y:year,m:month,d:day,h:hour,exp,fl:features.liunian?'1':'0',fp:features.person?'1':'0'});
  return `${location.origin}${location.pathname}?${p}`;
}
function parseLink() {
  const p = new URLSearchParams(location.search);
  if(!p.has('n')||!p.has('y')) return null;
  return {name:p.get('n'),gender:p.get('g')||'male',year:parseInt(p.get('y')),month:parseInt(p.get('m')),day:parseInt(p.get('d')),hour:p.get('h'),exp:parseInt(p.get('exp')||'0'),features:{liunian:p.get('fl')==='1',person:p.get('fp')==='1'}};
}
function isExpired(exp){return exp>0&&Date.now()>exp;}
function expireLabel(exp){
  if(!exp) return '永久有效';
  const d=new Date(exp);
  return `有效期限：${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── 全域狀態 ──────────────────────────────────────────
let currentPerson=null, currentChart=null, analysisCache={};

// ── localStorage 持久快取 ─────────────────────────────
function cacheKey(person, key) {
  return `tjg_${person.year}${person.month}${person.day}_${person.hour}_${person.gender}_${key}`;
}
function cacheGet(person, key) {
  try { return localStorage.getItem(cacheKey(person, key)); } catch(e) { return null; }
}
function cacheSet(person, key, html) {
  try { localStorage.setItem(cacheKey(person, key), html); } catch(e) {}
}

// ── Grid ──────────────────────────────────────────────
const GRID_POS=[{r:1,c:1},{r:1,c:2},{r:1,c:3},{r:1,c:4},{r:2,c:4},{r:3,c:4},{r:4,c:4},{r:4,c:3},{r:4,c:2},{r:4,c:1},{r:3,c:1},{r:2,c:1}];
const GRID_IDX=[1,2,3,4,5,6,7,8,9,10,11,0];
function renderGrid(chart) {
  const grid=document.getElementById('palace-grid');
  grid.innerHTML='';
  const sh=chart.sihua;
  const center=document.createElement('div');
  center.className='palace palace-center';
  center.style.gridColumn='2/4';center.style.gridRow='2/4';
  center.innerHTML=`<div class="center-title">天機閣</div><div class="center-sub">${chart.yearGan}${chart.yearZhi}年生</div><div class="center-sub">命宮：${chart.mingZhi}宮${chart.isUnknown?'（推算）':''}</div><div style="height:4px"></div><div class="center-sihua">化祿：${sh.lu}　化權：${sh.quan}<br>化科：${sh.ke}　化忌：${sh.ji}</div><div class="center-hint">▸ 點擊宮位</div>`;
  grid.appendChild(center);
  GRID_POS.forEach((pos,i)=>{
    const pal=chart.palaces[GRID_IDX[i]];
    const el=document.createElement('div');
    el.className='palace'+(pal.isMing?' mingong':'');
    el.style.gridColumn=pos.c;el.style.gridRow=pos.r;
    el.innerHTML=`<div class="palace-name">${pal.name}${pal.isMing?(chart.isUnknown?' ?':' ★'):''}</div><div class="palace-zhi">${pal.zhi}宮</div><div class="star-main">${pal.main}</div>${pal.hua?`<div class="star-hua">${pal.hua}</div>`:''}${pal.aux.length?`<div class="star-aux">${pal.aux.join('・')}</div>`:''}`;
    el.addEventListener('click',()=>analyzePalace(el,pal));
    grid.appendChild(el);
  });
}

// ── 時辰不詳 Banner ────────────────────────────────────
function renderUnknownBanner(person, chart) {
  document.getElementById('unknown-banner')?.remove();
  if(!chart.isUnknown) return;
  const candidates=guessMingCandidates(person.year,person.month);
  const banner=document.createElement('div');
  banner.id='unknown-banner';
  banner.style.cssText='background:#fff8e0;border:1px solid var(--border);border-radius:10px;padding:14px 18px;margin-bottom:18px;font-size:13px;line-height:1.9';
  const tags=candidates.map(c=>`<span style="display:inline-block;background:#fff;border:1px solid var(--border);border-radius:6px;padding:2px 10px;margin:2px 4px;font-size:12px;color:var(--gold-dk)">${c.mingZhi}宮（${c.mainStar}）</span>`).join('');
  banner.innerHTML=`<div style="font-weight:500;color:var(--gold-dk);margin-bottom:6px">⚠ 時辰不詳・命宮為推算值</div><div style="color:#888;font-size:12px">根據出生年月，最可能的命宮：</div><div style="margin:8px 0">${tags}</div><div style="color:#bbb;font-size:11px">其餘宮位及生年四化不受時辰影響，解析仍具參考價值。</div>`;
  document.getElementById('palace-grid').parentNode.insertBefore(banner,document.getElementById('palace-grid'));
}

// ── Tab 鎖定 ──────────────────────────────────────────
function applyTabLocks(features) {
  const btnLy=document.getElementById('tab-btn-liunian');
  const btnPr=document.getElementById('tab-btn-person');
  if(!features.liunian){btnLy.classList.add('locked-tab');btnLy.onclick=e=>e.stopPropagation();document.getElementById('liunian-content').innerHTML='<div class="locked-panel"><div class="lock-icon">🔒</div><p>此功能未開放</p></div>';}
  if(!features.person){btnPr.classList.add('locked-tab');btnPr.onclick=e=>e.stopPropagation();document.getElementById('person-content').innerHTML='<div class="locked-panel"><div class="lock-icon">🔒</div><p>此功能未開放</p></div>';}
}

// ── AI 呼叫 ────────────────────────────────────────────
async function callAI(prompt, maxTokens=1200) {
  const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,maxTokens})});
  const json=await res.json();
  if(!res.ok||json.error) throw new Error(json.error||`HTTP ${res.status}`);
  return json.text;
}
function textToHtml(text){return text.split('\n\n').map(p=>`<p>${p.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</p>`).join('');}
function showLoading(el){el.innerHTML=`<div class="loading-dots"><div class="dot-anim"><span>●</span><span>●</span><span>●</span></div><span style="color:#bbb;font-size:13px">解析中，請稍候…</span></div>`;}
function showError(el,msg){el.innerHTML=`<p style="color:#c00;font-size:13px">解析失敗：${msg||'請稍後重試'}</p>`;}

// ── 宮位解析 ────────────────────────────────────────────
async function analyzePalace(elClicked, palace) {
  document.querySelectorAll('.palace').forEach(el=>el.classList.remove('selected'));
  elClicked.classList.add('selected');
  const p=currentPerson, ch=currentChart;
  const key=`palace-${palace.name}-${palace.zhi}`;
  document.getElementById('analysis-title').textContent=`${palace.name}（${palace.zhi}宮）`;
  const bodyEl=document.getElementById('analysis-body');
  if(analysisCache[key]){bodyEl.innerHTML=analysisCache[key];return;}
  const cached=cacheGet(currentPerson,key);
  if(cached){analysisCache[key]=cached;bodyEl.innerHTML=cached;return;}
  showLoading(bodyEl);
  const genderNote=p.gender==='female'?'（女命，請特別針對女性的感情觀、婚姻、事業與人生特質加以詮釋）':'（男命，請針對男性的事業、財運、人生格局加以詮釋）';
  const unknownNote=ch.isUnknown&&palace.isMing?'\n注意：時辰不詳，命宮為推算值。':'';
  const prompt=`你是資深紫微斗數命理師，請用繁體中文詳細解析以下宮位。

命主：${p.name}${genderNote}
出生：${p.year}年${p.month}月${p.day}日 ${p.hour}
生年天干：${ch.yearGan}（化祿${ch.sihua.lu}、化權${ch.sihua.quan}、化科${ch.sihua.ke}、化忌${ch.sihua.ji}）
命宮：${ch.mingZhi}宮，主星：${ch.palaces[0].main}${unknownNote}

解析宮位：${palace.name}（${palace.zhi}宮）
主星：${palace.main}
輔星：${palace.aux.join('、')||'無'}
特殊：${palace.hua||'無'}

請分析：1.星曜組合對此命主的具體影響 2.吉凶判斷與注意事項 3.實際人生建議
風格：專業易懂，自然段落，約350字。`;
  try{const html=textToHtml(await callAI(prompt));analysisCache[key]=html;cacheSet(currentPerson,key,html);bodyEl.innerHTML=html;}
  catch(e){showError(bodyEl,e.message);}
}

// ── 流年查詢 ────────────────────────────────────────────
async function queryLiunian() {
  const lyYear=new Date().getFullYear();
  const titleEl=document.getElementById('ly-title');
  const bodyEl=document.getElementById('ly-body');
  const p=currentPerson,ch=currentChart;
  const age=lyYear-p.year;
  const key=`liunian-${lyYear}`;
  titleEl.textContent=`${lyYear} 年流年運勢（${age} 歲）`;
  if(analysisCache[key]){bodyEl.innerHTML=analysisCache[key];return;}
  const cachedLy=cacheGet(p,key);
  if(cachedLy){analysisCache[key]=cachedLy;bodyEl.innerHTML=cachedLy;return;}
  showLoading(bodyEl);
  const genderNote=p.gender==='female'?'女命，請特別針對女性的感情、婚姻、家庭與事業進行分析':'男命，請針對事業、財運、人際關係進行分析';
  const unknownNote=ch.isUnknown?'\n注意：時辰不詳，請以生年四化為主要依據。':'';
  const prompt=`你是資深紫微斗數命理師，請用繁體中文分析以下命主的流年運勢。

命主：${p.name}（${genderNote}，${age}歲）
出生：${p.year}年${p.month}月${p.day}日 ${p.hour}
生年：${ch.yearGan}${ch.yearZhi}年
命宮：${ch.mingZhi}宮，主星：${ch.palaces[0].main}
生年四化：化祿${ch.sihua.lu}、化權${ch.sihua.quan}、化科${ch.sihua.ke}、化忌${ch.sihua.ji}${unknownNote}

查詢流年：${lyYear}年

請依序分析（每項加粗小標題）：**整體運勢總評**、**事業財運**、**感情婚姻**、**健康注意**、**本年重點建議**
約450字，自然段落。`;
  try{const html=textToHtml(await callAI(prompt,1400));analysisCache[key]=html;cacheSet(p,key,html);bodyEl.innerHTML=html;}
  catch(e){showError(bodyEl,e.message);}
}

// ── 相似人物 ────────────────────────────────────────────
async function loadPersonMatch() {
  const bodyEl=document.getElementById('person-body');
  if(!currentPerson?.features?.person) return;
  const p=currentPerson,ch=currentChart;
  const key='person-match';
  if(analysisCache[key]){bodyEl.innerHTML=analysisCache[key];return;}
  const cachedPr=cacheGet(p,key);
  if(cachedPr){analysisCache[key]=cachedPr;bodyEl.innerHTML=cachedPr;return;}
  const genderNote=p.gender==='female'?'女命，請比對歷史上傑出女性或具代表性的女性人物':'男命';
  const unknownNote=ch.isUnknown?'\n注意：時辰不詳，請以生年四化及整體命格為主要依據。':'';
  const prompt=`你是紫微斗數命理師，根據以下命盤特質分析命主最像哪位歷史或知名人物。

命主：${p.name}（${genderNote}）
出生：${p.year}年${p.month}月${p.day}日 ${p.hour}
命宮：${ch.mingZhi}宮，主星：${ch.palaces[0].main}
生年：${ch.yearGan}${ch.yearZhi}，四化：化祿${ch.sihua.lu}、化權${ch.sihua.quan}、化科${ch.sihua.ke}、化忌${ch.sihua.ji}${unknownNote}

請分析：1.最相似人物（第一名）並詳細說明 2.第二三名簡要說明 3.命主獨特之處
約380字，自然段落。`;
  try{const html=`<div class="match-badge">命盤人物比對</div>`+textToHtml(await callAI(prompt));analysisCache[key]=html;cacheSet(p,key,html);bodyEl.innerHTML=html;}
  catch(e){showError(bodyEl,e.message);}
}

// ── 載入命盤 ──────────────────────────────────────────
function loadChartScreen(person) {
  currentPerson=person; currentChart=calcChart(person.year,person.month,person.day,person.hour); analysisCache={};
  const hd=person.hour===UNKNOWN_HOUR?'時辰不詳':person.hour;
  const isFemale=person.gender==='female';
  document.getElementById('pi-avatar').textContent=person.name[0];
  document.getElementById('pi-name').textContent=person.name;
  document.getElementById('pi-info').textContent=`${person.year}年${person.month}月${person.day}日・${hd}・${currentChart.yearGan}${currentChart.yearZhi}年`;
  document.getElementById('pi-expire').textContent=expireLabel(person.exp);
  const gb=document.getElementById('pi-gender-badge');
  gb.textContent=isFemale?'女命':'男命';
  gb.className='gender-badge '+(isFemale?'female':'male');
  document.getElementById('analysis-title').textContent='宮位解析';
  document.getElementById('analysis-body').innerHTML='<div class="placeholder-text">點擊上方任一宮位<br>即時解析星曜意涵</div>';
  document.getElementById('ly-body').innerHTML='<div class="loading-dots"><div class="dot-anim"><span>●</span><span>●</span><span>●</span></div><span style="color:#bbb;font-size:13px">載入中…</span></div>';
  document.getElementById('person-body').innerHTML='<div class="loading-dots"><div class="dot-anim"><span>●</span><span>●</span><span>●</span></div><span style="color:#bbb;font-size:13px">比對分析中…</span></div>';
  document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('active','locked-tab');b.onclick=null;});
  document.querySelector('.tab-btn[data-tab="chart"]').classList.add('active');
  document.getElementById('tab-chart').style.display='block';
  document.getElementById('tab-liunian').style.display='none';
  document.getElementById('tab-person').style.display='none';
  applyTabLocks(person.features||{liunian:true,person:true});
  renderGrid(currentChart); renderUnknownBanner(person,currentChart);
  showScreen('screen-chart');
  if(person.features?.person) loadPersonMatch();
}

function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}

// ── 初始化 ───────────────────────────────────────────────
(function init(){
  const person=parseLink();
  if(person){
    if(isExpired(person.exp)) showScreen('screen-expired');
    else loadChartScreen(person);
  } else {
    // 管理者入口：檢查 session
    if(sessionStorage.getItem('admin_ok')==='1') showScreen('screen-input');
    else showScreen('screen-lock');
  }
})();

// ── 產生連結 ─────────────────────────────────────────────
document.getElementById('btn-generate').addEventListener('click',()=>{
  const name=document.getElementById('inp-name').value.trim()||'命主';
  const gender=document.getElementById('inp-gender').value;
  const year=parseInt(document.getElementById('inp-year').value);
  const month=parseInt(document.getElementById('inp-month').value);
  const day=parseInt(document.getElementById('inp-day').value);
  const hour=document.getElementById('inp-hour').value;
  if(!year||!month||!day||!hour){alert('請填寫完整出生資訊');return;}
  if(year<1900||year>2026){alert('請輸入正確年份（1900–2026）');return;}
  if(day<1||day>31){alert('請輸入正確日期');return;}
  const features={liunian:featureState.liunian,person:featureState.person};
  const link=buildLink(name,gender,year,month,day,hour,features);
  const expireTs=Date.now()+EXPIRE_DAYS*24*60*60*1000;
  const featEl=document.getElementById('link-features');
  featEl.innerHTML='';
  ['命盤解析',...(features.liunian?['流年運勢']:[]),...(features.person?['相似人物']:[])].forEach(t=>{
    const tag=document.createElement('span');tag.className='link-feature-tag';tag.textContent=t;featEl.appendChild(tag);
  });
  document.getElementById('link-url').textContent=link;
  document.getElementById('link-expire').textContent=`⏱ 有效期限：3 天（${expireLabel(expireTs).replace('有效期限：','')} 到期）`;
  document.getElementById('link-box').style.display='block';
  document.getElementById('copy-ok').style.display='none';
  document.getElementById('btn-preview')._person={name,gender,year,month,day,hour,exp:expireTs,features};
});

document.getElementById('btn-copy').addEventListener('click',()=>{
  navigator.clipboard.writeText(document.getElementById('link-url').textContent).then(()=>{
    const ok=document.getElementById('copy-ok');ok.style.display='inline';setTimeout(()=>{ok.style.display='none';},2000);
  });
});
document.getElementById('btn-preview').addEventListener('click',function(){if(this._person) loadChartScreen(this._person);});

document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(btn.classList.contains('locked-tab')) return;
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab=btn.dataset.tab;
    document.getElementById('tab-chart').style.display=tab==='chart'?'block':'none';
    document.getElementById('tab-liunian').style.display=tab==='liunian'?'block':'none';
    document.getElementById('tab-person').style.display=tab==='person'?'block':'none';
    if(tab==='liunian') queryLiunian();
  });
});
