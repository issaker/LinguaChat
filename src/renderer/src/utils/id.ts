/**
 * 生成唯一 ID
 * @param prefix 可选前缀（如 'msg-', 'fc-'）
 */
export function generateId(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}
