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

  function pageBrief(b) {
    var c = h('div', 'content brief');
    c.appendChild(headline(['이번 달, 우리는 ', span(b.record_count + '개'), '의 추억을 남겼어요']));
    var cards = h('div', 'cards');
    cards.appendChild(briefCard('기록한 추억', b.record_count + '개'));
    cards.appendChild(briefCard('함께 담은 사진', b.photo_count + '장'));
    c.appendChild(cards);
    return c;
  }
  function briefCard(label, num) {
    var card = h('div', 'card');
    card.appendChild(h('div', 'label', label));
    card.appendChild(h('div', 'num', num));
    return card;
  }

  function pageNewspot(n) {
    var c = h('div', 'content newspot');
    c.appendChild(headline(['새롭게 발견한 ', span((n.total || 0) + '곳'), '의 장소']));
    var deck = h('div', 'deck');
    (n.places || []).forEach(function (p) {
      var spot = h('div', 'spot');
      spot.appendChild(imgEl('ic', iconUrl(p.category), p.category));
      spot.appendChild(h('div', 'nm', p.place_name));
      deck.appendChild(spot);
    });
    c.appendChild(deck);
    if (n.overflow > 0) c.appendChild(h('div', 'overflow', '외 ' + n.overflow + '곳'));
    return c;
  }

  function pageLastmonth(l) {
    var c = h('div', 'content lastmonth');
    var diff = (l.this_count || 0) - (l.last_count || 0);
    c.appendChild(headline(['지난달보다 ', span(Math.abs(diff) + '번'), diff >= 0 ? ' 더 만났어요' : ' 만났어요']));
    var max = Math.max(l.this_count || 0, l.last_count || 0, 1);
    var chart = h('div', 'chart');
    chart.appendChild(barWrap('지난달', l.last_count || 0, max, false));
    chart.appendChild(barWrap('이번달', l.this_count || 0, max, true));
    c.appendChild(chart);
    return c;
  }
  function barWrap(lbl, cnt, max, isThis) {
    var w = h('div', 'bar-wrap');
    w.appendChild(h('div', 'cnt', cnt));
    var bar = h('div', 'bar' + (isThis ? ' this' : ''));
    bar.style.height = Math.round((cnt / max) * 200) + 'px';
    w.appendChild(bar);
    w.appendChild(h('div', 'lbl', lbl));
    return w;
  }

  function pageRevisit(r) {
    var c = h('div', 'content revisit');
    c.appendChild(headline(['다시 찾은 ', span(r.place_name)]));
    var frames = h('div', 'frames');
    frames.appendChild(revisitFrame('past', r.past, r.place_name));
    frames.appendChild(revisitFrame('current', r.current, r.place_name));
    c.appendChild(frames);
    return c;
  }
  function revisitFrame(kind, side, name) {
    side = side || {};
    var f = h('div', 'frame ' + kind);
    f.appendChild(photoOrFallback('photo', side.photo_url, name));
    f.appendChild(h('div', 'cap', side.date || ''));
    return f;
  }

  function pageMainspot(arr) {
    var c = h('div', 'content mainspot');
    c.appendChild(headline(['우리가 가장 많이 찾은 곳']));
    var list = h('div', 'list');
    arr.forEach(function (m, i) {
      var row = h('div', 'row' + (i >= 3 ? ' small' : ''));
      row.appendChild(imgEl('ic', iconUrl(m.category), m.category));
      row.appendChild(h('div', 'nm', categoryLabel(m.category)));
      row.appendChild(h('div', 'ct', m.count + '회'));
      list.appendChild(row);
    });
    c.appendChild(list);
    return c;
  }

  function pageMostlong(m) {
    var c = h('div', 'content mostlong');
    c.appendChild(headline(['가장 긴 답을 남긴 추억문답']));
    var stack = h('div', 'stack');
    var card = h('div', 'card');
    card.appendChild(h('div', 'q', m.question_text));
    card.appendChild(h('div', 'd', (m.place_name ? m.place_name + ' · ' : '') + (m.date || '')));
    card.appendChild(h('div', 'a', m.answer));
    stack.appendChild(card);
    c.appendChild(stack);
    return c;
  }

  function pageFirst(f) {
    var c = h('div', 'content first anim');
    c.appendChild(headline(['이번 달 첫 추억']));
    var card = h('div', 'card');
    card.appendChild(photoOrFallback('photo', f.photo_url, f.place_name));
    card.appendChild(h('div', 'nm', f.place_name));
    card.appendChild(h('div', 'd', f.date || ''));
    var go = h('button', 'go', '추억 보러가기');
    go.addEventListener('click', function () { sendNative('OpenRecord:' + (f.record_id || '')); });
    card.appendChild(go);
    c.appendChild(card);
    return c;
  }

  function pageOutro() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline(['다음 달엔', span(' 어떤 추억'), '이 기다리고 있을까요?']));
    return c;
  }
  function pageClosing() {
    var c = h('div', 'content textonly anim');
    c.appendChild(headline(['우리의 이야기는', span(' 계속됩니다')]));
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
  if (data.lastmonth) pages.push({ node: pageLastmonth(data.lastmonth) });
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
