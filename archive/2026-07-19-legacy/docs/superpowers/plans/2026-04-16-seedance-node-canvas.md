# Seedance Node Canvas - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an n8n-style node-based canvas workflow editor that connects image generation (Google Imagen via nano) with video generation (Seedance 2.0 Fast via OpenRouter), allowing users to visually wire first/last frame images into video generation nodes.

**Architecture:** Pure vanilla HTML/CSS/JS with SVG connections and HTML5 drag-and-drop. No build tools or frameworks. The canvas is an infinite pannable/zoomable workspace where nodes are DOM elements positioned via CSS transforms. Connections are SVG bezier curves rendered in an overlay. Each node type has typed input/output ports that enforce connection rules.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES modules via `<script type="module">`), SVG for connections, Google Imagen 4.0 API (Gemini), OpenRouter Video API.

---

## File Structure

```
seedance/
├── index.html              # App shell, loads all modules
├── css/
│   └── style.css           # All styles (canvas, nodes, sidebar, modals)
├── js/
│   ├── app.js              # Main orchestrator, initializes everything
│   ├── canvas.js           # Infinite canvas: pan, zoom, grid rendering
│   ├── node-types.js       # Node type definitions (schemas, ports, defaults)
│   ├── node-renderer.js    # Creates DOM elements for nodes
│   ├── node-manager.js     # CRUD operations on nodes, drag logic
│   ├── connection.js       # SVG connection rendering, port hit detection
│   ├── execution.js        # Workflow execution engine (topological sort + run)
│   ├── sidebar.js          # Left sidebar: node palette + node settings panel
│   ├── topbar.js           # Top bar: API keys, global settings
│   └── api.js              # API clients: Imagen + OpenRouter Seedance
└── docs/
    └── superpowers/plans/  # This plan
```

## Node Types

| Node Type | Inputs | Outputs | Purpose |
|-----------|--------|---------|---------|
| **Image Generator** | (none) | `image` | Generate image via Imagen 4.0 (has prompt, aspect_ratio, model, style, negative) |
| **Image Upload** | (none) | `image` | Upload file or paste URL |
| **Video Generator** | `first_frame` (image), `last_frame` (image), `ref_images` (image[]) | `video` | Generate video via Seedance API (has prompt, duration, resolution, aspect_ratio, seed, generate_audio) |
| **Preview** | `media` (image or video) | (none) | Display result inline |

---

## Task 1: HTML Shell + CSS Foundation

**Files:**
- Create: `seedance/index.html` (overwrite existing)
- Create: `seedance/css/style.css`

- [ ] **Step 1: Create index.html shell**

```html
<!-- index.html: App shell with layout containers -->
<!-- Contains: #topbar, #sidebar, #canvas-wrapper > #canvas + svg#connections -->
<!-- Loads css/style.css and all js/ modules -->
```

The HTML has these major containers:
- `#topbar` — API key inputs (OpenRouter + Gemini), run button
- `#sidebar` — Two sections: node palette (draggable cards) and node settings (dynamic form)
- `#canvas-wrapper` — The viewport that clips the infinite canvas
  - `#canvas` — The transform layer (scale/translate) containing all node DOM elements
  - `svg#connections` — SVG overlay for bezier connections, same transform as canvas
- Hidden `<input type="file">` for image uploads

- [ ] **Step 2: Create style.css with full styling**

Styles must cover:
- **Layout:** Fixed topbar (48px), fixed sidebar (280px left), canvas fills remainder
- **Canvas:** Background grid using CSS `background-image` repeating pattern, cursor grab/grabbing
- **Nodes:** 240px wide, rounded cards with header (color-coded by type), body, port dots
- **Ports:** 12px circles on left (input) and right (output) edges, with hover glow
- **Connections:** SVG path with stroke, animated dash on hover
- **Sidebar palette:** Draggable cards with icon + label, grouped by category
- **Settings panel:** Form elements matching the dark theme from existing design
- **Topbar:** API key inputs with show/hide toggle, status indicators
- **States:** Node selected (accent border), node running (pulse animation), node error (red border), node complete (green border)

Color scheme (reuse existing dark theme):
```css
--bg: #0a0a0f;
--surface: #13131a;
--surface-2: #1a1a24;
--border: #2a2a3a;
--accent: #6c5ce7;
--success: #00b894;
--warning: #fdcb6e;
--danger: #e17055;
--node-image: #00b894;     /* green for image nodes */
--node-video: #6c5ce7;     /* purple for video nodes */
--node-upload: #fdcb6e;    /* yellow for upload nodes */
--node-preview: #0984e3;   /* blue for preview nodes */
```

- [ ] **Step 3: Verify layout renders**

Open `index.html` in browser, confirm:
- Topbar visible at top
- Sidebar on left
- Canvas fills remaining space with grid background
- No JS errors in console

---

## Task 2: Canvas Engine (Pan + Zoom + Grid)

**Files:**
- Create: `seedance/js/canvas.js`

- [ ] **Step 1: Implement Canvas class**

```javascript
// canvas.js — Manages infinite canvas with pan and zoom
export class Canvas {
  constructor(wrapperEl, canvasEl, svgEl) {
    this.wrapper = wrapperEl;
    this.canvas = canvasEl;
    this.svg = svgEl;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this._bindEvents();
    this._applyTransform();
  }

  // Convert screen coordinates to canvas coordinates
  screenToCanvas(screenX, screenY) {
    const rect = this.wrapper.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.offsetX) / this.scale,
      y: (screenY - rect.top - this.offsetY) / this.scale
    };
  }

  // Convert canvas coordinates to screen coordinates
  canvasToScreen(cx, cy) {
    const rect = this.wrapper.getBoundingClientRect();
    return {
      x: cx * this.scale + this.offsetX + rect.left,
      y: cy * this.scale + this.offsetY + rect.top
    };
  }

  _applyTransform() {
    const t = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    this.canvas.style.transform = t;
    this.svg.style.transform = t;
  }

  _bindEvents() {
    // Middle-click or Space+drag to pan
    this.wrapper.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.target === this.wrapper)) {
        this.isPanning = true;
        this.startX = e.clientX - this.offsetX;
        this.startY = e.clientY - this.offsetY;
        this.wrapper.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPanning) return;
      this.offsetX = e.clientX - this.startX;
      this.offsetY = e.clientY - this.startY;
      this._applyTransform();
    });

    window.addEventListener('pointerup', () => {
      this.isPanning = false;
      this.wrapper.style.cursor = '';
    });

    // Scroll to zoom (centered on cursor)
    this.wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(3, Math.max(0.2, this.scale * delta));
      const rect = this.wrapper.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Adjust offset so zoom centers on cursor
      this.offsetX = mx - (mx - this.offsetX) * (newScale / this.scale);
      this.offsetY = my - (my - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;
      this._applyTransform();
    }, { passive: false });
  }

  // Reset to default view
  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._applyTransform();
  }
}
```

