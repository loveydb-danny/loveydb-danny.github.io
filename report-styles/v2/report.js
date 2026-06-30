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

  // ---------- helpers (no innerHTML — XSS 차단) ----------
  function h(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = String(txt);
    return n;
  }
  function iconUrl(dbValue) { return (cfg.icon_base || '') + (dbValue || 'etc') + '.svg'; }
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
    hb.appendChild(imgEl('logo', 'logo.svg', 'Re:sum'));
    hb.appendChild(h('div', 'title', m.year + '년 ' + m.month + '월의 우리'));
    wrap.appendChild(hb);
    // wallpaper: 캘린더 캡처(B-1 앱 업로드 URL). 없으면 빈 흰 컨테이너.
    var wp = h('div', 'wallpaper');
    var wpUrl = data.wallpaper_url || m.wallpaper_url;
    if (wpUrl) wp.appendChild(imgEl('cal', wpUrl, '캘린더'));
    wrap.appendChild(wp);
    // CTA: `0000년 0월 추억 보기`
    var btn = h('button', 'cta', m.year + '년 ' + m.month + '월 추억 보기');
    btn.addEventListener('click', function () { next(); });
    wrap.appendChild(btn);
    return wrap;
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
    c.appendChild(headline(['이달, 우리의 새로운 추억 장소는 총 ' + (d.total || 0) + '개']));
    var cards = (d.places || []).slice(0, 4);
    var qcls = cards.length <= 2 ? 'q2' : (cards.length === 3 ? 'q3' : 'q4');
    var stack = h('div', 'newspot-stack ' + qcls);
    cards.forEach(function (p) {
      var card = h('div', 'newspot-card');
      var icon = h('div', 'newspot-icon');
      icon.appendChild(imgEl('newspot-icon-img', iconUrl(p.category), p.place_name));
      card.appendChild(icon);
      card.appendChild(h('div', 'newspot-name', p.place_name));
      stack.appendChild(card);
    });
    c.appendChild(stack);
    if (d.overflow > 0) c.appendChild(h('div', 'newspot-overflow', '그 외 ' + d.overflow + '곳이 더 추가됐어요'));
    return c;
  }

  function pageLastmonth(d) {
    var c = h('div', 'content lastmonth');
    var head;
    if (d.this_count > d.last_count) head = '지난달보다 추억을 많이 남겼어요';
    else if (d.this_count < d.last_count) head = '지난달보다 추억을 조금 남겼어요';
    else head = '지난달만큼 추억을 남겼어요';
    c.appendChild(headline([head]));
    var thisLbl = '', lastLbl = '';
    if (d.year && d.month) {
      thisLbl = d.year + '. ' + d.month;
      var py = d.year, pm = d.month - 1;
      if (pm < 1) { pm = 12; py -= 1; }
      lastLbl = py + '. ' + pm;
    }
    var max = Math.max(d.this_count, d.last_count) || 1;
    var chart = h('div', 'chart');
    chart.appendChild(lmCol(d.last_count, lastLbl, d.last_count === max, max));
    chart.appendChild(lmCol(d.this_count, thisLbl, d.this_count === max, max));
    c.appendChild(chart);
    return c;
  }
  function lmCol(cnt, lbl, win, max) {
    var col = h('div', 'col');
    col.appendChild(h('div', 'cnt ' + (win ? 'win' : 'lose'), cnt + '개'));
    var bar = h('div', 'bar ' + (win ? 'win' : 'lose'));
    bar.style.height = Math.round((cnt / max) * 200) + 'px';
    col.appendChild(bar);
    if (lbl) col.appendChild(h('div', 'lbl', lbl));
    return col;
  }

  function pageRevisit(d) {
    var c = h('div', 'content revisit');
    c.appendChild(headline([(d.place_name || '') + '에서 한번 더 추억을 쌓았어요']));
    var photos = h('div', 'photos');
    var past = h('div', 'polaroid polaroid--past');
    past.appendChild(photoOrFallback('photo', (d.past || {}).photo_url, d.place_name));
    past.appendChild(h('div', 'caption', ((d.past || {}).date || '') + ' 우리'));
    photos.appendChild(past);
    var cur = h('div', 'polaroid polaroid--current');
    cur.appendChild(photoOrFallback('photo', (d.current || {}).photo_url, d.place_name));
    cur.appendChild(h('div', 'caption caption--accent', ((d.current || {}).date || '') + ' 우리'));
    photos.appendChild(cur);
    c.appendChild(photos);
    return c;
  }

  function pageMainspot(arr) {
    var c = h('div', 'content mainspot');
    c.appendChild(headline(['이달에 우리가 주로 추억을 남긴 곳은']));
    var list = h('div', 'rows');
    arr.forEach(function (m, i) {
      var row = h('div', 'row' + (i >= 3 ? ' small' : ''));
      var left = h('div', 'row-left');
      left.appendChild(imgEl('row-icon', iconUrl(m.category), categoryLabel(m.category)));
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
    c.appendChild(headline(['이달에 ' + nick + '님이 가장 길게 답변한 추억은']));
    var meta = d.place_name ? (d.place_name + ' · ' + (d.date || '')) : (d.date || '');
    var stack = h('div', 'stack');
    stack.appendChild(mlCard(d, meta, 'card--dummy', true));
    stack.appendChild(mlCard(d, meta, 'card--main', false));
    c.appendChild(stack);
    return c;
  }
  function mlCard(d, meta, cls, hidden) {
    var card = h('div', 'card ' + cls);
    if (hidden) card.setAttribute('aria-hidden', 'true');
    var q = h('div', 'q-block');
    q.appendChild(h('div', 'q', d.question_text));
    q.appendChild(h('div', 'meta', meta));
    card.appendChild(q);
    card.appendChild(h('div', 'divider'));
    var aWrap = h('div', 'a-wrap');
    aWrap.appendChild(h('div', 'a', d.answer));
    card.appendChild(aWrap);
    return card;
  }

  function pageFirst(d) {
    var c = h('div', 'content first anim');
    c.appendChild(headline(['이달에 우리가 처음 쌓은 추억은']));
    var card = h('div', 'first-card');
    card.appendChild(photoOrFallback('photo', d.photo_url, d.place_name));
    var info = h('div', 'first-info');
    info.appendChild(h('div', 'first-name', d.place_name));
    info.appendChild(h('div', 'first-date', d.date || ''));
    card.appendChild(info);
    var go = h('button', 'first-go', '보러가기');
    go.addEventListener('click', function () { sendNative('OpenRecord:' + (d.record_id || '')); });
    card.appendChild(go);
    c.appendChild(card);
    return c;
  }

  function pageOutro() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline(['다음 달에 더 풍부한 리포트로 찾아올게요']));
    return c;
  }
  function pageClosing() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline(['이달에도 예쁜 사랑 하세요!']));
    return c;
  }

  // ---------- headline w/ accent spans ----------
  function span(t) { var s = h('span', 'accent', t); return s; }
  function headline(parts) {
    var hl = h('div', 'headline');
    parts.forEach(function (p) { hl.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    return hl;
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
  if (data.lastmonth) {
    var lm = {}; for (var lk in data.lastmonth) lm[lk] = data.lastmonth[lk];
    lm.year = cfg.year; lm.month = cfg.month;
    pages.push({ node: pageLastmonth(lm) });
  }
  (data.revisit || []).forEach(function (r) { pages.push({ node: pageRevisit(r) }); });
  if (data.mainspot && data.mainspot.length) pages.push({ node: pageMainspot(data.mainspot) });
  if (data.mostlong) pages.push({ node: pageMostlong(data.mostlong) });
  if (data.first) pages.push({ node: pageFirst(data.first) });
  pages.push({ node: pageOutro() });
  pages.push({ node: pageClosing() });

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
    var slide = h('div', 'slide' + (p.cls ? ' ' + p.cls : ''));
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
  document.body.appendChild(app);

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
  show(0);

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
