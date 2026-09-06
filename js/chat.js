/**
 * chat.js
 * Chat interface logic — منطق واجهة الشات
 */

class ChatManager {
  constructor({ onSend, onVoice }) {
    this.onSend    = onSend;
    this.onVoice   = onVoice;
    this.isWaiting = false;
    this.recognition = null;
    this.isRecording = false;

    this.messagesEl  = document.getElementById('chat-messages');
    this.textareaEl  = document.getElementById('chat-input');
    this.sendBtn     = document.getElementById('send-btn');
    this.micBtn      = document.getElementById('mic-btn');
    this.welcomeEl   = document.getElementById('chat-welcome');

    this._bindEvents();
    this._initSpeechRecognition();
  }

  _bindEvents() {
    // Send button
    this.sendBtn.addEventListener('click', () => this._handleSend());

    // Enter to send (Shift+Enter for new line)
    this.textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });

    // Auto-resize textarea
    this.textareaEl.addEventListener('input', () => {
      this.textareaEl.style.height = 'auto';
      this.textareaEl.style.height = Math.min(this.textareaEl.scrollHeight, 120) + 'px';
    });

    // Mic button
    this.micBtn.addEventListener('click', () => this._toggleRecording());
  }

  _initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ar-EG';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      this.textareaEl.value = transcript;
      this.textareaEl.style.height = 'auto';
      this.textareaEl.style.height = Math.min(this.textareaEl.scrollHeight, 120) + 'px';

      if (e.results[e.results.length - 1].isFinal) {
        this._stopRecording();
        this._handleSend();
      }
    };

    this.recognition.onend = () => this._stopRecording();
    this.recognition.onerror = () => this._stopRecording();
  }

  _toggleRecording() {
    if (this.isRecording) {
      this.recognition?.stop();
      this._stopRecording();
    } else {
      if (!this.recognition) {
        this.addBotMessage('متصفحك مش بيدعم الميكروفون للأسف. اكتب سؤالك بالكيبورد.');
        return;
      }
      this.recognition.start();
      this.isRecording = true;
      this.micBtn.classList.add('recording');
      this.micBtn.title = 'اضغط لإيقاف التسجيل';
    }
  }

  _stopRecording() {
    this.isRecording = false;
    this.micBtn.classList.remove('recording');
    this.micBtn.title = 'تحدث';
  }

  _handleSend() {
    const text = this.textareaEl.value.trim();
    if (!text || this.isWaiting) return;

    // Hide welcome screen
    if (this.welcomeEl) {
      this.welcomeEl.style.display = 'none';
    }

    this.addUserMessage(text);
    this.textareaEl.value = '';
    this.textareaEl.style.height = 'auto';
    this.setWaiting(true);

    this.onSend(text);
  }

  addUserMessage(text) {
    const time = this._getTime();
    const el = this._createMessageEl('user', '👤', text, time);
    this.messagesEl.appendChild(el);
    this._scrollToBottom();
  }

  addBotMessage(text, showExplainBtn = false, topic = '') {
    const time = this._getTime();
    const el   = this._createMessageEl('bot', '👨‍🏫', text, time, showExplainBtn, topic);
    this.messagesEl.appendChild(el);
    this._scrollToBottom();
    return el;
  }

  showTyping() {
    const el = document.createElement('div');
    el.className = 'message bot typing-bubble';
    el.id = 'typing-indicator';
    el.innerHTML = `
      <div class="message-avatar">👨‍🏫</div>
      <div>
        <div class="message-bubble">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;
    this.messagesEl.appendChild(el);
    this._scrollToBottom();
  }

  hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  }

  setWaiting(state) {
    this.isWaiting   = state;
    this.sendBtn.disabled = state;
  }

  _createMessageEl(type, avatar, text, time, showExplainBtn = false, topic = '') {
    const el = document.createElement('div');
    el.className = `message ${type}`;

    const btnHtml = showExplainBtn ? `
      <button class="show-explanation-btn" onclick="window.appController.showExplanation('${topic}')">
        📚 شوف الشرح الكامل
      </button>
    ` : '';

    el.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div>
        <div class="message-bubble">
          ${this._formatText(text)}
          ${btnHtml}
        </div>
        <div class="message-time">${time}</div>
      </div>
    `;
    return el;
  }

  _formatText(text) {
    // Convert markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  _getTime() {
    return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  _scrollToBottom() {
    requestAnimationFrame(() => {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    });
  }

  /** إضافة سؤال مقترح كـ click */
  useSuggestion(text) {
    this.textareaEl.value = text;
    this._handleSend();
  }
}
