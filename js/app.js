import { Canvas } from './canvas.js';
import { NodeManager } from './node-manager.js';
import { ConnectionManager } from './connection.js';
import { Sidebar } from './sidebar.js';
import { Topbar } from './topbar.js';
import { ExecutionEngine } from './execution.js';
import { updateNodeThumbnail } from './node-renderer.js';

class App {
  constructor() {
    // 1. Initialize Canvas
    this.canvas = new Canvas(
      document.getElementById('canvasWrapper'),
      document.getElementById('canvas'),
      document.getElementById('connections')
    );

    // 2. Initialize NodeManager
    this.nodeManager = new NodeManager(
      document.getElementById('canvas'),
      this.canvas
    );

    // 3. Initialize ConnectionManager
    this.connectionManager = new ConnectionManager(
      document.getElementById('connections'),
      this.nodeManager
    );

    // 4. Initialize Sidebar
    this.sidebar = new Sidebar(this.nodeManager);

    // 5. Initialize Topbar
    this.topbar = new Topbar();

    // 6. Initialize ExecutionEngine
    this.execution = new ExecutionEngine(
      this.nodeManager,
      this.connectionManager,
      this.topbar
    );

    this._wireEvents();
    this._setupDropZone();
    this._setupFileInput();
    this._setupLog();
    this._setupKeyboard();
  }

  _wireEvents() {
    // Node selected -> show settings in sidebar
    this.nodeManager.onNodeSelected = (node) => {
      if (node) this.sidebar.showSettings(node);
      else this.sidebar.showPalette();
    };

    // Node moved -> update connections
    this.nodeManager.onNodeMoved = () => {
      this.connectionManager.updateAllConnections();
    };

    // Node deleted -> remove connections
    this.nodeManager.onNodeDeleted = (id) => {
      this.connectionManager.removeConnectionsForNode(id);
    };

    // Click on empty canvas -> deselect all
    document.getElementById('canvasWrapper').addEventListener('pointerdown', (e) => {
      if (e.target === document.getElementById('canvasWrapper') ||
          e.target === document.getElementById('canvas') ||
          e.target === document.getElementById('connections')) {
        this.nodeManager.deselectAll();
      }
    });

    // Run workflow
    this.topbar.onRun = () => this.execution.run();

    // Reset view
    this.topbar.onResetView = () => this.canvas.resetView();
  }

  _setupDropZone() {
    const wrapper = document.getElementById('canvasWrapper');
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('node-type');
      if (!type) return;
      const pos = this.canvas.screenToCanvas(e.clientX, e.clientY);
      const node = this.nodeManager.addNode(type, pos.x, pos.y);
      if (node) this.nodeManager.selectNode(node.id);
    });
  }

  _setupFileInput() {
    const fileInput = document.getElementById('globalFileInput');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const nodeId = parseInt(fileInput.dataset.targetNodeId, 10);
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.nodeManager.updateNodeData(nodeId, 'imageData', ev.target.result);
        const node = this.nodeManager.getNode(nodeId);
        if (node) {
          // Refresh settings panel if this node is selected
          if (this.nodeManager.selectedNodeId === nodeId) {
            this.sidebar.showSettings(node);
          }
          // Update node thumbnail
          updateNodeThumbnail(nodeId, ev.target.result, 'image');
        }
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }

  _setupLog() {
    const logContent = document.querySelector('#logPanel .log-content');
    this.execution.onLog = (msg, type) => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      const now = new Date().toLocaleTimeString();
      entry.innerHTML = `<span class="log-time">[${now}]</span> ${msg}`;
      logContent.appendChild(entry);
      logContent.scrollTop = logContent.scrollHeight;
    };

    // Log panel toggle
    const logToggle = document.querySelector('#logPanel .log-toggle');
    if (logToggle) {
      logToggle.addEventListener('click', () => {
        document.getElementById('logPanel').classList.toggle('collapsed');
        const arrow = logToggle.querySelector('.toggle-arrow');
        if (arrow) arrow.textContent = document.getElementById('logPanel').classList.contains('collapsed') ? '\u25B2' : '\u25BC';
      });
    }
  }

  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't intercept when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      // Delete/Backspace -> delete selected node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = this.nodeManager.selectedNodeId;
        if (selectedId !== null) {
          this.nodeManager.deleteNode(selectedId);
          e.preventDefault();
        }
      }

      // Escape -> deselect
      if (e.key === 'Escape') {
        this.nodeManager.deselectAll();
      }

      // Ctrl+0 -> reset view
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.canvas.resetView();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
