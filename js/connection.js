// ===== Connection Manager =====
// Manages SVG bezier connections between node ports.

import { PORT_COMPAT } from './node-types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class ConnectionManager {
  constructor(svgEl, nodeManager) {
    this.svg = svgEl;
    this.nodeManager = nodeManager;
    this.connections = [];    // [{ id, fromNode, fromPort, toNode, toPort, pathEl }]
    this.nextId = 1;
    this._drawingState = null;
    this._tempPath = null;
    this._bindEvents();
  }

  /**
   * Get the position of a port dot in canvas coordinates.
   * @param {number} nodeId
   * @param {string} portId
   * @param {string} portDirection - 'in' or 'out'
   * @returns {{ x: number, y: number }|null}
   */
  _getPortPosition(nodeId, portId, portDirection) {
    const selector = `.port-${portDirection}[data-node-id="${nodeId}"][data-port-id="${portId}"] .port-dot`;
    const dot = this.nodeManager.canvasEl.querySelector(selector);
    if (!dot) return null;

    const dotRect = dot.getBoundingClientRect();
    const canvasRect = this.nodeManager.canvasEl.getBoundingClientRect();

    const x = (dotRect.left + dotRect.width / 2 - canvasRect.left - this.nodeManager.canvas.offsetX) / this.nodeManager.canvas.scale;
    const y = (dotRect.top + dotRect.height / 2 - canvasRect.top - this.nodeManager.canvas.offsetY) / this.nodeManager.canvas.scale;

    return { x, y };
  }

  /**
   * Create a bezier path string between two points.
   */
  _createBezierPath(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  /**
   * Add a connection between an output port and an input port.
   * @param {number} fromNodeId
   * @param {string} fromPortId
   * @param {number} toNodeId
   * @param {string} toPortId
   * @returns {Object} The created connection
   */
  addConnection(fromNodeId, fromPortId, toNodeId, toPortId) {
    // Remove any existing connection to this input (one connection per input)
    const existing = this.connections.find(
      (c) => c.toNode === toNodeId && c.toPort === toPortId
    );
    if (existing) {
      this.removeConnection(existing.id);
    }

    // Create SVG path
    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.classList.add('connection-path');
    const connId = this.nextId++;
    pathEl.dataset.connId = connId;
    this.svg.appendChild(pathEl);

    const conn = {
      id: connId,
      fromNode: fromNodeId,
      fromPort: fromPortId,
      toNode: toNodeId,
      toPort: toPortId,
      pathEl,
    };

    this.connections.push(conn);
    this._updateConnectionPath(conn);

    return conn;
  }

  /**
   * Remove a connection by id.
   * @param {number} id
   */
  removeConnection(id) {
    const idx = this.connections.findIndex((c) => c.id === id);
    if (idx === -1) return;

    const conn = this.connections[idx];
    if (conn.pathEl && conn.pathEl.parentNode) {
      conn.pathEl.parentNode.removeChild(conn.pathEl);
    }

    this.connections.splice(idx, 1);
  }

  /**
   * Remove all connections involving a given node.
   * @param {number} nodeId
   */
  removeConnectionsForNode(nodeId) {
    const toRemove = this.connections.filter(
      (c) => c.fromNode === nodeId || c.toNode === nodeId
    );
    for (const conn of toRemove) {
      this.removeConnection(conn.id);
    }
  }

  /**
   * Get all connections where the given node is the target (input).
   * @param {number} nodeId
   * @returns {Object[]}
   */
  getInputConnections(nodeId) {
    return this.connections.filter((c) => c.toNode === nodeId);
  }

  /**
   * Update the SVG path for a single connection.
   * @param {Object} conn
   */
  _updateConnectionPath(conn) {
    const fromPos = this._getPortPosition(conn.fromNode, conn.fromPort, 'out');
    const toPos = this._getPortPosition(conn.toNode, conn.toPort, 'in');
    if (!fromPos || !toPos) return;

    const d = this._createBezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
    conn.pathEl.setAttribute('d', d);
  }

  /**
   * Update all connection paths (e.g. after a node moves or canvas transforms).
   */
  updateAllConnections() {
    for (const conn of this.connections) {
      this._updateConnectionPath(conn);
    }
  }

  /**
   * Bind interaction events for creating and removing connections.
   */
  _bindEvents() {
    const canvasEl = this.nodeManager.canvasEl;

    // --- Start drawing a connection from a port dot ---
    canvasEl.addEventListener('pointerdown', (e) => {
      const dot = e.target.closest('.port-dot');
      if (!dot) return;

      const port = dot.closest('.port');
      if (!port) return;

      e.stopPropagation();
      e.preventDefault();

      const nodeId = parseInt(port.dataset.nodeId, 10);
      const portId = port.dataset.portId;
      const portType = port.dataset.portType;
      const isOutput = port.classList.contains('port-out');
      const direction = isOutput ? 'out' : 'in';

      const pos = this._getPortPosition(nodeId, portId, direction);
      if (!pos) return;

      this._drawingState = {
        fromNodeId: isOutput ? nodeId : null,
        fromPortId: isOutput ? portId : null,
        fromPortType: isOutput ? portType : null,
        toNodeId: isOutput ? null : nodeId,
        toPortId: isOutput ? null : portId,
        toPortType: isOutput ? null : portType,
        startX: pos.x,
        startY: pos.y,
        reverse: !isOutput, // true if started from an input port
      };

      // Create temp path
      this._tempPath = document.createElementNS(SVG_NS, 'path');
      this._tempPath.classList.add('connection-path', 'connection-temp');
      this.svg.appendChild(this._tempPath);
    });

    // --- Draw temp connection while moving ---
    window.addEventListener('pointermove', (e) => {
      if (!this._drawingState || !this._tempPath) return;

      const cursorPos = this.nodeManager.canvas.screenToCanvas(e.clientX, e.clientY);

      let d;
      if (this._drawingState.reverse) {
        // Started from input, draw from cursor to start
        d = this._createBezierPath(cursorPos.x, cursorPos.y, this._drawingState.startX, this._drawingState.startY);
      } else {
        // Started from output, draw from start to cursor
        d = this._createBezierPath(this._drawingState.startX, this._drawingState.startY, cursorPos.x, cursorPos.y);
      }
      this._tempPath.setAttribute('d', d);
    });

    // --- Complete or cancel connection on pointerup ---
    window.addEventListener('pointerup', (e) => {
      if (!this._drawingState) return;

      const state = this._drawingState;

      // Check if cursor is over a valid port
      const elUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
      const dot = elUnderCursor ? elUnderCursor.closest('.port-dot') : null;
      const port = dot ? dot.closest('.port') : null;

      if (port) {
        const targetNodeId = parseInt(port.dataset.nodeId, 10);
        const targetPortId = port.dataset.portId;
        const targetPortType = port.dataset.portType;
        const targetIsOutput = port.classList.contains('port-out');

        // Determine from/to based on draw direction
        let fromNodeId, fromPortId, fromPortType, toNodeId, toPortId, toPortType;

        if (state.reverse) {
          // Started from input, target should be output
          if (targetIsOutput) {
            fromNodeId = targetNodeId;
            fromPortId = targetPortId;
            fromPortType = targetPortType;
            toNodeId = state.toNodeId;
            toPortId = state.toPortId;
            toPortType = state.toPortType;
          }
        } else {
          // Started from output, target should be input
          if (!targetIsOutput) {
            fromNodeId = state.fromNodeId;
            fromPortId = state.fromPortId;
            fromPortType = state.fromPortType;
            toNodeId = targetNodeId;
            toPortId = targetPortId;
            toPortType = targetPortType;
          }
        }

        // Validate connection
        if (
          fromNodeId != null &&
          toNodeId != null &&
          fromNodeId !== toNodeId &&
          this._isCompatible(fromPortType, toPortType)
        ) {
          this.addConnection(fromNodeId, fromPortId, toNodeId, toPortId);
        }
      }

      // Cleanup temp path and drawing state
      if (this._tempPath && this._tempPath.parentNode) {
        this._tempPath.parentNode.removeChild(this._tempPath);
      }
      this._tempPath = null;
      this._drawingState = null;
    });

    // --- Right-click on connection to remove it ---
    this.svg.addEventListener('contextmenu', (e) => {
      const pathEl = e.target.closest('.connection-path');
      if (!pathEl || pathEl.classList.contains('connection-temp')) return;

      e.preventDefault();

      const connId = parseInt(pathEl.dataset.connId, 10);
      if (!isNaN(connId)) {
        this.removeConnection(connId);
      }
    });
  }

  /**
   * Check if an output port type is compatible with an input port type.
   * @param {string} outputType
   * @param {string} inputType
   * @returns {boolean}
   */
  _isCompatible(outputType, inputType) {
    const compatList = PORT_COMPAT[outputType];
    if (!compatList) return false;
    return compatList.includes(inputType);
  }
}