- [ ] **Step 2: Verify pan and zoom work**

Open in browser. Confirm:
- Scroll wheel zooms in/out centered on cursor
- Click+drag on empty canvas area pans
- Grid pattern moves with pan/zoom
- Zoom clamps between 0.2x and 3x

---

## Task 3: Node Type Definitions

**Files:**
- Create: `seedance/js/node-types.js`

- [ ] **Step 1: Define all node type schemas**

```javascript
// node-types.js — Node type registry with port definitions and default values
export const NODE_TYPES = {
  'image-generator': {
    label: 'Image Generator',
    category: 'Generation',
    color: 'var(--node-image)',
    icon: '🖼️',
    inputs: [],
    outputs: [
      { id: 'image', type: 'image', label: 'Image' }
    ],
    defaults: {
      prompt: '',
      model: 'imagen-4.0-generate-001',
      aspectRatio: '1:1',
      style: '',
      negative: ''
    },
    settings: [
      { key: 'prompt', type: 'textarea', label: 'Prompt', required: true, placeholder: 'Describe the image...' },
      { key: 'model', type: 'select', label: 'Model', options: [
        { value: 'imagen-4.0-generate-001', label: 'Imagen 4.0 (Standard)' },
        { value: 'imagen-4.0-fast-generate-001', label: 'Imagen 4.0 Fast' },
        { value: 'imagen-4.0-ultra-generate-001', label: 'Imagen 4.0 Ultra' }
      ]},
      { key: 'aspectRatio', type: 'select', label: 'Aspect Ratio', options: [
        { value: '1:1', label: '1:1 (Square)' },
        { value: '16:9', label: '16:9 (Landscape)' },
        { value: '9:16', label: '9:16 (Portrait)' },
        { value: '4:3', label: '4:3 (Standard)' },
        { value: '3:4', label: '3:4 (Portrait Standard)' }
      ]},
      { key: 'style', type: 'text', label: 'Style', placeholder: 'e.g. photorealistic, watercolor, anime...' },
      { key: 'negative', type: 'text', label: 'Negative Prompt', placeholder: 'e.g. no text, no watermark...' }
    ]
  },

  'image-upload': {
    label: 'Image Upload',
    category: 'Input',
    color: 'var(--node-upload)',
    icon: '📁',
    inputs: [],
    outputs: [
      { id: 'image', type: 'image', label: 'Image' }
    ],
    defaults: {
      imageUrl: '',
      imageData: null
    },
    settings: [
      { key: 'imageUrl', type: 'url', label: 'Image URL', placeholder: 'https://example.com/image.jpg' },
      { key: '_upload', type: 'file', label: 'Or Upload File', accept: 'image/*' }
    ]
  },

  'video-generator': {
    label: 'Video Generator',
    category: 'Generation',
    color: 'var(--node-video)',
    icon: '🎬',
    inputs: [
      { id: 'first_frame', type: 'image', label: 'First Frame' },
      { id: 'last_frame', type: 'image', label: 'Last Frame' },
      { id: 'ref_images', type: 'image', label: 'Reference Images', multiple: true }
    ],
    outputs: [
      { id: 'video', type: 'video', label: 'Video' }
    ],
    defaults: {
      prompt: '',
      duration: 5,
      resolution: '720p',
      aspectRatio: '',
      size: '',
      seed: '',
      generateAudio: false
    },
    settings: [
      { key: 'prompt', type: 'textarea', label: 'Video Prompt', required: true, placeholder: 'Describe the video motion...' },
      { key: 'duration', type: 'number', label: 'Duration (seconds)', min: 1, max: 30, step: 1 },
      { key: 'resolution', type: 'select', label: 'Resolution', options: [
        { value: '', label: 'Auto' },
        { value: '480p', label: '480p ($0.0538/s)' },
        { value: '720p', label: '720p ($0.121/s)' },
        { value: '1080p', label: '1080p ($0.2722/s)' },
        { value: '1K', label: '1K' },
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' }
      ]},
      { key: 'aspectRatio', type: 'select', label: 'Aspect Ratio', options: [
        { value: '', label: 'Auto' },
        { value: '16:9', label: '16:9 (Landscape)' },
        { value: '9:16', label: '9:16 (Portrait)' },
        { value: '1:1', label: '1:1 (Square)' },
        { value: '4:3', label: '4:3' },
        { value: '3:4', label: '3:4' },
        { value: '21:9', label: '21:9 (Ultrawide)' },
        { value: '9:21', label: '9:21' }
      ]},
      { key: 'size', type: 'text', label: 'Custom Size', placeholder: 'e.g. 1280x720' },
      { key: 'seed', type: 'number', label: 'Seed', placeholder: 'Random if empty' },
      { key: 'generateAudio', type: 'toggle', label: 'Generate Audio' }
    ]
  },

  'preview': {
    label: 'Preview',
    category: 'Output',
    color: 'var(--node-preview)',
    icon: '👁️',
    inputs: [
      { id: 'media', type: 'any', label: 'Media' }
    ],
    outputs: [],
    defaults: {},
    settings: []
  }
};

// Port type compatibility: which output types can connect to which input types
export const PORT_COMPAT = {
  'image': ['image', 'any'],
  'video': ['video', 'any'],
  'any': ['image', 'video', 'any']
};
```

