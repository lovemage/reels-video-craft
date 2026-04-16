export class Canvas {
  constructor(wrapperEl, canvasEl, svgEl) {
    this.wrapper = wrapperEl;
    this.canvas = canvasEl;
    this.svg = svgEl;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;

    this._applyTransform();
    this._bindEvents();
  }

  /**
   * Convert screen (client) coordinates to canvas coordinates.
   */
  screenToCanvas(screenX, screenY) {
    const rect = this.wrapper.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.offsetX) / this.scale,
      y: (screenY - rect.top - this.offsetY) / this.scale,
    };
  }

  /**
   * Convert canvas coordinates to screen (client) coordinates.
   */
  canvasToScreen(cx, cy) {
    const rect = this.wrapper.getBoundingClientRect();
    return {
      x: cx * this.scale + this.offsetX + rect.left,
      y: cy * this.scale + this.offsetY + rect.top,
    };
  }

  /**
   * Apply the current transform to both the canvas div and the SVG overlay.
   */
  _applyTransform() {
    const t = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    this.canvas.style.transform = t;
    this.svg.style.transform = t;
  }

  /**
   * Bind pointer and wheel events for panning and zooming.
   */
  _bindEvents() {
    // --- Panning ---
    this.wrapper.addEventListener('pointerdown', (e) => {
      // Middle-click always pans
      if (e.button === 1) {
        this._startPan(e);
        return;
      }
      // Left-click pans only if clicking on the wrapper or canvas itself (not on nodes)
      if (e.button === 0 && (e.target === this.wrapper || e.target === this.canvas || e.target === this.svg)) {
        this._startPan(e);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPanning) return;
      this.offsetX += e.clientX - this._panStartX;
      this.offsetY += e.clientY - this._panStartY;
      this._panStartX = e.clientX;
      this._panStartY = e.clientY;
      this._applyTransform();
    });

    window.addEventListener('pointerup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.wrapper.classList.remove('panning');
        this.wrapper.releasePointerCapture(this._panPointerId);
      }
    });

    // --- Zooming ---
    this.wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(3, Math.max(0.2, this.scale * delta));

      const rect = this.wrapper.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      this.offsetX = mx - (mx - this.offsetX) * (newScale / this.scale);
      this.offsetY = my - (my - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;

      this._applyTransform();
    }, { passive: false });
  }

  /**
   * Start a pan operation.
   */
  _startPan(e) {
    this.isPanning = true;
    this._panStartX = e.clientX;
    this._panStartY = e.clientY;
    this._panPointerId = e.pointerId;
    this.wrapper.setPointerCapture(e.pointerId);
    this.wrapper.classList.add('panning');
  }

  /**
   * Reset the view to default (scale 1, centered at origin).
   */
  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._applyTransform();
  }
}
