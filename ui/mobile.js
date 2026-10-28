/**
 * deepdive 手机版前端脚本 v0.6 —— 适配 DSH 内核 0.2.0-rc.1
 *
 * 与 v0.5（0.1.7 时期）的差异：
 *   1. 新增「内核更新提示横幅」：拉取插件路由 /dsh-update-check/status，
 *      有新版本时在顶部显示一条可关闭的提示（关闭状态按版本号记在 localStorage，
 *      同一版本不再骚扰；换新版本会重新提示）。
 *   2. Iterator polyfill 保留但已非必需：0.2.0 全树扫描确认**没有任何包**
 *      再用 `Iterator.prototype.join`（0.1.7 的 sidebar-documentpreview 用过），
 *      留着只为老 WebView 兜底，可安全删除。
 *   3. 其余机制（软键盘适配 / 回车换行 / 禁双指缩放）与内核版本无关，原样保留：
 *      · `[data-composer-card]` 标记：0.2.0 的 dsh-client-ui-conversation 里仍然存在（已核对）；
 *      · `#root` 容器：仍在 dist/index.html 中。
 */

/**
 * Iterator Helpers polyfill（0.2.0 起已无包使用，保留作老 WebView 兜底）。
 * 背景：0.1.7 的 @deepseek-ai/dsh-client-ui-sidebar-documentpreview 顶层有
 *   "function"!=typeof Iterator.prototype.join&&(Iterator.prototype.join=...)
 * 而 Iterator 是 ES2025（WebView 122+）。老 WebView 上 Iterator 未定义
 * → ReferenceError → 该插件 import 失败 → 前端白页「Failed to load plugins」。
 * 位置：mobile.js 是 body 末尾的普通脚本，早于所有 module 脚本执行 —— 时机正确。
 */
(function () {
  var iterProto = null;
  try {
    if (typeof Symbol !== 'undefined' && Symbol.iterator) {
      iterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
    }
  } catch (e) { iterProto = null; }

  function joinImpl(sep) {
    sep = (sep === undefined) ? ',' : String(sep);
    if (this == null || typeof this.next !== 'function') {
      throw new TypeError('Iterator.prototype.join called on incompatible receiver');
    }
    var out = '', first = true, step;
    while (!(step = this.next()).done) {
      if (!first) out += sep;
      first = false;
      var v = step.value;
      out += (v === null || v === undefined) ? '' : String(v);   // 与规范一致：null/undefined 当作空串
    }
    return out;
  }

  if (iterProto && typeof iterProto.join !== 'function') iterProto.join = joinImpl;

  if (typeof window.Iterator === 'undefined') {
    var It = function Iterator() { throw new TypeError('Iterator is not constructible'); };
    if (iterProto) { It.prototype = iterProto; } else { It.prototype.join = joinImpl; }
    window.Iterator = It;
  } else if (window.Iterator.prototype && typeof window.Iterator.prototype.join !== 'function') {
    window.Iterator.prototype.join = joinImpl;
  }
})();

/**
 * 移动端软键盘适配 v0.3
 *   VisualViewport + translateY 方案，竖屏横屏通用，rAF 节流 + 异常保护，
 *   暴露 --kb-height 供 CSS 使用；并用 pointerdown 位置判断焦点来源，
 *   程序化聚焦（切换话题/新会话自动 focus）立即 blur，不弹键盘。
 * 注：窄屏侧栏改造（三条杠 + 浮层）在核心源码 dsh-client-ui-layout，不在此文件。
 */
(function () {
  if (!window.visualViewport) return;
  var vv = window.visualViewport;
  var app = document.getElementById('root') || document.body;
  var lastKb = 0;
  var rafId = 0;
  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };

  function computeKb() {
    // 键盘高度 ≈ 布局视口高度 - 视觉视口高度 - 视觉视口顶部偏移
    var kb = window.innerHeight - vv.height - vv.offsetTop;
    return Math.max(0, Math.round(kb));
  }

  function apply() {
    var kb = computeKb();
    if (Math.abs(kb - lastKb) < 6) return;
    lastKb = kb;
    document.documentElement.style.setProperty('--kb-height', kb + 'px');
    if (!app) return;
    if (kb > 120) {
      app.style.transform = 'translateY(' + (-kb) + 'px)';
      app.style.transition = 'transform 0.12s ease-out';
      document.documentElement.classList.add('kb-open');
    } else {
      app.style.transform = '';
      app.style.transition = 'transform 0.12s ease-out';
      document.documentElement.classList.remove('kb-open');
    }
  }

  function schedule() {
    if (rafId) return;
    rafId = raf(function () {
      rafId = 0;
      apply();
    });
  }

  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', function () {
    setTimeout(schedule, 200);
  });

  var lastPointer = null;
  document.addEventListener('pointerdown', function (e) {
    lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, true);

  function isInputLike(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  document.addEventListener('focusin', function (e) {
    var t = e && e.target;
    if (!isInputLike(t)) return;
    var userTapped = false;
    if (lastPointer && Date.now() - lastPointer.t < 800) {
      var r = t.getBoundingClientRect();
      userTapped = r.left <= lastPointer.x && lastPointer.x <= r.right &&
                   r.top <= lastPointer.y && lastPointer.y <= r.bottom;
    }
    if (!userTapped) {
      setTimeout(function () {
        if (document.activeElement === t) t.blur();
      }, 0);
      return;
    }
    setTimeout(schedule, 150);
  });
  document.addEventListener('focusout', function (e) {
    if (isInputLike(e && e.target)) setTimeout(schedule, 150);
  });

  setTimeout(schedule, 100);
})();

