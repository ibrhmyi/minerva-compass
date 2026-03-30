// Minerva Compass — Embeddable Chat Widget
// Drop this script on any page:
// <script src="https://minerva-compass.vercel.app/embed/widget.js"></script>
//
// Optional config (before the script tag):
// window.MinervaCompassConfig = { position: 'right', accentColor: '#F0B91E' };

(function () {
  'use strict';

  var config = window.MinervaCompassConfig || {};
  var position = config.position || 'right';
  var accent = config.accentColor || '#F0B91E';
  var baseUrl = config.baseUrl || (document.currentScript ? new URL('.', document.currentScript.src).origin : 'https://minerva-compass.vercel.app');

  var isOpen = false;
  var bubble, iframe, container;

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.mc-widget-bubble{',
        'position:fixed;bottom:24px;' + position + ':24px;',
        'width:56px;height:56px;border-radius:50%;',
        'background:' + accent + ';color:#000;',
        'border:none;cursor:pointer;z-index:999998;',
        'box-shadow:0 4px 20px rgba(0,0,0,0.3),0 0 24px ' + accent + '33;',
        'display:flex;align-items:center;justify-content:center;',
        'transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.25s ease;',
      '}',
      '.mc-widget-bubble:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(0,0,0,0.4),0 0 32px ' + accent + '55;}',
      '.mc-widget-bubble svg{width:26px;height:26px;}',
      '.mc-widget-bubble.open svg.mc-icon-chat{display:none;}',
      '.mc-widget-bubble:not(.open) svg.mc-icon-close{display:none;}',
      '.mc-widget-container{',
        'position:fixed;bottom:92px;' + position + ':24px;',
        'width:380px;height:560px;max-height:calc(100vh - 120px);max-width:calc(100vw - 48px);',
        'border-radius:16px;overflow:hidden;z-index:999997;',
        'box-shadow:0 16px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.07);',
        'transform:scale(0.9) translateY(10px);opacity:0;pointer-events:none;',
        'transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease;',
      '}',
      '.mc-widget-container.open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto;}',
      '.mc-widget-container iframe{width:100%;height:100%;border:none;border-radius:16px;}',
      '@media(max-width:500px){',
        '.mc-widget-container{width:calc(100vw - 16px);height:calc(100vh - 100px);bottom:80px;' + position + ':8px;border-radius:12px;}',
        '.mc-widget-bubble{bottom:16px;' + position + ':16px;width:50px;height:50px;}',
        '.mc-widget-bubble svg{width:22px;height:22px;}',
      '}',
    ].join('');
    document.head.appendChild(style);
  }

  function createBubble() {
    bubble = document.createElement('button');
    bubble.className = 'mc-widget-bubble';
    bubble.setAttribute('aria-label', 'Open Minerva Compass chat');
    bubble.innerHTML =
      '<svg class="mc-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>' +
      '</svg>' +
      '<svg class="mc-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
      '</svg>';
    bubble.addEventListener('click', toggle);
    document.body.appendChild(bubble);
  }

  function createContainer() {
    container = document.createElement('div');
    container.className = 'mc-widget-container';

    iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/?embed=1';
    iframe.title = 'Minerva Compass Chat';
    iframe.setAttribute('loading', 'lazy');

    container.appendChild(iframe);
    document.body.appendChild(container);
  }

  function toggle() {
    isOpen = !isOpen;
    bubble.classList.toggle('open', isOpen);
    container.classList.toggle('open', isOpen);
    bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open Minerva Compass chat');
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    injectStyles();
    createBubble();
    createContainer();
  }
})();
