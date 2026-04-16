import { Canvas } from './canvas.js';

document.addEventListener('DOMContentLoaded', () => {
  window.canvas = new Canvas(
    document.getElementById('canvasWrapper'),
    document.getElementById('canvas'),
    document.getElementById('connections')
  );

  // Log panel toggle
  const logPanel = document.getElementById('logPanel');
  const logToggle = logPanel.querySelector('.log-toggle');
  if (logToggle) {
    logToggle.addEventListener('click', () => {
      logPanel.classList.toggle('collapsed');
      logToggle.querySelector('.toggle-arrow').textContent =
        logPanel.classList.contains('collapsed') ? '\u25B2' : '\u25BC';
    });
  }
});
