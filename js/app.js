// ============================================
// Minerva Compass — Application Logic
// Modern chat interface with glass UI
// ============================================

(function () {
  'use strict';

  // --- DOM Elements ---
  const chatArea = document.getElementById('chat-area');
  const welcomeScreen = document.getElementById('welcome-screen');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-chat-btn');
  const charCount = document.getElementById('char-count');
  const quickQuestions = document.querySelectorAll('.quick-q');

  // --- State ---
  let conversationHistory = [];
  let isLoading = false;

  // --- Suggested follow-ups per topic ---
  const followUpMap = {
    'deadline': ['What happens if I miss a deadline?', 'Which round should I apply in?', 'Is Early Action binding?'],
    'financial': ['What percentage of students get aid?', 'Are there merit scholarships?', 'How much does Minerva cost?'],
    'application': ['How many essays do I write?', 'Do I need test scores?', 'What are the Challenges?'],
    'accomplishment': ['What counts as an accomplishment?', 'Can I submit work-in-progress?', 'How many should I submit?'],
    'different': ['Where do students live?', 'How does the curriculum work?', 'What cities will I study in?'],
    'challenge': ['How long are the Challenges?', 'Can I prepare for them?', 'What skills do they test?'],
    'curriculum': ['What are the four core habits?', 'How does Active Learning work?', 'What majors are available?'],
    'student': ['What is the rotation schedule?', 'How diverse is the student body?', 'What support services exist?'],
  };

  // --- Initialize ---
  function init() {
    sendBtn.addEventListener('click', handleSend);
    messageInput.addEventListener('keydown', handleKeydown);
    messageInput.addEventListener('input', handleInput);
    clearBtn.addEventListener('click', handleClear);

    quickQuestions.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const question = btn.querySelector('.quick-q-text').textContent.trim();
        messageInput.value = question;
        handleSend();
      });
    });

    messageInput.focus();
  }

  // --- Handle input changes (auto-resize + char count) ---
  function handleInput() {
    // Auto-resize
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

    // Character count
    const len = messageInput.value.length;
    if (len > 0) {
      charCount.textContent = len + ' / 2000';
      charCount.style.color = len > 1800 ? 'var(--error)' : '';
    } else {
      charCount.textContent = '';
    }
  }

  // --- Handle keyboard input ---
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // --- Clear conversation ---
  function handleClear() {
    conversationHistory = [];

    // Remove all messages and typing indicators
    const messages = chatArea.querySelectorAll('.message, .typing-indicator');
    messages.forEach(function (msg) {
      msg.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(function () { msg.remove(); }, 200);
    });

    // Show welcome screen again
    setTimeout(function () {
      if (welcomeScreen) {
        welcomeScreen.style.display = '';
        welcomeScreen.style.animation = 'fadeIn 0.4s ease';
      }
    }, 250);
  }

  // --- Send message ---
  function handleSend() {
    var text = messageInput.value.trim();
    if (!text || isLoading || text.length > 2000) return;

    // Hide welcome screen on first message
    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
      welcomeScreen.style.display = 'none';
    }

    // Add user message to UI
    appendMessage('user', text);

    // Add to conversation history
    conversationHistory.push({ role: 'user', content: text });

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    charCount.textContent = '';

    // Show typing indicator
    showTyping();

    // Disable input while loading
    setLoading(true);

    // Call API
    callAPI(conversationHistory)
      .then(function (reply) {
        hideTyping();
        appendMessage('assistant', reply, text);
        conversationHistory.push({ role: 'assistant', content: reply });
      })
      .catch(function (err) {
        hideTyping();
        console.error('API Error:', err);
        var errorMsg = 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.';
        appendMessage('assistant', errorMsg);
        showError('Connection issue — please try again');
      })
      .finally(function () {
        setLoading(false);
        messageInput.focus();
      });
  }

  // --- Call the Vercel serverless API ---
  function callAPI(messages) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages })
    })
    .then(function (res) {
      if (!res.ok) {
        throw new Error('API returned ' + res.status);
      }
      return res.json();
    })
    .then(function (data) {
      if (data.error) {
        throw new Error(data.error);
      }
      return data.reply;
    });
  }

  // --- Detect relevant follow-ups based on question ---
  function getFollowUps(question) {
    var q = question.toLowerCase();
    for (var key in followUpMap) {
      if (q.includes(key)) {
        return followUpMap[key];
      }
    }
    // Default follow-ups
    return ['Tell me about student life', 'How do I apply?', 'What makes Minerva unique?'];
  }

  // --- Append a message to the chat ---
  function appendMessage(role, text, originalQuestion) {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'message ' + role;
    msgDiv.setAttribute('role', 'article');

    var avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.setAttribute('aria-hidden', 'true');

    if (role === 'user') {
      avatarDiv.textContent = 'You';
    } else {
      avatarDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.5"/></svg>';
    }

    var contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;';

    var contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'assistant') {
      contentDiv.innerHTML = formatMarkdown(text);
    } else {
      contentDiv.textContent = text;
    }

    contentWrapper.appendChild(contentDiv);

    // Add message actions for assistant messages
    if (role === 'assistant') {
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';

      var copyBtn = document.createElement('button');
      copyBtn.className = 'msg-action-btn';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
          copyBtn.classList.add('copied');
          setTimeout(function () {
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });

      actionsDiv.appendChild(copyBtn);
      contentWrapper.appendChild(actionsDiv);

      // Add follow-up suggestions
      if (originalQuestion) {
        var followUps = getFollowUps(originalQuestion);
        var followUpDiv = document.createElement('div');
        followUpDiv.className = 'follow-ups';

        followUps.forEach(function (q) {
          var btn = document.createElement('button');
          btn.className = 'follow-up-btn';
          btn.textContent = q;
          btn.addEventListener('click', function () {
            messageInput.value = q;
            handleSend();
          });
          followUpDiv.appendChild(btn);
        });

        contentWrapper.appendChild(followUpDiv);
      }
    }

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentWrapper);
    chatArea.appendChild(msgDiv);

    scrollToBottom();
  }

  // --- Markdown formatter ---
  function formatMarkdown(text) {
    // Escape HTML first
    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Inline code: `text`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Links: [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Bullet lists
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, function (match) {
      return '<ul>' + match + '</ul>';
    });
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Paragraphs
    var paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(function (p) {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<ul>') || p.startsWith('<li>') || p.startsWith('<ol>')) return p;
      p = p.replace(/\n/g, '<br>');
      return '<p>' + p + '</p>';
    }).join('');

    return html;
  }

  // --- Typing indicator ---
  function showTyping() {
    var typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.setAttribute('aria-label', 'Minerva Compass is thinking');

    var avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.style.background = 'linear-gradient(135deg, var(--accent-gold), #e8c060)';
    avatarDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#0d0d1a" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#0d0d1a" opacity="0.5"/></svg>';

    var dotsDiv = document.createElement('div');
    dotsDiv.className = 'typing-dots';
    dotsDiv.innerHTML = '<span></span><span></span><span></span>';

    typingDiv.appendChild(avatarDiv);
    typingDiv.appendChild(dotsDiv);
    chatArea.appendChild(typingDiv);

    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  // --- Loading state ---
  function setLoading(loading) {
    isLoading = loading;
    sendBtn.disabled = loading;
    messageInput.disabled = loading;
    if (!loading) {
      messageInput.focus();
    }
  }

  // --- Scroll chat to bottom ---
  function scrollToBottom() {
    requestAnimationFrame(function () {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  // --- Error toast ---
  function showError(text) {
    var existing = document.querySelector('.error-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = text;
    toast.setAttribute('role', 'alert');
    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(function () { toast.remove(); }, 300);
      }
    }, 4000);
  }

  // --- CSS for fadeOut (inject once) ---
  var style = document.createElement('style');
  style.textContent = '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(10px); } }';
  document.head.appendChild(style);

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
