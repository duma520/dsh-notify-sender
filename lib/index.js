/**
 * dsh-notify-sender — Host 半身（只发不收的通知发送器）。
 *
 * 定位：本插件**不建立任何连接、不接收任何消息**。它只做一件事——
 * 把本机已经接通的通道与账号列出来，让用户挑一个 / 几个 / 全部，
 * 把通知发出去。
 *
 * 通道实现全部复用 @duma520/dsh-push-hub 的 lib/bus.js（不复制、不改它）；
 * 账号则比 push-hub 更宽：push-hub 自有账号 + dsh-bridge 已接通账号 + im-connect。
 *
 * 职责：
 *  1. /api 路由：给面板与外部脚本用（accounts / send / history / settings / selfcheck）；
 *  2. 工具：notify_accounts / notify_send（让 AI 也能直接发通知）；
 *  3. 配置：~/.dsh/dsh-notify-sender/config.json，每次改动实时落盘。
 *
 * 发送粒度（三档，同一套代码）：
 *  单选 1 个 → 只发那一个；多选 N 个 → 逐个发；全选 → 发到所有「可用」账号。
 *  **串行发送，不并行** —— 避免同时打多个通道触发对方限流（开发规则 g24/g25）。
 *  逐条返回结果：一个失败不连累其余，界面照实显示「N 成功 / M 失败」。
 *
 * @module index.js
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import * as paths from './paths.js'
import * as accounts from './accounts.js'
import * as sender from './sender.js'
import * as history from './history.js'
import * as deliverability from './deliverability.js'

/** 外部调用的 API 前缀。 */
const API_PREFIX = '/@duma520/dsh-notify-sender/api'

export const name = '@duma520/dsh-notify-sender'
export const inject = ['webServer', 'tools']

