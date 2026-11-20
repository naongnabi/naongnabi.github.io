/* 오늘도득템 — 앱 로직
   데이터는 data/items.js (data/items.json 에서 자동 생성) 만 읽습니다. */
(function () {
  "use strict";

  var DATA = window.DEUKTEM_DATA || { items: [], brand: {} };
  var ITEMS = (DATA.items || []).slice();
  var BRAND = DATA.brand || {};
  /* 텐핑이 비었을 때 그 자리를 채우는 애드픽 광고 캐시 (data/adpick.js) */
  var ADPICK = window.DEUKTEM_ADPICK || null;
  /* 광고 상태 — render() 가 adCheck() 를 부르므로 먼저 선언해 둡니다 */
  var adState = { mode: "", t0: 0, offer: null };
  var FAV_KEY = "deuktem.favs";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var CAT = {
    deal: { label: "오늘의 특가", icon: "🔥" },
    exp: { label: "무료 체험단", icon: "🎁" },
    quiz: { label: "경품 퀴즈", icon: "🎯" },
    contest: { label: "공모전", icon: "🏆" },
    apptech: { label: "앱테크", icon: "💸" }
  };

  /* ───────── 찜 (localStorage) ───────── */
  var favs = new Set(loadFavs());
  function loadFavs() {
    try {
      var arr = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(arr) ? arr.filter(function (v) { return typeof v === "string"; }) : [];
    } catch (e) { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs))); } catch (e) {}
  }

  /* ───────── 날짜 · D-day (항상 한국 시간 기준) ───────── */
  var SEOUL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
  var SEOUL_KO = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "long" });

  function todayUTC() {
    var p = SEOUL_DAY.format(new Date()).split("-").map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }
  var TODAY = todayUTC();

  function dday(iso) {
    if (!iso) return null;
    var p = iso.split("-").map(Number);
    return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - TODAY) / 86400000);
  }
  function mmdd(iso) {
    if (!iso) return "";
    var p = iso.split("-").map(Number);
    return p[1] + "/" + p[2];
  }
  function isExpired(it) { var d = dday(it.deadline); return d !== null && d < 0; }
  function koreanDate(d) {
    var parts = SEOUL_KO.formatToParts(d);
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ""; };
    var m = get("month").replace(/[^0-9]/g, "");
    var day = get("day").replace(/[^0-9]/g, "");
    return m + "월 " + day + "일 " + get("weekday");
  }

  /* ───────── 상태 ─────────
     탭별 페이지(/quiz/ 등)는 <html data-default-tab="quiz"> 로 첫 탭을 지정합니다.
     기존 ?tab=… 주소도 그대로 동작합니다(주소의 tab 이 페이지 기본값보다 우선). */
  var startTab = new URLSearchParams(location.search).get("tab");
  var PAGE_TAB = document.documentElement.getAttribute("data-default-tab");
  var TAB_PAGE = CAT[PAGE_TAB] ? PAGE_TAB : null;
  var state = {
    tab: CAT[startTab] ? startTab : (TAB_PAGE || "all"),
    q: "",
    onlyFav: false
  };

  /* 탭별 페이지(/quiz/ 등)는 한 단계 아래에 있어서 사진 같은 자료 경로에 "../" 를 붙입니다.
     루트 도메인·서브경로 양쪽에서 모두 맞게 풀립니다. */
  var ROOT_PREFIX = TAB_PAGE ? "../" : "";

  /* 지금 보고 있는 페이지 기준으로 다른 탭 페이지 주소를 만듭니다.
     (/quiz/ → /deal/ , /onen1-deuktem/quiz/ → /onen1-deuktem/deal/ , 전체 → 사이트 루트) */
  function tabPageURL(tab) {
    var dir = location.pathname.replace(/[^/]*$/, "");
    if (TAB_PAGE) dir = dir.replace(new RegExp(TAB_PAGE + "/$"), "");
    return dir + (tab === "all" ? "" : tab + "/");
  }

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ───────── 필터 · 정렬 ───────── */
  function live() { return ITEMS.filter(function (it) { return !isExpired(it); }); }

  function matchesQuery(it, q) {
    if (!q) return true;
    var hay = [(CAT[it.cat] ? CAT[it.cat].label : ""), it.title, it.platform, it.tag, it.highlight, it.highlightSub,
      answerLines(it).join(" "), (it.meta || []).join(" "), it.note, it.deadlineText, it.cta].join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function byUrgency(a, b) {
    var da = dday(a.deadline), db = dday(b.deadline);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return live().filter(function (it) {
      if (state.onlyFav && !favs.has(it.id)) return false;
      if (state.tab !== "all" && it.cat !== state.tab) return false;
      return matchesQuery(it, q);
    }).sort(byUrgency);
  }

  /* ───────── 공통 조각 ───────── */
  var HEART = '<svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg>';
  var HEART_FILL = '<svg class="ic" aria-hidden="true"><use href="#i-heart-fill"/></svg>';
  var ARROW = '<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg>';

  /* ───────── 상품 사진 ─────────
     데이터의 image 값(assets/thumbs/… 또는 상품 이미지 주소)이 있으면 사진을 넣고,
     없거나 불러오지 못하면 같은 자리에 카테고리 아이콘만 남겨 깨진 이미지가 보이지 않게 합니다. */
  var CAT_ICO = { deal: "🛒", exp: "🎁", quiz: "🎯", contest: "🏆", apptech: "💸" };

  function thumbHTML(it, cls, lazy) {
    if (!it.image) return "";
    var src = /^https?:/i.test(it.image) ? it.image : ROOT_PREFIX + it.image;
    return '<span class="thumb ' + cls + '" data-ico="' + (CAT_ICO[it.cat] || "🛍️") + '">' +
      '<img src="' + esc(src) + '" alt=""' + (lazy ? ' loading="lazy"' : "") + ' decoding="async" ' +
        'onerror="this.parentNode.classList.add(\'is-fallback\');this.remove();" />' +
      "</span>";
  }

  /* ───────── 퀴즈 정답 ─────────
     data/items.json 의 answer(문자열 또는 문자열 배열)를 카드 안에 그대로 보여 줍니다.
     정답이 없는 설문형은 "설문 참여형 (정답 없음)" 처럼 사실대로 적고 파란 글씨로 구분합니다. */
  function answerLines(it) {
    var a = it.answer;
    if (!a) return [];
    if (typeof a === "string") a = [a];
    if (!Array.isArray(a)) return [];
    return a.filter(function (v) { return typeof v === "string" && v.trim(); });
  }

  function isNoAnswer(line) { return line.indexOf("정답 없음") !== -1; }

  function answerHTML(it) {
    var lines = answerLines(it);
    if (!lines.length) return "";
    var multi = lines.length > 1;
    var onlyNone = lines.every(isNoAnswer);   // 설문형처럼 정답이 없는 건 "안내"로 표기
    return '<div class="card-answer' + (multi ? " card-answer--multi" : "") +
      (onlyNone ? " card-answer--none" : "") + '">' +
      '<span class="ans-badge" aria-hidden="true">' + (onlyNone ? "📝 안내" : "💡 정답") + '</span>' +
      '<div class="ans-list">' +
        lines.map(function (l) {
          return '<p class="ans-line' + (isNoAnswer(l) ? " ans-line--none" : "") + '">' +
            '<span class="ans-hl">' + esc(l) + "</span></p>";
        }).join("") +
      "</div></div>";
  }

  function ddayBadge(it, big) {
    var d = dday(it.deadline);
    var cls = "dday" + (big ? " dday--big" : "");
    if (d === null) return '<span class="' + cls + ' dday--none">' + esc(it.deadlineText || "기간 확인") + "</span>";
    if (d === 0) return '<span class="' + cls + ' dday--hot">오늘 마감</span>';
    if (d <= 3) return '<span class="' + cls + ' dday--warm">D-' + d + "</span>";
    return '<span class="' + cls + '">D-' + d + "</span>";
  }

  /* ───────── 핫 TOP 카드 ───────── */
  function hotCard(it, rank) {
    return '' +
      '<a class="hot-card' + (it.image ? " has-thumb" : "") + '" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="hot-rank">' + rank + "</span>" +
        '<div class="hot-main">' +
          thumbHTML(it, "thumb--hot") +
          '<div class="hot-body">' +
            '<div class="hot-badges">' +
              '<span class="pbadge pb-' + esc(it.pkey || "gov") + '">' + esc(it.platform) + "</span>" +
              (it.tag ? '<span class="tag">' + esc(it.tag) + "</span>" : "") +
            "</div>" +
            '<p class="hot-title">' + esc(it.title) + "</p>" +
          "</div>" +
        "</div>" +
        '<p class="hot-price"><strong>' + esc(it.highlight) + "</strong></p>" +
        '<div class="hot-foot">' + ddayBadge(it) +
          '<span class="hot-go">보러가기' + ARROW + "</span>" +
        "</div>" +
      "</a>";
  }

  function renderHot() {
    var block = $("#hotBlock");
    var show = state.tab === "all" && !state.q.trim() && !state.onlyFav;
    var hot = show ? live().filter(function (it) { return it.hot != null; })
      .sort(function (a, b) { return (a.hot || 99) - (b.hot || 99); }) : [];
    if (!hot.length) { block.hidden = true; return; }
    block.hidden = false;
    $("#hotTrack").innerHTML = hot.map(function (it, i) { return hotCard(it, i + 1); }).join("");
  }

  /* ───────── 일반 카드 ───────── */
  function cardHTML(it) {
    var on = favs.has(it.id);
    var meta = (it.meta || []).slice();
    if (it.deadline) meta.push("마감 " + mmdd(it.deadline));
    meta.push("확인 " + mmdd(it.verifiedAt));

    return '' +
      '<article class="card card--' + esc(it.cat) + '" data-id="' + esc(it.id) + '" data-url="' + esc(it.url) + '">' +
        '<div class="card-top">' +
          '<span class="pbadge pb-' + esc(it.pkey || "gov") + '">' + esc(it.platform) + "</span>" +
          (it.tag ? '<span class="tag">' + esc(it.tag) + "</span>" : "") +
          '<span class="spacer"></span>' + ddayBadge(it) +
        "</div>" +
        '<div class="card-main">' +
          thumbHTML(it, "thumb--card", true) +
          '<div class="card-text">' +
            '<h3 class="card-title">' + esc(it.title) + "</h3>" +
            '<p class="card-benefit"><strong>' + esc(it.highlight) + "</strong>" +
              (it.highlightSub ? "<span>" + esc(it.highlightSub) + "</span>" : "") + "</p>" +
          "</div>" +
        "</div>" +
        answerHTML(it) +
        '<p class="card-meta">' +
          meta.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("<i>·</i>") + "</p>" +
        (it.note ? '<p class="card-note">' + esc(it.note) + "</p>" : "") +
        '<div class="card-foot">' +
          '<a class="cta" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
            esc(it.cta || "바로 보기") + ARROW + "</a>" +
          '<a class="icon-btn" href="' + esc(BRAND.blog || "#") + '" target="_blank" rel="noopener noreferrer" aria-label="블로그 보기" title="블로그">' +
            '<svg class="ic" aria-hidden="true"><use href="#i-blog"/></svg></a>' +
          '<button class="fav' + (on ? " is-on" : "") + '" type="button" aria-pressed="' + on + '" aria-label="' +
            (on ? "찜 해제" : "찜하기") + '" data-fav="' + esc(it.id) + '">' + (on ? HEART_FILL : HEART) + "</button>" +
          '<button class="icon-btn share" type="button" aria-label="공유하기" title="공유" data-share="' + esc(it.id) + '">' +
            '<svg class="ic" aria-hidden="true"><use href="#i-share"/></svg></button>' +
        "</div>" +
      "</article>";
  }

  function sectionHead(icon, label, n) {
    return '<div class="section-h"><span>' + (icon ? icon + " " : "") + esc(label) + "</span>" +
      '<span class="section-n">' + n + '</span><span class="section-line"></span></div>';
  }

  /* ───────── 광고 배치 ─────────
     슬롯 A = 텐핑(#adSlot, #list 안에 고정) 3번째 카드 뒤 — 텐핑이 비면 애드픽 카드로 채움
     슬롯 B = 애드픽 10번째 카드 뒤 · 슬롯 C = 애드픽 목록 하단 (카드가 충분할 때만)
     광고끼리 최소 5칸은 띄워서 과하지 않게 합니다. */
  var AD_AFTER = 3;
  var AD_MID = 10;
  var AD_MIN_GAP = 5;

  function adPlan(n) {
    if (n < 1) return { a: 0, mid: 0, bottom: false };
    var a = Math.min(AD_AFTER, n);
    var mid = n >= AD_MID + AD_MIN_GAP ? AD_MID : 0;
    var last = mid || a;
    return { a: a, mid: mid, bottom: n - last >= AD_MIN_GAP };
  }

  function adOffers() {
    return ((ADPICK && ADPICK.offers) || []).filter(function (o) {
      return o && o.link && o.title && (o.remain === null || o.remain === undefined || o.remain > 0);
    });
  }

  /* 0: 슬롯 A 대체 · 1: 슬롯 B · 2: 슬롯 C — 겹치지 않게 하루 단위로 돌려 씁니다 */
  function adOffer(idx) {
    var list = adOffers();
    if (!list.length) return null;
    var day = Math.floor(Date.now() / 86400000);
    return list[(day + idx) % list.length];
  }

  function adCardHTML(o, cls) {
    if (!o) return "";
    var thumb = o.image
      ? '<span class="adcard-thumb"><img src="' +
          esc(/^https?:/i.test(o.image) ? o.image : ROOT_PREFIX + o.image) + '" alt="" loading="lazy" decoding="async" ' +
          'onerror="this.parentNode.classList.add(\'is-fallback\');this.remove();" />' +
          '<span class="adcard-ad" aria-hidden="true">AD</span></span>'
      : '<span class="adcard-thumb is-fallback"><span class="adcard-ad" aria-hidden="true">AD</span></span>';
    return '<a class="adcard' + (cls ? " " + cls : "") + '" href="' + esc(o.link) + '" target="_blank" rel="noopener noreferrer sponsored">' +
      thumb +
      '<span class="adcard-body">' +
        '<strong class="adcard-title">' + esc(o.title) + '</strong>' +
        (o.desc ? '<span class="adcard-desc">' + esc(o.desc) + '</span>' : "") +
      '</span>' +
      '<span class="adcard-go" aria-hidden="true">보기 ›</span>' +
    '</a>';
  }

  /* 텐핑 iframe 은 DOM 에서 옮기면 다시 로드되며 비어 버립니다.
     그래서 #adSlot 은 그 자리에 두고, 카드만 그 앞(lead)/뒤(rest)로 다시 그립니다. */
  function paintList(lead, rest) {
    var list = $("#list"), ad = $("#adSlot");
    if (!list) return;
    if (!ad) { list.innerHTML = lead + rest; return; }
    while (list.firstElementChild && list.firstElementChild !== ad) list.removeChild(list.firstElementChild);
    while (ad.nextElementSibling) list.removeChild(ad.nextElementSibling);
    if (lead) ad.insertAdjacentHTML("beforebegin", lead);
    if (rest) ad.insertAdjacentHTML("afterend", rest);
  }

  /* ───────── 렌더 ───────── */
  function render() {
    renderHot();
    var items = filtered();
    var searching = state.q.trim() !== "" || state.onlyFav;

    // 1) 카테고리 묶음
    var groups = [];
    if (searching) {
      if (items.length) {
        var label = state.onlyFav && !state.q.trim()
          ? "찜한 항목"
          : (state.q.trim() ? "‘" + state.q.trim() + "’ 검색 결과" : "찜한 항목");
        groups.push({ icon: "", label: label, items: items, head: true });
      }
    } else if (state.tab === "all") {
      ["deal", "exp", "quiz", "contest", "apptech"].forEach(function (cat) {
        var sub = items.filter(function (it) { return it.cat === cat; });
        if (!sub.length) return;
        groups.push({ icon: CAT[cat].icon, label: CAT[cat].label, items: sub, head: true });
      });
    } else if (state.tab === "exp") {
      // 체험단 탭: 가전·IT 를 위로 (혜영 님 요청)
      var isIt = function (it) { return it.tag === "가전·디지털"; };
      var it1 = items.filter(isIt), it2 = items.filter(function (it) { return !isIt(it); });
      if (it1.length) groups.push({ icon: "📺", label: "가전·IT 체험단", items: it1, head: true });
      if (it2.length) groups.push({ icon: "🧺", label: "생활·뷰티·식품", items: it2, head: true });
    } else if (items.length) {
      groups.push({ icon: "", label: "", items: items, head: false });
    }

    // 2) 카드 순번에 맞춰 광고 카드까지 끼워 넣기
    var plan = adPlan(items.length);
    var lead = "", rest = "", cardN = 0;
    groups.forEach(function (g) {
      if (g.head) {
        var head = sectionHead(g.icon, g.label, g.items.length);
        if (cardN < plan.a) lead += head; else rest += head;
      }
      g.items.forEach(function (it) {
        var html = cardHTML(it);
        cardN++;
        if (cardN <= plan.a) lead += html; else rest += html;
        if (plan.mid && cardN === plan.mid) rest += adCardHTML(adOffer(1), "adcard--mid");
        if (plan.bottom && cardN === items.length) rest += adCardHTML(adOffer(2), "adcard--bottom");
      });
    });

    paintList(lead, rest);

    var list = $("#list");
    list.hidden = items.length === 0;

    // 텐핑 자리 — 결과 0건일 때만 숨김
    var adSlot = $("#adSlot");
    if (adSlot) {
      adSlot.hidden = items.length === 0;
      if (items.length) adCheck();
    }

    var empty = $("#empty");
    empty.hidden = items.length > 0;
    if (!items.length) {
      if (state.onlyFav && !state.q.trim()) {
        $("#emptyTitle").textContent = "아직 찜한 게 없어요";
        $("#emptySub").textContent = "카드의 하트를 누르면 여기에 모아 둘 수 있어요.";
      } else if (state.q.trim()) {
        $("#emptyTitle").textContent = "‘" + state.q.trim() + "’ 결과가 없어요";
        $("#emptySub").textContent = "다른 말로 검색하거나 아래 버튼으로 전체를 봐 주세요.";
      } else {
        $("#emptyTitle").textContent = "이 탭엔 아직 항목이 없어요";
        $("#emptySub").textContent = "내일 저녁에 새로 확인해서 올릴게요.";
      }
    }

    // 하단 안내
    var hidden = ITEMS.length - live().length;
    var foot = [];
    if (hidden > 0) foot.push("마감이 지난 " + hidden + "건은 자동으로 숨겼어요.");
    foot.push("가격·마감·경품은 바뀔 수 있으니 신청 전에 꼭 확인해 주세요.");
    $("#listFoot").textContent = foot.join(" ");

    // 숫자
    var all = live();
    $("#n-all").textContent = all.length;
    $("#n-deal").textContent = all.filter(function (i) { return i.cat === "deal"; }).length;
    $("#n-exp").textContent = all.filter(function (i) { return i.cat === "exp"; }).length;
    $("#n-quiz").textContent = all.filter(function (i) { return i.cat === "quiz"; }).length;
    $("#n-contest").textContent = all.filter(function (i) { return i.cat === "contest"; }).length;
    $("#n-apptech").textContent = all.filter(function (i) { return i.cat === "apptech"; }).length;
    $("#todayTotal").textContent = all.length;

    // 마감 임박 띠
    var hot = all.filter(function (i) { return dday(i.deadline) === 0; });
    var soon = all.filter(function (i) { var d = dday(i.deadline); return d !== null && d > 0 && d <= 3; });
    var strip = $("#urgentStrip");
    if (hot.length || soon.length) {
      var parts = [];
      if (hot.length) parts.push("오늘 마감 " + hot.length + "건");
      if (soon.length) parts.push("3일 안에 " + soon.length + "건 마감");
      $("#urgentText").textContent = parts.join(" · ") + "이에요. 놓치지 마세요!";
      strip.hidden = false;
    } else {
      strip.hidden = true;
    }

    // 찜 버튼
    var sb = $("#savedBtn");
    $("#savedCount").textContent = favs.size;
    sb.classList.toggle("is-on", state.onlyFav);
    sb.classList.toggle("has-fav", !state.onlyFav && favs.size > 0);
    sb.setAttribute("aria-pressed", String(state.onlyFav));

    // 탭
    $$(".tab").forEach(function (b) {
      var on = b.getAttribute("data-tab") === state.tab;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });

    $("#qClear").hidden = state.q === "";
  }

  /* ───────── 토스트 ───────── */
  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2000);
  }

  /* ───────── 공유 / 링크 복사 ───────── */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-100px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); resolve(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  function shareItem(id) {
    var it = ITEMS.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    var payload = {
      title: it.title,
      text: "[" + (BRAND.name || "오늘도득템") + "] " + it.title + " · " + it.highlight,
      url: it.url
    };
    if (navigator.share) {
      navigator.share(payload).catch(function () { /* 사용자가 취소 */ });
      return;
    }
    copyText(it.url).then(function () {
      toast("링크를 복사했어요");
    }).catch(function () {
      toast("링크: " + it.url);
    });
  }

  /* ───────── 이벤트 ───────── */
  function setTab(tab) {
    /* 탭별 페이지에서는 주소가 곧 카테고리입니다.
       다른 탭을 누르면 화면만 바꾸지 않고 그 탭의 페이지로 이동합니다
       (canonical·제목과 실제 보이는 내용이 어긋나지 않게). */
    if (TAB_PAGE) {
      if (tab === state.tab) window.scrollTo({ top: 0, behavior: "smooth" });
      else location.href = tabPageURL(tab);
      return;
    }
    var changed = state.tab !== tab;
    state.tab = tab;
    render();
    try {
      if (location.protocol === "http:" || location.protocol === "https:") {
        var u = new URL(location.href);
        if (tab === "all") u.searchParams.delete("tab"); else u.searchParams.set("tab", tab);
        history.replaceState(null, "", u.pathname + u.search);
      }
    } catch (e) {}
    /* 카테고리마다 스크롤을 따로 — 탭을 바꾸면 그 탭의 1번 카드부터 보이게 맨 위로 */
    if (changed) window.scrollTo(0, 0);
    var active = $('.tab[data-tab="' + tab + '"]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  $$(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () { setTab(btn.getAttribute("data-tab")); });
  });

  $("#q").addEventListener("input", function (e) { state.q = e.target.value; render(); });
  $("#qClear").addEventListener("click", function () {
    state.q = ""; $("#q").value = ""; $("#q").focus(); render();
  });

  $("#savedBtn").addEventListener("click", function () {
    state.onlyFav = !state.onlyFav;
    if (state.onlyFav) state.tab = "all";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#emptyReset").addEventListener("click", function () {
    if (TAB_PAGE) { location.href = tabPageURL("all"); return; }
    state.q = ""; state.onlyFav = false; state.tab = "all";
    $("#q").value = ""; render();
  });

  $("#list").addEventListener("click", function (e) {
    var favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();
      var id = favBtn.getAttribute("data-fav");
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      saveFavs();
      var on = favs.has(id);
      favBtn.classList.toggle("is-on", on);
      favBtn.setAttribute("aria-pressed", String(on));
      favBtn.setAttribute("aria-label", on ? "찜 해제" : "찜하기");
      favBtn.innerHTML = on ? HEART_FILL : HEART;
      favBtn.classList.remove("pop");
      void favBtn.offsetWidth;
      favBtn.classList.add("pop");
      $("#savedCount").textContent = favs.size;
      $("#savedBtn").classList.toggle("has-fav", !state.onlyFav && favs.size > 0);
      toast(on ? "찜했어요" : "찜을 풀었어요");
      return;
    }

    var shareBtn = e.target.closest("[data-share]");
    if (shareBtn) {
      e.preventDefault();
      e.stopPropagation();
      shareItem(shareBtn.getAttribute("data-share"));
      return;
    }

    if (e.target.closest("a")) return; // CTA·블로그 링크는 기본 동작

    var card = e.target.closest(".card");
    if (card && card.getAttribute("data-url")) {
      window.open(card.getAttribute("data-url"), "_blank", "noopener,noreferrer");
    }
  });

  /* 맨 위로 · 상단 그림자 · 탭 고정 위치 */
  var toTop = $("#toTop");
  var stickyTop = $("#stickyTop");
  function syncStickyHeight() {
    var h = stickyTop ? stickyTop.offsetHeight : 0;
    document.documentElement.style.setProperty("--stick-h", h + "px");
    syncTabsFade();
  }

  /* 오른쪽에 더 볼 탭이 있으면 가장자리를 흐리게 */
  var tabsEl = $("#tabs"), tabsFade = $("#tabsFade");
  function syncTabsFade() {
    if (!tabsEl || !tabsFade) return;
    var rest = tabsEl.scrollWidth - tabsEl.clientWidth - tabsEl.scrollLeft;
    tabsFade.classList.toggle("is-on", rest > 4);
  }
  if (tabsEl) tabsEl.addEventListener("scroll", syncTabsFade, { passive: true });
  syncStickyHeight();
  window.addEventListener("resize", syncStickyHeight);
  if (window.ResizeObserver && stickyTop) new ResizeObserver(syncStickyHeight).observe(stickyTop);

  window.addEventListener("scroll", function () {
    var y = window.scrollY || document.documentElement.scrollTop;
    toTop.classList.toggle("is-on", y > 600);
    stickyTop.classList.toggle("is-scrolled", y > 4);
  }, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* 날짜 · 기준 시각 */
  (function stamp() {
    var d = new Date(DATA.updatedAt || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    $("#todayDate").textContent = koreanDate(d);
    var ymd = SEOUL_DAY.format(d).split("-");
    $("#updatedAt").textContent = "마지막 확인 " + ymd[0] + "." + ymd[1] + "." + ymd[2];
    if (BRAND.tagline) $("#brandTagline").textContent = BRAND.tagline;
  })();

  /* ───────── ⭐ 즐겨찾기 · 홈 화면 바로가기 ─────────
     '앱 설치' 대신 부담 없는 재방문 안내만 띄웁니다.
     · 즐겨찾기(북마크) 방법 한 줄 안내
     · 홈 화면 아이콘 추가 (지원 브라우저에서는 1탭으로 바로 호출)
     · 주소 복사 */
  var HOME_URL = "https://naongnabi.github.io/";

  (function shortcut() {
    var sheet = $("#shortcutSheet");
    if (!sheet) return;
    var openers = [$("#shortcutOpen"), $("#shortcutFootOpen")].filter(Boolean);
    var installBtn = $("#shortcutInstall"), copyBtn = $("#shortcutCopy");
    var deferred = null, lastFocus = null;

    function show() {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      document.documentElement.style.overflow = "hidden";
      var x = $(".sheet-x", sheet);
      if (x) x.focus();
    }
    function hide() {
      sheet.hidden = true;
      document.documentElement.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    openers.forEach(function (b) { b.addEventListener("click", show); });
    $$("[data-sheet-close]", sheet).forEach(function (b) { b.addEventListener("click", hide); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !sheet.hidden) hide();
    });

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();      // 브라우저가 먼저 띄우는 설치 배너는 막고, 시트 버튼으로만
      deferred = e;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener("click", function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then(function (choice) {
          deferred = null;
          installBtn.hidden = true;
          if (choice.outcome === "accepted") { hide(); toast("홈 화면에 아이콘을 만들었어요"); }
          else toast("언제든 다시 만들 수 있어요");
        }).catch(function () {});
      });
    }
    window.addEventListener("appinstalled", function () { hide(); toast("홈 화면에 아이콘을 만들었어요"); });

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyText(HOME_URL).then(function () {
          copyBtn.textContent = "주소를 복사했어요";
          toast("주소를 복사했어요 · 붙여넣기만 하면 돼요");
          setTimeout(function () { copyBtn.textContent = "naongnabi.github.io 주소 복사"; }, 2200);
        }).catch(function () {
          copyBtn.textContent = HOME_URL;
        });
      });
    }
  })();

  render();
  syncTabsFade();

  /* ───────── 광고 채우기 (텐핑 → 안 뜨면 애드픽) ─────────
     텐핑 스크립트는 페이지 로드 때 <tenping> 을 한 번만 채우고 다시 훑지 않습니다.
     그래서 8초 뒤 자리째 숨기던 예전 방식 대신, 광고가 실제로 그려졌는지(높이)를
     계속 지켜보고 비어 있으면 애드픽 추천 카드로 그 자리를 채웁니다.
     애드핏·애드센스는 승인 전이라 지금은 비워 두고 자리만 잡아 둡니다(index.html). */

  function adSetMode(mode) {
    var slot = $("#adSlot"), box = $("#adpickBox"), list = $("#list");
    if (!slot || mode === adState.mode) return;
    adState.mode = mode;
    slot.classList.remove("is-empty");
    slot.classList.toggle("is-adpick", mode === "adpick");
    if (list) list.classList.toggle("is-adpick-top", mode === "adpick");
    var note = $("#adslotNote");
    if (note) note.textContent = mode === "adpick" ? "광고 · 애드픽 제휴" : "광고";
    if (box) {
      if (mode === "adpick") {
        if (!box.innerHTML) box.innerHTML = adCardHTML(adState.offer);
        /* 채울 광고가 실제로 없으면 흰 칸 대신 자리째 숨깁니다 */
        if (!box.innerHTML) { box.hidden = true; slot.classList.add("is-empty"); return; }
        box.hidden = false;
      } else {
        box.hidden = true;
      }
    }
  }

  /* 텐핑은 광고 요청이 실패해도 iframe 을 기본 150px 로 남겨 빈 흰 박스가 됩니다.
     그래서 iframeResizer 가 잡아 준 높이가 기본값(150px)보다 커야 '찼다'고 봅니다.
     (아주 작은 광고는 애드픽 카드로 대체되어도 손에 해가 없습니다) */
  var TP_MIN_H = 160;

  function tenpingHeight() {
    var box = $("#adSlotBox");
    var tp = box && box.querySelector("tenping");
    if (!tp) return 0;
    var ifr = tp.querySelector("iframe");
    if (!ifr || !ifr.style.height) return 0;
    var h = parseFloat(ifr.style.height) || 0;
    return h >= TP_MIN_H ? h : 0;
  }

  function adCheck() {
    var slot = $("#adSlot");
    if (!slot || slot.hidden) return;
    if (tenpingHeight() > 0) { adSetMode("tenping"); return; }
    /* 텐핑이 안 뜨면 빨리 애드픽 카드로 바꿔 빈 흰 칸이 남지 않게 합니다 */
    if (adState.offer && Date.now() - adState.t0 >= 1400) adSetMode("adpick");
  }

  (function adStart() {
    var slot = $("#adSlot");
    if (!slot) return;
    adState.offer = adOffer(0);
    adState.t0 = Date.now();

    if (!adState.offer) {
      // 애드픽 자료까지 없으면: 8초까지 기다렸다 비어 있으면 자리째 숨김
      var tries = 0;
      (function wait() {
        if (tenpingHeight() > 0) { adSetMode("tenping"); return; }
        if (++tries >= 16) { slot.classList.add("is-empty"); return; }
        setTimeout(wait, 500);
      })();
      return;
    }

    (function poll() {
      adCheck();
      if (Date.now() - adState.t0 < 30000) setTimeout(poll, 500);   // 30초까지는 계속 지켜봄
    })();

    var box = $("#adSlotBox"), tp = box && box.querySelector("tenping");
    if (tp && window.MutationObserver) {
      new MutationObserver(function () { adCheck(); }).observe(tp, { childList: true, subtree: true, attributes: true });
    }
  })();

  /* 탭이 6개라 390px 폭을 넘어갑니다 — 주소로 바로 들어온 탭(?tab=contest 등)이 가려지지 않게 가운데로 */
  if (state.tab !== "all") {
    var initTab = $('.tab[data-tab="' + state.tab + '"]');
    if (initTab && initTab.scrollIntoView) {
      requestAnimationFrame(function () { initTab.scrollIntoView({ block: "nearest", inline: "center" }); });
    }
  }

  /* ───────── 접속자 카운터 (hits.sh 무료 카운터, 실패하면 조용히 무시) ─────────
     · 셀 때: 이미지 한 장을 불러오는 방식이라 CORS·광고차단 영향이 적어요.
       일일 https://hits.sh/naongnabi.github.io/daily/YYYY-MM-DD.svg
       누적 https://hits.sh/naongnabi.github.io/total.svg
     · 읽을 때(증가 없이): curl -s https://hits.sh/api/urns/naongnabi.github.io/daily/YYYY-MM-DD
     · 한 세션(새로고침 포함)에서는 한 번만 올립니다(sessionStorage). */
  (function counter() {
    try {
      if (!/^https?:$/.test(location.protocol)) return;
      var KEY = "deuktem.counted";
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      var d = SEOUL_DAY.format(new Date());   // YYYY-MM-DD (한국 시간)
      var BASE = "https://hits.sh/naongnabi.github.io/";
      var beacon = function (path) {
        try {
          var img = new Image(1, 1);
          img.alt = "";
          img.style.cssText = "position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
          img.referrerPolicy = "no-referrer";
          img.onload = img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
          img.src = BASE + path + ".svg?style=flat";
          (document.body || document.documentElement).appendChild(img);
        } catch (e) {}
      };
      beacon("daily/" + d);
      beacon("total");
    } catch (e) { /* 카운터 실패는 페이지에 동작 영향 없음 */ }
  })();

  /* PWA 서비스 워커 (http/https 에서만) */
  if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(ROOT_PREFIX + "sw.js").catch(function () {});
    });
  }
})();
