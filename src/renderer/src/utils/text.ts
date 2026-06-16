/**
 * 文本处理工具函数
 */

/** CJK 统一表意文字 + 假名 + 谚文 */
export const CJK_RE = /[㐀-鿿豈-﫿぀-ゟ゠-ヿ가-힯]/

/** 判断字符串是否包含 CJK 字符 */
export function isCJK(text: string): boolean {
  return CJK_RE.test(text)
}

/**
 * CJK 文本逐字拆分，拉丁文本按空白拆分
 * 返回适用于 WordSpan 渲染的 token 数组
 */
export function tokenizeText(text: string): string[] {
  if (!text) return []
  const tokens: string[] = []
  for (const seg of text.split(/(\s+)/)) {
    if (CJK_RE.test(seg)) {
      // 在 CJK 和 Latin 边界处拆分，避免混合文本（如"你abc好"）将拉丁字母拆成单个字符
      const subSegs = seg.split(/([㐀-鿿豈-﫿぀-ゟ゠-ヿ가-힯]+)/).filter(Boolean)
      for (const sub of subSegs) {
        if (CJK_RE.test(sub)) {
          for (const ch of sub) tokens.push(ch)
        } else {
          tokens.push(sub)
        }
      }
    } else {
      tokens.push(seg)
    }
  }
  return tokens
}
