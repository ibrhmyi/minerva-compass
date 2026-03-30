// ============================================
// Minerva Compass — Admin Dashboard Logic
// ============================================

(function () {
  'use strict';

  var TOKEN_KEY = 'minerva-compass-admin-token';
  var token = sessionStorage.getItem(TOKEN_KEY) || '';

  var authScreen = document.getElementById('auth-screen');
  var dashboard = document.getElementById('dashboard');
  var tokenInput = document.getElementById('token-input');
  var authBtn = document.getElementById('auth-btn');
  var authError = document.getElementById('auth-error');
  var refreshBtn = document.getElementById('refresh-btn');

  var analyticsData = null;
  var emailsData = null;
  var sessionsData = null;
  var currentSessionFilter = 'all';

  // --- Auth ---
  function authenticate() {
    token = tokenInput.value.trim();
    if (!token) {
      authError.textContent = 'Please enter a token.';
      return;
    }
    authError.textContent = 'Verifying...';
    authError.classList.remove('error');
    fetchAnalytics().then(function (ok) {
      if (ok) {
        sessionStorage.setItem(TOKEN_KEY, token);
        authScreen.style.display = 'none';
        dashboard.style.display = 'block';
        loadAll();
      } else {
        authError.textContent = 'Invalid password. Please try again.';
        authError.classList.add('error');
      }
    });
  }

  authBtn.addEventListener('click', authenticate);
  tokenInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') authenticate();
  });

  // Auto-login if token stored
  if (token) {
    fetchAnalytics().then(function (ok) {
      if (ok) {
        authScreen.style.display = 'none';
        dashboard.style.display = 'block';
        loadAll();
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        token = '';
      }
    });
  }

  // --- Tabs ---
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // --- Refresh ---
  refreshBtn.addEventListener('click', function () {
    loadAll();
  });

  // --- API Calls ---
  function fetchAnalytics() {
    return fetch('/api/analytics', {
      headers: { Authorization: 'Bearer ' + token },
    })
    .then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (data) {
        analyticsData = data;
        return true;
      });
    })
    .catch(function () { return false; });
  }

  function fetchSessions(filter) {
    var url = '/api/sessions' + (filter === 'flagged' ? '?filter=flagged' : '');
    return fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
    })
    .then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (data) {
        sessionsData = data;
        return true;
      });
    })
    .catch(function () { return false; });
  }

  function fetchSessionDetail(id) {
    return fetch('/api/sessions?id=' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + token },
    })
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .catch(function () { return null; });
  }

  function fetchEmails() {
    return fetch('/api/emails', {
      headers: { Authorization: 'Bearer ' + token },
    })
    .then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (data) {
        emailsData = data;
        return true;
      });
    })
    .catch(function () { return false; });
  }

  // --- Load All Data ---
  function loadAll() {
    Promise.all([fetchAnalytics(), fetchEmails(), fetchSessions(currentSessionFilter)]).then(function () {
      renderOverview();
      renderFeedback();
      renderEmails();
      renderSessions();
    });
  }

  // --- Render Overview ---
  function renderOverview() {
    if (!analyticsData) return;

    document.getElementById('stat-total').textContent = analyticsData.total.toLocaleString();

    // Today's count
    var today = new Date().toISOString().slice(0, 10);
    var todayData = analyticsData.daily.find(function (d) { return d.date === today; });
    document.getElementById('stat-today').textContent = todayData ? todayData.count.toLocaleString() : '0';

    document.getElementById('stat-positive').textContent = analyticsData.feedback.positive.toLocaleString();
    document.getElementById('stat-negative').textContent = analyticsData.feedback.negative.toLocaleString();
    document.getElementById('stat-sessions').textContent = (analyticsData.sessions || 0).toLocaleString();
    document.getElementById('stat-emails').textContent = (analyticsData.emailCount || 0).toLocaleString();
    document.getElementById('stat-flagged').textContent = (analyticsData.flagged || 0).toLocaleString();

    // Daily bar chart
    renderBarChart(analyticsData.daily);

    // Topic chart
    renderTopicChart(analyticsData.topics);

    // Stage chart
    renderStageChart(analyticsData.stages || []);
  }

  function renderBarChart(daily) {
    var container = document.getElementById('daily-chart');
    container.innerHTML = '';

    var maxCount = Math.max.apply(null, daily.map(function (d) { return d.count; }));
    if (maxCount === 0) maxCount = 1;

    daily.forEach(function (d) {
      var col = document.createElement('div');
      col.className = 'bar-col';

      var value = document.createElement('div');
      value.className = 'bar-value';
      value.textContent = d.count || '';

      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = Math.max((d.count / maxCount) * 100, 2) + '%';
      bar.title = d.date + ': ' + d.count + ' questions';

      var label = document.createElement('div');
      label.className = 'bar-label';
      // Show short weekday (Mon, Tue...) for readability
      var dateObj = new Date(d.date + 'T12:00:00');
      label.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });

      col.appendChild(value);
      col.appendChild(bar);
      col.appendChild(label);
      container.appendChild(col);
    });
  }

  function renderTopicChart(topics) {
    var container = document.getElementById('topic-chart');
    container.innerHTML = '';

    if (!topics || topics.length === 0) {
      container.innerHTML = '<div class="empty-state">No topic data yet</div>';
      return;
    }

    var maxCount = topics[0].count || 1;

    topics.slice(0, 8).forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'topic-row';

      var name = document.createElement('span');
      name.className = 'topic-name';
      name.textContent = t.topic.replace(/-/g, ' ');

      var barWrap = document.createElement('div');
      barWrap.className = 'topic-bar-wrap';

      var fill = document.createElement('div');
      fill.className = 'topic-bar-fill';
      fill.style.width = Math.max((t.count / maxCount) * 100, 3) + '%';

      barWrap.appendChild(fill);

      var count = document.createElement('span');
      count.className = 'topic-count';
      count.textContent = t.count;

      row.appendChild(name);
      row.appendChild(barWrap);
      row.appendChild(count);
      container.appendChild(row);
    });
  }

  var STAGE_LABELS = {
    'exploring': 'Exploring Minerva',
    'applying': 'Applying Soon',
    'admitted': 'Already Admitted',
    'parent': 'Parent / Guardian',
  };

  function renderStageChart(stages) {
    var container = document.getElementById('stage-chart');
    container.innerHTML = '';

    if (!stages || stages.length === 0) {
      container.innerHTML = '<div style="font-size:0.75rem;color:var(--text-tertiary);">No journey data yet</div>';
      return;
    }

    // Show all 4 stages, even if 0
    var stageOrder = ['exploring', 'applying', 'admitted', 'parent'];
    var stageMap = {};
    stages.forEach(function (s) { stageMap[s.stage] = s.count; });
    var maxCount = Math.max.apply(null, stageOrder.map(function (k) { return stageMap[k] || 0; })) || 1;

    stageOrder.forEach(function (key) {
      var count = stageMap[key] || 0;
      var item = document.createElement('div');
      item.className = 'stage-item';

      var num = document.createElement('div');
      num.className = 'stage-item-count';
      num.textContent = count;

      var label = document.createElement('div');
      label.className = 'stage-item-label';
      label.textContent = STAGE_LABELS[key] || key;

      item.appendChild(num);
      item.appendChild(label);
      container.appendChild(item);
    });
  }

  // --- Render Feedback ---
  function renderFeedback() {
    var container = document.getElementById('feedback-list');
    container.innerHTML = '';

    if (!analyticsData || !analyticsData.feedback.items || analyticsData.feedback.items.length === 0) {
      container.innerHTML = '<div class="empty-state">No feedback entries yet</div>';
      return;
    }

    analyticsData.feedback.items.forEach(function (item) {
      var entry = document.createElement('div');
      entry.className = 'feedback-entry';

      var header = document.createElement('div');
      header.className = 'feedback-entry-header';

      var badge = document.createElement('span');
      badge.className = 'feedback-badge ' + (item.feedback || 'negative');
      badge.textContent = item.feedback === 'positive' ? 'Helpful' : 'Not helpful';

      var right = document.createElement('div');
      right.className = 'feedback-header-right';

      var time = document.createElement('span');
      time.className = 'feedback-time';
      time.textContent = item.timestamp ? formatDate(item.timestamp) : '';

      var chevron = document.createElement('span');
      chevron.className = 'feedback-chevron';
      chevron.innerHTML = '&#9662;';

      right.appendChild(time);
      right.appendChild(chevron);
      header.appendChild(badge);
      header.appendChild(right);

      var question = document.createElement('div');
      question.className = 'feedback-question';
      question.textContent = item.question || 'No question recorded';

      var detail = document.createElement('div');
      detail.className = 'feedback-detail';

      if (item.question) {
        var qFull = document.createElement('div');
        qFull.className = 'feedback-detail-label';
        qFull.textContent = 'Question';
        var qText = document.createElement('div');
        qText.className = 'feedback-detail-text';
        qText.textContent = item.question;
        detail.appendChild(qFull);
        detail.appendChild(qText);
      }

      if (item.answerPreview) {
        var aFull = document.createElement('div');
        aFull.className = 'feedback-detail-label';
        aFull.textContent = 'Answer';
        var aText = document.createElement('div');
        aText.className = 'feedback-detail-text';
        aText.textContent = item.answerPreview;
        detail.appendChild(aFull);
        detail.appendChild(aText);
      }

      entry.appendChild(header);
      entry.appendChild(question);
      entry.appendChild(detail);

      entry.addEventListener('click', function () {
        entry.classList.toggle('expanded');
      });

      container.appendChild(entry);
    });
  }

  // --- Render Emails ---
  function renderEmails() {
    var list = document.getElementById('emails-list');
    list.innerHTML = '';

    var emails = emailsData && emailsData.emails ? emailsData.emails : [];
    document.getElementById('email-count').textContent = emails.length + ' captured email' + (emails.length !== 1 ? 's' : '');

    if (emails.length === 0) {
      list.innerHTML = '<div class="empty-state">No emails captured yet</div>';
      return;
    }

    emails.forEach(function (item) {
      var entry = document.createElement('div');
      entry.className = 'email-entry';

      var left = document.createElement('div');
      var addr = document.createElement('div');
      addr.className = 'email-address';
      addr.textContent = item.email;
      left.appendChild(addr);

      if (item.context) {
        var ctx = document.createElement('div');
        ctx.className = 'email-context';
        ctx.textContent = item.context;
        left.appendChild(ctx);
      }

      var time = document.createElement('div');
      time.className = 'email-time';
      time.textContent = item.timestamp ? formatDate(item.timestamp) : '';

      entry.appendChild(left);
      entry.appendChild(time);
      list.appendChild(entry);
    });
  }

  // --- Render Sessions ---
  function renderSessions() {
    var list = document.getElementById('sessions-list');
    var detail = document.getElementById('session-detail');
    list.innerHTML = '';
    detail.style.display = 'none';
    list.style.display = '';

    if (!sessionsData) {
      list.innerHTML = '<div class="empty-state">No session data yet</div>';
      return;
    }

    // Stats
    var stats = sessionsData.stats || {};
    document.getElementById('sessions-total').textContent = (stats.total || 0) + ' session' + ((stats.total || 0) !== 1 ? 's' : '');
    document.getElementById('sessions-flagged').textContent = (stats.flagged || 0) + ' flagged';

    var sessions = sessionsData.sessions || [];
    if (sessions.length === 0) {
      list.innerHTML = '<div class="empty-state">No sessions recorded yet</div>';
      return;
    }

    sessions.forEach(function (s) {
      var entry = document.createElement('div');
      entry.className = 'session-entry' + (s.flagged ? ' flagged' : '');
      entry.addEventListener('click', function () { showSessionDetail(s.id); });

      var left = document.createElement('div');
      left.className = 'session-entry-left';

      var title = document.createElement('div');
      title.className = 'session-entry-title';
      title.textContent = s.title || 'Untitled session';
      left.appendChild(title);

      if (s.stage) {
        var stageBadge = document.createElement('span');
        stageBadge.className = 'session-stage-badge';
        stageBadge.textContent = STAGE_LABELS[s.stage] || s.stage;
        left.appendChild(stageBadge);
      }

      var meta = document.createElement('div');
      meta.className = 'session-entry-meta';
      var parts = [];
      parts.push(s.messageCount + ' message' + (s.messageCount !== 1 ? 's' : ''));
      if (s.flagged) parts.push('flagged: ' + (s.flagReason || 'unknown'));
      meta.textContent = parts.join(' \u00B7 ');
      left.appendChild(meta);

      var time = document.createElement('div');
      time.className = 'session-entry-time';
      time.textContent = s.updatedAt ? formatDate(s.updatedAt) : '';

      entry.appendChild(left);
      entry.appendChild(time);
      list.appendChild(entry);
    });
  }

  function showSessionDetail(id) {
    var list = document.getElementById('sessions-list');
    var detail = document.getElementById('session-detail');
    var sessionsHeader = document.querySelector('.sessions-header');

    list.style.display = 'none';
    if (sessionsHeader) sessionsHeader.style.display = 'none';
    detail.style.display = 'block';

    var messagesContainer = document.getElementById('session-detail-messages');
    messagesContainer.innerHTML = '<div class="empty-state">Loading...</div>';

    fetchSessionDetail(id).then(function (data) {
      if (!data || !data.session) {
        messagesContainer.innerHTML = '<div class="empty-state">Session not found</div>';
        return;
      }

      var session = data.session;
      document.getElementById('session-detail-title').textContent = session.title || 'Session';

      messagesContainer.innerHTML = '';

      // Render messages — highlight flagged ones in red
      (session.messages || []).forEach(function (msg) {
        var msgDiv = document.createElement('div');
        var isFlagged = !!msg.flagged;
        msgDiv.className = 'session-msg ' + msg.role + (isFlagged ? ' flagged-msg' : '');

        var label = document.createElement('div');
        label.className = 'session-msg-role';
        if (isFlagged) {
          label.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11" style="vertical-align:-1px;margin-right:3px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>Flagged';
        } else {
          label.textContent = msg.role === 'user' ? 'User' : 'Compass';
        }

        var content = document.createElement('div');
        content.className = 'session-msg-content';
        content.textContent = msg.content || '';

        msgDiv.appendChild(label);
        msgDiv.appendChild(content);
        messagesContainer.appendChild(msgDiv);
      });
    });
  }

  // Session back button
  document.getElementById('session-back-btn').addEventListener('click', function () {
    document.getElementById('sessions-list').style.display = '';
    document.getElementById('session-detail').style.display = 'none';
    var sessionsHeader = document.querySelector('.sessions-header');
    if (sessionsHeader) sessionsHeader.style.display = '';
  });

  // Session filter buttons
  document.querySelectorAll('.session-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.session-filter').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentSessionFilter = btn.dataset.filter;
      fetchSessions(currentSessionFilter).then(function () { renderSessions(); });
    });
  });

  // --- Export emails as CSV ---
  document.getElementById('export-emails-btn').addEventListener('click', function () {
    var emails = emailsData && emailsData.emails ? emailsData.emails : [];
    if (emails.length === 0) return;

    var csv = 'Email,Context,Timestamp\n';
    emails.forEach(function (e) {
      csv += '"' + (e.email || '') + '","' + (e.context || '').replace(/"/g, '""') + '","' + (e.timestamp || '') + '"\n';
    });

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'minerva-compass-emails.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Helpers ---
  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return iso; }
  }
})();
