/**
 * CC-CEDICT 反向索引构建脚本
 *
 * 用法: node scripts/build-reverse-dict.js
 *
 * 从 CC-CEDICT JSON 中提取英文释义，构建英→中反向词典，
 * 输出到 public/dictionaries/ecdict.json
 */

const fs = require('fs')
const path = require('path')

const CEDICT_PATH = path.join(__dirname, '..', 'src', 'renderer', 'public', 'dictionaries', 'cedict.json')
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'renderer', 'public', 'dictionaries', 'ecdict.json')

/** 从 CC-CEDICT 释义中提取有意义的英文单词 */
function extractEnglishWords(definitions) {
  const words = new Set()
  for (const def of definitions) {
    if (!def) continue
    // 去掉括号注释
    const cleaned = def.replace(/\(.*?\)/g, '').replace(/CL:.*?(?=\s|$)/g, '').trim()
    // 按 ; 拆分为候选词/短语
    for (const part of cleaned.split(';')) {
      const trimmed = part.trim().toLowerCase()
      if (!trimmed || trimmed.length < 2) continue
      // 排除纯符号、数字、中文（误入的）
      if (/^[^a-zA-Z]+$/.test(trimmed)) continue
      words.add(trimmed)
    }
  }
  return words
}

function main() {
  console.log('读取 CC-CEDICT...')
  const cedict = JSON.parse(fs.readFileSync(CEDICT_PATH, 'utf-8'))
  console.log(`共 ${Object.keys(cedict).length} 条中文词条`)

  // 构建反向索引: { "english_word" -> [{ chinese, pinyin }] }
  const reverse = {}
  let totalEnglishWords = 0

  for (const [chinese, entry] of Object.entries(cedict)) {
    const englishWords = extractEnglishWords(entry.definitions || [])
    for (const en of englishWords) {
      if (!reverse[en]) reverse[en] = []
      // 只保留前 5 个中文对应词（去重）
      if (!reverse[en].some((e) => e.chinese === chinese)) {
        reverse[en].push({ chinese, pinyin: entry.pinyin || undefined })
      }
    }
    totalEnglishWords += englishWords.size
  }

  // 按英文单词排序输出
  const sorted = {}
  for (const en of Object.keys(reverse).sort()) {
    sorted[en] = reverse[en].slice(0, 5) // 一个英文词最多对应 5 个中文词
  }

  const json = JSON.stringify(sorted)
  fs.writeFileSync(OUTPUT_PATH, json)
  const sizeKB = (json.length / 1024).toFixed(1)
  console.log(`提取了 ${totalEnglishWords} 个英文释义，去重后共 ${Object.keys(sorted).length} 条英文词条`)
  console.log(`已输出到 ${OUTPUT_PATH} (${sizeKB} KB)`)

  // 示例
  const samples = ['hello', 'computer', 'study', 'good', 'apple', 'world', 'book', 'big', 'today', 'cat']
  console.log('\n示例查询:')
  for (const w of samples) {
    const entry = sorted[w]
    if (entry) {
      console.log(`  ${w} → ${entry.slice(0, 3).map((e) => `${e.chinese}${e.pinyin ? `(${e.pinyin})` : ''}`).join(', ')}`)
    } else {
      console.log(`  ${w} → 未收录`)
    }
  }
}

main()
