// ===== Node Manager =====
// Manages node instances: CRUD operations, drag, selection, deletion.

import { NODE_TYPES } from './node-types.js';
import { createNodeElement, setNodeState } from './node-renderer.js';

export class NodeManager {
  constructor(canvasEl, canvasInstance) {
    this.canvas = canvasInstance;       // Canvas class for coordinate conversion
    this.canvasEl = canvasEl;           // DOM element (#canvas) to append nodes to
    this.nodes = new Map();             // id -> { id, type, x, y, data, state, el, output }
    this.selectedNodeId = null;
    this.nextId = 1;
    this._dragState = null;

    // Callbacks (set by app.js)
    this.onNodeSelected = null;         // callback(node|null)
    this.onNodeMoved = null;            // callback(nodeId)
    this.onNodeDeleted = null;          // callback(nodeId)

    this._bindDragEvents();
  }

  /**
   * Add a new node of the given type at canvas coordinates (x, y).
   * @param {string} type - Key from NODE_TYPES
   * @param {number} x - Canvas x coordinate
   * @param {number} y - Canvas y coordinate
   * @returns {Object} The created node object
   */
  addNode(type, x, y) {
    const typeDef = NODE_TYPES[type];
    if (!typeDef) {
      console.error(`Unknown node type: ${type}`);
      return null;
    }

    const id = this.nextId++;
    const node = {
      id,
      type,
      x,
      y,
      data: { ...typeDef.defaults },
      state: 'idle',
      output: null,
      el: null,
    };

    const el = createNodeElement(node);
    if (!el) return null;

    node.el = el;
    this.canvasEl.appendChild(el);
    this.nodes.set(id, node);

    // Bind delete button
    const deleteBtn = el.querySelector('.node-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteNode(id);
      });
    }

    // Bind header pointerdown for selection (excluding delete button)
    const header = el.querySelector('.node-header');
    if (header) {
      header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.node-delete')) return;
        this.selectNode(id);
      });
    }

    return node;
  }

  /**
   * Delete a node by id.
   * @param {number} id
   */
  deleteNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove DOM element
    if (node.el && node.el.parentNode) {
      node.el.parentNode.removeChild(node.el);
    }

    this.nodes.delete(id);

    // Clear selection if this was the selected node
    if (this.selectedNodeId === id) {
      this.selectedNodeId = null;
      if (this.onNodeSelected) this.onNodeSelected(null);
    }

    if (this.onNodeDeleted) this.onNodeDeleted(id);
  }

  /**
   * Select a node by id.
   * @param {number} id
   */
  selectNode(id) {
    // Deselect previous
    if (this.selectedNodeId !== null && this.selectedNodeId !== id) {
      const prevNode = this.nodes.get(this.selectedNodeId);
      if (prevNode && prevNode.el) {
        prevNode.el.classList.remove('selected');
      }
    }

    // Select new
    const node = this.nodes.get(id);
    if (!node) return;

    node.el.classList.add('selected');
    this.selectedNodeId = id;

    if (this.onNodeSelected) this.onNodeSelected(node);
  }

  /**
   * Deselect all nodes.
   */
  deselectAll() {
    if (this.selectedNodeId !== null) {
      const node = this.nodes.get(this.selectedNodeId);
      if (node && node.el) {
        node.el.classList.remove('selected');
      }
    }
    this.selectedNodeId = null;
    if (this.onNodeSelected) this.onNodeSelected(null);
  }

  /**
   * Update a data field on a node.
   * @param {number} id
   * @param {string} key
   * @param {*} value
   */
  updateNodeData(id, key, value) {
    const node = this.nodes.get(id);
    if (node) {
      node.data[key] = value;
    }
  }

  /**
   * Get a node by id.
   * @param {number} id
   * @returns {Object|undefined}
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes as an array.
   * @returns {Object[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Bind drag events for moving nodes on the canvas.
   */
  _bindDragEvents() {
    // pointerdown on .node-header (but not .node-delete)
    this.canvasEl.addEventListener('pointerdown', (e) => {
      const header = e.target.closest('.node-header');
      if (!header) return;
      if (e.target.closest('.node-delete')) return;

      const nodeEl = header.closest('.node');
      if (!nodeEl) return;

      const nodeId = parseInt(nodeEl.dataset.nodeId, 10);
      const node = this.nodes.get(nodeId);
      if (!node) return;

      // Stop propagation to prevent canvas panning
      e.stopPropagation();

      this._dragState = {
        nodeId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startNodeX: node.x,
        startNodeY: node.y,
      };
    });

    // pointermove on window
    window.addEventListener('pointermove', (e) => {
      if (!this._dragState) return;

      const { nodeId, startMouseX, startMouseY, startNodeX, startNodeY } = this._dragState;
      const node = this.nodes.get(nodeId);
      if (!node) {
        this._dragState = null;
        return;
      }

      const dx = (e.clientX - startMouseX) / this.canvas.scale;
      const dy = (e.clientY - startMouseY) / this.canvas.scale;

      node.x = startNodeX + dx;
      node.y = startNodeY + dy;
      node.el.style.left = `${node.x}px`;
      node.el.style.top = `${node.y}px`;

      if (this.onNodeMoved) this.onNodeMoved(nodeId);
    });

    // pointerup on window
    window.addEventListener('pointerup', () => {
      this._dragState = null;
    });
  }
}
