/**
 * lib/accounts.js — 账号聚合层（只发不收）。
 *
 * 本插件的核心价值是「挑一个账号发出去」，所以账号来源必须比 push-hub 更宽：
 *   A. push-hub 自己的账号（~/.dsh/dsh-push-hub/config.json，含 own_bots 展开）
 *   B. dsh-bridge 已接通的账号（~/.dsh/dsh-bridge/config.json）—— 只读借用
 *   C. dsh-im-connect（~/.dsh/dsh-im-connect/channels.json）—— 通常为空，兼容读取
 *
 * 纪律（与 push-hub 一致，不放松）：
 *   - 凭据只在内存里流转，绝不写进任何新文件、绝不回给浏览器；
 *   - 对外只暴露掩码指纹（尾 4 位）与「有没有配」，用于让用户确认选的是哪个账号；
 *   - bridge 字段名与 push-hub 不完全同名（例如 bridge 的 wechat 用 token/accountId/baseUrl，
 *     push-hub 也是同名），因此这里做显式白名单拷贝，不做整个对象透传 ——
 *     透传会把 bridge 的 cwd / agentModel 之类带进去，虽然无害但不该外泄。
 *
 * @module accounts
 */

import { readBridgeConfig, readImConnectConfig, readSettings } from './paths.js'

/**
 * 凭据字段白名单（按通道）。
 *
 * 只拷贝通道实现真正会读的字段，其余一律丢弃。这样：
 *  1. bridge 里的 agentPreset / cwd 之类不会被带进发送链路；
 *  2. 以后 push-hub 加新字段，这里显式补，不会因为「忘了过滤」泄露东西。
 */