- [ ] **Step 2: Verify module exports**

Add a temporary `console.log(NODE_TYPES)` in app.js, open browser, confirm object logs correctly.

---

## Task 4: Node Renderer

**Files:**
- Create: `seedance/js/node-renderer.js`

- [ ] **Step 1: Implement node DOM creation**

```javascript
// node-renderer.js — Creates and updates node DOM elements
import { NODE_TYPES } from './node-types.js';

export function createNodeElement(node) {
  // node = { id, type, x, y, data: {...defaults}, state: 'idle' }
  const typeDef = NODE_TYPES[node.type];
  const el = document.createElement('div');
  el.className = 'node';
  el.dataset.nodeId = node.id;
  el.style.left = node.x + 'px';
  el.style.top = node.y + 'px';

  // Header
  const header = document.createElement('div');
  header.className = 'node-header';
  header.style.background = typeDef.color;
  header.innerHTML = `<span class="node-icon">${typeDef.icon}</span>
    <span class="node-title">${typeDef.label}</span>
    <button class="node-delete" title="Delete node">&times;</button>`;
  el.appendChild(header);

  // Body (preview area for image/video output)
  const body = document.createElement('div');
  body.className = 'node-body';
  body.innerHTML = `<div class="node-preview-thumb" data-node-id="${node.id}"></div>`;
  el.appendChild(body);

  // Input ports (left side)
  const inputsContainer = document.createElement('div');
  inputsContainer.className = 'node-ports node-ports-in';
  typeDef.inputs.forEach(port => {
    const portEl = document.createElement('div');
    portEl.className = 'port port-in';
    portEl.dataset.nodeId = node.id;
    portEl.dataset.portId = port.id;
    portEl.dataset.portType = port.type;
    portEl.innerHTML = `<div class="port-dot"></div><span class="port-label">${port.label}</span>`;
    inputsContainer.appendChild(portEl);
  });
  el.appendChild(inputsContainer);

  // Output ports (right side)
  const outputsContainer = document.createElement('div');
  outputsContainer.className = 'node-ports node-ports-out';
  typeDef.outputs.forEach(port => {
    const portEl = document.createElement('div');
    portEl.className = 'port port-out';
    portEl.dataset.nodeId = node.id;
    portEl.dataset.portId = port.id;
    portEl.dataset.portType = port.type;
    portEl.innerHTML = `<span class="port-label">${port.label}</span><div class="port-dot"></div>`;
    outputsContainer.appendChild(portEl);
  });
  el.appendChild(outputsContainer);

  return el;
}

export function updateNodeThumbnail(nodeId, mediaUrl, mediaType) {
  const thumb = document.querySelector(`.node-preview-thumb[data-node-id="${nodeId}"]`);
  if (!thumb) return;
  if (mediaType === 'image') {
    thumb.innerHTML = `<img src="${mediaUrl}" alt="preview" />`;
  } else if (mediaType === 'video') {
    thumb.innerHTML = `<video src="${mediaUrl}" muted autoplay loop></video>`;
  }
}

export function setNodeState(nodeId, state) {
  // state: 'idle' | 'running' | 'complete' | 'error'
  const el = document.querySelector(`.node[data-node-id="${nodeId}"]`);
  if (!el) return;
  el.classList.remove('state-idle', 'state-running', 'state-complete', 'state-error');
  el.classList.add(`state-${state}`);
}
```

- [ ] **Step 2: Verify a test node renders on canvas**

Temporarily create a node in app.js, append to canvas, confirm it displays with header, ports, and body.

---

## Task 5: Node Manager (CRUD + Drag)

**Files:**
- Create: `seedance/js/node-manager.js`

- [ ] **Step 1: Implement NodeManager class**

```javascript
// node-manager.js — Manages node instances, handles drag, selection, deletion
import { NODE_TYPES } from './node-types.js';
import { createNodeElement, setNodeState } from './node-renderer.js';

export class NodeManager {
  constructor(canvasEl, canvasInstance) {
    this.canvas = canvasInstance;       // Canvas class for coordinate conversion
    this.canvasEl = canvasEl;           // DOM element to append nodes to
    this.nodes = new Map();             // id -> { id, type, x, y, data, state, el }
    this.selectedNodeId = null;
    this.nextId = 1;
    this._dragState = null;
    this.onNodeSelected = null;         // callback(node|null)
    this.onNodeMoved = null;            // callback(nodeId)
    this.onNodeDeleted = null;          // callback(nodeId)
    this._bindDragEvents();
  }

  addNode(type, x, y) {
    const typeDef = NODE_TYPES[type];
    if (!typeDef) return null;
    const id = 'node-' + (this.nextId++);
    const node = {
      id,
      type,
      x,
      y,
      data: { ...typeDef.defaults },
      state: 'idle',
      output: null    // result data after execution
    };
    const el = createNodeElement(node);
    this.canvasEl.appendChild(el);
    node.el = el;
    this.nodes.set(id, node);

    // Delete button handler
    el.querySelector('.node-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteNode(id);
    });

    // Select on click
    el.querySelector('.node-header').addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('node-delete')) return;
      this.selectNode(id);
    });

    return node;
  }

  deleteNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.el.remove();
    this.nodes.delete(id);
    if (this.selectedNodeId === id) {
      this.selectedNodeId = null;
      this.onNodeSelected?.(null);
    }
    this.onNodeDeleted?.(id);
  }

  selectNode(id) {
    // Deselect previous
    if (this.selectedNodeId) {
      const prev = this.nodes.get(this.selectedNodeId);
      if (prev) prev.el.classList.remove('selected');
    }
    this.selectedNodeId = id;
    const node = this.nodes.get(id);
    if (node) {
      node.el.classList.add('selected');
      this.onNodeSelected?.(node);
    }
  }

  deselectAll() {
    if (this.selectedNodeId) {
      const prev = this.nodes.get(this.selectedNodeId);
      if (prev) prev.el.classList.remove('selected');
    }
    this.selectedNodeId = null;
    this.onNodeSelected?.(null);
  }

  updateNodeData(id, key, value) {
    const node = this.nodes.get(id);
    if (!node) return;
    node.data[key] = value;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  _bindDragEvents() {
    // Node dragging — listen on canvas container
    this.canvasEl.addEventListener('pointerdown', (e) => {
      const header = e.target.closest('.node-header');
      if (!header || e.target.classList.contains('node-delete')) return;
      const nodeEl = header.closest('.node');
      const nodeId = nodeEl.dataset.nodeId;
      const node = this.nodes.get(nodeId);
      if (!node) return;

      e.stopPropagation(); // prevent canvas pan

      this._dragState = {
        nodeId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startNodeX: node.x,
        startNodeY: node.y
      };
    });

    window.addEventListener('pointermove', (e) => {
      if (!this._dragState) return;
      const { nodeId, startMouseX, startMouseY, startNodeX, startNodeY } = this._dragState;
      const node = this.nodes.get(nodeId);
      if (!node) return;

      const dx = (e.clientX - startMouseX) / this.canvas.scale;
      const dy = (e.clientY - startMouseY) / this.canvas.scale;
      node.x = startNodeX + dx;
      node.y = startNodeY + dy;
      node.el.style.left = node.x + 'px';
      node.el.style.top = node.y + 'px';
      this.onNodeMoved?.(nodeId);
    });

    window.addEventListener('pointerup', () => {
      this._dragState = null;
    });
  }
}
```

