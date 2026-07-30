/**
 * brief.json 的唯一組裝點。intake（單支）與 series（整套系列）都走這裡，
 * 欄位才不會在兩條入口之間走鐘。
 */
export function composeBrief(answers, reg, chosen, { fps = 30 } = {}) {
  const parseSize = (aspectId) => {
    const size = reg.aspects.find((a) => a.id === aspectId)?.size;
    if (!size || !/^\d+x\d+$/.test(size)) return null;
    const [width, height] = size.split('x').map(Number);
    return { width, height };
  };

  return {
    project: answers.project,
    createdAt: new Date().toISOString(),
    input: answers.input,
    aspect: answers.aspect,
    aspectSize:
      answers.aspect === 'custom'
        ? `${answers.width}x${answers.height}`
        : (reg.aspects.find((a) => a.id === answers.aspect)?.size ?? null),
    width: answers.width ?? parseSize(answers.aspect)?.width ?? null,
    height: answers.height ?? parseSize(answers.aspect)?.height ?? null,
    fps,
    method: answers.method,
    methodCode: chosen.code,
    voice: answers.voice ?? null,
    ttsModel: answers.ttsModel ?? null,
    ttsVoice: answers.ttsVoice ?? null,
    captions: answers.captions ?? null,
    captionLanguages: answers.captionLanguages ?? null,
    captionLanguageSpec: answers.captionLanguageSpec ?? null,
    avatarMode: answers.avatarMode ?? null,
    avatarSource: answers.avatarSource ?? null,
    avatarAsset: answers.avatarAsset ?? null,
    avatarProvider: answers.avatarProvider ?? null,
    avatarEndpointEnv: answers.avatarEndpointEnv ?? null,
    avatarApiKeyEnv: answers.avatarApiKeyEnv ?? null,
    mascot: answers.mascot ?? 'none',
    bgm: answers.bgm ?? 'none',
    bgmSource: answers.bgmSource ?? null,
    bgmLicense: answers.bgmLicense ?? null,
    targetDuration: answers.duration ?? '依旁白',
    ...(answers.series ? { series: answers.series } : {}),
    timeline: { durationSec: null, totalFrames: null, lockedAt: null },
    progress: { completed: [], notes: {} },
  };
}
