// ===== Topbar =====
// Top bar with API key management and controls.

export class Topbar {
  constructor() {
    this.onRun = null;          // callback()
    this.onResetView = null;    // callback()
    this._loadKeys();
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('runBtn').addEventListener('click', () => this.onRun?.());
    document.getElementById('resetViewBtn').addEventListener('click', () => this.onResetView?.());

    // Save keys to localStorage on change
    document.getElementById('apiKeyInput').addEventListener('input', () => this._saveKeys());
    document.getElementById('openrouterKeyInput').addEventListener('input', () => this._saveKeys());
  }

  getGeminiKey() {
    return document.getElementById('apiKeyInput').value.trim();
  }

  getOpenRouterKey() {
    return document.getElementById('openrouterKeyInput').value.trim();
  }

  _saveKeys() {
    localStorage.setItem('seedance_gemini_key', this.getGeminiKey());
    localStorage.setItem('seedance_openrouter_key', this.getOpenRouterKey());
  }

  _loadKeys() {
    const gk = localStorage.getItem('seedance_gemini_key');
    const ork = localStorage.getItem('seedance_openrouter_key');
    if (gk) document.getElementById('apiKeyInput').value = gk;
    if (ork) document.getElementById('openrouterKeyInput').value = ork;
  }

  setRunning(isRunning) {
    const btn = document.getElementById('runBtn');
    btn.disabled = isRunning;
    btn.textContent = isRunning ? '\u23F3 Running...' : '\u25B6 Run';
  }
}