/**
 * 手机端回车行为 v0.4 —— **回车换行，Ctrl/Cmd+回车 发送**
 *
 * 问题（用户反馈）：手机软键盘上按回车 = 直接把消息发出去，换不了行。
 * 成因：composer 的键盘映射对 Enter 只在 `event.shiftKey === true` 时放行换行，
 *   其余情况一律 submit()。实体键盘有 Shift，手机软键盘没有。
 *
 * 做法：**不改内核代码**。在 document 捕获阶段拦下裸 Enter（仅限聊天输入栏
 *   `[data-composer-card]` 内、且输入法未组词），阻止默认与冒泡，
 *   再补发一个 shiftKey=true 的合成 keydown —— 让编辑器走它本来就有的
 *   「Shift+Enter = 换行」路径（不自己拼 DOM / 不改 React 状态）。
 *   合成事件打 __dshSynthEnter 标记避免自拦截。
 *   KeyboardEvent 不可用时退化为 execCommand('insertLineBreak')。
 */
(function () {
  var SYNTH_FLAG = '__dshSynthEnter';

  function inComposer(t) {
    try {
      // data-composer-card 是 composer 卡片的稳定标记（0.2.0 仍在，已核对）
      return !!(t && t.closest && t.closest('[data-composer-card]'));
    } catch (e) { return false; }
  }

  document.addEventListener('keydown', function (e) {
    if (e[SYNTH_FLAG]) return;
    if (e.key !== 'Enter' && e.keyCode !== 13) return;
    if (e.isComposing || e.keyCode === 229) return;              // 输入法组词中的回车：交给输入法
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return; // 组合键保持原语义
    var t = e.target;
    if (!t || !t.isContentEditable || !inComposer(t)) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      var ev = new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        shiftKey: true, bubbles: true, cancelable: true
      });
      ev[SYNTH_FLAG] = true;
      t.dispatchEvent(ev);
    } catch (err) {
      try { document.execCommand('insertLineBreak'); } catch (e2) {}
    }
  }, true);
})();

/**
 * 内核更新提示横幅 v1（配合插件 @deepseek-ai/dsh-update-check）
 *
 * 数据源：GET /dsh-update-check/status（插件注册的只读路由，只含版本号）。
 * 行为：
 *   · 页面加载后延迟 3 秒查一次（不抢首屏）；
 *   · 有新版本才显示；点 × 关闭，关闭状态按「通道@版本」记在 localStorage，
 *     同一版本不再提示，出现更新的版本会重新提示；
 *   · 网络失败/插件不存在 → 静默（绝不打扰）。
 */
