export async function generateImage({ geminiKey, prompt, model, aspectRatio, style, negative }) {
  if (!geminiKey) throw new Error('Gemini API Key is required');
  if (!prompt) throw new Error('Prompt is required for image generation');

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

export async function submitVideoGeneration({ openRouterKey, prompt, duration, resolution, aspectRatio, size, seed, generateAudio, frameImages, inputReferences }) {
  if (!openRouterKey) throw new Error('OpenRouter API Key is required');
  if (!prompt) throw new Error('Prompt is required for video generation');

  const body = { model: 'bytedance/seedance-2.0-fast', prompt };

  if (duration) body.duration = parseInt(duration);
  if (resolution) body.resolution = resolution;
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (size) body.size = size;
  if (seed !== '' && seed !== undefined && seed !== null) body.seed = parseInt(seed);
  if (generateAudio) body.generate_audio = true;

  if (frameImages && frameImages.length > 0) {
    body.frame_images = frameImages.map(f => ({
      type: 'image_url',
      frame_type: f.frameType,
      image_url: { url: f.url }
    }));
  }

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

export async function pollVideoStatus(pollingUrl, openRouterKey) {
  const fullUrl = pollingUrl.startsWith('http') ? pollingUrl : `https://openrouter.ai${pollingUrl}`;
  const response = await fetch(fullUrl, {
    headers: { 'Authorization': `Bearer ${openRouterKey}` }
  });
  return response.json();
}