const CREDENTIAL_FIELDS = {
  telegram: ['botToken', 'proxy', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  feishu: ['appId', 'appSecret', 'domain', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  qq: ['appId', 'appSecret', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  wechat: ['token', 'accountId', 'baseUrl', 'proxy', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  synology_chat: ['webhookUrl', 'nasUrl', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  slack: ['botToken', 'webhookUrl', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  discord: ['botToken', 'webhookUrl', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  matrix: ['baseUrl', 'accessToken', 'userId', 'roomId', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  dingtalk: ['webhookUrl', 'secret', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  wecom: ['webhookUrl', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  wecom_app: ['corpId', 'corpSecret', 'agentId', 'toUser', 'toParty', 'toTag', 'target', 'targets', 'mention', 'allowFrom', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
  email: ['host', 'port', 'secure', 'user', 'pass', 'from', 'to', 'target', 'targets', 'maxMessageChars', 'chunkDelayMs', 'perMinute'],
}

/** 「这几个字段里有任意一个就算能用」——用来判断账号是否真的配好了。 */
const REQUIRED_ANY = {
  telegram: [['botToken']],
  feishu: [['appId'], ['appSecret']],
  qq: [['appId'], ['appSecret']],
  wechat: [['token']],
  synology_chat: [['webhookUrl']],
  slack: [['botToken', 'webhookUrl']],
  discord: [['botToken', 'webhookUrl']],
  matrix: [['accessToken'], ['baseUrl']],
  dingtalk: [['webhookUrl']],
  wecom: [['webhookUrl']],
  wecom_app: [['corpId'], ['corpSecret']],
  email: [['host'], ['to']],
}

/**
 * 这个通道是否**必须**指定「发送到」才能发出去。
 *
 * v0.2.7 修的一个误判：早期把「有 target」当成了所有通道的硬门槛，
 * 结果群晖 Chat 的 webhook 账号、钉钉 webhook、企业微信 webhook 全被判成
 * 「缺发送目标」而变灰 —— 但 webhook 型通道的地址里已经自带「发到哪个群」，
 * 它们**根本不需要** target。用户看到的就是「有 webhookUrl 却点不动」。
 *
 * 判定依据是 push-hub 各通道实现的真实行为（lib/channels/*.js）：
 *   - dingtalk.js / wecom.js：只读 webhookUrl，全程没有 targetOf()
 *   - synology.js：type=webhook 只读 webhookUrl；type=bot 需要 userIds
 *   - telegram / feishu / qq / wechat / slack / discord / matrix：都先调 targetOf()，
 *     拿不到就直接返回「还没选发送到」
 *   - wecom_app.js / email.js：读 acc.target.id，缺失即报错
 *
 * @param {string} channel
 * @param {Record<string, any>} acc
 * @returns {boolean}
 */
function needsTarget(channel, acc) {
  if (channel === 'dingtalk' || channel === 'wecom') return false
  if (channel === 'synology_chat') {
    // 只有机器人类型才需要「发给哪些用户 ID」；webhook 类型由 URL 决定去处。
    return String(acc?.type ?? 'webhook').trim().toLowerCase() === 'bot'
  }
  return true
}

/** 掩码：只留最后 4 个字符，且总长 ≤ 6 时整段掩掉。 */
function fingerprint(value) {
  const text = String(value ?? '').trim()
  if (text === '') return ''
  if (text.length <= 6) return '****'
  return '…' + text.slice(-4)
}

/**
 * 把任意来源的一个账号压成安全的外部描述（绝不带凭据原文）。
 *
 * @param {string} channel
 * @param {Record<string, any>} acc
 * @param {string} source 来源标签
 * @param {number} index 该通道内的序号（0 起）
 * @param {{deliverable?: {state: string, detail?: string, fails?: number, at?: string}}} [extra]
 *        真实的「上次发出去没有」判定（v0.2.9）。缺省时按可用处理，不冤枉新装用户。
 */
function describe(channel, acc, source, index, extra) {
  const name = String(acc?.name ?? '').trim() || '#' + (index + 1)
  const rules = REQUIRED_ANY[channel] ?? []
  const missing = rules
    .map((group) => group.find((key) => String(acc?.[key] ?? '').trim() !== ''))
    .filter((hit) => hit === undefined)
    .length

  // 目标：让用户知道「这个账号发去哪」——这是选账号时最需要的信息。
  const target = acc?.target && typeof acc.target === 'object' ? acc.target : null
  const targetId = String(target?.id ?? '').trim()
  const allowFrom = Array.isArray(acc?.allowFrom) ? acc.allowFrom : []
  // 群晖机器人的目标是数字 userIds（不叫 target / allowFrom），单独认一下。
  const rawIds = acc?.userIds
  const userIds = Array.isArray(rawIds)
    ? rawIds.map((v) => String(v).trim()).filter((v) => v !== '')
    : String(rawIds ?? '').trim() !== ''
      ? String(rawIds).split(/[,，\s]+/).filter((v) => v !== '')
      : []
  const botIds = channel === 'synology_chat' ? userIds : []
  const mustTarget = needsTarget(channel, acc)

  const targetLabel = targetId !== ''
    ? (target?.kind === 'group' ? '群 ' : '单聊 ') + targetId
    : allowFrom.length > 0
      ? '单聊 ' + String(allowFrom[0])
      : botIds.length > 0
        ? '群晖用户 ' + botIds.join(',')
        : mustTarget
          ? '未设置'
          : '由通道自身投递（webhook 地址里已指定）'

  // 凭据指纹：让用户能区分「同名但不同 token」的两个账号。
  const secretKeys = ['botToken', 'token', 'appSecret', 'webhookUrl', 'accessToken', 'corpSecret', 'pass']
  const hint = secretKeys
    .map((key) => String(acc?.[key] ?? '').trim())
    .find((value) => value !== '') ?? ''

  // 有凭据还不够：需要目标的通道缺目标时，发出去必然报「还没填发送到」。
  // 这里提前标出来，界面就不会给一个「点了必然失败」的账号；
  // 但**不需要**目标的通道（webhook 型）不能因此被判死（v0.2.7 的修复）。
  const hasTarget = targetId !== '' || allowFrom.length > 0 || botIds.length > 0 || !mustTarget
  const usable = missing === 0 && hasTarget

  // ── v0.2.9：真实可发送性 ────────────────────────────────────────────────
  // usable 只回答「配置上够不够」；deliverable 回答「上次真发到底成没成」。
  // 两者必须分开：微信那 9 个号配置全齐（usable=true），但 sendmessage 恒返
  // ret=-2 prepare failed —— 界面若只报 usable，用户会以为点了就能发出去。
  // 判据来自本机 history.json（见 lib/deliverability.js），这里只负责贴标签。
  const deliv = extra?.deliverable ?? null
  const upstreamBroken = deliv !== null && deliv.state === 'failing'
  const deliverable = !upstreamBroken
  const deliverNote = upstreamBroken
    ? '凭据齐但上游发不出（' + String(deliv?.fails ?? 1) + ' 次 ret=-2 prepare failed）'
    : ''

  // 给界面一句能直接显示的话，免得客户端自己再拼一遍判断逻辑。
  const disabledReason = usable
    ? ''
    : missing > 0
      ? '缺凭据字段：' + String(missing) + ' 组必填项没填'
      : '缺发送目标：这个通道必须先指定发给谁'

  return {
    id: channel + '::' + source + '::' + name,
    channel,
    name,
    source,
    usable,
    // 能勾选 = 配置齐。deliverable=false 时仍可勾（用户可能想再试一次），
    // 但卡片要显式说明「上次这类错误」，不能装成一切正常。
    deliverable,
    deliverNote,
    missingFields: missing,
    hasTarget,
    needTarget: mustTarget,
    disabledReason,
    target: targetLabel,
    targetKind: target?.kind === 'group' ? 'group' : targetId !== '' ? 'user' : mustTarget ? 'auto' : 'webhook',
    credentialHint: fingerprint(hint),
    multiTarget: Array.isArray(acc?.targets) && acc.targets.length > 1 ? acc.targets.length : 0,
    /** 目标是不是用户在设置里手动指定的（区别于平台侧自动记录）。 */
    targetOverridden: extra?.overridden === true,
  }
}

/** 按白名单裁剪一个账号（保留凭据，供内部发送用）。 */
function pickCredentials(channel, acc) {
  const fields = CREDENTIAL_FIELDS[channel] ?? []
  const out = {}
  if (!acc || typeof acc !== 'object') return out
  for (const key of fields) {
    if (acc[key] !== undefined && acc[key] !== null) out[key] = acc[key]
  }
  out.name = String(acc?.name ?? '').trim()
  return out
}

/** 从 push-hub 的合并配置里取账号（已含 own_bots 展开与多层合并）。 */
function fromPushHub(cfg) {
  const out = []
  for (const [channel, value] of Object.entries(cfg ?? {})) {
    if (!CREDENTIAL_FIELDS[channel]) continue
    const list = Array.isArray(value?.accounts) ? value.accounts : []
    for (const acc of list) {
      if (!acc || typeof acc !== 'object') continue
      out.push({ channel, acc, source: 'push-hub' })
    }
  }
  return out
}

/** 从 bridge / im-connect 的原始配置里取账号（结构同 push-hub 的 channel.accounts）。 */
function fromRawConfig(raw, source) {
  const out = []
  for (const [channel, value] of Object.entries(raw ?? {})) {
    if (!CREDENTIAL_FIELDS[channel]) continue
    const list = Array.isArray(value?.accounts)
      ? value.accounts
      : Array.isArray(value)
        ? value
        : []
    for (const acc of list) {
      if (!acc || typeof acc !== 'object') continue
      out.push({ channel, acc, source })
    }
  }
  return out
}

/**
 * 把设置里存的手动目标洗成一个合法的 acc.target；无效就返回 null（表示没覆盖）。
 *
 * 存两种形状都认：`'o9cq…@im.wechat'`（最省事的写法）或 `{kind:'user', id:'…'}`。
 * 群晖的 userIds 是数字，也允许用同一入口手填 —— 那里 id 会被当字符串，
 * 群晖通道自己会做数字转换，所以不必在这里特判。
 *
 * @param {any} value
 * @returns {{kind: string, id: string} | null}
 */
function normalizeOverride(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const id = value.trim()
    return id === '' ? null : { kind: 'user', id }
  }
  if (typeof value !== 'object') return null
  const id = String(value.id ?? '').trim()
  if (id === '') return null
  const kind = value.kind === 'group' ? 'group' : 'user'
  return { kind, id }
}

/**
 * 聚合全部账号。
 *
 * 去重规则：同通道 + 同来源 + 同名 视为同一个（不会因为 merge 出现两条）。
 * 跨来源同名**不合并** —— 用户就是要在「bridge 的 <你的微信ID>」和「push-hub 的 <你的微信ID>」之间选。
 *
 * @param {Record<string, any> | null} pushHubCfg push-hub 的 load() 结果，null 表示没装
 * @param {{
 *   disabledSources?: string[],
 *   targetOverrides?: Record<string, {kind?: string, id?: string} | string>,
 *   deliverability?: Map<string, {state: string, detail?: string, fails?: number, at?: string}>,
 * }} [options]
 * @returns {{ accounts: any[], byId: Map<string, any>, sources: any }}
 */
export function collect(pushHubCfg, options = {}) {
  const disabled = new Set(Array.isArray(options.disabledSources) ? options.disabledSources : [])
  // v0.2.9：用户在设置里手动指定的目标，键就是账号 id（channel::source::name）。
  // 只在内存里合并成 acc.target，**绝不回写 bridge / push-hub 的配置文件** ——
  // 那是别人的数据，改了会在对方下次启动时被覆盖，或者引发说不清的漂移。
  const overrides = options.targetOverrides && typeof options.targetOverrides === 'object'
    ? options.targetOverrides
    : {}
  const delivMap = options.deliverability instanceof Map ? options.deliverability : new Map()
  const seen = new Set()
  const raw = []
  const add = (list) => {
    for (const item of list) {
      const key = item.channel + '\u0000' + item.source + '\u0000' + String(item.acc?.name ?? '')
      if (seen.has(key)) continue
      seen.add(key)
      raw.push(item)
    }
  }

  if (!disabled.has('push-hub') && pushHubCfg) add(fromPushHub(pushHubCfg))
  if (!disabled.has('bridge')) add(fromRawConfig(readBridgeConfig(), 'bridge'))
  if (!disabled.has('im-connect')) add(fromRawConfig(readImConnectConfig(), 'im-connect'))

  // 每个通道内按来源、名字稳定排序，界面刷新不会跳来跳去。
  const order = ['push-hub', 'bridge', 'im-connect']
  raw.sort((a, b) => {
    if (a.channel !== b.channel) return a.channel.localeCompare(b.channel)
    const ia = order.indexOf(a.source)
    const ib = order.indexOf(b.source)
    if (ia !== ib) return ia - ib
    return String(a.acc?.name ?? '').localeCompare(String(b.acc?.name ?? ''))
  })

  const accounts = []
  const byId = new Map()
  const sourceCount = {}
  const perChannel = {}
  for (const item of raw) {
    const idx = perChannel[item.channel] ?? 0
    perChannel[item.channel] = idx + 1
    const name = String(item.acc?.name ?? '').trim() || '#' + (idx + 1)
    const id = item.channel + '::' + item.source + '::' + name
    // 手动目标只在内存里生效；_raw 也要用它，否则「界面上显示有目标、发出去却没目标」。
    const override = normalizeOverride(overrides[id])
    const acc = override === null ? item.acc : { ...item.acc, target: override }
    const deliv = delivMap.get(id) ?? null
    const meta = describe(item.channel, acc, item.source, idx, {
      deliverable: deliv,
      overridden: override !== null,
    })
    const entry = { ...meta, _raw: pickCredentials(item.channel, acc) }
    accounts.push(entry)
    byId.set(entry.id, entry)
    sourceCount[item.source] = (sourceCount[item.source] ?? 0) + 1
  }

  return {
    accounts,
    byId,
    sources: {
      counts: sourceCount,
      disabled: [...disabled],
    },
  }
}

/** 对外暴露的账号清单（剥掉 _raw，绝不含凭据）。 */
export function publicList(collected) {
  return collected.accounts.map(({ _raw, ...rest }) => rest)
}

/** 本插件设置里「上次选的账号」，用于界面回填。id 支持多选。 */
export function lastSelection() {
  const settings = readSettings()
  const ids = Array.isArray(settings?.lastAccountIds) ? settings.lastAccountIds.map(String).filter(s => s !== '') : []
  const single = typeof settings?.lastAccountId === 'string' ? settings.lastAccountId : ''
  return {
    accountId: single,
    ids: ids.length > 0 ? ids : (single === '' ? [] : [single]),
    channel: typeof settings?.lastChannel === 'string' ? settings.lastChannel : '',
  }
}
