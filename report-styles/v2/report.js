/* ============================================================
 * 월간 리포트 웹뷰 — report.js (v2, 개발 경로)
 * <script id="report-data"> JSON을 읽어 9페이지를 렌더.
 * 탭 네비(좌 prev / 우 next), 프로그레스바, X 닫기(JS채널).
 * SECURITY: report-data는 EF가 주입. couple_id 미포함. innerHTML 금지(텍스트 노드만).
 * 1차 골격 — 레이아웃은 Figma 실측으로 점진 정밀화.
 * ============================================================ */
(function () {
  'use strict';

  // ---------- data ----------
  var data = {};
  try {
    var el = document.getElementById('report-data');
    data = JSON.parse(el ? el.textContent : '{}') || {};
  } catch (e) { data = {}; }
  var cfg = data.config || {};

  // 에셋 베이스 URL — loadHtmlString엔 document base가 없어 상대경로 로드 실패.
  // report.js 자신의 절대 src에서 베이스를 유도(앱·프리뷰 양쪽 동작). CSS url()은
  // 스타일시트 기준이라 무관, 하지만 JS가 만드는 <img src>는 절대경로 필요.
  var ASSET_BASE = (function () {
    var s = document.querySelector('script[src*="report.js"]');
    if (s && s.src) return s.src.replace(/report\.js(\?.*)?$/, '');
    var l = document.querySelector('link[rel="stylesheet"][href*="report.css"]');
    if (l && l.href) return l.href.replace(/report\.css(\?.*)?$/, '');
    return '';
  })();

  // ---------- helpers (no innerHTML — XSS 차단) ----------
  function h(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = String(txt);
    return n;
  }
  function iconUrl(dbValue) { return (cfg.icon_base || '') + (dbValue || 'etc') + '.svg'; }
  // 글리프(원형 배경 없는 카테고리 아이콘) — mainspot 전용
  function glyphUrl(dbValue) { return (cfg.icon_base || '') + 'glyph/' + (dbValue || 'etc') + '.svg'; }
  function imgEl(cls, url, alt) {
    var i = h('img', cls); i.src = url; i.alt = alt || ''; i.loading = 'eager';
    return i;
  }
  // 사진 없음 폴백: pink200 + 사선 장소명 반복 타일
  function noPhoto(name) {
    var box = h('div', 'nophoto');
    var tile = h('div', 'tile');
    for (var i = 0; i < 12; i++) tile.appendChild(h('span', null, name || ''));
    box.appendChild(tile);
    return box;
  }
  function photoOrFallback(cls, url, name) {
    return url ? imgEl(cls, url, name) : noPhoto(name);
  }

  // ---------- page builders ----------
  function pageCover() {
    var m = data.meta || {};
    var wrap = h('div', 'cover-wrap');
    // headline: 흰 로고 + title `0000년 0월의 우리`
    var hb = h('div', 'headline-block');
    hb.appendChild(imgEl('logo', ASSET_BASE + 'logo.svg', 'Re:sum'));
    hb.appendChild(h('div', 'title', m.year + '년 ' + m.month + '월의 우리'));
    wrap.appendChild(hb);
    // wallpaper: 캘린더 캡처(B-1 앱 업로드 URL). 없으면 빈 흰 컨테이너.
    var wp = h('div', 'wallpaper');
    buildCalendar(wp, m.year, m.month, data.calendar || []);
    wrap.appendChild(wp);
    // CTA: `0000년 0월 추억 보기`
    var btn = h('button', 'cta', m.year + '년 ' + m.month + '월 추억 보기');
    btn.addEventListener('click', function () { next(); });
    wrap.appendChild(btn);
    return wrap;
  }

  // 커버 wallpaper = 해당 월 달력 그리드 (요일 헤더 없음, 캘린더탭과 동일 규칙)
  //   날짜칸: 그 날 대표 사진(photo_url) → 없으면 카테고리 아이콘 → 기록 없으면 날짜숫자
  //   data.calendar = [{ day, photo_url|null, category|null }] (EF가 매 서빙 photo_url 주입)
  function buildCalendar(wp, year, month, cal) {
    if (!year || !month) return;
    var byDay = {};
    cal.forEach(function (c) { byDay[c.day] = c; });
    var firstW = new Date(year, month - 1, 1).getDay();   // 0=일요일
    var days   = new Date(year, month, 0).getDate();       // 말일
    var grid = h('div', 'cal-grid');
    for (var b = 0; b < firstW; b++) grid.appendChild(h('div', 'cal-cell empty'));
    for (var d = 1; d <= days; d++) {
      var info = byDay[d];
      var hasPhoto = !!(info && info.photo_url);
      var hasRec   = !!(info && info.category);
      var cell = h('div', 'cal-cell' + (hasPhoto ? ' has-photo' : (hasRec ? ' has-rec' : '')));
      // 사진(셀 전체 cover) → 카테고리 아이콘(날짜 아래) 순으로 깔고, 날짜 숫자는 항상 위에
      if (hasPhoto) {
        cell.appendChild(imgEl('cal-photo', info.photo_url, ''));
      } else if (hasRec) {
        cell.appendChild(imgEl('cal-cat', iconUrl(info.category), info.category));
      }
      cell.appendChild(h('span', 'cal-d', d));   // 날짜 항상 표기(앱 캘린더 동일), 사진날=흰색
      grid.appendChild(cell);
    }
    wp.appendChild(grid);
  }

  function pageBrief(d) {
    var c = h('div', 'content brief');
    c.appendChild(headline(['이달, 우리가 남긴 추억들']));
    var cards = h('div', 'brief-cards');
    var c1 = h('div', 'brief-card brief-card--1');
    c1.appendChild(h('div', 'brief-card-label', '기록한 추억'));
    c1.appendChild(h('div', 'brief-card-value', (d.record_count || 0) + '개'));
    cards.appendChild(c1);
    var c2 = h('div', 'brief-card brief-card--2');
    c2.appendChild(h('div', 'brief-card-label', '추억의 사진'));
    c2.appendChild(h('div', 'brief-card-value', (d.photo_count || 0) + '장'));
    cards.appendChild(c2);
    c.appendChild(cards);
    return c;
  }

  function pageNewspot(d) {
    var c = h('div', 'content newspot');
    c.appendChild(headline('이달, 우리의 새로운\n추억 장소는 ' + (d.total || 0) + '개'));
    var cards = (d.places || []).slice(0, 4);
    var qcls = cards.length <= 1 ? 'q1' : (cards.length === 2 ? 'q2' : (cards.length === 3 ? 'q3' : 'q4'));
    var stack = h('div', 'newspot-stack ' + qcls);
    cards.forEach(function (p) {
      var card = h('div', 'newspot-card');
      // 카테고리 아이콘 SVG 자체가 56 원형 칩(원+글리프) → CSS 래퍼 원 없이 직접 56 렌더
      card.appendChild(imgEl('newspot-icon-img', iconUrl(p.category), p.place_name));
      card.appendChild(h('div', 'newspot-name', p.place_name));
      stack.appendChild(card);
    });
    c.appendChild(stack);
    if (d.overflow > 0) c.appendChild(h('div', 'newspot-overflow', '그 외 ' + d.overflow + '곳이 더 추가됐어요'));
    return c;
  }

  function pageLastmonth(d) {
    var c = h('div', 'content lastmonth');
    var word = d.this_count > d.last_count ? '많이' : (d.this_count < d.last_count ? '적게' : '똑같이');
    c.appendChild(headline('지난달보다\n추억을 ' + word + ' 남겼어요'));
    var thisLbl = '', lastLbl = '';
    if (d.year && d.month) {
      thisLbl = d.year + '. ' + d.month;
      var py = d.year, pm = d.month - 1;
      if (pm < 1) { pm = 12; py -= 1; }
      lastLbl = py + '. ' + pm;
    }
    // 색은 항상 당월=핑크 그라데이션 / 지난달=흰80%. 높이는 승자=200px·패자=비율.
    var max = Math.max(d.this_count, d.last_count) || 1;
    var chart = h('div', 'chart');
    chart.appendChild(lmCol(d.last_count, lastLbl, false, d.last_count >= max, max));  // 좌: 지난달
    chart.appendChild(lmCol(d.this_count, thisLbl, true, d.this_count >= max, max));   // 우: 당월
    c.appendChild(chart);
    return c;
  }
  function lmCol(cnt, lbl, isThis, tall, max) {
    var col = h('div', 'col');
    col.appendChild(h('div', 'cnt ' + (isThis ? 'this' : 'last'), cnt + '개'));
    var bar = h('div', 'bar ' + (isThis ? 'this' : 'last'));
    bar.style.height = (tall ? 200 : Math.round((cnt / max) * 200)) + 'px';
    col.appendChild(bar);
    if (lbl) col.appendChild(h('div', 'lbl', lbl));
    return col;
  }

  function pageRevisit(d) {
    var c = h('div', 'content revisit');
    c.appendChild(headline((d.place_name || '') + '에서\n한번 더 추억을 쌓았어요'));
    var photos = h('div', 'photos');
    var past = h('div', 'polaroid polaroid--past');
    past.appendChild(photoOrFallback('photo', (d.past || {}).photo_url, d.place_name));
    past.appendChild(h('div', 'caption', fmtDate((d.past || {}).date, '우리')));
    photos.appendChild(past);
    var cur = h('div', 'polaroid polaroid--current');
    cur.appendChild(photoOrFallback('photo', (d.current || {}).photo_url, d.place_name));
    cur.appendChild(h('div', 'caption caption--accent', fmtDate((d.current || {}).date, '우리')));
    photos.appendChild(cur);
    c.appendChild(photos);
    return c;
  }

  function pageMainspot(arr) {
    var c = h('div', 'content mainspot');
    c.appendChild(headline('이달에 우리가\n주로 추억을 남긴 곳은'));
    var tall = arr.length <= 3;   // 1~3행=80px / 4~5행=68px
    var list = h('div', 'rows');
    arr.forEach(function (m) {
      var row = h('div', 'row' + (tall ? ' tall' : ''));
      var left = h('div', 'row-left');
      left.appendChild(imgEl('row-icon', glyphUrl(m.category), categoryLabel(m.category)));
      left.appendChild(h('span', 'row-name', categoryLabel(m.category)));
      row.appendChild(left);
      row.appendChild(h('span', 'row-count', m.count + '번'));
      list.appendChild(row);
    });
    c.appendChild(list);
    return c;
  }

  function pageMostlong(d) {
    var nick = (data.meta && data.meta.partner_nickname) || '상대방';
    var c = h('div', 'content mostlong');
    c.appendChild(headline('이달에 ' + nick + '님이\n가장 길게 답변한 추억은'));
    var stack = h('div', 'stack');
    stack.appendChild(mlCard(d, 'card--dummy', true));
    stack.appendChild(mlCard(d, 'card--main', false));
    c.appendChild(stack);
    return c;
  }
  function mlCard(d, cls, hidden) {
    var card = h('div', 'card ' + cls);
    if (hidden) card.setAttribute('aria-hidden', 'true');
    var q = h('div', 'q-block');
    q.appendChild(h('div', 'q', d.question_text));
    if (d.place_name) q.appendChild(h('div', 'place', d.place_name));  // 장소명·날짜 줄바꿈(별도 줄)
    q.appendChild(h('div', 'date', fmtDate(d.date)));
    card.appendChild(q);
    card.appendChild(h('div', 'divider'));
    var aWrap = h('div', 'a-wrap');
    aWrap.appendChild(h('div', 'a', d.answer));   // 길면 a-wrap 내부 스크롤
    card.appendChild(aWrap);
    return card;
  }

  // first = 2페이지: ① 인트로 텍스트만 → ② 추억 카드만 (Figma 분리)
  function pageFirstIntro() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline('이달에 우리가\n처음 쌓은 추억을\n한번 떠올려보세요'));
    return c;
  }
  function pageFirst(d) {
    var c = h('div', 'content first anim');
    var card = h('div', 'first-card');
    // 대표 사진 2장(R-004 완성 페이지 동일). RPC는 1장 → 앞·뒤 동일 사진 2번. 없으면 폴백.
    var frame = h('div', 'pp-frame');
    var back = h('div', 'pp pp-back');
    back.appendChild(photoOrFallback('pp-img', d.photo_url, d.place_name));
    var front = h('div', 'pp pp-front');
    front.appendChild(photoOrFallback('pp-img', d.photo_url, d.place_name));
    frame.appendChild(back); frame.appendChild(front);
    card.appendChild(frame);
    var info = h('div', 'first-info');
    info.appendChild(h('div', 'first-name', d.place_name));
    info.appendChild(h('div', 'first-date', fmtDate(d.date)));
    card.appendChild(info);
    var go = h('button', 'first-go', '보러가기');
    go.addEventListener('click', function () { sendNative('OpenRecord:' + (d.record_id || '')); });
    card.appendChild(go);
    c.appendChild(card);
    return c;
  }

  function pageOutro() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline('다음 달에 더 풍부한\n리포트로 찾아올게요'));
    return c;
  }
  function pageClosing() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline('언제나 예쁜 사랑 하세요'));
    return c;
  }

  // ---------- headline (\n 줄바꿈은 CSS white-space:pre-line) ----------
  function headline(text) {
    var hl = h('div', 'headline');
    hl.textContent = Array.isArray(text) ? text.join('\n') : String(text);
    return hl;
  }
  // ---------- 날짜 포맷 'yyyy. m. d. (요일)' [+ suffix] ----------
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function fmtDate(raw, suffix) {
    if (!raw) return '';
    var m = String(raw).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return suffix ? (raw + ' ' + suffix) : String(raw);
    var wd = new Date(+m[1], +m[2] - 1, +m[3]).getDay();
    var s = (+m[1]) + '. ' + (+m[2]) + '. ' + (+m[3]) + '. (' + WD[wd] + ')';
    return suffix ? s + ' ' + suffix : s;
  }

  // ---------- category label (15 dbValue → 한글, 1차 골격) ----------
  var CAT = {
    restaurant: '맛집', cafe_dessert: '카페·디저트', bar: '술집', entertain: '놀거리',
    culture: '문화', relaxation: '휴식', park: '공원', nature: '자연', sports: '스포츠',
    leisure: '레저', sightseeing: '관광', shopping: '쇼핑', accommodation: '숙박',
    convenience: '편의', etc: '기타'
  };
  function categoryLabel(v) { return CAT[v] || v || '기타'; }

  // ---------- assemble pages ----------
  var pages = [];
  pages.push({ cls: 'cover', node: pageCover() });
  if (data.brief) pages.push({ node: pageBrief(data.brief) });
  if (data.newspot && (data.newspot.total || 0) > 0) pages.push({ node: pageNewspot(data.newspot) });
  if (data.lastmonth && (data.lastmonth.this_count || 0) > 0) {   // 당월 0개면 페이지 패스
    var lm = {}; for (var lk in data.lastmonth) lm[lk] = data.lastmonth[lk];
    lm.year = cfg.year; lm.month = cfg.month;
    pages.push({ node: pageLastmonth(lm) });
  }
  (data.revisit || []).forEach(function (r) { pages.push({ node: pageRevisit(r) }); });
  if (data.mainspot && data.mainspot.length) pages.push({ node: pageMainspot(data.mainspot) });
  if (data.mostlong) pages.push({ node: pageMostlong(data.mostlong) });
  if (data.first) {
    pages.push({ node: pageFirstIntro(), moment: true });
    pages.push({ node: pageFirst(data.first), moment: true });
  }
  pages.push({ node: pageOutro(), moment: true });
  pages.push({ node: pageClosing(), moment: true });

  // 디테일(커버 제외) 개수 → 프로그레스 세그먼트
  var detailCount = pages.length - 1;

  // ---------- render DOM ----------
  var app = h('div', 'report-app');
  // 앱바
  var appbar = h('div', 'appbar');
  var closeBtn = h('button', 'close');
  closeBtn.setAttribute('aria-label', '닫기');
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  closeBtn.addEventListener('click', function () { sendNative('ReportClose'); });
  appbar.appendChild(closeBtn);

  pages.forEach(function (p, i) {
    var slide = h('div', 'slide' + (p.cls ? ' ' + p.cls : '') + (p.moment ? ' moment' : ''));
    // 프로그레스 (커버 제외)
    if (!p.cls) {
      var prog = h('div', 'progress');
      for (var s = 0; s < detailCount; s++) {
        prog.appendChild(h('div', 'seg' + (s === (i - 1) ? ' on' : '')));
      }
      slide.appendChild(prog);
    }
    slide.appendChild(appbar.cloneNode(true));
    slide.appendChild(p.node);
    // 탭존
    var prevZ = h('div', 'tapzone prev'); prevZ.addEventListener('click', prev);
    var nextZ = h('div', 'tapzone next'); nextZ.addEventListener('click', next);
    slide.appendChild(prevZ); slide.appendChild(nextZ);
    p.el = slide;
    app.appendChild(slide);
  });
  // app은 이미지 프리로드 후 body에 append (사진 팝인 방지, 아래 reveal)

  // 앱바 close는 cloneNode로 복제됨 → 위임 재바인딩
  app.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.close');
    if (t) sendNative('ReportClose');
  });

  // ---------- navigation ----------
  var cur = 0;
  function show(i) {
    if (i < 0 || i >= pages.length) return;
    pages[cur].el.classList.remove('active');
    cur = i;
    pages[cur].el.classList.add('active');
  }
  function next() { if (cur < pages.length - 1) show(cur + 1); }
  function prev() { if (cur > 0) show(cur - 1); }

  // ---------- 이미지 프리로드 후 reveal (사진 팝인 방지, #1) ----------
  var loader = h('div', 'report-loader');
  loader.appendChild(h('div', 'spinner'));
  document.body.appendChild(loader);
  function reveal() {
    document.body.appendChild(app);
    show(0);
    if (loader.parentNode) loader.parentNode.removeChild(loader);
  }
  (function preload() {
    var imgs = app.querySelectorAll('img'), urls = [];
    for (var i = 0; i < imgs.length; i++) { var u = imgs[i].getAttribute('src'); if (u) urls.push(u); }
    if (!urls.length) { reveal(); return; }
    var remaining = urls.length, done = false;
    function finish() { if (!done) { done = true; reveal(); } }
    var timer = setTimeout(finish, 6000);   // 안전망: 6s 초과 시 그냥 진행
    urls.forEach(function (u) {
      var im = new Image();
      function one() { if (--remaining <= 0) { clearTimeout(timer); finish(); } }
      im.onload = one; im.onerror = one; im.src = u;
    });
  })();

  // ---------- native bridge (앱: JS채널 / 브라우저 프리뷰: 콘솔) ----------
  function sendNative(msg) {
    try {
      if (window.ReportChannel && window.ReportChannel.postMessage) {
        window.ReportChannel.postMessage(msg);
        return;
      }
    } catch (e) {}
    console.log('[native]', msg);   // preview.html에서 동작 확인용
  }
})();
