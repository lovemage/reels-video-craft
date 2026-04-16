// ===== Node Type Registry =====
// Defines all available node types with ports, defaults, and settings schemas.

export const NODE_TYPES = {
  'image-generator': {
    label: 'Image Generator',
    category: 'Generation',
    color: 'var(--node-image)',
    icon: '\u{1F5BC}\uFE0F',
    inputs: [],
    outputs: [{ id: 'image', type: 'image', label: 'Image' }],
    defaults: {
      prompt: '',
      model: 'imagen-4.0-generate-001',
      aspectRatio: '1:1',
      style: '',
      negative: ''
    },
    settings: [
      { key: 'prompt', type: 'textarea', label: 'Prompt', required: true, placeholder: 'Describe the image...' },
      {
        key: 'model', type: 'select', label: 'Model',
        options: [
          { value: 'imagen-4.0-generate-001', label: 'Standard' },
          { value: 'imagen-4.0-fast-generate-001', label: 'Fast' },
          { value: 'imagen-4.0-ultra-generate-001', label: 'Ultra' }
        ]
      },
      {
        key: 'aspectRatio', type: 'select', label: 'Aspect Ratio',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' }
        ]
      },
      { key: 'style', type: 'text', label: 'Style', placeholder: 'e.g. photorealistic, watercolor, anime...' },
      { key: 'negative', type: 'text', label: 'Negative Prompt', placeholder: 'e.g. no text, no watermark...' }
    ]
  },

  'image-upload': {
    label: 'Image Upload',
    category: 'Input',
    color: 'var(--node-upload)',
    icon: '\u{1F4C1}',
    inputs: [],
    outputs: [{ id: 'image', type: 'image', label: 'Image' }],
    defaults: {
      imageUrl: '',
      imageData: null
    },
    settings: [
      { key: 'imageUrl', type: 'url', label: 'Image URL', placeholder: 'https://example.com/image.jpg' },
      { key: '_upload', type: 'file', label: 'Upload Image', accept: 'image/*' }
    ]
  },

  'video-generator': {
    label: 'Video Generator',
    category: 'Generation',
    color: 'var(--node-video)',
    icon: '\u{1F3AC}',
    inputs: [
      { id: 'first_frame', type: 'image', label: 'First Frame' },
      { id: 'last_frame', type: 'image', label: 'Last Frame' },
      { id: 'ref_images', type: 'image', label: 'Ref Images', multiple: true }
    ],
    outputs: [{ id: 'video', type: 'video', label: 'Video' }],
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
      { key: 'prompt', type: 'textarea', label: 'Prompt', required: true, placeholder: 'Describe the video motion...' },
      { key: 'duration', type: 'number', label: 'Duration (s)', min: 1, max: 30, step: 1 },
      {
        key: 'resolution', type: 'select', label: 'Resolution',
        options: [
          { value: '', label: 'Auto' },
          { value: '480p', label: '480p ($0.0538/s)' },
          { value: '720p', label: '720p ($0.121/s)' },
          { value: '1080p', label: '1080p ($0.2722/s)' },
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K' }
        ]
      },
      {
        key: 'aspectRatio', type: 'select', label: 'Aspect Ratio',
        options: [
          { value: '', label: 'Auto' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' }
        ]
      },
      { key: 'size', type: 'text', label: 'Size', placeholder: 'e.g. 1280x720' },
      { key: 'seed', type: 'number', label: 'Seed', placeholder: 'Random if empty' },
      { key: 'generateAudio', type: 'toggle', label: 'Generate Audio' }
    ]
  },

  'preview': {
    label: 'Preview',
    category: 'Output',
    color: 'var(--node-preview)',
    icon: '\u{1F441}\uFE0F',
    inputs: [{ id: 'media', type: 'any', label: 'Media' }],
    outputs: [],
    defaults: {},
    settings: []
  }
};

// Port compatibility map — which output types can connect to which input types
export const PORT_COMPAT = {
  'image': ['image', 'any'],
  'video': ['video', 'any'],
  'any': ['image', 'video', 'any']
};
