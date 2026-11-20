/**
 * lib/history.js — 发送历史（本机留存，最多 300 条）。
 *
 * 为什么必须留：用户最常问的是「刚才那条到底发出去没有」。
 * 没有历史就只能猜，或者去翻平台。
 *
 * 纪律：历史里只记通道 / 账号名 / 正文摘要 / 结果 / 消息 id，
 * **绝不记凭据**，也绝不记完整正文（正文可能含敏感信息，只留 200 字摘要 + 长度）。
 *
 * @module history
 */

import { readHistory, writeHistory } from './paths.js'

/** 最多保留多少条。超出丢最旧的。 */
export const MAX_ENTRIES = 300

/** 摘要长度上限。 */
const PREVIEW_CHARS = 200

/** 生成摘要（保留换行，过长截断）。 */
export function preview(text) {
  const body = String(text ?? '')
  if (body.length <= PREVIEW_CHARS) return body
  return body.slice(0, PREVIEW_CHARS) + '…'
}

/**
 * 记一条发送结果。
 *
 * @param {object} entry 至少含 channel / account / ok
 * @returns {{ok: boolean, count: number}}
 */
export function record(entry) {
  const list = readHistory()
  const item = {
    at: new Date().toISOString(),
    channel: String(entry?.channel ?? ''),
    channelTitle: String(entry?.channelTitle ?? ''),
    account: String(entry?.account ?? ''),
    source: String(entry?.source ?? ''),
    ok: entry?.ok === true,
    dryRun: entry?.dryRun === true,
    detail: String(entry?.detail ?? ''),
    messageIds: Array.isArray(entry?.messageIds) ? entry.messageIds.map(String) : [],
    chars: Number(entry?.chars ?? 0) || 0,
    blocks: Number(entry?.blocks ?? 0) || 0,
    preview: preview(entry?.text),
  }
  list.unshift(item)
  const kept = list.slice(0, MAX_ENTRIES)
  const written = writeHistory(kept)
  return { ok: written, count: kept.length }
}

/** 读最近 N 条。 */
export function recent(limit) {
  const n = Number(limit)
  const cap = Number.isFinite(n) && n > 0 ? Math.floor(n) : 50
  return readHistory().slice(0, Math.min(cap, MAX_ENTRIES))
}
