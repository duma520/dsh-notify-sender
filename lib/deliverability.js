/**
 * lib/deliverability.js — 「这个账号上次到底发出去没有」的派生判定（v0.2.9）。
 *
 * 为什么需要它（真实踩坑）：
 *   v0.2.7 的可用性判定只看「凭据齐不齐 + 有没有发送目标」。
 *   微信那 9 个 bridge 账号凭据齐、5 个还有 allowFrom，界面全显示 ✅ 可用；
 *   但实测 sendmessage 恒返 `ret=-2 prepare failed` —— 上游根本没就绪。
 *   用户看到一堆绿卡，点了发送全失败，还以为是自己网络问题。
 *
 * 判据必须是「真实发生过的事」，不是配置长相：
 *   读本机 history.json，取最近若干条同账号的**真发**记录（dryRun 不算）。
 *   - 最近一条成功 → state = 'ok'
 *   - 最近连续若干条都失败，且失败原因是「上游能力未就绪」类错误 → state = 'failing'
 *   - 没有记录 / 失败原因不是这一类（比如限流、网络抖动）→ state = 'unknown'（按可用处理）
 *
 * 为什么没有记录时要按「可用」：新装用户一条历史都没有，
 * 如果默认判黄，整个界面从一开始就是一片警告，那等于没有信息量。
 * unknown 的语义就是「没测过，不冤枉你」。
 *
 * @module deliverability
 */

import { readHistory } from './paths.js'

/** 往回看最近多少条同账号记录。 */
export const WINDOW = 5

/**
 * 哪些失败原因算「上游能力未就绪」而不是「这次没发成」。
 *
 * ret=-2 + prepare failed 是微信 iLink 的典型症状：token 有效、参数没错，
 * 但该 bot 的发送能力本身没开通（唯一修法是在微信客户端重新扫码绑定）。
 * 这类错误重试一万次也不会好，所以值得在界面上长期标注。
 *
 * 而超时、429、401 这类是**可恢复**的，不该把一个账号永久标黄 ——
 * 它们只会让 state 停在 'unknown'。
 */
const UPSTREAM_BROKEN = [/prepare\s*failed/i, /ret\s*=\s*-2\b/i]

/**
 * 这条失败详情是不是「上游能力未就绪」。
 *
 * @param {string} detail
 * @returns {boolean}
 */
export function isUpstreamBroken(detail) {
  const text = String(detail ?? '')
  if (text === '') return false
  return UPSTREAM_BROKEN.some((re) => re.test(text))
}

/** 账号的唯一键，与 accounts.js 里的 id 完全一致。 */
export function accountKey(channel, source, name) {
  return String(channel) + '::' + String(source) + '::' + String(name)
}

/**
 * 从历史记录推导每个账号的可发送状态。
 *
 * @param {Array<Record<string, any>>} [entries] history.recent() 的结果（新的在前）
 * @param {{window?: number}} [options]
 * @returns {Map<string, {state: 'ok'|'failing'|'unknown', detail: string, at: string, fails: number}>}
 */
export function derive(entries, options = {}) {
  const window = Number(options?.window) > 0 ? Math.floor(Number(options.window)) : WINDOW
  const list = Array.isArray(entries) ? entries : []
  /** @type {Map<string, any[]>} */
  const grouped = new Map()

  for (const entry of list) {
    // 预览（dryRun）不是真实发送结果，拿它判可发送性等于自欺欺人。
    if (entry?.dryRun === true) continue
    const key = accountKey(entry?.channel, entry?.source, entry?.account)
    const bucket = grouped.get(key)
    if (bucket === undefined) grouped.set(key, [entry])
    else if (bucket.length < window) bucket.push(entry)
  }

  const out = new Map()
  for (const [key, bucket] of grouped) {
    const latest = bucket[0] ?? null
    if (latest === null) continue
    if (latest.ok === true) {
      out.set(key, {
        state: 'ok',
        detail: String(latest.detail ?? ''),
        at: String(latest.at ?? ''),
        fails: 0,
      })
      continue
    }
    // 从最近往回数：连续「上游未就绪」的失败有几条。
    let fails = 0
    for (const item of bucket) {
      if (item?.ok === true) break
      if (!isUpstreamBroken(item?.detail)) break
      fails += 1
    }
    out.set(key, {
      state: fails > 0 ? 'failing' : 'unknown',
      detail: String(latest.detail ?? ''),
      at: String(latest.at ?? ''),
      fails,
    })
  }
  return out
}

/** 便捷封装：直接读本机历史。 */
export function deriveFromDisk(options = {}) {
  return derive(readHistory(), options)
}