(function () {
  var DISMISS_KEY = 'dsh-update-dismissed';
  var CHECK_DELAY_MS = 3000;

  function dismissed(key) {
    try { return window.localStorage.getItem(DISMISS_KEY) === key; } catch (e) { return false; }
  }
  function dismiss(key) {
    try { window.localStorage.setItem(DISMISS_KEY, key); } catch (e) { /* 无痕模式等 */ }
  }

  function show(status) {
    if (document.querySelector('.dsh-update-banner')) return;
    var key = status.recommended.tag + '@' + status.recommended.version;
    if (dismissed(key)) return;

    var bar = document.createElement('div');
    bar.className = 'dsh-update-banner';
    bar.setAttribute('role', 'status');

    var text = document.createElement('span');
    text.className = 'dsh-update-banner__text';
    text.textContent = 'DSH 内核有新版本 ' + status.recommended.version +
      '（当前 ' + status.current + '）· 适配版发布后会自动提示应用更新';
    bar.appendChild(text);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'dsh-update-banner__close';
    close.setAttribute('aria-label', '关闭更新提示');
    close.textContent = '×';
    close.addEventListener('click', function () {
      dismiss(key);
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    });
    bar.appendChild(close);

    document.body.appendChild(bar);
  }

  function check() {
    var url = '/dsh-update-check/status';
    var options = { credentials: 'same-origin', cache: 'no-store' };
    var request = (typeof window.fetch === 'function')
      ? window.fetch(url, options)
      : new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onload = function () {
            try { resolve({ ok: xhr.status >= 200 && xhr.status < 300, json: function () { return Promise.resolve(JSON.parse(xhr.responseText)); } }); }
            catch (e) { reject(e); }
          };
          xhr.onerror = reject;
          xhr.send();
        });
    request
      .then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (status) {
        if (!status || status.ok !== true) return;
        if (status.updateAvailable !== true || !status.recommended) return;
        show(status);
      })
      .catch(function () { /* 静默：离线或插件未启用都不该打扰用户 */ });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(check, CHECK_DELAY_MS);
  } else {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(check, CHECK_DELAY_MS); });
  }
})();

/**
 * Real-device mobile shell polish.
 *
 * Geometry is owned by mobile.css. This layer only supplies behaviours that
 * CSS cannot express:
 *   - close the drawer after choosing a destination;
 *   - keep drawer state aligned when the viewport crosses tablet width.
 *
 * The DOM remains upstream DSH. No React tree is cloned or replaced.
 */
