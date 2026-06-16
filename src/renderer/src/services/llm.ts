/**
 * LLM API 服务
 * 支持 OpenAI / Anthropic / OpenRouter / Ollama
 */
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Settings } from '../store/settingsStore'
import type { Character } from '../data/presetCharacters'

/** 缓存 Anthropic SDK 动态导入，避免每次调用都走模块 I/O */
let anthropicModule: Promise<typeof import('@anthropic-ai/sdk')> | null = null

function getAnthropicModule(): Promise<typeof import('@anthropic-ai/sdk')> {
  if (!anthropicModule) {
    anthropicModule = import('@anthropic-ai/sdk')
  }
  return anthropicModule
}

export async function createAnthropicClient(settings: Settings) {
  const { Anthropic } = await getAnthropicModule()
  return new Anthropic({
    apiKey: settings.apiKey,
    baseURL: settings.apiBaseUrl || undefined,
    dangerouslyAllowBrowser: true,
  })
}

/** Gemini 客户端工厂 — SDK 轻量，每次新建即可 */
export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey)
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

interface LLMResponse {
  content: string
  translation?: string
}

/**
 * 构建语言学习的 System Prompt
 */
function buildSystemPrompt(
  settings: Settings,
  character: Character,
  sceneContext?: string
): string {
  const levelHint = settings.level === 'beginner'
    ? '请用简单的词汇和短句'
    : settings.level === 'intermediate'
      ? '请用中等难度的日常表达'
      : '请用自然的母语水平表达'

  const parts: string[] = [
    `你是 ${character.name}。${character.background}`,
    `性格: ${character.personality}`,
    `说话方式: ${character.speakingStyle}`,
    `请始终用 ${settings.targetLanguage} 与用户聊天。${levelHint}。`,
  ]

  if (settings.enableCorrection) {
    parts.push(
      `用户用 ${settings.targetLanguage} 表达有错误时，用 ✏️ 简短纠正。用户说 ${settings.nativeLanguage} 时不纠错。`
    )
  }

  if (sceneContext) {
    parts.push(`当前场景: ${sceneContext}`)
  }

  if (character.isLearner) {
    parts.push(`你也在学习 ${settings.targetLanguage}，偶尔会犯小错误，有时会向用户请教。`)
  }

  return parts.join('\n\n')
}

/**
 * 构建群聊模式中某个角色的 prompt
 */
function buildGroupSystemPrompt(
  settings: Settings,
  character: Character,
  otherCharacters: Character[],
  sceneContext?: string
): string {
  const basePrompt = buildSystemPrompt(settings, character)
  const otherNames = otherCharacters.map((c) => `${c.emoji} ${c.name}（${c.occupation}）`).join('、')

  return `${basePrompt}

当前是群聊模式。参与聊天的有: 用户 + ${otherNames}
- 和其他角色自然互动，不必等用户说话
- 群聊中纠错用正确说法自然重述，不要打断对话流`
}

/**
 * 构建对话消息列表
 */
function buildMessages(
  systemPrompt: string,
  history: { role: string; content: string; characterName?: string }[],
  userInput: string,
  isGroup: boolean
): LLMMessage[] {
  const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }]

  // 添加历史消息
  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant' && msg.characterName) {
      // 群聊中需要标注角色名
      messages.push({
        role: 'assistant',
        content: msg.content,
        name: msg.characterName,
      })
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content })
    }
  }

  // 添加当前用户输入
  messages.push({ role: 'user', content: userInput })

  return messages
}

/**
 * 创建 API 客户端
 */
export function createClient(settings: Settings): OpenAI {
  const config: Record<string, unknown> = {
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true, // Electron renderer 环境
  }

  if (settings.apiBaseUrl) {
    config.baseURL = settings.apiBaseUrl
  }

  return new OpenAI(config)
}

/**
 * 统一 LLM API 调用层 — 根据 provider 分发给 Anthropic / Gemini / OpenAI 兼容
 *
 * 所有需要走 LLM 的地方统一经过此函数，消除各调用点重复的 provider 分发逻辑。
 */
