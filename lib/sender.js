/**
 * lib/sender.js — 发送编排层。
 *
 * 为什么不直接调 push-hub 的 bus.send：
 *   bus.send 按配置里的账号发送，而本插件要发的是聚合出来的、可能来自 bridge 的账号。
 *   因此这里用 bus.sendOne —— 它接收 {channel, account, text}，account 是完整账号对象，
 *   正好允许我们把自己拼好的账号（来自任意来源）直接交给通道实现。
 *
 * 降级策略（重要）：
 *   找不到 push-hub 时本插件不能假装能发 —— 直接返回明确错误，
 *   而不是静默发到别处或报一个含糊的失败。
 *
 * @module sender
 */

import { loadPushHub, findPushHub, readSettings } from './paths.js'

/** 单例：push-hub 模块只加载一次。 */
let hubCache = null
let hubError = ''

/**
 * 拿 push-hub 的模块（带缓存）。
 *
 * @returns {Promise<any>}
 */
export async function getHub() {
  if (hubCache !== null) return hubCache
  if (hubError !== '') return { ok: false, error: hubError }

  const settings = readSettings()
  const found = findPushHub(settings?.pushHubPath)
  if (found === null) {
    hubError = '找不到 dsh-push-hub（推送通道层）。请确认已安装 @duma520/dsh-push-hub，或在设置里填它的目录。'
    return { ok: false, error: hubError }
  }
  const mods = await loadPushHub(found.dir)
  if (mods === null) {
    hubError = '找到了 dsh-push-hub 目录但加载失败：' + found.dir
    return { ok: false, error: hubError }
  }
  hubCache = { ok: true, dir: found.dir, source: found.source, config: mods.config, bus: mods.bus }
  return hubCache
}

/** 强制重新加载（用户改了 pushHubPath 或升级了 push-hub 后用）。 */
export function resetHub() {
  hubCache = null
  hubError = ''
}

/**
 * 拼标题与正文。
 *
 * 与 push-hub 的 composeBody 保持同一形态（【标题】换行正文），
 * 这样同一条内容在两个插件里发出去长得一样。
 */
export function composeBody(title, text) {
  const head = String(title ?? '').trim()
  const body = String(text ?? '')
  if (head === '') return body
  return '【' + head + '】' + String.fromCharCode(10) + body
}

/**
 * 按账号发一条消息。
 *
 * @param {object} params account / text / dryRun
 * @returns {Promise<Record<string, any>>}
 */
export async function sendWithAccount(params) {
  const hub = await getHub()
  if (hub.ok !== true) return { ok: false, error: hub.error }

  const channel = String(params?.account?.channel ?? '').trim()
  const name = String(params?.account?.name ?? '').trim()
  const acc = params?.account?._raw
  const text = String(params?.text ?? '')

  if (channel === '') return { ok: false, error: '没有指定通道' }
  if (!acc || typeof acc !== 'object') return { ok: false, error: '账号数据缺失（可能来源配置已变，刷新后重试）' }
  if (text.trim() === '') return { ok: false, error: '正文为空，没东西可发' }

  const reg = hub.bus.REGISTRY
  if (!(reg instanceof Map) || !reg.has(channel)) {
    return { ok: false, error: 'push-hub 不认识通道 ' + channel + '，可能版本过旧' }
  }

  if (params?.dryRun === true) {
    const mod = reg.get(channel)
    const limit = Number(acc?.maxMessageChars) > 0 ? Number(acc.maxMessageChars) : Number(mod?.MAX_CHARS ?? 0)
    const blocks = limit > 0 ? Math.max(1, Math.ceil(text.length / limit)) : 1
    return {
      ok: true,
      dryRun: true,
      channel,
      account: name,
      title: String(mod?.TITLE ?? channel),
      chars: text.length,
      limit,
      blocks,
      preview: text.length > 200 ? text.slice(0, 200) + '…' : text,
      target: String(acc?.target?.id ?? (Array.isArray(acc?.allowFrom) ? acc.allowFrom[0] : '') ?? ''),
    }
  }

  // sendOne(cfg, {channel, account}) 的 account 参数是**账号名**，它会去 cfg 里按名找。
  // 我们的账号可能来自 bridge（不在 push-hub 的 cfg 里），所以构造一份只含这一个账号的临时
  // 配置交给它 —— 这样既复用了通道实现与限流，又不必把凭据写进任何配置文件。
  const settings = readSettings()
  let baseCfg = {}
  try {
    baseCfg = hub.config.load(settings?.pushHubPath || undefined) ?? {}
  } catch {
    baseCfg = {}
  }
  const tempCfg = { ...baseCfg, [channel]: { ...(baseCfg?.[channel] ?? {}), accounts: [acc] } }
  if (name !== '') acc.name = name
  const outcome = await hub.bus.sendOne(tempCfg, { channel, account: name, text })

  return {
    ok: outcome?.ok === true,
    channel,
    account: name,
    detail: String(outcome?.detail ?? ''),
    messageIds: Array.isArray(outcome?.messageIds) ? outcome.messageIds.map(String) : [],
    deliveries: Array.isArray(outcome?.deliveries) ? outcome.deliveries : [],
    bestEffort: outcome?.bestEffort === true,
  }
}