(function () {
  var root = document.documentElement;
  var lastDrawerOpen = null;
  var syncTimer = 0;
  var composerObserver = null;
  var observedComposerCard = null;
  var observedComposerDock = null;
  var composerDiscoveryObserver = null;
  var drawerStateObserver = null;
  var lastDrawerPointerAt = 0;
  var contentObserver = null;
  var contentIdle = 0;
  var pendingTokenParagraphs = new Set();
  var requestIdle =
    window.requestIdleCallback ||
    function (callback) { return setTimeout(callback, 120); };

  function menuButton() {
    return document.querySelector('.dsh-mobile-menu-btn');
  }

  function scrim() {
    return document.querySelector('.dsh-mobile-scrim');
  }

  function closeDrawer() {
    var s = scrim();
    if (s) s.click();
  }

  function syncDrawerAffordances(open) {
    var sidebar = document.querySelector('[class*="_sidebarCol"]');
    var center = document.querySelector('[class*="_centerCol"]');
    var toggle = sidebar && sidebar.querySelector('[class*="_toggle"]');
    var brand = sidebar && sidebar.querySelector('button[class*="_brand"]');
    var mobile = (window.innerWidth || 0) < 1024;

    if (brand && mobile) {
      brand.setAttribute('aria-hidden', 'true');
      brand.tabIndex = -1;
    } else if (brand) {
      brand.removeAttribute('aria-hidden');
      brand.removeAttribute('tabindex');
    }

    if (toggle) {
      toggle.setAttribute('aria-label', open ? '关闭侧边栏' : '收起侧边栏');
    }

    if (center) {
      center.inert = open;
      if (open) center.setAttribute('aria-hidden', 'true');
      else center.removeAttribute('aria-hidden');
    }

    if (sidebar) {
      if (open) {
        sidebar.setAttribute('role', 'dialog');
        sidebar.setAttribute('aria-modal', 'true');
        sidebar.setAttribute('aria-label', '导航菜单');
      } else {
        sidebar.removeAttribute('role');
        sidebar.removeAttribute('aria-modal');
        sidebar.removeAttribute('aria-label');
      }
    }

    return { toggle: toggle, center: center };
  }

  function syncDrawerState() {
    var open = !!scrim();
    var previous = lastDrawerOpen;
    var changed = open !== previous;
    lastDrawerOpen = open;
    if (changed) root.classList.toggle('dsh-mobile-drawer-open', open);
    var menu = menuButton();
    if (menu) {
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        menu.setAttribute('aria-hidden', 'true');
        menu.tabIndex = -1;
      } else {
        menu.removeAttribute('aria-hidden');
        menu.removeAttribute('tabindex');
      }
    }
    var drawer = syncDrawerAffordances(open);
    if (!changed || previous === null) return;
    if (open && drawer.toggle) {
      var pointerOpened = Date.now() - lastDrawerPointerAt < 1200;
      if (pointerOpened) root.classList.add('dsh-mobile-touch-focus');
      setTimeout(function () {
        if (scrim()) drawer.toggle.focus({ preventScroll: true });
      }, 80);
      if (pointerOpened) {
        setTimeout(function () {
          root.classList.remove('dsh-mobile-touch-focus');
        }, 280);
      }
    } else if (!open && menu) {
      var pointerClosed = Date.now() - lastDrawerPointerAt < 1200;
      if (pointerClosed) root.classList.add('dsh-mobile-touch-focus');
      setTimeout(function () {
        menu.focus({ preventScroll: true });
      }, 80);
      if (pointerClosed) {
        setTimeout(function () {
          root.classList.remove('dsh-mobile-touch-focus');
        }, 280);
      }
    }
  }

  function markViewport() {
    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    root.setAttribute('data-dsh-mobile', w < 1024 ? '1' : '0');
    root.setAttribute('data-dsh-mobile-orientation', h >= w ? 'portrait' : 'landscape');
    root.style.setProperty('--dsh-mobile-visual-height', h + 'px');
    var bodyFontSize = parseFloat(getComputedStyle(document.body).fontSize);
    root.classList.toggle(
      'dsh-mobile-large-text',
      Number.isFinite(bodyFontSize) && bodyFontSize > 17
    );
    syncComposerMetrics();
    syncDrawerState();
  }

  function publishComposerMetrics() {
    var card = observedComposerCard || document.querySelector('[data-composer-card]');
    var dock = observedComposerDock || document.querySelector('[data-composer-dock]');
    if (card) {
      var nextCardHeight =
        Math.round(card.getBoundingClientRect().height * 100) / 100 + 'px';
      if (root.style.getPropertyValue('--dsh-mobile-composer-card-height') !== nextCardHeight) {
        root.style.setProperty(
          '--dsh-mobile-composer-card-height',
          nextCardHeight
        );
      }
    }
    if (dock) {
      var nextDockHeight =
        Math.round(dock.getBoundingClientRect().height * 100) / 100 + 'px';
      if (root.style.getPropertyValue('--dsh-mobile-composer-dock-height') !== nextDockHeight) {
        root.style.setProperty(
          '--dsh-mobile-composer-dock-height',
          nextDockHeight
        );
      }
    }
    var inputScroll = document.querySelector('[data-input-scroll]');
    if (inputScroll) {
      var isScrollable = inputScroll.scrollHeight > inputScroll.clientHeight + 1;
      if (isScrollable) {
        if (inputScroll.getAttribute('data-dsh-scroll-focus') !== 'true') {
          inputScroll.tabIndex = 0;
          inputScroll.setAttribute('role', 'region');
          inputScroll.setAttribute('aria-label', '消息输入内容');
          inputScroll.setAttribute('data-dsh-scroll-focus', 'true');
        }
      } else if (inputScroll.getAttribute('data-dsh-scroll-focus') === 'true') {
        inputScroll.removeAttribute('tabindex');
        inputScroll.removeAttribute('role');
        inputScroll.removeAttribute('aria-label');
        inputScroll.removeAttribute('data-dsh-scroll-focus');
      }
    }
  }

  function syncComposerMetrics() {
    var card = document.querySelector('[data-composer-card]');
    var dock = document.querySelector('[data-composer-dock]');
    if (!card || !dock) return;
    if (card === observedComposerCard && dock === observedComposerDock) {
      publishComposerMetrics();
      return;
    }

    if (composerObserver) composerObserver.disconnect();
    observedComposerCard = card;
    observedComposerDock = dock;
    publishComposerMetrics();

    if (typeof ResizeObserver !== 'function') return;
    composerObserver = new ResizeObserver(publishComposerMetrics);
    composerObserver.observe(card);
    composerObserver.observe(dock);
    if (composerDiscoveryObserver) {
      composerDiscoveryObserver.disconnect();
      composerDiscoveryObserver = null;
    }
  }

  function watchForComposer() {
    if (
      document.querySelector('[data-composer-card]') &&
      document.querySelector('[data-composer-dock]')
    ) {
      syncComposerMetrics();
      return;
    }
    if (typeof MutationObserver !== 'function') return;
    composerDiscoveryObserver = new MutationObserver(function () {
      syncComposerMetrics();
    });
    composerDiscoveryObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    setTimeout(function () {
      if (!composerDiscoveryObserver) return;
      composerDiscoveryObserver.disconnect();
      composerDiscoveryObserver = null;
    }, 20000);
  }

  function watchDrawerState() {
    if (drawerStateObserver || typeof MutationObserver !== 'function') return;
    var frame = document.querySelector('[class*="_frame"]');
    if (!frame) return;
    drawerStateObserver = new MutationObserver(function () {
      scheduleSync();
    });
    drawerStateObserver.observe(frame, { childList: true });
  }

  function markTokenLines() {
    contentIdle = 0;
    var paragraphs = pendingTokenParagraphs;
    pendingTokenParagraphs = new Set();
    paragraphs.forEach(function (paragraph) {
      if (!paragraph.isConnected) return;
      var text = (paragraph.textContent || '').trim();
      var shouldBalance =
        text.length >= 24 &&
        text.length <= 180 &&
        text.indexOf('→') !== -1 &&
        paragraph.children.length === 0;
      if (shouldBalance) {
        paragraph.setAttribute('data-dsh-token-line', 'true');
      } else if (paragraph.hasAttribute('data-dsh-token-line')) {
        paragraph.removeAttribute('data-dsh-token-line');
      }
    });
  }

  function queueParagraphs(node) {
    if (!node) return;
    var element = node.nodeType === 1 ? node : node.parentElement;
    if (!element || !element.closest) return;
    var markdown =
      element.closest('[class*="_markdown_"]') ||
      element.querySelector('[class*="_markdown_"]');
    if (!markdown) return;
    var containingParagraph = element.closest('p');
    if (containingParagraph && markdown.contains(containingParagraph)) {
      pendingTokenParagraphs.add(containingParagraph);
    }
    var paragraphs = element.querySelectorAll('p');
    for (var i = 0; i < paragraphs.length; i += 1) {
      pendingTokenParagraphs.add(paragraphs[i]);
    }
  }

  function scheduleContentEnhancement(records) {
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      if (record.type === 'characterData') {
        queueParagraphs(record.target.parentElement);
      } else {
        for (var j = 0; j < record.addedNodes.length; j += 1) {
          queueParagraphs(record.addedNodes[j]);
        }
      }
    }
    if (contentIdle || pendingTokenParagraphs.size === 0) return;
    contentIdle = requestIdle(markTokenLines, { timeout: 700 });
  }

  function watchConversationContent(attempt) {
    if (contentObserver || typeof MutationObserver !== 'function') return;
    var contentRoot = document.querySelector('.wSkVaW_body');
    if (!contentRoot) {
      if ((attempt || 0) < 40) {
        setTimeout(function () {
          watchConversationContent((attempt || 0) + 1);
        }, 250);
      }
      return;
    }
    contentObserver = new MutationObserver(scheduleContentEnhancement);
    contentObserver.observe(contentRoot, {
      childList: true,
      characterData: true,
      subtree: true
    });
    var initialParagraphs = contentRoot.querySelectorAll(
      '[class*="_markdown_"] p'
    );
    for (var i = 0; i < initialParagraphs.length; i += 1) {
      pendingTokenParagraphs.add(initialParagraphs[i]);
    }
    queueParagraphs(contentRoot);
    scheduleContentEnhancement([]);
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = setTimeout(function () {
      syncTimer = 0;
      syncComposerMetrics();
      syncDrawerState();
    }, 0);
  }

  document.addEventListener('click', function (event) {
    scheduleSync();
    var button = event.target && event.target.closest
      ? event.target.closest('button, [role="button"]')
      : null;
    if (!button) return;

    var sidebar = button.closest('[class*="_sidebarCol"]');
    if (!sidebar || !scrim()) return;

    var label = (
      (button.getAttribute('aria-label') || '') + ' ' +
      (button.getAttribute('title') || '') + ' ' +
      (button.textContent || '')
    ).replace(/\s+/g, ' ').trim();

    // Keep accordion/header controls available; close after navigation-like taps.
    if (/功能|收起|展开|更多|视图选项|添加工作区|搜索会话|账号菜单/.test(label)) return;
    setTimeout(closeDrawer, 100);
  }, true);

  document.addEventListener('pointerdown', function () {
    lastDrawerPointerAt = Date.now();
  }, true);

  window.addEventListener('resize', markViewport, { passive: true });
  window.addEventListener('orientationchange', function () {
    setTimeout(markViewport, 160);
  }, { passive: true });
  window.addEventListener('popstate', closeDrawer, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      markViewport();
      setTimeout(syncComposerMetrics, 120);
      watchForComposer();
      watchConversationContent(0);
      watchDrawerState();
      root.classList.add('dsh-mobile-ready');
    });
  } else {
    markViewport();
    setTimeout(syncComposerMetrics, 120);
    watchForComposer();
    watchConversationContent(0);
    watchDrawerState();
    root.classList.add('dsh-mobile-ready');
  }
})();
