// ===== Node Renderer =====
// Creates and updates node DOM elements on the canvas.

import { NODE_TYPES } from './node-types.js';

/**
 * Create a DOM element for a node.
 * @param {Object} node - { id, type, x, y, data, state }
 * @returns {HTMLElement} The node element
 */
export function createNodeElement(node) {
  const typeDef = NODE_TYPES[node.type];
  if (!typeDef) {
    console.error(`Unknown node type: ${node.type}`);
    return null;
  }

  const el = document.createElement('div');
  el.className = 'node';
  if (node.state && node.state !== 'idle') {
    el.classList.add(`state-${node.state}`);
  }
  el.dataset.nodeId = node.id;
  el.style.left = `${node.x}px`;
  el.style.top = `${node.y}px`;

  // --- Header ---
  const header = document.createElement('div');
  header.className = 'node-header';
  header.style.background = typeDef.color;

  const icon = document.createElement('span');
  icon.className = 'node-icon';
  icon.textContent = typeDef.icon;

  const title = document.createElement('span');
  title.className = 'node-title';
  title.textContent = typeDef.label;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'node-delete';
  deleteBtn.textContent = '\u00D7';
  deleteBtn.title = 'Delete node';

  header.append(icon, title, deleteBtn);

  // --- Body ---
  const body = document.createElement('div');
  body.className = 'node-body';

  const thumb = document.createElement('div');
  thumb.className = 'node-preview-thumb';
  thumb.dataset.nodeId = node.id;
  body.appendChild(thumb);

  // --- Ports container ---
  const ports = document.createElement('div');
  ports.className = 'node-ports';

  // Input ports (left side)
  const portsIn = document.createElement('div');
  portsIn.className = 'node-ports-in';
  for (const input of typeDef.inputs) {
    portsIn.appendChild(createPortElement(node.id, input, 'in'));
  }

  // Output ports (right side)
  const portsOut = document.createElement('div');
  portsOut.className = 'node-ports-out';
  for (const output of typeDef.outputs) {
    portsOut.appendChild(createPortElement(node.id, output, 'out'));
  }

  ports.append(portsIn, portsOut);

  // --- Assemble ---
  el.append(header, body, ports);
  return el;
}

/**
 * Create a single port element.
 */
function createPortElement(nodeId, portDef, direction) {
  const port = document.createElement('div');
  port.className = `port port-${direction}`;
  port.dataset.nodeId = nodeId;
  port.dataset.portId = portDef.id;
  port.dataset.portType = portDef.type;

  const dot = document.createElement('div');
  dot.className = 'port-dot';

  const label = document.createElement('span');
  label.className = 'port-label';
  label.textContent = portDef.label;

  if (direction === 'in') {
    // dot first, then label
    port.append(dot, label);
  } else {
    // label first, then dot
    port.append(label, dot);
  }

  return port;
}

/**
 * Update the thumbnail preview inside a node.
 * @param {string} nodeId
 * @param {string} mediaUrl - URL or data URI of the media
 * @param {'image'|'video'} mediaType
 */
export function updateNodeThumbnail(nodeId, mediaUrl, mediaType) {
  const thumb = document.querySelector(`.node-preview-thumb[data-node-id="${nodeId}"]`);
  if (!thumb) return;

  if (mediaType === 'image') {
    thumb.innerHTML = `<img src="${mediaUrl}" alt="Preview" />`;
  } else if (mediaType === 'video') {
    thumb.innerHTML = `<video src="${mediaUrl}" muted autoplay loop></video>`;
  }
}

/**
 * Set the visual state of a node.
 * @param {string} nodeId
 * @param {'idle'|'running'|'complete'|'error'} state
 */
export function setNodeState(nodeId, state) {
  const el = document.querySelector(`.node[data-node-id="${nodeId}"]`);
  if (!el) return;

  // Remove all existing state classes
  el.classList.remove('state-idle', 'state-running', 'state-complete', 'state-error');

  // Add the new state class (skip for idle — it's the default)
  if (state && state !== 'idle') {
    el.classList.add(`state-${state}`);
  }
}
