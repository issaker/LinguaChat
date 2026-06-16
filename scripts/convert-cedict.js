/**
 * CC-CEDICT 转换脚本
 *
 * 用法: node scripts/convert-cedict.js
 *
 * 从 MDBG 下载 CC-CEDICT 并转换为压缩 JSON 格式，
 * 输出到 public/dictionaries/cedict.json
 *
 * CC-CEDICT 是 CC-CEDICT 项目维护的开源中英词典
 * https://cc-cedict.org/wiki/
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'renderer', 'public', 'dictionaries', 'cedict.json')

// CEDICT 行格式: traditional simplified [pinyin] /def1/def2/
// 例如: 你好 你好 [ni3 hao3] /hello/hi/
function parseLine(line) {
  if (line.startsWith('#') || line.trim() === '') return null

  // 分离词头和释义
  const slashIdx = line.indexOf('/')
  if (slashIdx === -1) return null

  const head = line.substring(0, slashIdx).trim()
  const defsPart = line.substring(slashIdx)

  const defs = defsPart
    .split('/')
    .filter(Boolean)
    .map((d) => d.trim())

  // 解析 simplified、traditional、pinyin
  const spaceBeforeBracket = head.lastIndexOf(' ')
  const bracketContent =
    spaceBeforeBracket > 0 && head[head.length - 1] === ']'
      ? head.substring(spaceBeforeBracket + 1, head.length - 1)
      : ''

  const withoutPinyin =
    spaceBeforeBracket > 0 ? head.substring(0, spaceBeforeBracket) : head

  const parts = withoutPinyin.split(' ')
  const traditional = parts[0] || ''
  const simplified = parts[1] || traditional

  // 统一 key: 优先用 simplified
  const word = simplified || traditional

  return {
    word,
    traditional,
    pinyin: bracketContent || undefined,
    definitions: defs,
  }
}

async function main() {
  console.log('正在下载 CC-CEDICT (gzip)...')
  const resp = await fetch(CEDICT_URL)
  if (!resp.ok) {
    console.error(`下载失败: ${resp.status} ${resp.statusText}`)
    process.exit(1)
  }

  // 解压 gzip
  const buffer = Buffer.from(await resp.arrayBuffer())
  const decompressed = zlib.gunzipSync(buffer)
  const text = decompressed.toString('utf-8')
  const lines = text.split('\n')
  console.log(`共 ${lines.length} 行，大小 ${(decompressed.length / 1024 / 1024).toFixed(1)} MB`)

  const entries = []
  for (const line of lines) {
    const entry = parseLine(line)
    if (entry) entries.push(entry)
  }

  console.log(`解析出 ${entries.length} 条有效词条`)

  // 压缩为 { word -> entry } 的 Map
  const wordMap = {}
  let multiCount = 0
  for (const entry of entries) {
    if (wordMap[entry.word]) {
      // 已存在：合并释义（同一个词可能有多个释义/读音）
      multiCount++
      wordMap[entry.word].definitions.push(...entry.definitions)
      // 如果已有词条没有拼音但新条有，补充
      if (!wordMap[entry.word].pinyin && entry.pinyin) {
        wordMap[entry.word].pinyin = entry.pinyin
      }
    } else {
      wordMap[entry.word] = {
        definitions: entry.definitions,
        pinyin: entry.pinyin,
        traditional: entry.traditional !== entry.word ? entry.traditional : undefined,
      }
    }
  }
  if (multiCount > 0) {
    console.log(`合并了 ${multiCount} 个多义项`)
  }

  const json = JSON.stringify(wordMap)
  fs.writeFileSync(OUTPUT_PATH, json)
  const sizeKB = (json.length / 1024).toFixed(1)
  console.log(`已输出到 ${OUTPUT_PATH} (${sizeKB} KB)`)

  // 打印几个示例
  const sampleKeys = ['你好', '学习', '电脑', '苹果', '中文']
  for (const key of sampleKeys) {
    if (wordMap[key]) {
      console.log(`  ${key}: ${wordMap[key].definitions.slice(0, 3).join(', ')}`)
    }
  }
}

main().catch((err) => {
  console.error('错误:', err)
  process.exit(1)
})