- [ ] **Step 2: Verify drag works**

Add a node via console, drag it around, confirm smooth movement and coordinate updates.

---

## Task 6: Connection System (SVG Bezier Curves)

**Files:**
- Create: `seedance/js/connection.js`

- [ ] **Step 1: Implement ConnectionManager class**

```javascript
// connection.js — Manages SVG bezier connections between node ports
import { PORT_COMPAT } from './node-types.js';

export class ConnectionManager {
  constructor(svgEl, nodeManager) {
    this.svg = svgEl;
    this.nodeManager = nodeManager;
    this.connections = [];    // [{ id, fromNode, fromPort, toNode, toPort, pathEl }]
    this.nextId = 1;
    this._drawingState = null; // temp connection while dragging from port
    this._tempPath = null;
    this._bindEvents();
  }

  // Get the screen position of a port dot
  _getPortPosition(nodeId, portId, portDirection) {
    const selector = `.port-${portDirection}[data-node-id="${nodeId}"][data-port-id="${portId}"] .port-dot`;
    const dot = document.querySelector(selector);
    if (!dot) return null;
    const node = this.nodeManager.getNode(nodeId);
    const nodeEl = node.el;
    const dotRect = dot.getBoundingClientRect();
    const canvasRect = this.nodeManager.canvasEl.getBoundingClientRect();
    // Get position relative to canvas element, accounting for transform
    const scale = this.nodeManager.canvas.scale;
    const offsetX = this.nodeManager.canvas.offsetX;
    const offsetY = this.nodeManager.canvas.offsetY;
    return {
      x: (dotRect.left + dotRect.width / 2 - canvasRect.left - offsetX) / scale,
      y: (dotRect.top + dotRect.height / 2 - canvasRect.top - offsetY) / scale
    };
  }

  _createBezierPath(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  addConnection(fromNodeId, fromPortId, toNodeId, toPortId) {
    // Check if input already has a connection (only one allowed per input)
    const existing = this.connections.find(c => c.toNode === toNodeId && c.toPort === toPortId);
    if (existing) this.removeConnection(existing.id);

    const id = 'conn-' + (this.nextId++);
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.classList.add('connection-path');
    pathEl.dataset.connId = id;
    this.svg.appendChild(pathEl);

    const conn = { id, fromNode: fromNodeId, fromPort: fromPortId, toNode: toNodeId, toPort: toPortId, pathEl };
    this.connections.push(conn);
    this._updateConnectionPath(conn);
    return conn;
  }

  removeConnection(id) {
    const idx = this.connections.findIndex(c => c.id === id);
    if (idx === -1) return;
    this.connections[idx].pathEl.remove();
    this.connections.splice(idx, 1);
  }

  removeConnectionsForNode(nodeId) {
    const toRemove = this.connections.filter(c => c.fromNode === nodeId || c.toNode === nodeId);
    toRemove.forEach(c => this.removeConnection(c.id));
  }

  getInputConnections(nodeId) {
    return this.connections.filter(c => c.toNode === nodeId);
  }

  _updateConnectionPath(conn) {
    const from = this._getPortPosition(conn.fromNode, conn.fromPort, 'out');
    const to = this._getPortPosition(conn.toNode, conn.toPort, 'in');
    if (!from || !to) return;
    conn.pathEl.setAttribute('d', this._createBezierPath(from.x, from.y, to.x, to.y));
  }

  updateAllConnections() {
    this.connections.forEach(c => this._updateConnectionPath(c));
  }

  _bindEvents() {
    const canvasEl = this.nodeManager.canvasEl;

    // Start drawing from output port
    canvasEl.addEventListener('pointerdown', (e) => {
      const portDot = e.target.closest('.port-dot');
      if (!portDot) return;
      const portEl = portDot.closest('.port');
      if (!portEl) return;

      e.stopPropagation();

      const isOutput = portEl.classList.contains('port-out');
      const isInput = portEl.classList.contains('port-in');

      if (isOutput) {
        this._drawingState = {
          fromNode: portEl.dataset.nodeId,
          fromPort: portEl.dataset.portId,
          fromType: portEl.dataset.portType
        };
      } else if (isInput) {
        // Allow dragging from input to create reverse connection
        this._drawingState = {
          toNode: portEl.dataset.nodeId,
          toPort: portEl.dataset.portId,
          toType: portEl.dataset.portType,
          reverse: true
        };
      }

      // Create temp path
      this._tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this._tempPath.classList.add('connection-path', 'connection-temp');
      this.svg.appendChild(this._tempPath);
    });

    window.addEventListener('pointermove', (e) => {
      if (!this._drawingState || !this._tempPath) return;
      const canvas = this.nodeManager.canvas;
      const mousePos = canvas.screenToCanvas(e.clientX, e.clientY);

      let startPos;
      if (this._drawingState.reverse) {
        startPos = this._getPortPosition(this._drawingState.toNode, this._drawingState.toPort, 'in');
        if (startPos) {
          this._tempPath.setAttribute('d', this._createBezierPath(mousePos.x, mousePos.y, startPos.x, startPos.y));
        }
      } else {
        startPos = this._getPortPosition(this._drawingState.fromNode, this._drawingState.fromPort, 'out');
        if (startPos) {
          this._tempPath.setAttribute('d', this._createBezierPath(startPos.x, startPos.y, mousePos.x, mousePos.y));
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this._drawingState) return;

      // Check if we dropped on a valid port
      const portDot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.port-dot');
      const portEl = portDot?.closest('.port');

      if (portEl) {
        const targetNodeId = portEl.dataset.nodeId;
        const targetPortId = portEl.dataset.portId;
        const targetPortType = portEl.dataset.portType;
        const isTargetInput = portEl.classList.contains('port-in');
        const isTargetOutput = portEl.classList.contains('port-out');

        if (this._drawingState.reverse && isTargetOutput) {
          // Dragged from input, dropped on output
          const compat = PORT_COMPAT[targetPortType];
          if (compat && compat.includes(this._drawingState.toType) && targetNodeId !== this._drawingState.toNode) {
            this.addConnection(targetNodeId, targetPortId, this._drawingState.toNode, this._drawingState.toPort);
          }
        } else if (!this._drawingState.reverse && isTargetInput) {
          // Dragged from output, dropped on input
          const compat = PORT_COMPAT[this._drawingState.fromType];
          if (compat && compat.includes(targetPortType) && targetNodeId !== this._drawingState.fromNode) {
            this.addConnection(this._drawingState.fromNode, this._drawingState.fromPort, targetNodeId, targetPortId);
          }
        }
      }

      // Cleanup
      if (this._tempPath) {
        this._tempPath.remove();
        this._tempPath = null;
      }
      this._drawingState = null;
    });

    // Right-click on connection to delete
    this.svg.addEventListener('contextmenu', (e) => {
      const pathEl = e.target.closest('.connection-path');
      if (!pathEl) return;
      e.preventDefault();
      const connId = pathEl.dataset.connId;
      if (connId) this.removeConnection(connId);
    });
  }
}
```