export async function callLLM(
  settings: Settings,
  params: {
    systemPrompt: string
    messages: LLMMessage[]
    temperature?: number
    maxTokens?: number
    onChunk?: (chunk: string) => void
  }
): Promise<string> {
  const { systemPrompt, messages, temperature = 0.7, maxTokens = 4096, onChunk } = params

  if (settings.apiProvider === 'anthropic') {
    const client = await createAnthropicClient(settings)
    const apiMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    if (onChunk) {
      const stream = await client.messages.stream({
        model: settings.model,
        system: systemPrompt,
        messages: apiMessages,
        max_tokens: maxTokens,
      })
      let fullContent = ''
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.text) {
          fullContent += event.delta.text
          onChunk(event.delta.text)
        }
      }
      return fullContent
    }

    const response = await client.messages.create({
      model: settings.model,
      system: systemPrompt,
      messages: apiMessages,
      max_tokens: maxTokens,
    })
    const textContent = response.content.find((c) => c.type === 'text')
    return textContent?.text || ''
  }

  if (settings.apiProvider === 'gemini') {
    const genAI = createGeminiClient(settings.apiKey)
    const model = genAI.getGenerativeModel({
      model: settings.model,
      systemInstruction: systemPrompt,
    })
    const apiMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }))

    if (onChunk) {
      const result = await model.generateContentStream({
        contents: apiMessages,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      })
      let fullContent = ''
      for await (const chunk of result.stream) {
        const delta = chunk.text() || ''
        fullContent += delta
        onChunk(delta)
      }
      return fullContent
    }

    const result = await model.generateContent({
      contents: apiMessages,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    })
    return result.response.text()
  }

  // OpenAI / OpenRouter / Ollama
  const client = createClient(settings)
  const openAIMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  if (onChunk) {
    const stream = await client.chat.completions.create({
      model: settings.model,
      messages: openAIMessages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    })
    let fullContent = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      fullContent += delta
      onChunk(delta)
    }
    return fullContent
  }

  const response = await client.chat.completions.create({
    model: settings.model,
    messages: openAIMessages,
    temperature,
    max_tokens: maxTokens,
  })
  return response.choices[0]?.message?.content || ''
}

/**
 * Level 2: 将聊天回复翻译为母语，拼入返回值
 */
async function attachTranslation(content: string, settings: Settings): Promise<LLMResponse> {
  if (!settings.showTranslation) return { content }
  try {
    const translation = await translateViaLLM(
      content, settings.targetLanguage, settings.nativeLanguage, settings
    )
    return { content, translation }
  } catch (err) {
    console.error('Memo: Level 2 翻译失败，仅返回原文', err)
    return { content }
  }
}

/**
 * 发送消息到 LLM 并获取回复
 */
export async function sendMessage(
  settings: Settings,
  character: Character,
  history: { role: string; content: string; characterName?: string }[],
  userInput: string,
  sceneContext?: string,
  onChunk?: (chunk: string) => void
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(settings, character, sceneContext)
  const messages = buildMessages(systemPrompt, history, userInput, false)

  console.log(`Memo: [Level 1] model=${settings.model} userInput="${userInput}"`)

  // Level 1: 聊天 — 只生成目标语言回复
  const content = await callLLM(settings, { systemPrompt, messages, temperature: 0.7, onChunk })

  console.log(`Memo: [Level 1] 响应(前200字):\n${content.substring(0, 200)}`)

  return attachTranslation(content, settings)
}

/**
 * 群聊模式：向单个角色发送消息（包含其他角色的历史）
 */
export async function sendGroupMessage(
  settings: Settings,
  character: Character,
  otherCharacters: Character[],
  history: { role: string; content: string; characterName?: string }[],
  userInput: string,
  sceneContext?: string,
  onChunk?: (chunk: string) => void
): Promise<LLMResponse> {
  const systemPrompt = buildGroupSystemPrompt(settings, character, otherCharacters, sceneContext)
  const messages = buildMessages(systemPrompt, history, userInput, true)

  console.log(`Memo: [Level 1 G] model=${settings.model} ${character.name} userInput="${userInput}"`)

  const content = await callLLM(settings, { systemPrompt, messages, temperature: 0.8, onChunk })

  console.log(`Memo: [Level 1 G] ${character.name} 响应(前200字):\n${content.substring(0, 200)}`)

  return attachTranslation(content, settings)
}

/**
 * 使用 LLM 翻译文本（替代 Google Translate）
 * 走用户已配置的 API 通道，不受网络环境限制
 */
export async function translateViaLLM(
  text: string,
  nativeLanguage: string,
  targetLanguage: string,
  settings: Settings
): Promise<string> {
  if (!text.trim()) return ''
  if (!settings.apiKey) throw new Error('API Key 未配置，无法翻译')

  // 用填空式 prompt 代替指令式，弱模型更容易遵循
  const systemPrompt = `你是严格的翻译器。输入是${nativeLanguage}，输出必须是${targetLanguage}。禁止输出${nativeLanguage}。`

  const content = await callLLM(settings, {
    systemPrompt,
    messages: [{ role: 'user', content: `翻译成${targetLanguage}:\n${text}` }],
    temperature: 0.1,
    maxTokens: 500,
  })
  const result = content.trim()
  console.log(`Memo: [翻译] ${nativeLanguage}→${targetLanguage} 输入="${text.substring(0, 100)}" 输出="${result.substring(0, 100)}"`)
  return result
}

/**
 * 解析 AI 回复中的纠错信息
 */
export function parseCorrection(response: string): {
  explanation: string
  remaining: string
} | null {
  const correctionRegex = /✏️\s*(.*?)(?:\n|$)/
  const match = response.match(correctionRegex)

  if (!match) return null

  const explanation = match[1].trim()
  const remaining = response.replace(match[0], '').trim()

  return { explanation, remaining }
}
