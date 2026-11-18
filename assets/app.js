/* 오늘도득템 — 앱 로직
   데이터는 data/items.js (data/items.json 에서 자동 생성) 만 읽습니다. */
(function () {
  "use strict";

  var DATA = window.DEUKTEM_DATA || { items: [], brand: {} };
  var ITEMS = (DATA.items || []).slice();
  var BRAND = DATA.brand || {};
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

  /* ───────── 상태 ───────── */
  var startTab = new URLSearchParams(location.search).get("tab");
  var state = {
    tab: CAT[startTab] ? startTab : "all",
    q: "",
    onlyFav: false
  };

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
      (it.meta || []).join(" "), it.note, it.deadlineText, it.cta].join(" ").toLowerCase();
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
    return '<span class="thumb ' + cls + '" data-ico="' + (CAT_ICO[it.cat] || "🛍️") + '">' +
      '<img src="' + esc(it.image) + '" alt=""' + (lazy ? ' loading="lazy"' : "") + ' decoding="async" ' +
        'onerror="this.parentNode.classList.add(\'is-fallback\');this.remove();" />' +
      "</span>";
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

  /* ───────── 렌더 ───────── */
  function render() {
    renderHot();
    var items = filtered();
    var list = $("#list");
    var html = "";
    var searching = state.q.trim() !== "" || state.onlyFav;

    if (searching) {
      if (items.length) {
        var label = state.onlyFav && !state.q.trim()
          ? "찜한 항목"
          : (state.q.trim() ? "‘" + state.q.trim() + "’ 검색 결과" : "찜한 항목");
        html += sectionHead("", label, items.length) + items.map(cardHTML).join("");
      }
    } else if (state.tab === "all") {
      ["deal", "exp", "quiz", "contest", "apptech"].forEach(function (cat) {
        var sub = items.filter(function (it) { return it.cat === cat; });
        if (!sub.length) return;
        html += sectionHead(CAT[cat].icon, CAT[cat].label, sub.length) + sub.map(cardHTML).join("");
      });
    } else if (state.tab === "exp") {
      // 체험단 탭: 가전·IT 를 위로 (혜영 님 요청)
      var isIt = function (it) { return it.tag === "가전·디지털"; };
      var it1 = items.filter(isIt), it2 = items.filter(function (it) { return !isIt(it); });
      if (it1.length) html += sectionHead("📺", "가전·IT 체험단", it1.length) + it1.map(cardHTML).join("");
      if (it2.length) html += sectionHead("🧺", "생활·뷰티·식품", it2.length) + it2.map(cardHTML).join("");
    } else {
      html += items.map(cardHTML).join("");
    }

    list.innerHTML = html;
    list.hidden = items.length === 0;

    // 광고 배너 자리(미리보기) — 목록 맨 끝, 클릭 요소 아님
    var adSlot = $("#adSlot");
    if (adSlot) adSlot.hidden = items.length === 0;

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
    state.tab = tab;
    render();
    try {
      if (location.protocol === "http:" || location.protocol === "https:") {
        var u = new URL(location.href);
        if (tab === "all") u.searchParams.delete("tab"); else u.searchParams.set("tab", tab);
        history.replaceState(null, "", u.pathname + u.search);
      }
    } catch (e) {}
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

  /* 홈 화면에 추가 (PWA 설치) */
  (function install() {
    var box = $("#installBox"), btn = $("#installBtn"), desc = $("#installDesc");
    if (!box) return;
    var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) return;

    var ua = navigator.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      box.hidden = false;
      btn.hidden = true;
      desc.innerHTML = "Safari 아래 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>를 눌러 주세요.";
    }

    var deferred = null;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      box.hidden = false;
      btn.hidden = false;
      desc.textContent = "아래 버튼을 누르면 바로 설치됩니다.";
    });
    btn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        deferred = null;
        btn.hidden = true;
        desc.textContent = choice.outcome === "accepted" ? "설치 중이에요. 홈 화면을 확인해 주세요!" : "언제든 다시 추가할 수 있어요.";
      }).catch(function () {});
    });
    window.addEventListener("appinstalled", function () { box.hidden = true; toast("홈 화면에 추가했어요"); });
  })();

  render();
  syncTabsFade();

  /* 탭이 6개라 390px 폭을 넘어갑니다 — 주소로 바로 들어온 탭(?tab=contest 등)이 가려지지 않게 가운데로 */
  if (state.tab !== "all") {
    var initTab = $('.tab[data-tab="' + state.tab + '"]');
    if (initTab && initTab.scrollIntoView) {
      requestAnimationFrame(function () { initTab.scrollIntoView({ block: "nearest", inline: "center" }); });
    }
  }

  /* PWA 서비스 워커 (http/https 에서만) */
  if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