/** 版本号只有 package.json 一个来源，避免 /info 与包版本不同步。 */
function readVersion() {
  try {
    const meta = JSON.parse(readFileSync(path.join(paths.PKG_ROOT, 'package.json'), 'utf8'))
    return typeof meta?.version === 'string' ? meta.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 最后一次收到的客户端心跳。
 *
 * 为什么需要它：客户端半身要是没被执行，界面上就一个入口都没有，而服务端
 * （/info、API 路由、插件加载日志）全都正常 —— 只靠服务端完全看不出区别。
 * 有了这条记录就能一句话判断「这个页面到底跑没跑过本插件的 apply()」。
 */
const clientHello = { at: '', stage: '', loadId: '', ua: '', href: '', visibility: '', slots: null, style: null, note: '' }

/** 读请求体并解析 JSON；空体返回 {}。 */
async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readQuery(req) {
  try {
    return new URL(String(req?.url ?? ''), 'http://127.0.0.1').searchParams
  } catch {
    return new URLSearchParams()
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

/**
 * 从本机历史推导「哪些账号上次真发失败了」（v0.2.9）。
 *
 * 单独抽一层是为了让 collectAccounts 和 /selftest 用同一份判据，
 * 不会出现「面板说有历史、自检说没有」这种自相矛盾。
 */
function deliverabilityOf() {
  return deliverability.deriveFromDisk()
}

/**
 * 聚合当前可用账号。
 *
 * push-hub 没装时不崩：返回空清单 + 明确原因，界面据此提示该装什么。
 */
async function collectAccounts() {
  const settings = paths.readSettings()
  const hub = await sender.getHub()
  let cfg = null
  if (hub.ok === true) {
    try {
      cfg = hub.config.load(settings?.pushHubPath || undefined)
    } catch {
      cfg = null
    }
  }
  // v0.2.9：把「上次真发到底成没成」一起并进账号描述。
  // 历史读不出来（首次运行）不该把整个面板打死，出错就当没有历史、按可用处理。
  let delivMap = new Map()
  try {
    delivMap = deliverabilityOf()
  } catch {
    delivMap = new Map()
  }
  const collected = accounts.collect(cfg, {
    disabledSources: settings?.disabledSources,
    targetOverrides: settings?.targetOverrides,
    deliverability: delivMap,
  });
  return {
    list: accounts.publicList(collected),
    byId: collected.byId,
    sources: collected.sources,
    hub: hub.ok === true ? { ok: true, dir: hub.dir, source: hub.source } : { ok: false, error: String(hub.error ?? '') },
  };
}

/** 设置项的默认值。 */
function defaultSettings() {
  return {
    version: 1,
    pushHubPath: '',
    disabledSources: [],
    lastAccountId: '',
    lastAccountIds: [],
    lastChannel: '',
    dryRunByDefault: true,
    // v0.2.9：手动指定的发送目标。键 = 账号 id（channel::source::name），
    // 值 = 'o9cq…@im.wechat' 或 {kind:'user'|'group', id:'…'}。
    // 只在本插件内存里合并成 acc.target，绝不回写 bridge / push-hub 的配置。
    targetOverrides: {},
  };
}

/** 合并设置（只接受已知键，防止面板误写进奇怪字段）。 */
function mergeSettings(current, patch) {
  const out = { ...defaultSettings(), ...(current && typeof current === 'object' ? current : {}) }
  if (!patch || typeof patch !== 'object') return out
  const allowed = ['pushHubPath', 'disabledSources', 'lastAccountId', 'lastAccountIds', 'lastChannel', 'dryRunByDefault', 'targetOverrides']
  for (const key of allowed) {
    if (!Object.hasOwn(patch, key)) continue
    if (key === 'disabledSources' || key === 'lastAccountIds') {
      out[key] = Array.isArray(patch[key]) ? patch[key].map(String) : []
    } else if (key === 'dryRunByDefault') {
      out.dryRunByDefault = patch.dryRunByDefault === true
    } else if (key === 'targetOverrides') {
      // 只收「账号 id → 目标」的扁平映射；值允许字符串或 {kind,id}。
      // 空字符串等于删除这条覆盖（撤销手动指定，回落到平台侧记录的目标）。
      const next = {}
      const raw = patch.targetOverrides
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [id, value] of Object.entries(raw)) {
          const key2 = String(id ?? '').trim()
          if (key2 === '') continue
          if (typeof value === 'string') {
            const v = value.trim()
            if (v !== '') next[key2] = v
            continue
          }
          if (value && typeof value === 'object') {
            const targetId = String(value.id ?? '').trim()
            if (targetId === '') continue
            next[key2] = { kind: value.kind === 'group' ? 'group' : 'user', id: targetId }
          }
        }
      }
      out.targetOverrides = next
    } else {
      out[key] = String(patch[key] ?? '')
    }
  }
  return out
}

/** 自检：只读，不发任何消息。 */
async function selfCheck() {
  const hub = await sender.getHub()
  const all = await collectAccounts()
  const byChannel = {}
  for (const item of all.list) {
    const row = byChannel[item.channel] ?? { total: 0, usable: 0, deliverable: 0, names: [] }
    row.total += 1
    if (item.usable) row.usable += 1
    if (item.deliverable !== false) row.deliverable += 1
    const mark = item.usable ? (item.deliverable === false ? '（上游发不出）' : '') : '（缺凭据/目标）'
    row.names.push(item.name + '@' + item.source + mark)
    byChannel[item.channel] = row
  }
  return {
    ok: hub.ok === true && all.list.length > 0,
    version: readVersion(),
    pushHub: hub.ok === true ? { ok: true, dir: hub.dir, source: hub.source } : { ok: false, error: String(hub.error ?? '') },
    settingsPath: paths.SETTINGS_PATH,
    historyPath: paths.HISTORY_PATH,
    totalAccounts: all.list.length,
    usableAccounts: all.list.filter((i) => i.usable).length,
    // 配置齐、且最近一次真发没被判成「上游未就绪」的账号数。
    deliverableAccounts: all.list.filter((i) => i.usable && i.deliverable !== false).length,
    sources: all.sources,
    channels: byChannel,
    // 最后一次客户端心跳：at 为空说明这个 DSH 进程里还没有任何页面跑过本插件的 apply()。
    client: clientHello,
  }
}

/**
 * 真探测（v0.2.9）：逐个账号调 push-hub 的 probeAccount。
 *
 * 为什么不能只靠历史：新装用户一条历史都没有，黄不了也绿不了。
 * 为什么不能只靠 probe：微信的 probe 只验 token（getconfig），
 * 而 sendmessage 可能恒返 ret=-2 —— 所以这里是**补充**，不是替代。
 * 界面把这两条信息并排显示，用户才能判断「是没测过，还是测了也不行」。
 *
 * 只读，不发任何消息，不消耗消息配额。
 */
async function runSelfTest(input) {
  const hub = await sender.getHub()
  if (hub.ok !== true) {
    return { ok: false, error: '推送中枢未就绪：' + String(hub.error ?? ''), results: [] }
  }
  const settings = paths.readSettings()
  let cfg = null
  try {
    cfg = hub.config.load(settings?.pushHubPath || undefined)
  } catch (error) {
    return { ok: false, error: '读取推送中枢配置失败：' + String(error?.message ?? error), results: [] }
  }
  const all = await collectAccounts()
  // 只探「配置齐」的账号 —— 缺凭据的账号 probe 只会回一句「找不到该账号」，
  // 对用户没有信息量，反而把结果列表冲得看不清。
  const wanted = new Set(
    Array.isArray(input?.accountIds) ? input.accountIds.map(String) : [],
  )
  const pool = all.list.filter((item) => item.usable && (wanted.size === 0 || wanted.has(item.id)))

  const results = []
  for (const item of pool) {
    // 串行：与发送保持一致，避免同时打满上游（开发规则 g24）。
    let outcome
    try {
      outcome = await sender.probeAccount({ account: item, cfg })
    } catch (error) {
      outcome = { ok: false, detail: '探测异常：' + String(error?.message ?? error), supported: false }
    }
    results.push({
      id: item.id,
      channel: item.channel,
      account: item.name,
      source: item.source,
      ok: outcome?.ok === true,
      supported: outcome?.supported !== false,
      detail: String(outcome?.detail ?? ''),
      // 历史判据也一并回，界面能把「刚探到 OK 但上次真发炸了」这种矛盾直接摆出来。
      lastFail: item.deliverable === false ? String(item.deliverNote ?? '') : '',
    })
  }
  const passed = results.filter((r) => r.ok).length
  return {
    ok: results.length > 0 && passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    at: new Date().toISOString(),
    results,
  }
}

/**
 * 把请求里的选择解析成一组账号 id。
 *
 * 支持三种写法（等价，允许混用）：
 *   { accountId: 'x' }            —— 单个（老参数名，保持兼容）
 *   { accountIds: ['x','y'] }     —— 多选
 *   { all: true }                 —— 全选所有「可用」账号
 */
function resolveSelection(input, all) {
  const ids = []
  const pushId = (value) => {
    const id = String(value ?? '').trim()
    if (id !== '' && !ids.includes(id)) ids.push(id)
  }

  if (input?.all === true) {
    for (const item of all.list) if (item.usable === true) pushId(item.id)
    return { ids, mode: 'all' }
  }

  if (Array.isArray(input?.accountIds)) for (const id of input.accountIds) pushId(id)
  if (Array.isArray(input?.account_ids)) for (const id of input.account_ids) pushId(id)
  pushId(input?.accountId)
  pushId(input?.account_id)

  return { ids, mode: ids.length > 1 ? 'multi' : 'single' }
}

/**
 * 发一条到一个具体账号（不落设置、不记历史 —— 由调用方统一处理）。
 */
async function sendToTarget(target, input) {
  const title = String(input?.title ?? '')
  const text = String(input?.text ?? '')
  const dryRun = input?.dryRun === true || input?.dry_run === true

  const body = sender.composeBody(title, text)
  if (body.trim() === '') {
    return { ok: false, error: '正文为空，没东西可发', channel: target.channel, account: target.name, accountId: target.id }
  }

  const outcome = await sender.sendWithAccount({ account: target, text: body, dryRun })

  return {
    ...outcome,
    accountId: target.id,
    account: target.name,
    channel: target.channel,
    source: target.source,
    preview: history.preview(body),
  }
}

/**
 * 执行一次发送（面板 / 工具 / 外部脚本共用同一入口）。
 *
 * 支持 1 个或多个账号；**串行**发，逐条返回。
 * 一个失败不连累其余：batch.ok 只在「全部成功」时为 true，
 * 部分成功时仍是 ok:false，但 results 里每条明明白白。
 */
async function doSend(input) {
  const all = await collectAccounts()
  const { ids, mode } = resolveSelection(input, all)

  if (ids.length === 0) {
    return { ok: false, error: '没有选择账号（先选一个，或传 all:true 发到所有可用账号）' }
  }

  // 先整体校验：任何一条不合格就整体拒绝，避免「发了一半才发现第 5 个没目标」。
  const targets = []
  for (const id of ids) {
    const hit = all.byId.get(id) ?? null
    if (hit === null) {
      return { ok: false, error: '找不到账号 ' + id + '，可能来源配置已变，请刷新账号列表' }
    }
    if (hit.usable !== true) {
      return { ok: false, error: '该账号缺少凭据字段，无法发送：' + hit.channel + ' / ' + hit.name }
    }
    targets.push(hit)
  }

  // 正文也属于「整体校验」的一部分：空正文不该逐个账号各报一次失败（会得到 17 条一样的错），
  // 应当在选完目标后立刻拦下。sendToTarget 里仍保留同样的判断，作为单条调用时的兜底。
  if (sender.composeBody(String(input?.title ?? ''), String(input?.text ?? '')).trim() === '') {
    return { ok: false, error: '正文为空，没东西可发' }
  }

  const dryRun = input?.dryRun === true || input?.dry_run === true

  // 串行发送：不 Promise.all 并行，避免一个用户点击同时打穿多路通道配额。
  const results = []
  for (const target of targets) {
    results.push(await sendToTarget(target, input))
  }

  const sent = results.filter((r) => r.ok === true).length
  const failed = results.length - sent
  const allOk = failed === 0

  // 记住上次选择，下次打开面板直接回填 —— 实时落盘，不等用户点保存。
  const settings = paths.readSettings()
  paths.writeSettings(mergeSettings(settings, {
    lastAccountIds: targets.map((t) => t.id),
    lastAccountId: targets[0].id,
    lastChannel: targets[0].channel,
  }))

  if (dryRun !== true) {
    for (let i = 0; i < results.length; i += 1) {
      const outcome = results[i]
      const target = targets[i]
      history.record({
        channel: target.channel,
        channelTitle: outcome?.title ?? '',
        account: target.name,
        source: target.source,
        ok: outcome?.ok === true,
        detail: outcome?.detail,
        messageIds: outcome?.messageIds,
        chars: outcome?.chars,
        blocks: outcome?.blocks,
        text: sender.composeBody(input?.title, input?.text),
      })
    }
  }

  const summary = {
    ok: allOk,
    dryRun,
    mode,
    total: results.length,
    sent,
    failed,
    results,
  }

  // 只发一个时保持扁平形状（老调用方与工具输出读起来更顺）。
  if (results.length === 1) return { ...results[0], ...summary, ok: allOk }
  return summary
}

/**
 * @param {any} ctx cordis 上下文
 * @param {any} config_in 插件配置
 */
export function apply(ctx, config_in) {
  const configuredPath = typeof config_in?.configPath === 'string' ? config_in.configPath.trim() : ''
  if (configuredPath !== '') {
    // 允许通过插件配置指定 push-hub 目录（与设置页的 pushHubPath 同效，配置优先）。
    process.env.NOTIFY_SENDER_PUSH_HUB = configuredPath;
  }

  // ── API ───────────────────────────────────────────────────────────────
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler: async (req, res) => {
      const url = String(req.url ?? '')
      const sub = url.startsWith(API_PREFIX) ? url.slice(API_PREFIX.length) : url
      const route = sub.split('?')[0].replace(/\/+$/, '') || '/'
      const isPost = req.method === 'POST'
      try {
        if (route === '/info') {
          return sendJson(res, 200, { ok: true, version: readVersion(), name });
        }

        if (route === '/accounts') {
          const all = await collectAccounts();
          return sendJson(res, 200, {
            ok: all.hub.ok === true,
            hub: all.hub,
            sources: all.sources,
            count: all.list.length,
            accounts: all.list,
            last: accounts.lastSelection(),
            // 手动指定的目标与三态汇总：界面用它画黄卡、也能一键撤销。
            overrides: paths.readSettings()?.targetOverrides ?? {},
          });
        }

        if (route === '/selftest' && isPost) {
          const payload = await readJsonBody(req);
          if (payload === null) return sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' });
          return sendJson(res, 200, await runSelfTest(payload));
        }

        if (route === '/send' && isPost) {
          const payload = await readJsonBody(req);
          if (payload === null) return sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' });
          const outcome = await doSend(payload);
          return sendJson(res, outcome?.ok === true ? 200 : 502, outcome);
        }

        if (route === '/history') {
          const limitRaw = readQuery(req).get('limit');
          const limit = limitRaw === null ? 50 : Number(limitRaw);
          const list = history.recent(limit);
          return sendJson(res, 200, { ok: true, path: paths.HISTORY_PATH, count: list.length, entries: list });
        }

        if (route === '/settings') {
          // GET 必须支持：设置区初次挂载就是 GET /settings 拉现值。
          // 早先只有 POST 分支，GET 落到 404，设置区会永远停在「正在读取设置…」，
          // 而改一项之后 patch() 用 POST 的返回值把 state 填上，看起来又「好了」——
          // 这种半好状态最难查，所以两条都留着。
          if (!isPost) {
            return sendJson(res, 200, { ok: true, settings: mergeSettings(paths.readSettings(), null) });
          }
          const payload = await readJsonBody(req);
          if (payload === null) return sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' });
          const merged = mergeSettings(paths.readSettings(), payload);
          const written = paths.writeSettings(merged);
          if (Object.hasOwn(payload, 'pushHubPath')) sender.resetHub();
          return sendJson(res, written ? 200 : 500, { ok: written, settings: merged });
        }

        if (route === '/hello') {
          if (isPost) {
            const payload = await readJsonBody(req)
            if (payload === null) return sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' })
            clientHello.at = new Date().toISOString()
            clientHello.stage = String(payload.stage ?? '')
            clientHello.loadId = String(payload.loadId ?? '')
            clientHello.ua = String(payload.ua ?? '').slice(0, 400)
            clientHello.href = String(payload.href ?? '').slice(0, 400)
            clientHello.visibility = String(payload.visibility ?? '')
            clientHello.slots = payload.slots && typeof payload.slots === 'object' ? payload.slots : null
            // style 是「样式到底插进了哪个 root、解析出多少条规则」的诊断，v0.2.8 新增。
            clientHello.style = payload.style && typeof payload.style === 'object' ? payload.style : null
            clientHello.note = String(payload.note ?? '').slice(0, 400)
          }
          return sendJson(res, 200, { ok: true, client: clientHello })
        }

        if (route === '/selfcheck') {
          return sendJson(res, 200, await selfCheck());
        }

        return sendJson(res, 404, { ok: false, error: '未知接口 ' + route });
      } catch (error) {
        return sendJson(res, 500, { ok: false, error: String(error?.message ?? error) });
      }
    },
  }), 'notify-sender: api')

  // ── 工具 1：列账号 ────────────────────────────────────────────────────
  ctx.effect(() => ctx.tools.register({
    name: 'notify_accounts',
    description: '列出本机所有可用来「发通知」的通道与账号（只发不收）。账号来自 push-hub 自有配置与 dsh-bridge 已接通账号，凭据一律不外泄，只给账号名、来源、目标与掩码指纹。选账号前先调它。',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    async execute() {
      const all = await collectAccounts();
      const rows = all.list.map((item) => ({
        id: item.id,
        channel: item.channel,
        account: item.name,
        source: item.source,
        usable: item.usable,
        target: item.target,
        // v0.2.9：deliverable=false 表示「配置齐但上次真发被上游拒了（如微信 ret=-2）」，
        // 仍可发送（用户可能想重试），但 AI 不该把它当成「一切正常」。
        deliverable: item.deliverable !== false,
        deliverNote: item.deliverNote,
        needTarget: item.needTarget,
        targetOverridden: item.targetOverridden === true,
      }));
      return JSON.stringify({
        ok: all.hub.ok === true,
        hub: all.hub,
        total: rows.length,
        usable: rows.filter((r) => r.usable).length,
        accounts: rows,
      }, null, 2);
    },
  }), 'notify-sender: accounts tool')

  // ── 工具 2：发通知 ────────────────────────────────────────────────────
  ctx.effect(() => ctx.tools.register({
    name: 'notify_send',
    description: '用指定账号发一条通知（只发不收）。三种粒度：给 account_id 发 1 个；给 account_ids 数组发多个；给 all=true 发到所有可用账号。必须先用 notify_accounts 拿到账号 id。默认 dry_run=true 只做预览不真发；确认无误后传 dry_run=false 才真正发出去。多个账号时串行发送（避免触发通道限流），逐条返回结果，一个失败不连累其余。',
    parameters: {
      account_id: { type: 'string', description: '只发一个账号时用：notify_accounts 返回的 id 原文。' },
      account_ids: { type: 'array', items: { type: 'string' }, description: '发到多个指定账号时用：账号 id 数组（2 个及以上）。' },
      all: { type: 'boolean', description: 'true = 发到所有「可用」账号（等于全选）。用它之前先想清楚，这会真发到十几个人。' },
      text: { type: 'string', required: true, description: '通知正文，可多行。' },
      title: { type: 'string', description: '可选标题，会以【标题】形式加在正文最前面。' },
      dry_run: { type: 'boolean', description: 'true（默认）只返回切成几块、发到哪，不真发；确认后再传 false。' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    async execute(args) {
      const dry = args?.dry_run === undefined ? true : args.dry_run === true;
      const outcome = await doSend({
        accountId: args?.account_id,
        accountIds: args?.account_ids,
        all: args?.all === true,
        title: args?.title,
        text: args?.text,
        dryRun: dry,
      });
      return JSON.stringify(outcome, null, 2);
    },
  }), 'notify-sender: send tool')

  // ── 工具 3：自检 ──────────────────────────────────────────────────────
  ctx.effect(() => ctx.tools.register({
    name: 'notify_selfcheck',
    description: '通知发送器自检：确认 push-hub 找得到、账号聚合出多少个、哪些缺凭据、配置文件在哪。只读，不发任何消息。排查「为什么列不出账号」时先看它。',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    async execute() {
      return JSON.stringify(await selfCheck(), null, 2);
    },
  }), 'notify-sender: selfcheck tool')
}
