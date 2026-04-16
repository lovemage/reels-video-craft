import { NODE_TYPES } from './node-types.js';
import { generateImage, submitVideoGeneration, pollVideoStatus } from './api.js';
import { setNodeState, updateNodeThumbnail } from './node-renderer.js';

export class ExecutionEngine {
  constructor(nodeManager, connectionManager, topbar) {
    this.nodeManager = nodeManager;
    this.connectionManager = connectionManager;
    this.topbar = topbar;
    this.onLog = null;  // callback(message, type) — type is '' | 'error' | 'success'
  }

  _log(msg, type = '') { this.onLog?.(msg, type); }

  // Topological sort: returns nodes in execution order (sources first)
  _topoSort() {
    const nodes = this.nodeManager.getAllNodes();
    const connections = this.connectionManager.connections;
    const inDegree = {};
    const adj = {};

    nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
    connections.forEach(c => {
      inDegree[c.toNode] = (inDegree[c.toNode] || 0) + 1;
      if (!adj[c.fromNode]) adj[c.fromNode] = [];
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

    if (sorted.length !== nodes.length) throw new Error('Circular dependency detected in workflow');
    return sorted.map(id => this.nodeManager.getNode(id));
  }

  // Get the output data flowing into a node's specific input port
  _getInputData(nodeId, portId) {
    const conn = this.connectionManager.connections.find(c => c.toNode === nodeId && c.toPort === portId);
    if (!conn) return null;
    return this.nodeManager.getNode(conn.fromNode)?.output || null;
  }

  // Get all input data for a multi-input port
  _getAllInputData(nodeId, portId) {
    return this.connectionManager.connections
      .filter(c => c.toNode === nodeId && c.toPort === portId)
      .map(c => this.nodeManager.getNode(c.fromNode)?.output)
      .filter(Boolean);
  }

  async run() {
    const openRouterKey = this.topbar.getOpenRouterKey();
    const geminiKey = this.topbar.getGeminiKey();

    let sortedNodes;
    try { sortedNodes = this._topoSort(); } catch (e) { this._log(e.message, 'error'); return; }
    if (sortedNodes.length === 0) { this._log('No nodes to execute', 'error'); return; }

    this.topbar.setRunning(true);
    this._log('Starting workflow execution...');
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
            this._log('Image generated successfully', 'success');
            break;
          }
          case 'image-upload': {
            const url = node.data.imageData || node.data.imageUrl;
            if (!url) throw new Error('No image provided');
            node.output = url;
            updateNodeThumbnail(node.id, url, 'image');
            this._log('Image loaded', 'success');
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
            const pollingUrl = result.polling_url || `/api/v1/videos/${result.id}`;

            // Poll loop
            while (true) {
              await new Promise(r => setTimeout(r, 5000));
              const status = await pollVideoStatus(pollingUrl, openRouterKey);
              this._log(`Video status: ${status.status}`);
              if (status.status === 'completed') {
                const videoUrl = status.unsigned_urls?.[0];
                if (status.usage) this._log(`Cost: $${status.usage.cost}`, 'success');
                if (videoUrl) {
                  node.output = videoUrl;
                  updateNodeThumbnail(node.id, videoUrl, 'video');
                }
                this._log('Video generated!', 'success');
                break;
              }
              if (status.status === 'failed') {
                throw new Error(status.error || 'Video generation failed');
              }
            }
            break;
          }
          case 'preview': {
            const media = this._getInputData(node.id, 'media');
            if (media) {
              node.output = media;
              const isVideo = typeof media === 'string' && (media.includes('.mp4') || media.includes('video'));
              updateNodeThumbnail(node.id, media, isVideo ? 'video' : 'image');
              this._log('Preview updated', 'success');
            }
            break;
          }
        }
        setNodeState(node.id, 'complete');
      } catch (err) {
        setNodeState(node.id, 'error');
        this._log(`Error in ${node.id}: ${err.message}`, 'error');
      }
    }

    this.topbar.setRunning(false);
    this._log('Workflow execution finished.', 'success');
  }
}
