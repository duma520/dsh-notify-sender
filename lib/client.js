/**
 * 必须是 var，不能是 const —— 这是踩过的坑，别改回去。
 *
 * 宿主把几十个插件的客户端 bundle 拼成**同一个 classic script**（combo 路由
 * /plugins/??a/client.js,b/client.js&rev=...）。在 classic script 的顶层用 const/let
 * 声明的名字进的是全局词法环境，同一个文档里**第二次执行同一段拼接脚本**（热重载、
 * 重新注入 combo）就会在解析阶段抛 SyntaxError: Identifier 'X' has already been
 * declared —— 整段脚本一行都不执行，本插件所有插槽注册静默失效，界面上就是
 * 「插件在运行、但侧栏和设置里都找不到它」。
 *
 * 对照：dsh-push-hub 与 dsh-composer-butler 的 client.js 顶层一条语句都没有（全塞在
 * factory 里），所以它们不受影响；本项目早期版本把 CSS 数组放在文件第一行且用 const，
 * 正是「v0.2.3 加了入口却仍不显示」的根因。var 在 classic script 顶层是重复声明安全的。
 */
var CSS_LINES = [".ns-wrap{display:flex;flex-direction:column;gap:14px;font-size:13px;line-height:1.55;color:var(--dsh-text,#1f1f1f);box-sizing:border-box;flex:1 1 auto;min-height:0;max-height:calc(100vh - 88px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:24px;}",".ns-wrap *{box-sizing:border-box;}",".ns-wrap{scrollbar-width:thin;scrollbar-color:var(--dsh-scrollbar-thumb,rgba(128,128,128,.45)) transparent;}",".ns-wrap::-webkit-scrollbar,.ns-accounts::-webkit-scrollbar,.ns-log::-webkit-scrollbar,.ns-hist::-webkit-scrollbar,.ns-per::-webkit-scrollbar{width:8px;height:8px;}",".ns-wrap::-webkit-scrollbar-track,.ns-accounts::-webkit-scrollbar-track,.ns-log::-webkit-scrollbar-track,.ns-hist::-webkit-scrollbar-track,.ns-per::-webkit-scrollbar-track{background:transparent;}",".ns-wrap::-webkit-scrollbar-thumb,.ns-accounts::-webkit-scrollbar-thumb,.ns-log::-webkit-scrollbar-thumb,.ns-hist::-webkit-scrollbar-thumb,.ns-per::-webkit-scrollbar-thumb{background:var(--dsh-scrollbar-thumb,rgba(128,128,128,.45));border-radius:8px;}",".ns-wrap::-webkit-scrollbar-thumb:hover,.ns-accounts::-webkit-scrollbar-thumb:hover,.ns-log::-webkit-scrollbar-thumb:hover,.ns-hist::-webkit-scrollbar-thumb:hover,.ns-per::-webkit-scrollbar-thumb:hover{background:var(--dsh-scrollbar-thumb-hover,rgba(128,128,128,.75));}",".ns-card{border:1px solid var(--dsh-border,#e3e3e3);border-radius:10px;padding:14px;background:var(--dsh-surface,#fff);}",".ns-card-narrow{max-width:min(100%,980px);}",".ns-title{font-weight:600;font-size:14px;margin:0 0 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}",".ns-hint{opacity:.68;font-size:12px;line-height:1.5;}",".ns-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}",".ns-row > label{min-width:64px;opacity:.75;}",".ns-grow{flex:1 1 240px;min-width:0;}",".ns-field{width:100%;background:var(--dsh-input-bg,transparent);color:inherit;border:1px solid var(--dsh-border,#d9d9d9);border-radius:7px;padding:7px 9px;font:inherit;outline:none;}",".ns-field:focus{border-color:var(--dsh-accent,#4a7dff);}",".ns-area{min-height:132px;resize:vertical;line-height:1.55;}",".ns-btn{display:inline-flex;align-items:center;gap:6px;background:transparent;color:inherit;border:1px solid var(--dsh-border,#d9d9d9);border-radius:7px;padding:6px 13px;font:inherit;cursor:pointer;}",".ns-btn:hover:not(:disabled){background:var(--dsh-hover,rgba(0,0,0,.05));}",".ns-btn:disabled{opacity:.45;cursor:not-allowed;}",".ns-btn-primary{border-color:var(--dsh-accent,#4a7dff);background:var(--dsh-accent,#4a7dff);color:#fff;}",".ns-btn-primary:hover:not(:disabled){filter:brightness(1.06);background:var(--dsh-accent,#4a7dff);}",".ns-btn-sm{padding:3px 9px;font-size:12px;}",".ns-accounts{display:flex;flex-wrap:wrap;gap:8px;max-height:290px;overflow:auto;padding:2px;}",".ns-acc{position:relative;display:flex;flex-direction:column;gap:2px;align-items:flex-start;min-width:172px;max-width:100%;text-align:left;border:1px solid var(--dsh-border,#d9d9d9);border-radius:9px;padding:8px 11px;background:transparent;color:inherit;font:inherit;cursor:pointer;}",".ns-acc:hover{background:var(--dsh-hover,rgba(0,0,0,.05));}",".ns-acc[data-on=\\\"1\\\"]{border-color:var(--dsh-accent,#4a7dff);background:rgba(74,125,255,.10);box-shadow:0 0 0 2px var(--dsh-accent,#4a7dff) inset;}",".ns-acc[data-on=\\\"1\\\"]::after{display:none;}",".ns-acc[data-off=\\\"1\\\"]{opacity:.5;cursor:not-allowed;}",".ns-acc-head{display:flex;align-items:center;gap:6px;max-width:100%;min-width:0;}.ns-acc-name{flex:0 1 auto;min-width:0;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.ns-acc-badge{flex:none;font-size:10px;font-weight:600;line-height:16px;padding:0 7px;border-radius:999px;background:var(--dsh-accent,#4a7dff);color:#fff;}.ns-picked{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px;}.ns-picked-chip{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--dsh-accent,#4a7dff);background:rgba(74,125,255,.10);border-radius:999px;padding:1px 4px 1px 9px;font-size:11px;}.ns-picked-x{border:none;background:transparent;color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:0 4px;opacity:.7;}.ns-picked-x:hover{opacity:1;}",".ns-acc-meta{font-size:11px;opacity:.68;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",".ns-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:1px 9px;font-size:11px;border:1px solid var(--dsh-border,#d9d9d9);opacity:.9;}",".ns-chip-ok{border-color:#3f9c5a;color:#3f9c5a;}",".ns-chip-bad{border-color:#c87b22;color:#c87b22;}",".ns-bar{position:relative;height:8px;border-radius:999px;background:var(--dsh-hover,rgba(0,0,0,.08));overflow:hidden;}",".ns-bar-fill{height:100%;border-radius:999px;background:var(--dsh-accent,#4a7dff);transition:width .22s ease;}",".ns-bar-fill[data-err=\\\"1\\\"]{background:#d9534f;}",".ns-bar-fill[data-ok=\\\"1\\\"]{background:#3f9c5a;}",".ns-bar-row{display:flex;align-items:center;gap:10px;}",".ns-bar-label{font-size:12px;opacity:.72;white-space:nowrap;}",".ns-log{font-family:Cascadia Mono,Consolas,monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;background:var(--dsh-hover,rgba(0,0,0,.04));border-radius:8px;padding:9px 11px;max-height:220px;overflow:auto;}",".ns-hist{display:flex;flex-direction:column;gap:7px;max-height:300px;overflow:auto;}",".ns-hist-item{display:flex;gap:9px;align-items:flex-start;border-bottom:1px dashed var(--dsh-border,#eee);padding-bottom:7px;}",".ns-hist-main{flex:1 1 auto;min-width:0;}",".ns-hist-when{font-size:11px;opacity:.6;white-space:nowrap;}",".ns-hist-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",".ns-empty{opacity:.6;padding:10px 2px;}",".ns-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:14px;align-items:start;}",".ns-icon{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--dsh-border,#d9d9d9);font-size:13px;}",".ns-per{display:flex;flex-direction:column;gap:3px;max-height:260px;overflow:auto;}",".ns-per-item{display:flex;gap:8px;align-items:center;font-size:12px;}",".ns-per-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}","@media (max-width:900px){.ns-split{grid-template-columns:minmax(0,1fr);}}","@media (max-width:560px){.ns-row > label{min-width:0;width:100%;}.ns-acc{min-width:100%;}}"]

