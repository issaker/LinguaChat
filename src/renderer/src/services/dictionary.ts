/**
 * 本地词典服务
 *
 * 加载 CC-CEDICT 开源词典，提供中→英 + 英→中双向离线查询。
 * 未收录的词自动回退到 LLM。
 *
 * CC-CEDICT 许可证: Creative Commons Attribution-ShareAlike 4.0
 * https://cc-cedict.org/wiki/
 */

interface DictEntry {
  definitions: string[]
  pinyin?: string
}

type DictData = Record<string, DictEntry>

/** 反向词典条目：一个英文词可能对应多个中文词 */
interface ReverseEntry {
  chinese: string
  pinyin?: string
}

type ReverseDictData = Record<string, ReverseEntry[]>

class DictionaryService {
  private ceData: DictData | null = null      // 中→英 (cedict.json)
  private ecData: ReverseDictData | null = null // 英→中 (ecdict.json)
  private loadPromise: Promise<void> | null = null

  /**
   * 加载词典（懒加载，首次 lookup 时执行）
   */
  private async ensureLoaded(): Promise<void> {
    if (this.ceData) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      try {
        const [ceResp, ecResp] = await Promise.all([
          fetch('/dictionaries/cedict.json'),
          fetch('/dictionaries/ecdict.json'),
        ])
        if (!ceResp.ok) throw new Error(`中英词典加载失败: ${ceResp.status}`)
        if (!ecResp.ok) throw new Error(`英中词典加载失败: ${ecResp.status}`)
        this.ceData = await ceResp.json()
        this.ecData = await ecResp.json()
        console.log(
          `Memo: 本地词典已加载 (中→英 ${Object.keys(this.ceData!).length} 条, 英→中 ${Object.keys(this.ecData!).length} 条)`
        )
      } catch (err) {
        this.loadPromise = null // 重置，允许下次重试
        throw err
      }
    })()

    return this.loadPromise
  }

  /**
   * 查询单词释义
   * 先试中→英正向，再试英→中反向，均未命中返回 null
   */
  async lookup(word: string): Promise<DictEntry | null> {
    const clean = word.trim().toLowerCase()
    if (!clean) return null

    try {
      await this.ensureLoaded()
    } catch (err) {
      console.warn('Memo: 本地词典加载失败，将使用 LLM 兜底', err)
      return null
    }

    // 1. 正向：中文→英文
    const ceEntry = this.ceData![clean]
    if (ceEntry && ceEntry.definitions.length > 0) {
      return ceEntry
    }

    // 2. 反向：英文→中文
    const ecEntry = this.ecData![clean]
    if (ecEntry && ecEntry.length > 0) {
      return {
        definitions: ecEntry.map((e) => e.chinese),
        pinyin: ecEntry[0].pinyin,
      }
    }

    return null
  }

  /** 词典是否已加载 */
  get isLoaded(): boolean {
    return this.ceData !== null
  }

  /** 手动预加载词典（可在应用空闲时调用） */
  async preload(): Promise<void> {
    await this.ensureLoaded()
  }
}

export const dictionary = new DictionaryService()