- [ ] **Step 2: Wire up connection update on node move**

In app.js, set `nodeManager.onNodeMoved = () => connectionManager.updateAllConnections()` and `nodeManager.onNodeDeleted = (id) => connectionManager.removeConnectionsForNode(id)`.

- [ ] **Step 3: Verify connections work**

Place two nodes, drag from output port to input port, confirm bezier curve renders. Move a node, confirm connection follows. Right-click connection to delete it.

---

## Task 7: Sidebar — Node Palette + Settings Panel

**Files:**
- Create: `seedance/js/sidebar.js`

- [ ] **Step 1: Implement Sidebar class**

```javascript
// sidebar.js — Left sidebar with node palette and settings panel
import { NODE_TYPES } from './node-types.js';

export class Sidebar {
  constructor(sidebarEl, nodeManager, canvas) {
    this.el = sidebarEl;
    this.nodeManager = nodeManager;
    this.canvas = canvas;
    this.onFileUpload = null;  // callback(nodeId, file)
    this._render();
  }

  _render() {
    this.el.innerHTML = `
      <div class="sidebar-section" id="nodePalette">
        <div class="sidebar-title">Nodes</div>
        <div class="palette-list"></div>
      </div>
      <div class="sidebar-section" id="nodeSettings" style="display:none;">
        <div class="sidebar-title">
          <span id="settingsTitle">Settings</span>
          <button class="sidebar-back" id="settingsBack" title="Back">&larr;</button>
        </div>
        <div class="settings-form" id="settingsForm"></div>
      </div>
    `;

    this._renderPalette();
    this._bindPaletteDrag();

    document.getElementById('settingsBack').addEventListener('click', () => {
      this.nodeManager.deselectAll();
      this.showPalette();
    });
  }

  _renderPalette() {
    const list = this.el.querySelector('.palette-list');
    const categories = {};
    for (const [typeId, def] of Object.entries(NODE_TYPES)) {
      if (!categories[def.category]) categories[def.category] = [];
      categories[def.category].push({ typeId, ...def });
    }

    let html = '';
    for (const [cat, items] of Object.entries(categories)) {
      html += `<div class="palette-category">${cat}</div>`;
      items.forEach(item => {
        html += `<div class="palette-item" draggable="true" data-type="${item.typeId}">
          <span class="palette-icon">${item.icon}</span>
          <span class="palette-label">${item.label}</span>
        </div>`;
      });
    }
    list.innerHTML = html;
  }

  _bindPaletteDrag() {
    const items = this.el.querySelectorAll('.palette-item');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('node-type', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  }

  showPalette() {
    document.getElementById('nodePalette').style.display = '';
    document.getElementById('nodeSettings').style.display = 'none';
  }

  showSettings(node) {
    document.getElementById('nodePalette').style.display = 'none';
    document.getElementById('nodeSettings').style.display = '';

    const typeDef = NODE_TYPES[node.type];
    document.getElementById('settingsTitle').textContent = typeDef.label;

    const form = document.getElementById('settingsForm');
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
          html += `<label class="setting-toggle">
            <input type="checkbox" data-key="${setting.key}" ${node.data[setting.key] ? 'checked' : ''} />
            <span class="toggle-slider-sm"></span>
          </label>`;
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

    form.innerHTML = html;

    // Bind change events
    form.querySelectorAll('.setting-input').forEach(input => {
      const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, (e) => {
        const key = e.target.dataset.key;
        let val = e.target.type === 'checkbox' ? e.target.checked :
                  e.target.type === 'number' ? (e.target.value ? Number(e.target.value) : '') :
                  e.target.value;
        this.nodeManager.updateNodeData(node.id, key, val);
      });
    });

    // File upload button
    form.querySelectorAll('.upload-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fileInput = document.getElementById('globalFileInput');
        fileInput.dataset.targetNodeId = node.id;
        fileInput.click();
      });
    });
  }
}
```

