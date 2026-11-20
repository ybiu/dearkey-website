/* DearKey 梦键 · 官网交互 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 移动端菜单 */
  var toggle = $('#menuToggle');
  var links = $('#navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '收起菜单' : '展开菜单');
    });
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* 角色动作：与 App 内一致，逐帧切换精灵表 */
  var witch = $('#witchAnim');
  if (witch) {
    $$('.motion').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.motion;
        $$('.motion').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
        witch.style.backgroundImage = "url('assets/witch-" + key + "-sheet.webp')";
        witch.setAttribute('aria-label', '魔女角色' + ({ wave: '挥手', laugh: '笑', bounce: '蹦跳' }[key] || '') + '动画');
      });
    });
  }

  /* 复制启用路径 */
  var copyBtn = $('#copyPath');
  var path = $('#setupPath');
  var hint = $('#copyHint');
  if (copyBtn && path && hint) {
    copyBtn.addEventListener('click', function () {
      var text = path.textContent.trim();
      var done = function () {
        hint.textContent = '已复制';
        setTimeout(function () { hint.textContent = ''; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { hint.textContent = '请手动复制'; });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { hint.textContent = '请手动复制'; }
        document.body.removeChild(ta);
      }
    });
  }

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
