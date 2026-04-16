// ===== Sidebar =====
// Left sidebar with node palette (drag to add nodes) and dynamic settings panel.

import { NODE_TYPES } from './node-types.js';

// Map short palette type names to full NODE_TYPES keys
const PALETTE_TYPE_MAP = {
  'upload': 'image-upload',
  'image': 'image-generator',
  'video': 'video-generator',
  'preview': 'preview'
};

export class Sidebar {
  constructor(nodeManager) {
    this.nodeManager = nodeManager;
    this.paletteSection = document.querySelector('#sidebar > .sidebar-section:first-child');
    this.settingsSection = document.getElementById('nodeSettings');
    this.settingsContent = document.getElementById('nodeSettingsContent');
    this.onFileUpload = null;  // callback(nodeId, file) — set by app.js

    this._bindPaletteDrag();
    this._bindBackButton();
  }

  _bindPaletteDrag() {
    document.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        const shortType = item.dataset.nodeType;
        const fullType = PALETTE_TYPE_MAP[shortType] || shortType;
        e.dataTransfer.setData('node-type', fullType);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  }

  _bindBackButton() {
    document.getElementById('settingsBackBtn').addEventListener('click', () => {
      this.nodeManager.deselectAll();
      this.showPalette();
    });
  }

  showPalette() {
    this.paletteSection.classList.remove('hidden');
    this.settingsSection.classList.add('hidden');
  }

  showSettings(node) {
    this.paletteSection.classList.add('hidden');
    this.settingsSection.classList.remove('hidden');

    const typeDef = NODE_TYPES[node.type];

    // Build settings form HTML dynamically from typeDef.settings array
    let html = '';
    typeDef.settings.forEach(setting => {
      const value = node.data[setting.key] || '';
      html += `<div class="setting-group">`;
      html += `<label class="setting-label">${setting.label}${setting.required ? ' <span class="required">*</span>' : ''}</label>`;

      switch (setting.type) {
        case 'textarea':
          html += `<textarea class="setting-input" data-key="${setting.key}" placeholder="${setting.placeholder || ''}" rows="4">${value}</textarea>`;
          break;
        case 'text':
        case 'url':
          html += `<input type="${setting.type}" class="setting-input" data-key="${setting.key}" value="${value}" placeholder="${setting.placeholder || ''}" />`;
          break;
        case 'number':
          html += `<input type="number" class="setting-input" data-key="${setting.key}" value="${value}" min="${setting.min || ''}" max="${setting.max || ''}" step="${setting.step || 1}" placeholder="${setting.placeholder || ''}" />`;
          break;
        case 'select':
          html += `<select class="setting-input" data-key="${setting.key}">`;
          setting.options.forEach(opt => {
            html += `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`;
          });
          html += `</select>`;
          break;
        case 'toggle':
          html += `<label class="setting-toggle"><input type="checkbox" class="setting-input" data-key="${setting.key}" ${node.data[setting.key] ? 'checked' : ''} /><span class="toggle-slider-sm"></span></label>`;
          break;
        case 'file':
          html += `<button class="upload-btn" data-node-id="${node.id}">Choose File</button>`;
          if (node.data.imageData || node.data.imageUrl) {
            const src = node.data.imageData || node.data.imageUrl;
            html += `<div class="setting-preview"><img src="${src}" alt="preview" /></div>`;
          }
          break;
      }
      html += `</div>`;
    });

    this.settingsContent.innerHTML = html;

    // Bind change events — on input/change, update node data
    this.settingsContent.querySelectorAll('.setting-input').forEach(input => {
      const ev = (input.tagName === 'SELECT') ? 'change' : 'input';
      input.addEventListener(ev, (e) => {
        const key = e.target.dataset.key;
        let val = e.target.type === 'checkbox' ? e.target.checked :
                  e.target.type === 'number' ? (e.target.value ? Number(e.target.value) : '') :
                  e.target.value;
        this.nodeManager.updateNodeData(node.id, key, val);
      });
    });

    // File upload buttons
    this.settingsContent.querySelectorAll('.upload-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileInput = document.getElementById('globalFileInput');
        fileInput.dataset.targetNodeId = node.id;
        fileInput.click();
      });
    });
  }
}