- [ ] **Step 2: Verify palette renders and drag-to-canvas works**

Drag a palette item onto the canvas. Confirm a new node is created at the drop position. Click a node, confirm settings panel appears.

---

## Task 8: Top Bar (API Keys + Controls)

**Files:**
- Create: `seedance/js/topbar.js`

- [ ] **Step 1: Implement Topbar class**

```javascript
// topbar.js — Top bar with API keys, run button, and status
export class Topbar {
  constructor(topbarEl) {
    this.el = topbarEl;
    this.onRun = null;         // callback()
    this.onClearCanvas = null;  // callback()
    this._render();
    this._loadKeys();
  }

  _render() {
    this.el.innerHTML = `
      <div class="topbar-left">
        <div class="topbar-brand">
          <span class="topbar-logo">⬡</span>
          <span class="topbar-title">Seedance Studio</span>
        </div>
      </div>
      <div class="topbar-center">
        <div class="topbar-key-group">
          <label>OpenRouter</label>
          <input type="password" id="openrouterKey" placeholder="sk-or-..." />
        </div>
        <div class="topbar-key-group">
          <label>Gemini</label>
          <input type="password" id="geminiKey" placeholder="AI..." />
        </div>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn topbar-btn-secondary" id="clearBtn" title="Clear Canvas">🗑️ Clear</button>
        <button class="topbar-btn topbar-btn-primary" id="runBtn">▶ Run Workflow</button>
      </div>
    `;

    document.getElementById('runBtn').addEventListener('click', () => this.onRun?.());
    document.getElementById('clearBtn').addEventListener('click', () => {
      if (confirm('Clear all nodes and connections?')) this.onClearCanvas?.();
    });

    // Save keys to localStorage on change
    ['openrouterKey', 'geminiKey'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this._saveKeys());
    });
  }

  getOpenRouterKey() { return document.getElementById('openrouterKey').value.trim(); }
  getGeminiKey() { return document.getElementById('geminiKey').value.trim(); }

  _saveKeys() {
    localStorage.setItem('seedance_openrouter_key', this.getOpenRouterKey());
    localStorage.setItem('seedance_gemini_key', this.getGeminiKey());
  }

  _loadKeys() {
    const orKey = localStorage.getItem('seedance_openrouter_key');
    const gemKey = localStorage.getItem('seedance_gemini_key');
    if (orKey) document.getElementById('openrouterKey').value = orKey;
    if (gemKey) document.getElementById('geminiKey').value = gemKey;
  }

  setRunning(isRunning) {
    const btn = document.getElementById('runBtn');
    btn.disabled = isRunning;
    btn.textContent = isRunning ? '⏳ Running...' : '▶ Run Workflow';
  }
}
```

- [ ] **Step 2: Verify top bar renders**

Confirm API key inputs display, values persist in localStorage, Run/Clear buttons exist.

---

## Task 9: API Clients (Imagen + Seedance)

**Files:**
- Create: `seedance/js/api.js`

- [ ] **Step 1: Implement API client functions**

