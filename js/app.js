// ============================================
// Minerva Compass — Application Logic
// Streaming chat, localStorage persistence,
// feedback, export, time-aware starters
// ============================================

(function () {
  'use strict';

  // --- Constants ---
  var STORAGE_KEY = 'minerva-compass-history';
  var HISTORY_KEY = 'minerva-compass-conversations';
  var ACTIVE_ID_KEY = 'minerva-compass-active-id';
  var MAX_STORED_MESSAGES = 50;
  var MAX_CHARS = 2000;
  var MAX_RETRIES = 1;

  // --- DOM Elements ---
  var chatArea = document.getElementById('chat-area');
  var welcomeScreen = document.getElementById('welcome-screen');
  var messageInput = document.getElementById('message-input');
  var sendBtn = document.getElementById('send-btn');
  var clearBtn = document.getElementById('clear-chat-btn');
  var charCount = document.getElementById('char-count');
  var quickQuestionsContainer = document.querySelector('.quick-questions');

  // --- State ---
  var conversationHistory = [];
  var isLoading = false;
  var activeConversationId = null;

  // --- Admission Cycle Deadlines (2025-2026) ---
  var DEADLINES = [
    { name: 'Early Action', date: new Date('2025-11-01'), aid: new Date('2025-11-08'), decision: new Date('2025-12-19') },
    { name: 'Regular Decision I', date: new Date('2026-01-13'), aid: new Date('2026-01-20'), decision: new Date('2026-03-05') },
    { name: 'Regular Decision II', date: new Date('2026-02-24'), aid: new Date('2026-03-03'), decision: new Date('2026-04-10') },
    { name: 'Extended Decision', date: new Date('2026-04-07'), aid: null, decision: new Date('2026-04-24') },
    { name: 'Enrollment Deadline', date: new Date('2026-05-01'), aid: null, decision: null },
  ];

  // --- Suggested follow-ups per topic ---
  var followUpMap = {
    'deadline': ['What happens if I miss a deadline?', 'Which round should I apply in?', 'Is Early Action binding?'],
    'financial': ['What documents do I need for financial aid?', 'Are there merit scholarships?', 'How much does Minerva cost per year?'],
    'application': ['How long does the application take?', 'Do I need test scores?', 'What are the Challenges?'],
    'accomplishment': ['What counts as an accomplishment?', 'How many should I submit?', 'Can you help me think through mine?'],
    'different': ['Where do students live?', 'How does the curriculum work?', 'What cities will I study in?'],
    'challenge': ['How long are the Challenges?', 'Can I prepare for them?', 'What skills do they test?'],
    'curriculum': ['What are the four core habits?', 'How does Active Learning work?', 'What majors are available?'],
    'student': ['What is the rotation schedule?', 'How diverse is the student body?', 'What support services exist?'],
    'career': ['What are the employment outcomes?', 'What companies hire Minerva grads?', 'Is there career coaching?'],
    'transfer': ['Can I transfer credits?', 'Do transfers start as first-years?', 'What percentage are transfers?'],
    'major': ['Can I double major?', 'What concentrations are available?', 'Which major is most popular?'],
    'cost': ['What is the total cost of attendance?', 'What additional costs should I plan for?', 'Do fees increase each year?'],
  };

  // --- Initialize ---
  function init() {
    sendBtn.addEventListener('click', handleSend);
    messageInput.addEventListener('keydown', handleKeydown);
    messageInput.addEventListener('input', handleInput);
    clearBtn.addEventListener('click', handleClear);

    // Add history toggle button to header
    addHistoryButton();

    // Migrate old single-conversation data if needed
    migrateOldData();

    // Set up time-aware quick questions
    setupTimeAwareStarters();

    // Restore conversation from localStorage
    restoreConversation();

    messageInput.focus();
  }

  // --- Add history button to header ---
  function addHistoryButton() {
    var headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    var historyBtn = document.createElement('button');
    historyBtn.id = 'history-btn';
    historyBtn.className = 'icon-btn';
    historyBtn.type = 'button';
    historyBtn.setAttribute('aria-label', 'Chat history');
    historyBtn.title = 'Chat history';
    historyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    historyBtn.addEventListener('click', toggleHistoryPanel);

    // Insert before the export button
    headerActions.insertBefore(historyBtn, headerActions.firstChild);
  }

  // --- Time-aware quick question starters ---
  function setupTimeAwareStarters() {
    if (!quickQuestionsContainer) return;

    var now = new Date();
    var questions = getTimeAwareQuestions(now);

    // Clear existing quick questions
    quickQuestionsContainer.innerHTML = '';

    var icons = ['📋', '⏰', '💰', '🏆', '✨', '🧩'];
    questions.forEach(function (q, i) {
      var btn = document.createElement('button');
      btn.className = 'quick-q glass-subtle';
      btn.type = 'button';
      btn.innerHTML = '<span class="quick-q-icon">' + icons[i % icons.length] + '</span><span class="quick-q-text">' + q + '</span>';
      btn.addEventListener('click', function () {
        messageInput.value = q;
        handleSend();
      });
      quickQuestionsContainer.appendChild(btn);
    });
  }

  function getTimeAwareQuestions(now) {
    // Find the next upcoming deadline
    var nextDeadline = null;
    var daysUntil = Infinity;
    for (var i = 0; i < DEADLINES.length; i++) {
      var diff = Math.ceil((DEADLINES[i].date - now) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff < daysUntil) {
        daysUntil = diff;
        nextDeadline = DEADLINES[i];
      }
    }

    // Check if we're waiting for a decision
    var awaitingDecision = null;
    for (var j = 0; j < DEADLINES.length; j++) {
      var d = DEADLINES[j];
      if (d.decision && d.date < now && d.decision > now) {
        awaitingDecision = d;
        break;
      }
    }

    // Generate context-aware questions
    if (nextDeadline && daysUntil <= 7) {
      // Urgent: deadline within a week
      return [
        nextDeadline.name + ' deadline is in ' + daysUntil + ' day' + (daysUntil === 1 ? '' : 's') + ', what do I need?',
        'How does the application work?',
        'Tips for accomplishments?',
        'How does financial aid work?',
        nextDeadline.aid ? 'When is the financial aid deadline?' : 'What makes Minerva different?',
        'What are the Challenges like?',
      ];
    } else if (awaitingDecision) {
      // Waiting for results
      var decisionDays = Math.ceil((awaitingDecision.decision - now) / (1000 * 60 * 60 * 24));
      return [
        awaitingDecision.name + ' results come ' + (decisionDays <= 0 ? 'soon' : 'in ~' + decisionDays + ' days') + ', what to expect?',
        'What happens after I\'m admitted?',
        'How does enrollment work?',
        'Can I defer my enrollment?',
        'Tell me about student life',
        'What are the career outcomes?',
      ];
    } else if (nextDeadline && daysUntil <= 60) {
      // Upcoming deadline (1-2 months away)
      return [
        'How does the application work?',
        nextDeadline.name + ' is coming up, what are the deadlines?',
        'Tips for accomplishments?',
        'How does financial aid work?',
        'What makes Minerva different?',
        'What are the Challenges like?',
      ];
    } else {
      // Off-cycle or far from deadlines
      return [
        'How does the application work?',
        'What are the deadlines for next year?',
        'How does financial aid work?',
        'Tips for accomplishments?',
        'What makes Minerva different?',
        'Tell me about student life',
      ];
    }
  }

  // --- localStorage Persistence ---
  function saveConversation() {
    try {
      var toSave = conversationHistory.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      // Quota exceeded or unavailable — ignore
    }
    // Also persist to multi-conversation history
    saveCurrentToHistory();
  }

  function restoreConversation() {
    try {
      // Try loading from the multi-conversation history system
      var storedId = localStorage.getItem(ACTIVE_ID_KEY);
      if (storedId) {
        var conversations = getConversations();
        for (var i = 0; i < conversations.length; i++) {
          if (conversations[i].id === storedId) {
            conversationHistory = conversations[i].messages || [];
            activeConversationId = storedId;

            if (conversationHistory.length === 0) return;

            // Hide welcome screen
            if (welcomeScreen) {
              welcomeScreen.style.display = 'none';
            }

            // Render saved messages without animation
            conversationHistory.forEach(function (msg) {
              appendMessage(msg.role, msg.content, null, true);
            });

            // Keep legacy key in sync
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory.slice(-MAX_STORED_MESSAGES)));

            showToast('Conversation restored');
            return;
          }
        }
      }

      // Fallback: load from legacy single-conversation key
      var saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      var parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      conversationHistory = parsed;

      // Assign an active ID so future saves go to history
      activeConversationId = generateId();
      localStorage.setItem(ACTIVE_ID_KEY, activeConversationId);
      saveCurrentToHistory();

      // Hide welcome screen
      if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
      }

      // Render saved messages without animation
      parsed.forEach(function (msg) {
        appendMessage(msg.role, msg.content, null, true);
      });

      showToast('Conversation restored');
    } catch (e) {
      // Corrupted data — clear it
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearStoredConversation() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_ID_KEY);
    } catch (e) { /* ignore */ }
  }

  // --- Multi-conversation History System ---

  function generateId() {
    return Date.now().toString(36);
  }

  function getConversations() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      // Sort by updatedAt descending
      list.sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
      return list;
    } catch (e) {
      return [];
    }
  }

  function saveConversations(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  function saveCurrentToHistory() {
    if (conversationHistory.length === 0) return;

    if (!activeConversationId) {
      activeConversationId = generateId();
      localStorage.setItem(ACTIVE_ID_KEY, activeConversationId);
    }

    var conversations = getConversations();

    // Auto-generate title from first user message
    var title = 'New conversation';
    for (var i = 0; i < conversationHistory.length; i++) {
      if (conversationHistory[i].role === 'user') {
        title = conversationHistory[i].content;
        if (title.length > 40) {
          title = title.substring(0, 40) + '...';
        }
        break;
      }
    }

    // Find existing or create new entry
    var found = false;
    for (var j = 0; j < conversations.length; j++) {
      if (conversations[j].id === activeConversationId) {
        conversations[j].messages = conversationHistory.slice(-MAX_STORED_MESSAGES);
        conversations[j].title = title;
        conversations[j].updatedAt = new Date().toISOString();
        found = true;
        break;
      }
    }

    if (!found) {
      conversations.push({
        id: activeConversationId,
        title: title,
        messages: conversationHistory.slice(-MAX_STORED_MESSAGES),
        updatedAt: new Date().toISOString()
      });
    }

    saveConversations(conversations);
  }

  function loadConversation(id) {
    var conversations = getConversations();
    for (var i = 0; i < conversations.length; i++) {
      if (conversations[i].id === id) {
        // Save current conversation before switching (if it has messages)
        if (conversationHistory.length > 0 && activeConversationId) {
          saveCurrentToHistory();
        }

        conversationHistory = conversations[i].messages || [];
        activeConversationId = id;
        localStorage.setItem(ACTIVE_ID_KEY, id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory.slice(-MAX_STORED_MESSAGES)));

        // Clear chat area
        var messages = chatArea.querySelectorAll('.message, .typing-indicator');
        messages.forEach(function (msg) { msg.remove(); });

        // Hide welcome screen and render messages
        if (conversationHistory.length > 0) {
          if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
          }
          conversationHistory.forEach(function (msg) {
            appendMessage(msg.role, msg.content, null, true);
          });
        } else {
          if (welcomeScreen) {
            welcomeScreen.style.display = '';
          }
          setupTimeAwareStarters();
        }

        showToast('Conversation loaded');
        return;
      }
    }
  }

  function deleteConversation(id) {
    var conversations = getConversations();
    conversations = conversations.filter(function (c) { return c.id !== id; });
    saveConversations(conversations);

    // If we deleted the active conversation, start fresh
    if (activeConversationId === id) {
      startNewConversation();
    }
  }

  function startNewConversation() {
    // Save current conversation before starting new one
    if (conversationHistory.length > 0 && activeConversationId) {
      saveCurrentToHistory();
    }

    conversationHistory = [];
    activeConversationId = generateId();
    localStorage.setItem(ACTIVE_ID_KEY, activeConversationId);
    localStorage.removeItem(STORAGE_KEY);

    // Clear chat area
    var messages = chatArea.querySelectorAll('.message, .typing-indicator');
    messages.forEach(function (msg) {
      msg.style.animation = 'fadeOut 0.2s ease forwards';
      setTimeout(function () { msg.remove(); }, 200);
    });

    setTimeout(function () {
      if (welcomeScreen) {
        welcomeScreen.style.display = '';
        welcomeScreen.style.animation = 'fadeIn 0.4s ease';
      }
      setupTimeAwareStarters();
    }, 250);
  }

  // --- Migrate old single-conversation data to new multi-conversation format ---
  function migrateOldData() {
    try {
      // Only migrate if there's old data and no new history yet
      var hasNewHistory = localStorage.getItem(HISTORY_KEY);
      if (hasNewHistory) return;

      var oldData = localStorage.getItem(STORAGE_KEY);
      if (!oldData) return;

      var parsed = JSON.parse(oldData);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      // Create a conversation entry from the old data
      var id = generateId();
      var title = 'New conversation';
      for (var i = 0; i < parsed.length; i++) {
        if (parsed[i].role === 'user') {
          title = parsed[i].content;
          if (title.length > 40) {
            title = title.substring(0, 40) + '...';
          }
          break;
        }
      }

      var conversations = [{
        id: id,
        title: title,
        messages: parsed,
        updatedAt: new Date().toISOString()
      }];

      saveConversations(conversations);
      localStorage.setItem(ACTIVE_ID_KEY, id);
    } catch (e) {
      // Migration failed — not critical
    }
  }

  // --- History Panel (inline under header) ---
  function toggleHistoryPanel() {
    var panel = document.querySelector('.history-dropdown');
    if (panel) {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        renderHistoryList();
      }
      return;
    }

    // Create dropdown panel under header
    var appHeader = document.querySelector('.app-header');
    if (!appHeader) return;

    panel = document.createElement('div');
    panel.className = 'history-dropdown open';

    // List container
    var listContainer = document.createElement('div');
    listContainer.className = 'history-list';

    panel.appendChild(listContainer);
    appHeader.parentNode.insertBefore(panel, appHeader.nextSibling);

    renderHistoryList();

    // Close when clicking outside
    document.addEventListener('click', function closeOutside(e) {
      if (!panel.contains(e.target) && !e.target.closest('#history-btn')) {
        panel.classList.remove('open');
      }
    });
  }

  function renderHistoryList() {
    var listContainer = document.querySelector('.history-list');
    if (!listContainer) return;

    var conversations = getConversations();
    listContainer.innerHTML = '';

    if (conversations.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No past conversations yet';
      listContainer.appendChild(empty);
      return;
    }

    conversations.forEach(function (conv) {
      var item = document.createElement('div');
      item.className = 'history-item';
      if (conv.id === activeConversationId) {
        item.classList.add('active');
      }

      var info = document.createElement('div');
      info.className = 'history-item-info';
      info.addEventListener('click', function () {
        loadConversation(conv.id);
        var panel = document.querySelector('.history-dropdown');
        if (panel) panel.classList.remove('open');
      });

      var title = document.createElement('div');
      title.className = 'history-item-title';
      title.textContent = conv.title || 'Untitled';

      var date = document.createElement('div');
      date.className = 'history-item-date';
      date.textContent = formatHistoryDate(conv.updatedAt);

      info.appendChild(title);
      info.appendChild(date);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'history-delete-btn';
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
      deleteBtn.title = 'Delete conversation';
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteConversation(conv.id);
        renderHistoryList();
      });

      item.appendChild(info);
      item.appendChild(deleteBtn);
      listContainer.appendChild(item);
    });
  }

  function formatHistoryDate(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      var now = new Date();
      var diffMs = now - d;
      var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return diffDays + ' days ago';
      } else {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return '';
    }
  }

  // --- Handle input changes (auto-resize + char count) ---
  function handleInput() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

    var len = messageInput.value.length;
    if (len > 0) {
      charCount.textContent = len + ' / ' + MAX_CHARS;
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
    startNewConversation();
  }

  // --- Send message ---
  function handleSend() {
    var text = messageInput.value.trim();
    if (!text || isLoading || text.length > MAX_CHARS) return;

    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
      welcomeScreen.style.display = 'none';
    }

    // Ensure we have an active conversation ID
    if (!activeConversationId) {
      activeConversationId = generateId();
      localStorage.setItem(ACTIVE_ID_KEY, activeConversationId);
    }

    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    saveConversation();

    messageInput.value = '';
    messageInput.style.height = 'auto';
    charCount.textContent = '';

    setLoading(true);

    // Create streaming message placeholder
    var streamMsg = createStreamingMessage();
    scrollToBottom();

    callAPIStreaming(conversationHistory, streamMsg, text);
  }

  // --- Create streaming message placeholder ---
  function createStreamingMessage() {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'message assistant streaming';
    msgDiv.setAttribute('role', 'article');

    var avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.setAttribute('aria-hidden', 'true');
    avatarDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.5"/></svg>';

    var contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1;';

    var contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span class="streaming-cursor"></span>';

    contentWrapper.appendChild(contentDiv);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentWrapper);
    chatArea.appendChild(msgDiv);

    return { msgDiv: msgDiv, contentDiv: contentDiv, contentWrapper: contentWrapper };
  }

  // --- Streaming API call ---
  function callAPIStreaming(messages, streamMsg, originalQuestion, retryCount) {
    retryCount = retryCount || 0;

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages }),
    })
    .then(function (response) {
      if (!response.ok) {
        return response.json().then(function (data) {
          throw new Error(data.error || 'API returned ' + response.status);
        });
      }

      var contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        // Non-streaming fallback
        return response.json().then(function (data) {
          var reply = data.reply || data.error || 'No response received.';
          var parsedReply = parseFollowUps(reply);
          finalizeStreamMessage(streamMsg, reply, originalQuestion);
          conversationHistory.push({ role: 'assistant', content: parsedReply.cleanText });
          saveConversation();
          setLoading(false);
          messageInput.focus();
        });
      }

      // Read SSE stream
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var fullText = '';

      function readChunk() {
        reader.read().then(function (result) {
          if (result.done) {
            var parsedResult = parseFollowUps(fullText);
            finalizeStreamMessage(streamMsg, fullText, originalQuestion);
            conversationHistory.push({ role: 'assistant', content: parsedResult.cleanText });
            saveConversation();
            setLoading(false);
            messageInput.focus();
            return;
          }

          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line === 'data: [DONE]') {
              var parsedDone = parseFollowUps(fullText);
              finalizeStreamMessage(streamMsg, fullText, originalQuestion);
              conversationHistory.push({ role: 'assistant', content: parsedDone.cleanText });
              saveConversation();
              setLoading(false);
              messageInput.focus();
              return;
            }
            if (line.startsWith('data: ')) {
              try {
                var data = JSON.parse(line.slice(6));
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.text) {
                  fullText += data.text;
                  updateStreamContent(streamMsg.contentDiv, fullText);
                  scrollToBottom();
                }
              } catch (e) {
                if (e.message && e.message !== 'Unexpected end of JSON input') {
                  // Real error from server
                }
              }
            }
          }

          readChunk();
        }).catch(function (err) {
          handleStreamError(err, streamMsg, messages, originalQuestion, retryCount);
        });
      }

      readChunk();
    })
    .catch(function (err) {
      handleStreamError(err, streamMsg, messages, originalQuestion, retryCount);
    });
  }

  // --- Error handling with retry ---
  function handleStreamError(err, streamMsg, messages, originalQuestion, retryCount) {
    console.error('API Error:', err);

    if (retryCount < MAX_RETRIES) {
      // Auto-retry once
      updateStreamContent(streamMsg.contentDiv, '⏳ Reconnecting...');
      setTimeout(function () {
        callAPIStreaming(messages, streamMsg, originalQuestion, retryCount + 1);
      }, 1000);
      return;
    }

    // Final failure — show helpful fallback
    var fallbackMsg = "I'm having trouble connecting right now. In the meantime, you can:\n\n" +
      '- Visit [Minerva Admissions](https://minerva.edu/undergraduate/admissions) for application info\n' +
      '- Visit [Financial Aid](https://minerva.edu/undergraduate/financial-aid) for aid details\n' +
      '- Email [admissions@minerva.edu](mailto:admissions@minerva.edu) for direct help\n\n' +
      'Please try again in a moment.';

    finalizeStreamMessage(streamMsg, fallbackMsg, originalQuestion);
    showToast('Connection issue — please try again');
    setLoading(false);
    messageInput.focus();
  }

  // --- Update streaming content ---
  function updateStreamContent(contentDiv, text) {
    var displayText = text;
    var markerIdx = text.indexOf('|||FOLLOWUPS|||');
    if (markerIdx !== -1) displayText = text.substring(0, markerIdx);
    contentDiv.innerHTML = formatMarkdown(displayText) + '<span class="streaming-cursor"></span>';
  }

  // --- Finalize stream message (add actions, follow-ups, feedback) ---
  function finalizeStreamMessage(streamMsg, text, originalQuestion) {
    var contentDiv = streamMsg.contentDiv;
    var contentWrapper = streamMsg.contentWrapper;
    var msgDiv = streamMsg.msgDiv;

    // Parse dynamic follow-ups from AI response
    var parsed = parseFollowUps(text);
    var cleanText = parsed.cleanText;
    var dynamicFollowUps = parsed.followUps;

    // Remove streaming class and cursor
    msgDiv.classList.remove('streaming');
    contentDiv.innerHTML = formatMarkdown(cleanText);

    // Message actions row (copy + feedback)
    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';

    // Copy button
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

    // Feedback buttons
    var feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-group';

    var thumbsUp = document.createElement('button');
    thumbsUp.className = 'feedback-btn';
    thumbsUp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';
    thumbsUp.title = 'Helpful';

    var thumbsDown = document.createElement('button');
    thumbsDown.className = 'feedback-btn';
    thumbsDown.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>';
    thumbsDown.title = 'Not helpful';

    var msgIndex = conversationHistory.length; // Will be the index after push

    thumbsUp.addEventListener('click', function () {
      thumbsUp.classList.add('active', 'positive');
      thumbsDown.classList.remove('active', 'negative');
      saveFeedback(msgIndex, 'positive', originalQuestion, cleanText);
    });

    thumbsDown.addEventListener('click', function () {
      thumbsDown.classList.add('active', 'negative');
      thumbsUp.classList.remove('active', 'positive');
      saveFeedback(msgIndex, 'negative', originalQuestion, cleanText);
    });

    feedbackDiv.appendChild(thumbsUp);
    feedbackDiv.appendChild(thumbsDown);
    actionsDiv.appendChild(feedbackDiv);

    contentWrapper.appendChild(actionsDiv);

    // Follow-up suggestions — use AI-generated ones, fall back to keyword-based
    var followUps = dynamicFollowUps.length > 0 ? dynamicFollowUps : getFollowUps(originalQuestion || '');
    if (followUps.length > 0) {
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

  // --- Save feedback to localStorage + send to server for analytics ---
  function saveFeedback(messageIndex, type, question, answer) {
    var timestamp = new Date().toISOString();

    // Save locally
    try {
      var feedbackKey = 'minerva-compass-feedback';
      var feedback = JSON.parse(localStorage.getItem(feedbackKey) || '[]');
      feedback.push({ index: messageIndex, type: type, timestamp: timestamp });
      if (feedback.length > 200) feedback = feedback.slice(-200);
      localStorage.setItem(feedbackKey, JSON.stringify(feedback));
    } catch (e) { /* ignore */ }

    // Send to server (fire-and-forget — appears in Vercel Runtime Logs)
    try {
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          question: question || null,
          answer: answer || null,
          timestamp: timestamp,
        }),
      }).catch(function () { /* ignore network errors */ });
    } catch (e) { /* ignore */ }
  }

  // --- Parse dynamic follow-ups from AI response ---
  function parseFollowUps(text) {
    var marker = '|||FOLLOWUPS|||';
    var idx = text.indexOf(marker);
    if (idx === -1) return { cleanText: text, followUps: [] };

    var cleanText = text.substring(0, idx).trim();
    var followUpStr = text.substring(idx + marker.length);
    var parts = followUpStr.split('|||').map(function (s) { return s.trim(); }).filter(Boolean);

    // Only return valid short questions (under 80 chars)
    var followUps = parts.filter(function (q) { return q.length > 5 && q.length < 80; }).slice(0, 3);

    return { cleanText: cleanText, followUps: followUps };
  }

  // --- Fallback follow-ups if AI didn't generate them ---
  function getFollowUps(question) {
    var q = question.toLowerCase();
    for (var key in followUpMap) {
      if (q.includes(key)) {
        return followUpMap[key];
      }
    }
    return ['Tell me about student life', 'How do I apply?', 'What makes Minerva unique?'];
  }

  // --- Append a message to the chat (used for user messages and restored messages) ---
  function appendMessage(role, text, originalQuestion, skipAnimation) {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'message ' + role;
    if (skipAnimation) msgDiv.style.animation = 'none';
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
    contentWrapper.style.cssText = 'display:flex;flex-direction:column;min-width:0;flex:1;';

    var contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'assistant') {
      contentDiv.innerHTML = formatMarkdown(text);
    } else {
      contentDiv.textContent = text;
    }

    contentWrapper.appendChild(contentDiv);

    // For restored assistant messages, add copy button and feedback
    if (role === 'assistant' && skipAnimation) {
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
    }

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentWrapper);
    chatArea.appendChild(msgDiv);

    if (!skipAnimation) scrollToBottom();
  }

  // --- Markdown formatter ---
  function formatMarkdown(text) {
    var html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Source citation line (special styling)
    html = html.replace(/^(📖\s*Source:?\s*)(.+)$/gm, function (match, prefix, rest) {
      var formatted = rest.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return '<div class="source-citation">' + prefix + formatted + '</div>';
    });

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Email links (auto-detect)
    html = html.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, function (match) {
      if (html.indexOf('href="mailto:' + match) !== -1) return match;
      return '<a href="mailto:' + match + '">' + match + '</a>';
    });

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
      if (/^<(ul|li|ol|h[1-6]|div)/.test(p)) return p;
      p = p.replace(/\n/g, '<br>');
      return '<p>' + p + '</p>';
    }).join('');

    return html;
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

  // --- Toast notification ---
  function showToast(text) {
    var existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = text;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(function () { toast.remove(); }, 300);
      }
    }, 3000);
  }

  // --- CSS for animations (inject once) ---
  var style = document.createElement('style');
  style.textContent = '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(10px); } }';
  document.head.appendChild(style);

  // --- Register Service Worker ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      // Service worker registration failed — not critical
    });
  }

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
