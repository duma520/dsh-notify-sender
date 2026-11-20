/**
 * lib/paths.js — 定位本插件要复用的外部依赖。
 *
 * 为什么不写死 <插件根目录>\\dsh-push-hub：
 *   1. 不同机器上插件目录可能换盘、换路径；
 *   2. 用户可能用 npm 版而不是 link 版；
 *   3. 写死路径一旦失效，插件会整个激活失败。
 *
 * 查找顺序（命中即停）：
 *   1. 环境变量 NOTIFY_SENDER_PUSH_HUB
 *   2. 插件配置里的 pushHubPath
 *   3. 扫描 ~/.dsh/profiles/<profile>/node_modules/@duma520/dsh-push-hub（按常用 profile 优先）
 *
 * 找不到不是崩溃理由：调用方据此降级为「只有 bridge 账号」或「提示安装」。
 *
 * @module paths
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 本插件包根目录。 */
export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 本插件用户级配置目录（绝不放包内代码目录）。 */
export const DATA_DIR = path.join(os.homedir(), '.dsh', 'dsh-notify-sender')

/** 本插件设置文件。 */
export const SETTINGS_PATH = path.join(DATA_DIR, 'config.json')

/** 发送历史文件。 */
export const HISTORY_PATH = path.join(DATA_DIR, 'history.json')

/** dsh-bridge 的配置（只读，作为第二账号池）。 */
export const BRIDGE_CONFIG = path.join(os.homedir(), '.dsh', 'dsh-bridge', 'config.json')

/** dsh-im-connect 的配置（只读，作为第三账号池；通常为空）。 */
export const IM_CONNECT_CONFIG = path.join(os.homedir(), '.dsh', 'dsh-im-connect', 'channels.json')

/** 扫描 profile 时的优先顺序：桌面端最常用，其次默认/web。 */
const PROFILE_ORDER = ['desktop', 'default', 'web', 'superagent', 'safe', 'add']

/** 展开 ~ 前缀。 */
export function expandHome(target) {
  const value = String(target ?? '').trim()
  if (value === '') return ''
  if (value === '~') return os.homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) return path.join(os.homedir(), value.slice(2))
  return value
}

/** 读一个 JSON 文件，失败返回 null（绝不抛）。 */
function readJson(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * 找 dsh-push-hub 的真身目录。
 *
 * @param {string} [override] 配置里显式指定的路径
 * @returns {{dir: string, source: string} | null}
 */
export function findPushHub(override) {
  const fromEnv = expandHome(process.env.NOTIFY_SENDER_PUSH_HUB)
  const candidates = []
  if (fromEnv !== '') candidates.push({ dir: fromEnv, source: 'env' })
  const fromCfg = expandHome(override)
  if (fromCfg !== '') candidates.push({ dir: fromCfg, source: 'config' })

  const profilesDir = path.join(os.homedir(), '.dsh', 'profiles')
  let names = []
  try {
    names = fs.readdirSync(profilesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    names = []
  }
  names.sort((a, b) => {
    const ia = PROFILE_ORDER.indexOf(a)
    const ib = PROFILE_ORDER.indexOf(b)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })
  for (const name of names) {
    candidates.push({
      dir: path.join(profilesDir, name, 'node_modules', '@duma520', 'dsh-push-hub'),
      source: 'profile:' + name,
    })
  }

  for (const item of candidates) {
    try {
      // 必须同时有 package.json 与 lib/bus.js，才算是完整可用的包。
      if (!fs.existsSync(path.join(item.dir, 'package.json'))) continue
      if (!fs.existsSync(path.join(item.dir, 'lib', 'bus.js'))) continue
      return { dir: fs.realpathSync(item.dir), source: item.source }
    } catch {
      /* 下一个候选 */
    }
  }
  return null
}

/**
 * 动态加载 push-hub 的两个内部模块。
 *
 * 为什么用 file:// URL 而不是包名 import：本插件与 push-hub 是两个独立包，
 * Node 从本插件位置往上解析不到兄弟包的 node_modules；拿到真实目录后
 * 用绝对 file:// URL 最稳，也不受 profile 的符号链接形态影响。
 *
 * @param {string} dir push-hub 真实目录
 * @returns {Promise<{config: any, bus: any} | null>}
 */
export async function loadPushHub(dir) {
  if (!dir) return null
  try {
    const toUrl = (rel) => new URL('file://' + path.resolve(dir, rel).replace(/\\/g, '/')).href
    const config = await import(toUrl('lib/config.js'))
    const bus = await import(toUrl('lib/bus.js'))
    return { config, bus }
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[notify-sender] 加载 push-hub 失败：' + (err?.message ?? err))
    }
    return null
  }
}

/** 读 dsh-bridge 配置（只读，绝不写）。 */
export function readBridgeConfig() {
  return readJson(BRIDGE_CONFIG)
}

/** 读 dsh-im-connect 配置（只读）。 */
export function readImConnectConfig() {
  return readJson(IM_CONNECT_CONFIG)
}

/** 确保数据目录存在。 */
export function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    return true
  } catch {
    return false
  }
}

/** 读本插件设置。 */
export function readSettings() {
  return readJson(SETTINGS_PATH) ?? {}
}

/**
 * 写本插件设置（原子写：先写临时文件再改名，避免断电写坏）。
 * 每个字段都实时落盘，不依赖「保存」按钮。
 */
export function writeSettings(data) {
  if (!ensureDataDir()) return false
  const tmp = SETTINGS_PATH + '.tmp'
  try {
    fs.writeFileSync(tmp, JSON.stringify(data ?? {}, null, 2) + '\n', 'utf8')
    fs.renameSync(tmp, SETTINGS_PATH)
    return true
  } catch {
    return false
  }
}

/** 读发送历史。 */
export function readHistory() {
  const parsed = readJson(HISTORY_PATH)
  return Array.isArray(parsed?.entries) ? parsed.entries : []
}

/** 写发送历史。 */
export function writeHistory(entries) {
  if (!ensureDataDir()) return false
  const tmp = HISTORY_PATH + '.tmp'
  try {
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, entries }, null, 2) + '\n', 'utf8')
    fs.renameSync(tmp, HISTORY_PATH)
    return true
  } catch {
    return false
  }
}