```javascript
// api.js — API clients for Google Imagen and OpenRouter Seedance

// Generate image via Google Imagen 4.0
export async function generateImage({ geminiKey, prompt, model, aspectRatio, style, negative }) {
  if (!geminiKey) throw new Error('Gemini API Key is required');
  if (!prompt) throw new Error('Prompt is required for image generation');

  // Build the full prompt with style and negative constraints
  let fullPrompt = prompt;
  if (style) fullPrompt = `${style} style: ${fullPrompt}`;
  if (negative) fullPrompt += `. Avoid: ${negative}`;

  const modelId = model || 'imagen-4.0-generate-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${geminiKey}`;

  const requestBody = {
    instances: [{ prompt: fullPrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: aspectRatio || '1:1'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Imagen API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.predictions || data.predictions.length === 0) {
    throw new Error('No image generated. The prompt may have been blocked by safety filters.');
  }

  const base64Image = data.predictions[0].bytesBase64Encoded;
  const mimeType = data.predictions[0].mimeType || 'image/png';
  return `data:${mimeType};base64,${base64Image}`;
}

// Submit video generation to OpenRouter
export async function submitVideoGeneration({ openRouterKey, prompt, duration, resolution, aspectRatio, size, seed, generateAudio, frameImages, inputReferences }) {
  if (!openRouterKey) throw new Error('OpenRouter API Key is required');
  if (!prompt) throw new Error('Prompt is required for video generation');

  const body = {
    model: 'bytedance/seedance-2.0-fast',
    prompt
  };

  if (duration) body.duration = parseInt(duration);
  if (resolution) body.resolution = resolution;
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (size) body.size = size;
  if (seed !== '' && seed !== undefined && seed !== null) body.seed = parseInt(seed);
  if (generateAudio) body.generate_audio = true;

  // Frame images (first/last frame)
  if (frameImages && frameImages.length > 0) {
    body.frame_images = frameImages.map(f => ({
      type: 'image_url',
      frame_type: f.frameType,
      image_url: { url: f.url }
    }));
  }

  // Reference images
  if (inputReferences && inputReferences.length > 0) {
    body.input_references = inputReferences.map(url => ({
      type: 'image_url',
      image_url: { url }
    }));
  }

  const response = await fetch('https://openrouter.ai/api/v1/videos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || result.error || `HTTP ${response.status}`);
  }

  return result; // { id, polling_url, status }
}

// Poll video generation status
export async function pollVideoStatus(pollingUrl, openRouterKey) {
  const fullUrl = pollingUrl.startsWith('http') ? pollingUrl : `https://openrouter.ai${pollingUrl}`;

  const response = await fetch(fullUrl, {
    headers: { 'Authorization': `Bearer ${openRouterKey}` }
  });

  return response.json();
}
```

- [ ] **Step 2: Verify API functions are importable**

Import in app.js, confirm no syntax errors.

---

## Task 10: Execution Engine (Topological Sort + Run)

**Files:**
- Create: `seedance/js/execution.js`

- [ ] **Step 1: Implement workflow execution**

```javascript
// execution.js — Executes the node workflow in topological order
import { NODE_TYPES } from './node-types.js';
import { generateImage, submitVideoGeneration, pollVideoStatus } from './api.js';
import { setNodeState, updateNodeThumbnail } from './node-renderer.js';

export class ExecutionEngine {
  constructor(nodeManager, connectionManager, topbar) {
    this.nodeManager = nodeManager;
    this.connectionManager = connectionManager;
    this.topbar = topbar;
    this.onLog = null;  // callback(message, type)
  }

  _log(msg, type = '') {
    this.onLog?.(msg, type);
  }

  // Topological sort — returns nodes in execution order
  _topoSort() {
    const nodes = this.nodeManager.getAllNodes();
    const connections = this.connectionManager.connections;
    const inDegree = {};
    const adj = {};

    nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
    connections.forEach(c => {
      inDegree[c.toNode] = (inDegree[c.toNode] || 0) + 1;
      adj[c.fromNode] = adj[c.fromNode] || [];
      adj[c.fromNode].push(c.toNode);
    });

    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const sorted = [];
    while (queue.length > 0) {
      const id = queue.shift();
      sorted.push(id);
      (adj[id] || []).forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      });
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Circular dependency detected in workflow');
    }

    return sorted.map(id => this.nodeManager.getNode(id));
  }

  // Get the output data flowing into a node's specific input port
  _getInputData(nodeId, portId) {
    const conn = this.connectionManager.connections.find(
      c => c.toNode === nodeId && c.toPort === portId
    );
    if (!conn) return null;
    const sourceNode = this.nodeManager.getNode(conn.fromNode);
    return sourceNode?.output || null;
  }

  // Get all input data for a multi-input port (like ref_images)
  _getAllInputData(nodeId, portId) {
    const conns = this.connectionManager.connections.filter(
      c => c.toNode === nodeId && c.toPort === portId
    );
    return conns.map(c => {
      const sourceNode = this.nodeManager.getNode(c.fromNode);
      return sourceNode?.output;
    }).filter(Boolean);
  }

  async run() {
    const openRouterKey = this.topbar.getOpenRouterKey();
    const geminiKey = this.topbar.getGeminiKey();

    let sortedNodes;
    try {
      sortedNodes = this._topoSort();
    } catch (e) {
      this._log(e.message, 'error');
      return;
    }

    if (sortedNodes.length === 0) {
      this._log('No nodes to execute', 'error');
      return;
    }

    this.topbar.setRunning(true);
    this._log('Starting workflow execution...', '');

    // Reset all node states
    sortedNodes.forEach(n => { n.output = null; setNodeState(n.id, 'idle'); });

    for (const node of sortedNodes) {
      try {
        setNodeState(node.id, 'running');
        this._log(`Running: ${NODE_TYPES[node.type].label} (${node.id})`);

        switch (node.type) {
          case 'image-generator': {
            const imageUrl = await generateImage({
              geminiKey,
              prompt: node.data.prompt,
              model: node.data.model,
              aspectRatio: node.data.aspectRatio,
              style: node.data.style,
              negative: node.data.negative
            });
            node.output = imageUrl;
            updateNodeThumbnail(node.id, imageUrl, 'image');
            this._log(`Image generated successfully`, 'success');
            break;
          }

          case 'image-upload': {
            const url = node.data.imageData || node.data.imageUrl;
            if (!url) throw new Error('No image provided');
            node.output = url;
            updateNodeThumbnail(node.id, url, 'image');
            this._log(`Image loaded`, 'success');
            break;
          }

          case 'video-generator': {
            const firstFrame = this._getInputData(node.id, 'first_frame');
            const lastFrame = this._getInputData(node.id, 'last_frame');
            const refImgs = this._getAllInputData(node.id, 'ref_images');

            const frameImages = [];
            if (firstFrame) frameImages.push({ frameType: 'first_frame', url: firstFrame });
            if (lastFrame) frameImages.push({ frameType: 'last_frame', url: lastFrame });

            const result = await submitVideoGeneration({
              openRouterKey,
              prompt: node.data.prompt,
              duration: node.data.duration,
              resolution: node.data.resolution,
              aspectRatio: node.data.aspectRatio,
              size: node.data.size,
              seed: node.data.seed,
              generateAudio: node.data.generateAudio,
              frameImages: frameImages.length > 0 ? frameImages : undefined,
              inputReferences: refImgs.length > 0 ? refImgs : undefined
            });

            this._log(`Video job submitted: ${result.id}. Polling...`);

            // Poll until complete
            const pollingUrl = result.polling_url || `/api/v1/videos/${result.id}`;
            let videoUrl = null;
            while (true) {
              await new Promise(r => setTimeout(r, 5000));
              const status = await pollVideoStatus(pollingUrl, openRouterKey);
              this._log(`Video status: ${status.status}`);

              if (status.status === 'completed') {
                videoUrl = status.unsigned_urls?.[0];
                if (status.usage) this._log(`Cost: $${status.usage.cost}`, 'success');
                break;
              }
              if (status.status === 'failed') {
                throw new Error(status.error || 'Video generation failed');
              }
            }

            if (videoUrl) {
              node.output = videoUrl;
              updateNodeThumbnail(node.id, videoUrl, 'video');
              this._log(`Video generated successfully!`, 'success');
            }
            break;
          }

          case 'preview': {
            const media = this._getInputData(node.id, 'media');
            if (media) {
              node.output = media;
              const isVideo = typeof media === 'string' && (media.includes('.mp4') || media.includes('video'));
              updateNodeThumbnail(node.id, media, isVideo ? 'video' : 'image');
              this._log(`Preview updated`, 'success');
            }
            break;
          }
        }

        setNodeState(node.id, 'complete');
      } catch (err) {
        setNodeState(node.id, 'error');
        this._log(`Error in ${node.id}: ${err.message}`, 'error');
        // Continue to next node — don't stop entire workflow
      }
    }

    this.topbar.setRunning(false);
    this._log('Workflow execution finished.', 'success');
  }
}
```

- [ ] **Step 2: Verify execution engine compiles**

Import in app.js, confirm no syntax errors.

---

## Task 11: App Orchestrator (Wire Everything Together)

**Files:**
- Create: `seedance/js/app.js`

- [ ] **Step 1: Implement main app initialization**

```javascript
// app.js — Main orchestrator, initializes and connects all modules
import { Canvas } from './canvas.js';
import { NodeManager } from './node-manager.js';
import { ConnectionManager } from './connection.js';
import { Sidebar } from './sidebar.js';
import { Topbar } from './topbar.js';
import { ExecutionEngine } from './execution.js';