/**
 * dsh-notify-sender — 浏览器半身（中文界面）。
 *
 * 为什么手写 ModuleLoader bundle 而不是走构建：本机没有 tsc、也没有 DSH 源码 checkout，
 * 与 dsh-composer-butler、dsh-push-hub 走同一条已验证路线（零构建、只依赖 shell 提供的 react）。
 *
 * 界面做的事：
 *   选账号（1 个 / 多个 / 全选） → 写内容 → 预览或发送 → 逐条看结果 → 看记录。
 *
 * 三条硬约束（对应开发规则）：
 *  1. 全中文；
 *  2. 有进度条，且进度是真实阶段（准备→发送→完成），不是假动画；
 *  3. 设置改动实时落盘（每次勾选/改路径立刻 POST，不等「保存」按钮）。
 *
 * 多发安全阀：选中 3 个及以上且要真发时，按钮变成「再点一次确认」——
 * 一次误点不该把通知打到十几个账号上。
 *
 * 凭据纪律：本界面**永远不显示、不请求、不缓存**任何 token/secret。
 *
 * @module client.js
 */

window.__ModuleLoader__.load({
  id: '@duma520/dsh-notify-sender',
  factory: require => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const { createElement: h, useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } = React

    /** 与 host 半身一致的 API 前缀。 */
    const API_BASE = '/@duma520/dsh-notify-sender/api'
    /** 侧栏面板 id，main 与 sidebar 两处必须一致，否则点侧栏切不过去。 */
    const PANEL_ID = 'notify-sender'
    /** 样式表 id，注入一次即可。 */
    const STYLE_ID = 'notify-sender-style'
    /** 本插件声明的插槽依赖。 */
    const inject = ['slots']

    /**
     * 客户端心跳。
     *
     * 为什么要有它：这个插件曾经出现「服务端一切正常（/info 有版本、插件日志 applied），
     * 但界面上一个入口都没有」的情况 —— 服务端完全看不出客户端半身到底跑没跑过。
     * 这里在 apply() 开头与结尾各报一次，把「哪个页面、哪次加载、各入口注册成没成」
     * 落到 host 的 /api/hello 上，排查时一句话就能定位。
     *
     * 三条纪律：① 绝不能因为心跳失败影响插件；② 只发一次不重试；
     * ③ 不携带任何凭据与账号信息（只有页面地址、UA 与注册结果）。
     */
    const LOAD_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    const helloSlots = { settings: false, bundleConfig: false, main: false, panellist: false, panellistActions: false, detailAction: false }

    /** 向 host 报一次心跳；任何异常都当没发生。 */
    function reportHello(stage, note) {
      try {
        const body = { stage: String(stage), loadId: LOAD_ID, note: String(note ?? ''), slots: helloSlots, style: styleDiag }
        if (typeof document !== 'undefined' && document !== null) {
          body.href = String(document.location?.href ?? '')
          body.visibility = String(document.visibilityState ?? '')
        }
        if (typeof navigator !== 'undefined' && navigator !== null) body.ua = String(navigator.userAgent ?? '')
        if (typeof fetch === 'function') {
          void fetch(API_BASE + '/hello', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }).catch(() => {})
        }
      } catch {
        /* 心跳只是诊断手段，失败绝不影响插件 */
      }
    }

    /** 通道中文名与图标字符（不引外部图标字体，离线可用）。 */
    const CHANNEL_META = {
      telegram: { title: 'Telegram', glyph: '✈' },
      feishu: { title: '飞书', glyph: '飞' },
      wechat: { title: '微信', glyph: '微' },
      qq: { title: 'QQ', glyph: 'Q' },
      dingtalk: { title: '钉钉', glyph: '钉' },
      wecom: { title: '企业微信', glyph: '企' },
      wecom_app: { title: '企业微信自建应用', glyph: '企' },
      slack: { title: 'Slack', glyph: 'S' },
      discord: { title: 'Discord', glyph: 'D' },
      matrix: { title: 'Matrix', glyph: 'M' },
      synology_chat: { title: '群晖 Chat', glyph: '群' },
      email: { title: '邮件', glyph: '@' },
    }

    /** 账号来源的中文解释。 */
    const SOURCE_LABEL = {
      'push-hub': '推送中枢自有',
      bridge: 'IM 桥接已接通',
      'im-connect': 'IM 连接',
    }

    function channelTitle(id) {
      const meta = CHANNEL_META[id]
      return meta === undefined ? String(id) : meta.title
    }

    function channelGlyph(id) {
      const meta = CHANNEL_META[id]
      return meta === undefined ? '·' : meta.glyph
    }

    function sourceLabel(id) {
      const hit = SOURCE_LABEL[id]
      return hit === undefined ? String(id) : hit
    }

    /** 多发「再点一次确认」的触发阈值。 */
    const CONFIRM_THRESHOLD = 3

    /**
     * 样式：靠 var(--dsh-*) 跟主题走，不写死颜色，深浅色都不糊。
     *
     * 为什么要「往任意 root 里插一份」（v0.2.8）：
     * 面板挂在哪里由宿主的插槽系统决定。正常情形它就在主文档里，样式插进
     * document.head 就够；但如果宿主把面板包进 shadow root，主文档里的
     * <style> 对 shadow 内部**完全无效** —— 表现就是「功能全对、样式全丢」，
     * 而 CSS 文本本身一个字都没错。所以这里不再假设 root 一定是 document：
     * 谁需要样式，就往它所在的那个 root 里补一份（同一 root 只补一次）。
     */
    const styleDiag = { roots: [], rules: 0, error: '' }

    /** 往指定 root 里确保有一份本插件样式；root 可以是 document 或 ShadowRoot。 */
    function ensureStyleIn(root) {
      if (root === null || root === undefined) return null
      if (typeof root.querySelector !== 'function') return null
      const existing = root.querySelector('style[data-ns-css="1"]')
      if (existing !== null && existing !== undefined) return existing
      const style = document.createElement('style')
      style.setAttribute('data-ns-css', '1')
      if (root === document) style.id = STYLE_ID
      style.textContent = CSS_LINES.join('')
      const host = root === document
        ? (document.head === null || document.head === undefined ? document.documentElement : document.head)
        : root
      if (host === null || host === undefined) return null
      host.appendChild(style)
      const kind = root === document ? 'document' : 'shadow'
      if (styleDiag.roots.indexOf(kind) === -1) styleDiag.roots.push(kind)
      try {
        const sheet = style.sheet
        styleDiag.rules = sheet === null || sheet === undefined ? 0 : sheet.cssRules.length
      } catch (error) {
        styleDiag.error = String(error && error.message ? error.message : error).slice(0, 200)
      }
      return style
    }

    /**
     * 组件级补样式：返回一个 ref，挂到组件根节点上即可。
     * 挂载后从该节点往上找根（Document 或 ShadowRoot），往那个根里补一份样式。
     * 用 hook 而不是在每个组件里复写同一段，是为了「入口再多也不会漏一个」。
     */
    function useRootStyle(existing) {
      const own = useRef(null)
      const ref = existing === null || existing === undefined ? own : existing
      useLayoutEffect(() => {
        try {
          const element = ref.current
          if (element === null || element === undefined) return
          const root = typeof element.getRootNode === 'function' ? element.getRootNode() : null
          if (root !== null && root !== undefined && root !== document) ensureStyleIn(root)
          reportHello('style-ensured', 'roots=' + styleDiag.roots.join('+') + ' rules=' + String(styleDiag.rules))
        } catch {
          /* 补样式失败不影响面板 */
        }
      }, [])
      return ref
    }

    /**
     * 主文档那份（apply 时先插，绝大多数情形就靠它）。
     *
     * 为什么卸载时**不**把 <style> 删掉（v0.2.8 修的就是这个）：
     * 卸载函数会在插件热重载时执行。顺序是「新实例 apply → 看到旧 <style> 还在，
     * 于是返回空清理函数 → 旧实例 dispose，把它删了」。结果新实例认定样式已就位、
     * 旧的刚被删掉 —— 页面上就一份样式都不剩：功能全对，样式全丢，而且刷新前
     * 无法自愈。样式节点本身是惰性且极小的，留着比删掉安全，所以这里不删。
     */
    function installStyle() {
      if (typeof document === 'undefined') return () => {}
      ensureStyleIn(document)
      return () => {}
    }

    /** 统一的请求封装：把网络错误也变成 {ok:false,error}，界面不必到处 try。 */
    async function request(path, options) {
      const opt = options === undefined ? {} : options
      try {
        const response = await fetch(API_BASE + path, {
          method: opt.method === undefined ? 'GET' : opt.method,
          headers: opt.body === undefined ? undefined : { 'content-type': 'application/json' },
          body: opt.body === undefined ? undefined : JSON.stringify(opt.body),
        })
        const text = await response.text()
        let data = null
        try { data = text === '' ? null : JSON.parse(text) } catch { data = { ok: false, error: '返回不是 JSON：' + text.slice(0, 200) } }
        if (data === null) return { ok: false, error: '空响应（HTTP ' + response.status + '）' }
        return data
      } catch (error) {
        return { ok: false, error: '请求失败：' + String((error && error.message) || error) }
      }
    }

    /** 进度条。value 为 0–100；label 说明当前阶段，不写假话。 */
    function ProgressBar(props) {
      const value = Math.max(0, Math.min(100, Number(props.value) || 0))
      const fill = h('div', {
        className: 'ns-bar-fill',
        style: { width: value + '%' },
        'data-err': props.state === 'error' ? '1' : undefined,
        'data-ok': props.state === 'done' ? '1' : undefined,
      })
      return h('div', { className: 'ns-bar-row' },
        h('div', { className: 'ns-bar ns-grow', role: 'progressbar', 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': 100 }, fill),
        h('div', { className: 'ns-bar-label' }, String(value) + '%  ' + String(props.label || ''))
      )
    }

    /** 通道标签（带图标字符，纯文本，不依赖图标库）。 */
    function ChannelChip(props) {
      return h('span', { className: 'ns-chip' },
        h('span', { className: 'ns-icon', style: { width: '18px', height: '18px', fontSize: '11px', borderRadius: '5px' } }, channelGlyph(props.channel)),
        channelTitle(props.channel)
      )
    }

    /**
     * 账号卡片。可多选；缺凭据/缺目标的一律置灰并给出原因，不让用户点了必失败。
     *
     * v0.2.7：原因文本一律用服务端算好的 `disabledReason`，客户端不再拿 hasTarget 自己反推。
     * 早期就是客户端反推的（hasTarget 为 false 就写「缺发送目标」），而服务端当时又把
     * webhook 型通道（群晖 Chat / 钉钉 / 企业微信）一律判成「必须填目标」——
     * 两处叠加的结果是：明明有 webhookUrl、推送中枢里也能正常发，这里却灰着点不动。
     */
    function AccountCard(props) {
      const item = props.item
      const usable = item.usable === true
      const reason = usable ? '' : String(item.disabledReason || '不可用')
      // 置灰的卡片光说「为什么不行」不够，还要说「怎么才能变可用」。
      const fix = usable
        ? ''
        : (String(item.missingFields || 0) !== '0'
          ? '到推送中枢里把该账号的必填项补齐'
          : '先给这个账号指定「发送到」：让对方给机器人发一条消息，或在推送中枢里选一个会话')
      return h('button', {
        type: 'button',
        className: 'ns-acc',
        'data-on': props.selected ? '1' : '0',
        'data-off': usable ? '0' : '1',
        'aria-pressed': props.selected ? 'true' : 'false',
        'aria-disabled': usable ? 'false' : 'true',
        'data-need-target': item.needTarget === false ? '0' : '1',
        disabled: !usable,
        title: usable ? (item.target || '') : (reason + '。' + fix),
        onClick: () => { if (usable) props.onToggle(item.id) },
      },
        h('span', { className: 'ns-acc-head' },
          h('span', { className: 'ns-acc-name' }, String(item.name)),
          props.selected ? h('span', { className: 'ns-acc-badge' }, '✓ 已选') : null
        ),
        h('span', { className: 'ns-acc-meta' }, channelTitle(item.channel) + ' · ' + sourceLabel(item.source)
          + (item.needTarget === false ? ' · 无需目标' : '')),
        h('span', { className: 'ns-acc-meta' }, usable ? ('发给 ' + (item.target || '未知目标')) : reason)
      )
    }

    /** 主界面：选账号（1/多/全）+ 写内容 + 预览/发送 + 逐条结果 + 历史。 */
    function SenderPanel() {
      const [loading, setLoading] = useState(true)
      const [accounts, setAccounts] = useState([])
      const [hub, setHub] = useState(null)
      const [pickedIds, setPickedIds] = useState([])
      const [title, setTitle] = useState('')
      const [text, setText] = useState('')
      const [busy, setBusy] = useState(false)
      const [percent, setPercent] = useState(0)
      const [stage, setStage] = useState('')
      const [state, setState] = useState('idle')
      const [result, setResult] = useState(null)
      const [history, setHistory] = useState([])
      const [armed, setArmed] = useState(false)
      const alive = useRef(true)
      /** 根节点既用来量高度，也用来把样式补进它所在的那个 root（防 shadow DOM）。 */
      const wrapRef = useRootStyle()

      useEffect(() => () => { alive.current = false }, [])

      /**
       * 自己算可用高度，不指望父容器给。
       *
       * 为什么必须这么干：宿主的 main 槽位外面只包了一层 .mainPanel
       * （display:flex;flex-direction:column;flex:1;min-height:0，**没有 overflow**），
       * 而槽位锚点本身是 display:contents（不产生盒模型）。于是：
       *   - 写 height:100% → 父级高度不是「确定高度」时百分比退化成 auto，内容超出被直接裁掉；
       *   - 不写高度 → 同样被 .mainPanel 裁掉，且没有滚动条；
       * push-hub 就踩过这个坑（它的注释写得很清楚）。
       *
       * 换成「量一下自己头顶到窗口底还剩多少」，就不依赖父级是否定高，
       * 换分辨率、改窗口大小、宿主改版都不用改这个数。
       */
      useLayoutEffect(() => {
        const element = wrapRef.current
        if (element === null || element === undefined) return undefined
        const measure = () => {
          const top = element.getBoundingClientRect().top
          const room = window.innerHeight - top - 12
          element.style.maxHeight = String(Math.max(220, Math.floor(room))) + 'px'
        }
        measure()
        window.addEventListener('resize', measure)
        return () => { window.removeEventListener('resize', measure) }
      }, [])

      const refreshAccounts = useCallback(async () => {
        setLoading(true)
        const data = await request('/accounts')
        if (!alive.current) return
        setLoading(false)
        if (data.ok !== true && !Array.isArray(data.accounts)) {
          setHub(data.hub || { ok: false, error: String(data.error || '') })
          setAccounts([])
          return
        }
        const list = Array.isArray(data.accounts) ? data.accounts : []
        setHub(data.hub || null)
        setAccounts(list)
        // 回填上次的选择（可能是一个，也可能是多个）——「记住上次选择」不该只记一个。
        const lastIds = data?.last && Array.isArray(data.last.ids) ? data.last.ids : []
        if (lastIds.length > 0) {
          const okIds = lastIds.filter(id => list.some(a => a.id === id && a.usable === true))
          if (okIds.length > 0) setPickedIds(okIds)
        }
      }, [])

      const refreshHistory = useCallback(async () => {
        const data = await request('/history?limit=20')
        if (data.ok === true && Array.isArray(data.entries) && alive.current) setHistory(data.entries)
      }, [])

      useEffect(() => {
        refreshAccounts()
        refreshHistory()
      }, [refreshAccounts, refreshHistory])

      const usableAccounts = useMemo(() => accounts.filter(a => a.usable === true), [accounts])
      const usableCount = usableAccounts.length

      const pickedSet = useMemo(() => new Set(pickedIds), [pickedIds])
      /** 某一组里选了几个（分组头用，省得用户在 22 个卡片里自己数）。 */
      const selectedIn = useCallback((list) => list.filter(a => pickedSet.has(a.id)).length, [pickedSet])
      const pickedList = useMemo(() => usableAccounts.filter(a => pickedSet.has(a.id)), [usableAccounts, pickedSet])

      /** 点一下就切换选中/取消，不做单选互斥 —— 这是多选界面。 */
      const toggle = useCallback((id) => {
        setPickedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat([id]))
        setArmed(false)
      }, [])

      const selectAll = useCallback(() => {
        setPickedIds(usableAccounts.map(a => a.id))
        setArmed(false)
      }, [usableAccounts])

      const clearAll = useCallback(() => {
        setPickedIds([])
        setArmed(false)
      }, [])

      const invert = useCallback(() => {
        setPickedIds(prev => usableAccounts.filter(a => !prev.includes(a.id)).map(a => a.id))
        setArmed(false)
      }, [usableAccounts])

      /** 分通道分组，界面上按通道成段显示，避免 22 个账号糊成一片。 */
      const grouped = useMemo(() => {
        const groups = new Map()
        for (const item of accounts) {
          const list = groups.get(item.channel) || []
          list.push(item)
          groups.set(item.channel, list)
        }
        return Array.from(groups.entries())
      }, [accounts])

      /** 真正发出去（或预览）。进度是真实阶段，不掺假。 */
      const run = useCallback(async (dryRun) => {
        if (pickedList.length === 0) {
          setResult({ ok: false, error: '先选至少一个账号' })
          setState('error')
          return
        }
        if (String(text).trim() === '') {
          setResult({ ok: false, error: '正文为空，没东西可发' })
          setState('error')
          return
        }
        setBusy(true)
        setState('running')
        setResult(null)
        setPercent(8)
        setStage('准备请求')
        try {
          setPercent(28)
          setStage(dryRun ? ('校验 ' + String(pickedList.length) + ' 个账号与分块') : ('正在逐个发送 ' + String(pickedList.length) + ' 个账号（后端串行，完成后统一返回）'))
          const data = await request('/send', {
            method: 'POST',
            body: { accountIds: pickedList.map(a => a.id), title, text, dryRun },
          })
          setPercent(data.ok === true ? 100 : 96)
          setStage(data.ok === true ? (dryRun ? '预览完成' : '已发出') : '部分或全部失败')
          setResult(data)
          setState(data.ok === true ? 'done' : 'error')
          setArmed(false)
          if (dryRun !== true) refreshHistory()
        } catch (error) {
          setPercent(96)
          setStage('异常')
          setResult({ ok: false, error: String((error && error.message) || error) })
          setState('error')
        } finally {
          if (alive.current) setBusy(false)
        }
      }, [pickedList, title, text, refreshHistory])

      /** 真发按钮的点击：选中 N≥3 时先要一次确认，防误点把通知打一片。 */
      const onSendClick = useCallback(() => {
        if (pickedList.length >= CONFIRM_THRESHOLD && armed !== true) {
          setArmed(true)
          return
        }
        run(false)
      }, [pickedList.length, armed, run])

      const barLabel = stage === '' ? (loading ? '正在读取账号' : '空闲') : stage
      const barValue = busy ? percent : (state === 'done' ? 100 : (state === 'error' ? percent : 0))
      const barState = state === 'error' ? 'error' : (state === 'done' ? 'done' : undefined)
      const sendLabel = busy
        ? '处理中…'
        : (pickedList.length >= CONFIRM_THRESHOLD && armed !== true
          ? ('发送到 ' + String(pickedList.length) + ' 个（点一下确认）')
          : (pickedList.length === 0 ? '发送出去' : ('发送到 ' + String(pickedList.length) + ' 个账号')))

      const header = h('div', { className: 'ns-card ns-card-narrow' },
        h('div', { className: 'ns-title' }, '通知发送器',
          h('span', { className: 'ns-chip' }, '只发不收'),
          h('span', { className: 'ns-chip ns-chip-ok' }, '可用账号 ' + String(usableCount) + ' / ' + String(accounts.length)),
          h('span', { className: 'ns-grow' }),
          h('button', { className: 'ns-btn', disabled: loading || busy, onClick: () => { refreshAccounts(); refreshHistory() } }, loading ? '刷新中…' : '刷新账号')
        ),
        h('div', { className: 'ns-hint' }, '本插件不建立任何连接、不接收任何消息；它只是借用本机已接通的通道，把一条通知发到你勾选的那些账号。可以只勾一个，也可以勾几个或全选。'),
        hub !== null && hub.ok !== true ? h('div', { className: 'ns-hint', style: { color: '#c87b22', marginTop: '6px' } }, '推送中枢未就绪：' + String(hub.error || '未找到 @duma520/dsh-push-hub') + '。请在下方设置里指定它的目录。') : null
      )

      const picker = h('div', { className: 'ns-card' },
        h('div', { className: 'ns-title' }, '1. 选择发给谁',
          pickedList.length === 0
            ? h('span', { className: 'ns-chip' }, '未选')
            : h('span', { className: 'ns-chip ns-chip-ok' }, '已选 ' + String(pickedList.length) + ' 个'),
          h('span', { className: 'ns-grow' }),
          h('button', { className: 'ns-btn ns-btn-sm', disabled: loading || busy || usableCount === 0, onClick: selectAll }, '全选可用'),
          h('button', { className: 'ns-btn ns-btn-sm', disabled: loading || busy || usableCount === 0, onClick: invert }, '反选'),
          h('button', { className: 'ns-btn ns-btn-sm', disabled: busy || pickedIds.length === 0, onClick: clearAll }, '清空')
        ),
        pickedList.length === 0
          ? null
          : h('div', { className: 'ns-picked' },
            h('span', { className: 'ns-hint' }, '已选：'),
            pickedList.map(item => h('span', { key: item.id, className: 'ns-picked-chip' },
              channelGlyph(item.channel) + ' ' + String(item.name),
              h('button', {
                type: 'button',
                className: 'ns-picked-x',
                title: '取消选择 ' + String(item.name),
                onClick: () => toggle(item.id),
              }, '×')
            ))
          ),
        loading
          ? h('div', { className: 'ns-empty' }, '正在读取账号…')
          : (accounts.length === 0
            ? h('div', { className: 'ns-empty' }, '没有列出任何账号。先确认推送中枢装有账号，或在下方设置里把「已禁用的来源」取消勾选。')
            : h('div', null, grouped.map(pair => h('div', { key: pair[0], style: { marginBottom: '10px' } },
                h('div', { className: 'ns-row', style: { marginBottom: '6px' } }, h(ChannelChip, { channel: pair[0] }), h('span', { className: 'ns-hint' }, String(pair[1].length) + ' 个账号' + (selectedIn(pair[1]) > 0 ? ' · 已选 ' + String(selectedIn(pair[1])) + ' 个' : ''))),
                h('div', { className: 'ns-accounts' }, pair[1].map(item => h(AccountCard, {
                  key: item.id,
                  item,
                  selected: pickedSet.has(item.id),
                  onToggle: toggle,
                })))
              )))
          )
      )

      const composer = h('div', { className: 'ns-card' },
        h('div', { className: 'ns-title' }, '2. 写内容'),
        h('div', { className: 'ns-row', style: { marginBottom: '9px' } },
          h('label', null, '标题'),
          h('input', {
            className: 'ns-field ns-grow',
            value: title,
            placeholder: '可留空（留空就只发正文）',
            onChange: event => setTitle(event.target.value),
          })
        ),
        h('textarea', {
          className: 'ns-field ns-area',
          value: text,
          placeholder: '要发出去的通知正文，可多行。超长会自动分块发送；多个账号收到的是同一条内容。',
          onChange: event => setText(event.target.value),
        }),
        h('div', { className: 'ns-row', style: { marginTop: '9px' } },
          h('span', { className: 'ns-hint' }, '共 ' + String(text.length) + ' 字 · 将发往 ' + String(pickedList.length) + ' 个账号'),
          h('span', { className: 'ns-grow' }),
          h('button', { className: 'ns-btn', disabled: busy || pickedList.length === 0 || text.trim() === '', onClick: () => run(true) }, busy ? '处理中…' : '预览（不真发）'),
          h('button', { className: 'ns-btn ns-btn-primary', disabled: busy || pickedList.length === 0 || text.trim() === '', onClick: onSendClick }, sendLabel)
        ),
        armed === true && pickedList.length >= CONFIRM_THRESHOLD
          ? h('div', { className: 'ns-hint', style: { color: '#c87b22', marginTop: '6px' } },
              '再点一次上面的按钮，就会真发到 ' + String(pickedList.length) + ' 个账号。不想发就点「预览」或改一下选择。',
              h('button', { className: 'ns-btn ns-btn-sm', style: { marginLeft: '8px' }, onClick: () => setArmed(false) }, '取消'))
          : null,
        h('div', { style: { marginTop: '11px' } }, h(ProgressBar, { value: barValue, label: barLabel, state: barState })),
        result === null ? null : h(ResultBlock, { result })
      )

      const historyCard = h('div', { className: 'ns-card' },
        h('div', { className: 'ns-title' }, '发送记录',
          h('span', { className: 'ns-hint' }, '只记通道/账号/摘要，不记凭据'),
          h('span', { className: 'ns-grow' }),
          h('button', { className: 'ns-btn', disabled: busy, onClick: refreshHistory }, '刷新')
        ),
        history.length === 0
          ? h('div', { className: 'ns-empty' }, '还没有发过（预览不算）。')
          : h('div', { className: 'ns-hist' }, history.map((item, index) => h('div', { className: 'ns-hist-item', key: String(item.at || '') + '-' + String(index) },
              h('span', { className: 'ns-chip ' + (item.ok === true ? 'ns-chip-ok' : 'ns-chip-bad') }, item.ok === true ? '成功' : '失败'),
              h('div', { className: 'ns-hist-main' },
                h('div', { className: 'ns-hist-text' }, channelTitle(item.channel) + ' · ' + String(item.account || '') + ' · ' + String(item.preview || '')),
                h('div', { className: 'ns-hist-when' }, String(item.atLocal || item.at || '') + (item.detail ? (' · ' + String(item.detail)) : ''))
              )
            )))
      )

      return h('div', { className: 'ns-wrap', ref: wrapRef, style: { padding: '14px 14px 24px' } },
        header,
        h('div', { className: 'ns-split' },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, picker, composer),
          historyCard
        ),
        h(SenderSettings, { compact: true })
      )
    }

    /** 结果区：单个时给详情，多个时给「N 成功 / M 失败 + 逐条」。 */
    function ResultBlock(props) {
      const result = props.result
      const ok = result.ok === true
      const rows = Array.isArray(result.results) ? result.results : []
      const isBatch = rows.length > 1

      const head = h('div', { className: 'ns-row', style: { marginBottom: '6px' } },
        h('span', { className: 'ns-chip ' + (ok ? 'ns-chip-ok' : 'ns-chip-bad') },
          ok ? (result.dryRun === true ? '预览成功' : '发送成功') : (isBatch ? (String(result.sent || 0) + ' 成功 / ' + String(result.failed || 0) + ' 失败') : '未成功')),
        isBatch ? h('span', { className: 'ns-hint' }, '共 ' + String(result.total) + ' 个账号') : null,
        result.dryRun === true ? h('span', { className: 'ns-hint' }, '未真发') : null
      )

      const per = isBatch
        ? h('div', { className: 'ns-per' }, rows.map((row, index) => h('div', { className: 'ns-per-item', key: String(row.accountId || index) },
            h('span', { className: 'ns-chip ' + (row.ok === true ? 'ns-chip-ok' : 'ns-chip-bad') }, row.ok === true ? '成功' : '失败'),
            h('span', { className: 'ns-per-name', title: String(row.account || '') }, channelTitle(row.channel) + ' · ' + String(row.account || '')),
            row.ok === true
              ? h('span', { className: 'ns-hint' }, row.dryRun === true ? (String(row.blocks || 1) + ' 块') : (row.messageIds && row.messageIds.length ? ('id ' + String(row.messageIds[0])) : '已发出'))
              : h('span', { className: 'ns-hint', title: String(row.detail || row.error || '') }, String(row.detail || row.error || '未成功'))
          )))
        : null

      const detail = h('div', { className: 'ns-log' }, JSON.stringify(isBatch ? { total: result.total, sent: result.sent, failed: result.failed } : result, null, 2))

      return h('div', { style: { marginTop: '10px' } }, head, per, detail)
    }

    /** 设置区：每一项改动立刻 POST 落盘（不等「保存」按钮）。 */
    function SenderSettings(props) {
      const compact = props !== null && props !== undefined && props.compact === true
      const [state, setState] = useState(null)
      const [saveNote, setSaveNote] = useState('')
      const [open, setOpen] = useState(compact !== true)
      /** 设置区也可能被挂进 shadow root（插件详情页就是这么渲染的），同样补样式。 */
      const rootRef = useRootStyle()

      useEffect(() => {
        let alive = true
        request('/settings').then(data => { if (alive && data && data.ok === true) setState(data.settings) })
        return () => { alive = false }
      }, [])

      const patch = useCallback(async (next) => {
        setState(prev => ({ ...(prev || {}), ...next }))
        const data = await request('/settings', { method: 'POST', body: next })
        if (data && data.ok === true) {
          setState(data.settings)
          setSaveNote('已保存 ' + new Date().toLocaleTimeString())
        } else {
          setSaveNote('保存失败：' + String((data && data.error) || '未知原因'))
        }
      }, [])

      if (state === null) {
        return h('div', { className: 'ns-card ns-card-narrow', ref: rootRef }, h('div', { className: 'ns-empty' }, '正在读取设置…'))
      }

      const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '11px' } },
        h('div', { className: 'ns-row' },
          h('label', null, '推送中枢目录'),
          h('input', {
            className: 'ns-field ns-grow',
            value: String(state.pushHubPath || ''),
            placeholder: '留空 = 自动在 profiles/<profile>/node_modules 里找（推荐）',
            onChange: event => setState(prev => ({ ...prev, pushHubPath: event.target.value })),
            onBlur: event => patch({ pushHubPath: event.target.value }),
          })
        ),
        h('div', { className: 'ns-hint' }, '一般不用填。只有自动查找失败（上面提示「推送中枢未就绪」）时，才填它的绝对目录，例如 <插件根目录>/dsh-push-hub。'),
        h('div', { className: 'ns-row' },
          h('label', null, '默认先预览'),
          h('input', {
            type: 'checkbox',
            checked: state.dryRunByDefault !== false,
            onChange: event => patch({ dryRunByDefault: event.target.checked }),
          }),
          h('span', { className: 'ns-hint' }, '勾上更安全：AI 调工具时默认只预览，要真发必须显式传 dry_run=false。')
        ),
        h('div', { className: 'ns-row' }, h('label', null, '禁用来源'),
          ['push-hub', 'bridge', 'im-connect'].map(source => {
            const disabled = Array.isArray(state.disabledSources) ? state.disabledSources : []
            const on = disabled.includes(source)
            return h('label', { key: source, style: { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 'auto' } },
              h('input', {
                type: 'checkbox',
                checked: on,
                onChange: event => {
                  const next = event.target.checked
                    ? disabled.concat([source])
                    : disabled.filter(x => x !== source)
                  patch({ disabledSources: next })
                },
              }),
              h('span', null, sourceLabel(source))
            )
          })
        ),
        h('div', { className: 'ns-hint' }, '勾上 = 不列出该来源的账号。来源之间互相独立，关掉一个不影响其他。'),
        h('div', { className: 'ns-row' },
          h('span', { className: 'ns-hint' }, saveNote === '' ? '改动即时保存，无需点按钮' : saveNote),
          h('span', { className: 'ns-grow' }),
          h('button', { className: 'ns-btn', onClick: async () => {
            const data = await request('/selfcheck')
            setSaveNote('自检：' + (data.ok === true ? ('可用 ' + String(data.usableAccounts) + '/' + String(data.totalAccounts) + ' 个账号') : ('未通过 ' + String(data.error || ''))))
          } }, '自检'),
          compact ? h('button', { className: 'ns-btn', onClick: () => setOpen(!open) }, open ? '收起设置' : '展开设置') : null
        )
      )

      if (compact === true && open !== true) {
        return h('div', { className: 'ns-card ns-card-narrow', ref: rootRef },
          h('div', { className: 'ns-title' }, '设置',
            h('span', { className: 'ns-hint' }, '改动即时保存'),
            h('span', { className: 'ns-grow' }),
            h('button', { className: 'ns-btn', onClick: () => setOpen(true) }, '展开')
          )
        )
      }

      return h('div', { className: 'ns-card ns-card-narrow', ref: rootRef },
        h('div', { className: 'ns-title' }, '设置', h('span', { className: 'ns-hint' }, '改动即时保存，重启不丢')),
        body
      )
    }

    /**
     * 侧栏面板图标。
     *
     * 宿主对 `sidebar.panellist` 的 owner props 是 `{ size: number; active: boolean }`，
     * 由 `renderSlot('sidebar.panellist', { size, active }, { only: id })` 下发。
     * 早先这里是个不接 props 的纯文本 span —— 那本身合法，但尺寸不受控；
     * 改成和 push-hub 同构的内联 SVG，跟着 size 缩放，不引任何图标资源。
     */
    function SidebarIcon(props) {
      const owner = props !== null && props !== undefined ? props : {}
      const px = typeof owner.size === 'number' && owner.size > 0 ? owner.size : 16
      const on = owner.active === true
      return h('svg', {
        width: px,
        height: px,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { opacity: on ? 1 : 0.82 },
      },
        h('path', { d: 'M1.9 3.4h12.2v9.2H1.9z' }),
        h('path', { d: 'M1.9 3.9 8 8.6l6.1-4.7' })
      )
    }

    /**
     * 侧栏面板列表「更多」菜单里的一行。
     *
     * 为什么除了 `sidebar.panellist` 还要再注册这一条：面板行由宿主按
     * `sidebar.panel.icon` 工厂渲染，任何一环没就位就整行不出现；
     * 而 `sidebar.panellist.actions` 是「更多」菜单里的独立行，注册即出现。
     * 两条路径都注册，等于给入口上了双保险（composer-butler 只注册这一条也在菜单里看得见）。
     * order 取负值：list slot 按 (priority, order) 升序，官方行默认 0，正数会掉到最底部。
     */
    function SidebarActionRow(props) {
      const owner = props !== null && props !== undefined ? props : {}
      const [hot, setHot] = useState(false)
      const onClick = () => {
        if (typeof owner.onDismiss === 'function') { try { owner.onDismiss() } catch { /* 菜单已关 */ } }
        if (typeof owner.onOpen === 'function') owner.onOpen(PANEL_ID)
      }
      return h('button', {
        type: 'button',
        onClick,
        title: '通知发送器：只发不收，选账号发通知',
        'aria-label': '通知发送器',
        onMouseEnter: () => setHot(true),
        onMouseLeave: () => setHot(false),
        style: {
          display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
          background: hot ? 'var(--dsh-hover, rgba(128,128,128,.14))' : 'transparent',
          border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px',
          fontSize: '14px', lineHeight: '22px', color: 'inherit', textAlign: 'left', font: 'inherit',
        },
      },
        h('span', { style: { flex: 'none', width: '16px', textAlign: 'center', opacity: 0.8 } }, '✉'),
        h('span', { style: { flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '通知发送器'),
        h('span', { style: { flex: 'none', fontSize: '11px', opacity: 0.55 } }, '只发不收')
      )
    }

    /** 插件详情页的「打开通知发送器」。 */
    function OpenPanelAction(props) {
      const onOpen = props !== null && props !== undefined && typeof props.onOpen === 'function' ? props.onOpen : null
      return h('button', {
        className: 'ns-btn',
        type: 'button',
        onClick: () => { if (onOpen !== null) onOpen() },
      }, '打开通知发送器')
    }

    /**
     * 挂载入口。
     *
     * 三条注册路径都已在本机跑通（照 dsh-push-hub / dsh-composer-butler）：
     *  1. settings.section   —— 设置 → 左侧「通知发送器」；
     *  2. plugins.bundle.config —— 插件详情页配置区（key 用裸包名）；
     *  3. layout 下的 main + sidebar.panellist + plugins.detail.actions —— 整页与侧栏入口。
     * 任何一步失败都只丢那一个入口，绝不让整个插件激活失败。
     */
    function apply(ctx) {
      reportHello('apply-start')

      ctx.effect(() => installStyle(), 'notify-sender: 样式表')

      ctx.effect(() => ctx.slots.inject('settings.section', () => {
        const stop = ctx.slots.register({
          name: 'settings.section',
          id: 'notify-sender',
          order: 39,
          label: () => '通知发送器',
        }, () => h(SenderSettings, { compact: false }))
        helloSlots.settings = true
        reportHello('settings-registered')
        return stop
      }), 'notify-sender: 设置分区')

      ctx.effect(() => ctx.slots.inject('plugins.bundle.config', () => {
        const stop = ctx.slots.register({
          name: 'plugins.bundle.config',
          key: '@duma520/dsh-notify-sender',
        }, (properties) => h(SenderSettings, { compact: true }))
        helloSlots.bundleConfig = true
        reportHello('bundle-config-registered')
        return stop
      }), 'notify-sender: 插件详情页配置区')

      ctx.effect(() => installPanelEntry(ctx), 'notify-sender: 侧栏入口')

      reportHello('apply-done')
    }

    /** 整页 + 侧栏 + 详情页按钮。写法同 push-hub 的 installPanelEntry。 */
    function installPanelEntry(ctx) {
      if (typeof ctx.inject !== 'function') return () => {}
      try {
        return ctx.inject(['layout'], (pageCtx) => {
          if (!pageCtx || typeof pageCtx.slots?.inject !== 'function') return () => {}
          const stops = []
          stops.push(pageCtx.slots.inject('main', () => pageCtx.slots.register({
            name: 'main',
            key: PANEL_ID,
          }, SenderPanel)))
          stops.push(pageCtx.slots.inject('sidebar.panellist', () => pageCtx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 41,
            label: () => '通知发送器',
          }, SidebarIcon)))
          stops.push(pageCtx.slots.inject('sidebar.panellist.actions', () => pageCtx.slots.register({
            name: 'sidebar.panellist.actions',
            id: 'notify-sender-row',
            order: -99,
            label: () => '通知发送器',
          }, SidebarActionRow)))
          stops.push(pageCtx.slots.inject('plugins.detail.actions', () => pageCtx.slots.register({
            name: 'plugins.detail.actions',
            id: PANEL_ID + '-open',
            order: 21,
            inject: () => ({
              packageName: '@duma520/dsh-notify-sender',
              onOpen: () => pageCtx.layout.selectPanel(PANEL_ID),
            }),
          }, OpenPanelAction)))
          helloSlots.main = true
          helloSlots.panellist = true
          helloSlots.panellistActions = true
          helloSlots.detailAction = true
          reportHello('layout-registered')
          return () => {
            for (const stop of stops) {
              try { if (typeof stop === 'function') stop() } catch { /* 卸载失败不影响其它入口 */ }
            }
          }
        })
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[notify-sender] 侧栏入口注册失败，已跳过：' + String((error && error.message) || error))
        }
        return () => {}
      }
    }

    exports.apply = apply
    exports.inject = inject
    exports.name = '@duma520/dsh-notify-sender'
    return module.exports
  },
})
