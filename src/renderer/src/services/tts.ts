/**
 * 语音朗读服务
 * 使用 Web Speech API (macOS 原生语音引擎)
 */

/**
 * 朗读文本
 * @param rate 语速 0.3~2.0
 */
export function speakText(
  text: string,
  lang = 'en-US',
  rate = 0.6,
  onEnd?: () => void
): void {
  if (!('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = 1

  const voices = window.speechSynthesis.getVoices()
  const langVoices = voices.filter((v) => v.lang.startsWith(lang.split('-')[0]))
  if (langVoices.length > 0) {
    const premium = langVoices.find(
      (v) => v.name.includes('Premium') || v.name.includes('Enhanced')
    )
    utterance.voice = premium || langVoices[0]
  }

  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

/**
 * 朗读一个单词
 */
export function speakWord(word: string, lang = 'en', rate = 0.5): void {
  speakText(word, lang, rate)
}

/**
 * 朗读一个句子
 */
export function speakSentence(sentence: string, lang = 'en', rate = 0.6): void {
  speakText(sentence, lang, rate)
}