class App {
  constructor() {
    // Initialize canvas
    this.canvas = new Canvas(
      document.getElementById('canvasWrapper'),
      document.getElementById('canvas'),
      document.getElementById('connections')
    );

    // Initialize node manager
    this.nodeManager = new NodeManager(
      document.getElementById('canvas'),
      this.canvas
    );

    // Initialize connections
    this.connectionManager = new ConnectionManager(
      document.getElementById('connections'),
      this.nodeManager
    );

    // Initialize sidebar
    this.sidebar = new Sidebar(
      document.getElementById('sidebar'),
      this.nodeManager,
      this.canvas
    );

    // Initialize topbar
    this.topbar = new Topbar(document.getElementById('topbar'));

    // Initialize execution engine
    this.execution = new ExecutionEngine(
      this.nodeManager,
      this.connectionManager,
      this.topbar
    );

    this._wireEvents();
    this._setupDropZone();
    this._setupFileInput();
    this._setupLog();
  }

  _wireEvents() {
    // When a node is selected, show its settings
    this.nodeManager.onNodeSelected = (node) => {
      if (node) {
        this.sidebar.showSettings(node);
      } else {
        this.sidebar.showPalette();
      }
    };

    // When a node moves, update connections
    this.nodeManager.onNodeMoved = () => {
      this.connectionManager.updateAllConnections();
    };

    // When a node is deleted, remove its connections
    this.nodeManager.onNodeDeleted = (id) => {
      this.connectionManager.removeConnectionsForNode(id);
    };

    // Click on empty canvas to deselect
    document.getElementById('canvasWrapper').addEventListener('pointerdown', (e) => {
      if (e.target === document.getElementById('canvasWrapper') ||
          e.target === document.getElementById('canvas')) {
        this.nodeManager.deselectAll();
      }
    });

    // Run workflow
    this.topbar.onRun = () => this.execution.run();

    // Clear canvas
    this.topbar.onClearCanvas = () => {
      this.nodeManager.getAllNodes().forEach(n => this.nodeManager.deleteNode(n.id));
    };
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
      const nodeId = fileInput.dataset.targetNodeId;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.nodeManager.updateNodeData(nodeId, 'imageData', ev.target.result);
        const node = this.nodeManager.getNode(nodeId);
        if (node) {
          // Refresh settings panel
          this.sidebar.showSettings(node);
          // Update thumbnail
          import('./node-renderer.js').then(m => m.updateNodeThumbnail(nodeId, ev.target.result, 'image'));
        }
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }

  _setupLog() {
    const logPanel = document.getElementById('logPanel');
    this.execution.onLog = (msg, type) => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      const now = new Date().toLocaleTimeString();
      entry.innerHTML = `<span class="log-time">[${now}]</span> ${msg}`;
      logPanel.appendChild(entry);
      logPanel.scrollTop = logPanel.scrollHeight;
    };
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
```

- [ ] **Step 2: Verify full app boots**

Open `index.html`, confirm:
- No console errors
- Grid canvas visible
- Sidebar with 4 node types
- Topbar with API key inputs and Run button

---

## Task 12: Final Integration + Polish

**Files:**
- Modify: `seedance/index.html` — finalize all containers and scripts
- Modify: `seedance/css/style.css` — add missing styles

- [ ] **Step 1: Add bottom log panel to index.html**

Add a collapsible log panel at the bottom of the canvas area (like a dev tools console). It has a toggle button and shows execution logs.

- [ ] **Step 2: Add keyboard shortcuts**

- `Delete` / `Backspace` — delete selected node
- `Escape` — deselect all
- `Space` (hold) — pan mode cursor
- `Ctrl+0` — reset view

- [ ] **Step 3: Add connection validation visual feedback**

When dragging a connection, highlight compatible ports in green and incompatible ports in red/dim.

- [ ] **Step 4: Add node state animations in CSS**

- `state-running`: pulsing border animation
- `state-complete`: green border
- `state-error`: red border with shake animation

- [ ] **Step 5: Test complete workflow**

1. Drag "Image Generator" node → set prompt → Run → confirm image appears in thumbnail
2. Drag "Video Generator" node → connect image output to first_frame input → set video prompt → Run
3. Drag "Preview" node → connect video output to media input → verify preview
4. Test with Image Upload node (URL and file modes)
5. Test deleting nodes and connections
6. Test pan, zoom, and node dragging

---

## Summary of Dependencies

```
Task 1 (HTML/CSS) ← independent, do first
Task 2 (Canvas)   ← needs Task 1 DOM
Task 3 (Types)    ← independent data definitions
Task 4 (Renderer) ← needs Task 3
Task 5 (Manager)  ← needs Task 2 + 4
Task 6 (Connections) ← needs Task 3 + 5
Task 7 (Sidebar)  ← needs Task 3 + 5
Task 8 (Topbar)   ← needs Task 1
Task 9 (API)      ← independent
Task 10 (Execution) ← needs Task 5 + 6 + 8 + 9
Task 11 (App)      ← needs all above
Task 12 (Polish)   ← needs Task 11
```

Tasks 1, 3, 8, 9 can be parallelized. Tasks 2, 4 can be parallelized after Task 1. Tasks 5, 7 after their deps. Task 6 after 5. Tasks 10-12 are sequential.
