# dsh-notify-sender · 通知发送器

**一句话**：只发不收的通知发送器 —— 借用本机已经接通的 12 类消息通道，让你**逐个挑选用哪个账号**把一条通知发出去。

**给谁用**：DSH 上同时挂着多个微信 / QQ / 飞书 / Telegram 账号，需要「这次用哪个号发」而不是一股脑群发的人。

**解决什么问题**：官方推送类插件习惯「一次发所有通道所有账号」，账号一多就变成刷屏，你想只发一个人时反而做不到。本插件把粒度交给你：**可以只勾一个，也可以勾几个，也可以全选**——勾谁就发谁，不多不少。

> 当前版本 **v0.3.0**（2026-11-25）。插件名 `@duma520/dsh-notify-sender`，纯 JS 零构建，装在本机 DSH 的 `desktop` profile 里。

> 本插件**不建立任何连接、不接收任何消息**，也不保存任何凭据。它只是一个「借用者」：通道实现来自 `@duma520/dsh-push-hub`，账号来自本机已有的配置文件，凭据只在发送的那一瞬间经过内存。

---

## 界面截图

<img src="docs/screenshots/notify-sender.png" width="880" alt="通知发送器主界面">

> 上图为真机实拍（本机 DSH 桌面版）。截图里的账号名、ID、发送记录已做像素化处理，只保留界面结构。

> 只想快点装起来？直接看根目录的 [INSTALL.txt](INSTALL.txt)：三步安装 + 三处验证 + 配置在哪 + 怎么卸。

---

## 目录

- [界面截图](#界面截图)
- [1. 这是什么](#1-这是什么)
- [2. 零基础入门（三步用起来）](#2-零基础入门三步用起来)
- [3. 界面逐项说明](#3-界面逐项说明)
- [4. 三个完整操作示例](#4-三个完整操作示例)
- [5. 配置文件详解](#5-配置文件详解)
- [6. 工作原理（技术参考）](#6-工作原理技术参考)
- [7. 给 AI 用的两个工具](#7-给-ai-用的两个工具)
- [8. HTTP 接口](#8-http-接口)
- [9. 排错手册](#9-排错手册)
- [10. FAQ](#10-faq)
- [11. 版本更新简介](#11-版本更新简介)
- [12. 已知限制与安全说明](#12-已知限制与安全说明)
- [13. 目录结构与开发](#13-目录结构与开发)
- [14. 许可](#14-许可)

---

## 1. 这是什么

### 1.1 一句话定位

一个**单向**的通知出口。输入是一段文字，输出是已经发出去的消息，出口是你在界面上勾选的那**一个或几个**账号 —— 勾几个就发几个。

### 1.2 和「推送中枢」（dsh-push-hub）的区别

| | 推送中枢 dsh-push-hub | 通知发送器 dsh-notify-sender |
|---|---|---|
| 发送粒度 | 按通道群发，铺开到全部账号 | **勾几个发几个**（1 个 / 多个 / 全选，由你当场决定） |
| 账号来源 | 只认自己的 `config.json`（4 个） | 并集：自有 4 个 + IM 桥接已接通 18 个 |
| 接收消息 | 支持（长轮询 / WebSocket） | **完全不支持，也不建立连接** |
| 改 / 撤消息 | 支持 | 不支持（它只负责「发出去」） |
| 凭据存储 | 自己存 | **不存**，只在内存里路过 |

一句话：推送中枢是「广播台」，通知发送器是「可点名的对讲机」—— 你可以只喊一个人，也可以喊一小群，也可以全场广播，但每一次都要你亲手选。

### 1.3 支持的通道

通道实现全部复用推送中枢，因此支持它支持的全部 12 个：

| 通道 id | 中文名 | 备注 |
|---|---|---|
| `telegram` | Telegram | 需要 botToken + 目标 chat id |
| `feishu` | 飞书 | appId + appSecret，走自建应用 |
| `wechat` | 微信 | 走 im-bot 网关，需要 token + 目标 openid |
| `qq` | QQ | appId + appSecret |
| `dingtalk` | 钉钉 | webhook 机器人 |
| `wecom` | 企业微信 | webhook |
| `wecom_app` | 企业微信自建应用 | corpId + agentId |
| `slack` | Slack | bot token |
| `discord` | Discord | bot token |
| `matrix` | Matrix | homeserver + token |
| `synology_chat` | 群晖 Chat | webhook |
| `email` | 邮件 | SMTP |

**实际能列出哪些，取决于你本机已经接通了哪些。** 本机当前（2026-11-19）实际聚合出 **22 个账号**：推送中枢自有 4 个 + IM 桥接 18 个。

---

## 2. 零基础入门（三步用起来）

### 第 1 步：确认它已经装上

它有三个入口，任一个能进就说明装好了：

| 入口 | 长什么样 | 说明 |
| --- | --- | --- |
| 左侧栏面板列表 | 一个 ✉ 信封图标，悬停提示「通知发送器」 | 面板行，点击直接开整页 |
| 左侧栏「插件」下拉菜单的「更多」 | 一行 `✉ 通知发送器　只发不收` | 菜单行，面板行被宿主过滤时这条仍在（v0.2.3 补的双保险） |
| 设置弹窗左侧列表 | 「通知发送器」 | 只打开设置卡片，不是整页 |

三个都看不到，才说明插件没被 profile 加载。检查两件事：

1. `<用户目录>\.dsh\profiles\desktop\package.json` 的 `dependencies` 里有：
   ```json
   "@duma520/dsh-notify-sender": "link:<插件根目录>/dsh-notify-sender"
   ```
2. 同文件的 `dsh.profile.bundles` 数组里有 `"@duma520/dsh-notify-sender"`。

两条都在，**重启 DSH**即可。

### 第 2 步：看看它认出了几个账号

点侧栏 ✉ 图标进主界面，顶部会显示：

> 通知发送器 ｜ 只发不收 ｜ **可用账号 17 / 22**

这个数字就是现在能用的账号数。灰色卡片是「有账号但发不出去」的，鼠标悬停能看到原因（缺凭据 / 缺发送目标）。

### 第 3 步：发第一条

1. 在「1. 选择用哪个账号发」里**点一张卡片**（卡片边框会高亮）。
2. 在「2. 写内容」里写正文（标题可留空）。
3. 先点「**预览（不真发）**」—— 进度条会走完，下方显示切成几块、发到哪个目标。
4. 确认无误，点「**发送出去**」。
5. 右侧「发送记录」里会多一条。

就这样。**预览和发送用的是同一套校验**，预览能过，发送就能过（除非对方平台临时抽风）。

---

## 3. 界面逐项说明

### 3.1 顶部信息条

| 元素 | 作用 | 什么时候看它 |
|---|---|---|
| 「只发不收」标签 | 声明本插件不接收消息 | 想确认它不会偷看你的消息时 |
| 「可用账号 17 / 22」 | 前者=能发，后者=总数 | 数字变小了 → 有账号凭据掉了 |
| 「刷新账号」按钮 | 重新读一遍所有来源 | 你在别处改了账号配置之后 |

如果推送中枢没找到，这里会出现一行橙色提示：

> 推送中枢未就绪：未找到 @duma520/dsh-push-hub。请在下方设置里指定它的目录。

### 3.2 选择账号区

账号按**通道分组**显示，每组标题带通道图标字符和账号数。

每张卡片三行（点卡片 = 勾选/取消）：

```
账号名  [✓ 已选]   [上游发不出] [手动目标]   ← 后两个角标 v0.2.9 才有，只在对应情况出现
通道 · 来源 · 无需目标   ← 「无需目标」只出现在 webhook 型通道上（v0.2.7）
发给 xxx           ← 或「缺发送目标：…」/「缺凭据字段：…」/「凭据齐但上游发不出（…）」
```

**怎么一眼知道选了谁**（v0.2.6 起，三个位置同时给答案，不用自己数）：

1. **卡片本身**：选中的卡片有明显变化 —— 蓝色边框 + 浅蓝底色 + 2px 内描边，名字右边多一个实心蓝底白字的 **✓ 已选** 角标。灰掉的卡片（缺凭据/缺目标）永远不会出现这个角标，因为它们点不了。
2. **已选清单**（标题下方的胶囊行）：直接列出你选中的每一个账号，形如 `✈ DSH_Push_Hub ×`、`飞 飞书扫码机器人 ×`。点胶囊右边的 **×** 就地取消那一个，不用回到卡片区去找。
3. **分组头**：某组里有选中时，标题后面会追加「· 已选 M 个」，22 个账号铺满屏时也能看出哪一组有份。

这一行最左边是一个绿色胶囊 **已选 N 个**（实时计数），右边是三个批量按钮：**全选可用** / **反选** / **清空**。这三个按钮只作用于可用的卡片 —— 灰掉的卡片不会被「全选」偷偷带上。

**上次的选择会被记住**：下次打开面板时自动回填（存在 `~/.dsh/dsh-notify-sender/config.json` 的 `lastAccountIds`），所以「进来就看到已选 2 个」是正常的，不是你误点。想从零开始就点「清空」。

**取值与状态**（v0.2.9 起是三态，多出一个「黄卡」）：

| 状态 | 表现 | 含义 | 怎么办 |
|---|---|---|---|
| 可用（绿） | 正常显示，可点 | 凭据齐 &&（需要目标的通道）有发送目标 && 上次真发成功过或还没有历史 | 直接点 |
| **上游发不出（黄）** | **橙色边框 + 橙底，带「上游发不出」角标，可点** | **凭据齐、目标也有，但最近几次真发全部是 `ret=-2 prepare failed`（上游不认这个 bot）** | 去微信客户端**重新扫码绑定**这个 bot；或换一个账号发。**点发送仍然可以试**，本插件不管住你 |
| 缺目标（灰） | 灰掉，第三行写「缺发送目标：这个通道必须先指定发给谁」 | 凭据有，但不知道该发给谁 | 让对方先给机器人发一条消息（产生 openid），或用设置区的**「手动指定目标」**直接填对端 ID |
| 缺凭据（灰） | 灰掉，第三行写「缺凭据字段：N 组必填项没填」 | 配置里缺关键字段 | 去源头补配置 |

**黄卡是怎么判出来的**（v0.2.9 的核心）：不再只看「配置齐不齐」，而是回看 `~/.dsh/dsh-notify-sender/history.json` 里**这个账号最近 5 条真发记录**（`dryRun` 的一律跳过，拿预览当结论没有意义）。最近一条成功 → 绿；从最近往回连着都是「上游能力未就绪」的失败 → 黄；其余（比如超时、429、401 这类**可恢复**失败，或者干脆没发过）→ 仍按绿处理，不冤枉它。只把 `prepare failed` / `ret=-2` 这两类算作「上游能力未就绪」，这是关键——否则一次网络抖动就会把账号永久标黄。

> 为什么要加这一态：本机 9 个微信 bot 里有 5 个**配置完全正常、token 探测也通过，但发消息恒返 `ret=-2`**。v0.2.8 及以前它们全显示绿色「可用」，你点发送、失败、再点、再失败，界面上找不到任何线索。黄卡就是把这个「假可用」如实画出来。

把鼠标停在灰掉的卡片上，提示框会补一句**怎么才能变可用**（「先给这个账号指定发送到：…」/「到推送中枢里把该账号的必填项补齐」）——只说「为什么不行」而不说「怎么办」，等于把排查工作丢给你。黄卡的提示框则直接写最近一次失败的原因。

> 为什么把它们灰掉而不是藏起来？因为它们**存在**——你在别处看到过这个账号，突然消失会以为插件坏了。灰掉并写明原因更诚实。

**「无需目标」是什么（v0.2.7）**：钉钉群机器人、企业微信群机器人、群晖 Chat 的 webhook 账号，收件人信息本身就编在 webhook 地址里，**根本不需要**再填 target。v0.2.6 及以前把它们一并当成「缺发送目标」判灰，于是明明推送中枢里能正常发，这里却点不动 —— v0.2.7 修的就是这个。哪些通道需要目标、依据是什么，见 6.3 的 ⑦。

### 3.3 写内容区

| 元素 | 作用 | 取值 | 建议 |
|---|---|---|---|
| 「标题」输入框 | 会以 `【标题】` 形式加在正文最前面 | 任意文字，可留空 | 告警类建议填，聊天类可不填 |
| 正文框 | 要发出去的内容 | 多行 | 超长会自动分块 |
| 「共 N 字」 | 实时字数 | 只读 | 超过通道上限就靠自动分块 |
| 「预览（不真发）」 | 走一遍完整校验但不发 | — | **默认先点这个** |
| 「发送出去」 | 真发 | — | 预览通过后再点 |

**分块机制**：每个通道有自己的单条上限（飞书 2000 字、Telegram 4096 字等）。超长会被切成多条依次发送，预览里能看到块数。

### 3.4 进度条

进度条显示的是**真实阶段**，不是动画：

| 百分比 | 阶段文字 | 含义 |
|---|---|---|
| 8% | 准备请求 | 开始组装 |
| 28% | 校验账号 / 校验账号与分块 | 请求已发出，等宿主返回 |
| 100% | 已发出 / 预览完成 | 成功，绿色 |
| 96% | 失败 / 异常 | 失败，红色 |

**为什么 28% 之后会停一下？** 因为那时候真的在等平台返回（网络请求）。进度条不会为了「看起来流畅」而虚假推进——宁可停住，也不骗你。

### 3.5 结果区

成功时：

```json
{
  "ok": true,
  "channel": "feishu",
  "account": "飞书扫码机器人",
  "title": "飞书",
  "blocks": 1,
  "limit": 2000,
  "target": "oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "messageIds": ["om_xxx"]
}
```

失败时会多一个 `detail` 字段，里面是平台或通道实现给的原话，比如 `没有名为 X 的账号`、`还没填发送到`。**原话不翻译**，因为你去搜索时搜的是原话。

### 3.6 发送记录

右侧卡片，只记录**真发成功/失败**的（预览不记）。

每条显示：成功/失败标签、通道 · 账号 · 正文摘要（前 200 字）、时间 · 失败原因。

**最多保留 300 条**，超出自动丢最旧的。绝不含：凭据、完整正文、完整目标 id（只留摘要）。

### 3.7 设置区

| 设置项 | 作用 | 默认 | 什么时候改 |
|---|---|---|---|
| 推送中枢目录 | 手动指定 push-hub 的位置 | 空 = 自动找 | 只在自动查找失败时填 |
| 默认先预览 | AI 调工具时默认 dry_run | 开 | 建议一直开着 |
| 禁用来源 | 勾上 = 不列出该来源的账号 | 全不勾 | 嫌账号太多、或某来源不可信时 |
| 手动指定目标 | 给某个账号直接指定「发给谁」（v0.2.9 新增） | 空 | 账号灰着「缺发送目标」但你知道对端 ID 时 |

**前四项都是改完立即保存**，没有「保存」按钮。底下那行小字会显示「已保存 18:03:12」。（「手动指定目标」每行有自己的「保存」按钮，因为它是按账号逐条存的，见下。）

#### 「手动指定目标」怎么用（v0.2.9）

这是给**灰卡**的一条出路。场景：某个微信号灰着「缺发送目标」，但你知道该发给谁（比如对端 openid 是 `o9cq806PIC82mwTEf33-Ktld2Luw@im.wechat`）。

1. 在设置区找到 **「手动指定目标」**，点 **「加载账号」**。它只列出**需要目标**的账号（webhook 型通道不列，因为它们本来就不需要）。
2. 每行显示：账号名 · 通道·来源 · 当前状态（灰/可用）。
3. 在右边输入框填对端 ID，回车或点 **「保存」**。保存后会自动重拉账号列表 —— 那个卡片会立刻从灰变绿，不用刷新页面。
4. 想撤销就点该行的 **「撤销」**（等于存空串），账号回落到原来的判定。

**为什么值只能自己填、做不到自动**：openid（`o9cq…@im.wechat`）只有「对方先给这个 bot 发过一条消息」才会产生。从未收到过消息的 bot 根本没有 openid 可填——这种情况下唯一的办法是**让对方给那个 bot 发一句话**，然后回来点「加载账号」刷新。

**它存在哪、会不会改坏别人的配置**：只写本插件自己的 `~/.dsh/dsh-notify-sender/config.json` 的 `targetOverrides` 字段，**绝不回写 push-hub 或 dsh-bridge 的 config.json**。发送时在内存里把这个目标合并进账号对象（`acc.target = {kind:'user', id:…}`）再交给 push-hub，所以对上游是无侵入的。

---

## 4. 三个完整操作示例

### 示例 A：最简单 —— 用微信小号给自己发一条提醒

**场景**：你要离开工位，想让自己手机上的微信（账号 <你的微信ID>）收到一条提醒。

1. 点侧栏 ✉
2. 在「微信」分组里点卡片 **<你的微信ID>**（第二行会显示「微信 · IM 桥接已接通」）
3. 正文框输入：`14:30 记得去开会`
4. 点「预览（不真发）」→ 看到 `blocks: 1`、`target: o9cq…xxxxxxxxxxxxxxxxxx@im.wechat`
5. 点「发送出去」→ 进度条走到 100%，结果区显示「发送成功」

### 示例 B：常见组合 —— 带标题的运维告警发到飞书

**场景**：脚本跑完了，要发一条结构化告警到飞书群。

1. 选 **飞书扫码机器人@推送中枢自有**
2. 标题填：`备份完成`
3. 正文填：
   ```
   数据库：pms.db
   大小：182 MB
   耗时：43 秒
   结果：成功
   ```
4. 预览 → 确认 `chars` 数字对得上
5. 发送

对方收到的是：

```
【备份完成】
数据库：pms.db
大小：182 MB
耗时：43 秒
结果：成功
```

### 示例 C：进阶 —— 同一件事同时发给两个人

**场景**：一次部署要通知两个人，一个用 Telegram、一个用 QQ。

1. 分别点 **DSH_Push_Hub@推送中枢自有**（Telegram）和 **<你的QQ号>@IM 桥接已接通**（QQ），两张卡片右上角都出现 ✓，按钮显示「发送到 2 个账号」。
2. 写正文（勾选不会清空已写内容），先点「预览」确认两个目标都在结果列表里。
3. 点「发送到 2 个账号」—— 2 < 3，不需要二次确认，直接发。

**发给三个人以上时**（例如全员公告点「全选可用」得到 17 个）：按钮会先变成「发送到 17 个（点一下确认）」，**第二次点才真发**。这是防手滑阀，不是失败。

> 为什么多发是串行的？因为各家的限流按「通道 + 账号」算，一次点击同时打十几路必然撞限流，还会让你看到一个「全红」的假失败。慢一点，但每条结果都真实。

### 示例 D：给 AI 用

在会话里直接说：

> 用 QQ 那个 <你的QQ号> 的号，发一条「构建完成」给我

AI 会先调 `notify_accounts` 找 id，再调 `notify_send`。默认 `dry_run=true`，它会先把预览结果给你看，你确认后它才真发。

---

## 5. 配置文件详解

### 5.1 位置

| 文件 | 路径 | 内容 |
|---|---|---|
| 设置 | `~/.dsh/dsh-notify-sender/config.json` | 见下表 |
| 记录 | `~/.dsh/dsh-notify-sender/history.json` | 最近 300 条 |
| 本插件被谁读 | 无 | 不读其他插件的写操作 |

Windows 上 `~` 是 `C:\Users\<用户名>`。

### 5.2 config.json 完整示例

```json
{
  "version": 1,
  "pushHubPath": "",
  "disabledSources": [],
  "lastAccountId": "wechat::bridge::<你的微信ID>",
  "lastChannel": "wechat",
  "dryRunByDefault": true
}
```

### 5.3 字段逐个说明

| 字段 | 类型 | 默认 | 取值范围 | 含义 | 改错了会怎样 |
|---|---|---|---|---|---|
| `version` | number | `1` | 固定 `1` | 配置格式版本 | 当前代码不读它，改错无影响 |
| `pushHubPath` | string | `""` | 目录绝对路径或空 | 手动指定推送中枢位置 | 填了不存在的路径 → 账号列表为空，顶部提示「推送中枢未就绪」 |
| `disabledSources` | string[] | `[]` | `push-hub` / `bridge` / `im-connect` | 不列出这些来源的账号 | 填了不认识的字符串 → 忽略，不会崩 |
| `lastAccountId` | string | `""` | 账号 id | 上次用的账号，下次打开自动回填 | 填了已不存在的 id → 不回填，不报错 |
| `lastChannel` | string | `""` | 通道 id | 上次用的通道（仅展示用） | 无影响 |
| `dryRunByDefault` | boolean | `true` | true / false | AI 调工具时是否默认只预览 | `false` 时 AI 不传 dry_run 就会真发 —— **有风险**，见 12.2 |

### 5.4 账号 id 的格式

```
通道::来源::账号名
```

例如：

- `wechat::bridge::<你的微信ID>` — IM 桥接里的微信 <你的微信ID>
- `telegram::push-hub::DSH_Push_Hub` — 推送中枢自有的 Telegram
- `feishu::bridge::135` — IM 桥接里的飞书 135

**为什么要把来源也编进 id？** 因为不同来源里可能有**同名账号**（比如都叫 `135`）。只按通道+名字去重会误合并成一条。

### 5.5 环境变量

| 变量 | 作用 | 优先级 |
|---|---|---|
| `NOTIFY_SENDER_PUSH_HUB` | 直接指定推送中枢目录 | **最高**，盖过 config.json |

一般不用它。它是给「临时换个位置试一下」或「CI 里固定路径」用的。

---

## 6. 工作原理（技术参考）

### 6.1 三层结构

```
浏览器半身 (lib/client.js)
        │  fetch /@duma520/dsh-notify-sender/api/*
        ▼
宿主半身 (lib/index.js)
        │
        ├── accounts.js  聚合三个来源 → 去重 → 判可用
        ├── sender.js    构造临时 cfg → 调 push-hub 的 bus.sendOne
        ├── history.js   记最近 300 条（只记摘要）
        └── paths.js     定位 push-hub / 读写设置与记录
        │
        ▼
@duma520/dsh-push-hub (lib/bus.js)  ← 通道实现、限流、分块全在这一层
```

### 6.2 数据怎么流动（一次发送）

1. 浏览器 `POST /send`，body 三选一：`{accountId}`（单个）/ `{accountIds:[...]}`（多个）/ `{all:true}`（全部可用）
2. `resolveSelection()` 把三种写法统一成一个 id 数组，并算出 `mode`（single / multi / all）
3. `doSend()` **先整体校验**命中该数组的全部 id：任何一个查不到或 `usable !== true`，整体拒绝，不进入发送流程（避免「发到第 5 个才发现没目标」）
4. `composeBody(title, text)` 拼成 `【标题】\n正文`
5. 对每个目标**串行**调 `sendToTarget()`：
   - `dryRun` → 按通道上限算块数，返回预览
   - 真发 → 构造 `tempCfg`，调 `bus.sendOne(tempCfg, {channel, account, text})`
6. 批量回写 `lastAccountIds` / `lastAccountId` / `lastChannel`（**立即落盘**）
7. 非 dryRun → 逐条写 history
8. 返回 `{ok, dryRun, mode, total, sent, failed, results}`；只有 1 个目标时展开成扁平对象，兼容老调用方

### 6.3 关键设计决定（以及为什么）

#### ① 为什么构造 tempCfg，而不是直接用推送中枢的配置？

`bus.sendOne(cfg, input)` 的 `input.account` 是**账号名字符串**，它内部用 `account(cfg, name, wanted)` 去 `cfg` 里按名查（`bus.js:659-666`）。而 IM 桥接的账号**不在**推送中枢的 `cfg` 里 —— 直接传名字必然查不到。

所以我们构造：

```js
const tempCfg = {
  ...baseCfg,
  [channel]: { ...(baseCfg[channel] ?? {}), accounts: [acc] },
}
```

只把那**一个**账号塞进去。这样：

- 复用了通道实现、分块、限流（一行没重写）
- 桥接凭据只在内存里，**不写进推送中枢的 config.json**
- 推送中枢自己的账号配置一行未动

#### ② 为什么账号池要取并集？

如果只用推送中枢自有账号：每通道只有 1 个（telegram 1、feishu 1、wechat 1、synology 1），「**选择用哪个账号**」这个功能就没有意义了——每个通道都没得选。

IM 桥接里躺着 18 个已接通的账号（微信 9、QQ 7、飞书 1、Telegram 1）。把它们并进来，才有了「22 个账号让你挑」的实际价值。

#### ③ 为什么「可用」要额外要求有发送目标？

凭据齐 ≠ 能发出去。有 4 个微信账号凭据齐全，但**既没填 target 也没 allowFrom**——点发送必然报「还没填发送到」，所以它们该判灰。

但**不是所有通道都需要目标**（v0.2.7 修正）：钉钉 / 企业微信的群机器人、群晖 Chat 的 webhook 账号，收件人编在 webhookUrl 里，通道实现全程不读 target。所以判定拆成两步：

```
needTarget = 这个通道的通道实现是否真的会读 target
hasTarget  = target.id 存在 || allowFrom[0] 存在 || userIds 存在 || !needTarget
usable     = 凭据齐 && hasTarget
```

逐通道的真实依据见 6.3 的 ⑦。界面把不可用的灰掉并写明「缺发送目标：这个通道必须先指定发给谁」，而不是让你点了才知道。

#### ④ 为什么是「勾几个发几个」，而不是要么一个要么全发？

因为真实场景里三种粒度都有人要：

| 粒度 | 典型场景 |
|---|---|
| 只发 1 个 | 只提醒某一个人；测试某个号是否通 |
| 发几个 | 只通知当班的 3 个人；发给「微信 + 飞书」双保险 |
| 全选 | 全员公告 |

如果只支持「一次一个」，全选场景要点 17 次；如果只支持「全群发」，给一个人发消息就得先把别人都关掉。所以界面做**多选**，粒度由勾选数决定 —— 同一套代码覆盖三种用法，不需要三套入口。

**串行发送**：多个账号时后端是一个接一个发，不用 Promise.all 并行。原因是对面各家的限流是按「通道 + 账号」算的，一次点击同时打十几路必然撞限流，还会让用户看到一个「全红」的假失败。串行慢一点，但每条结果都真实。

**多发确认阀**：勾到 3 个及以上再点发送，按钮会先变成「发送到 N 个（点一下确认）」，第二次点才真发。这是防手滑 —— 单发不需要确认（多一次点击是浪费），群发必须确认（一次误点代价太大）。

#### ⑤ 为什么不存凭据？

凭据（token / secret / webhook）在桥接和推送中枢各自的配置里已经存了一份。本插件再存一份 = 多一个泄露面，还可能出现「两边不一致」的诡异问题。

所以：**只读不写，只在内存里路过。** 界面拿到的只有 `credentialHint`（尾 4 位掩码），用来让你确认「是不是这个号」。

#### ⑥ 为什么 `lib/client.js` 顶层一条语句都不许有？（v0.3.0 改写，原问题是「为什么 CSS 数组用 `var`」）

宿主把几十个插件的客户端半身拼成**同一个 classic script**（combo 路由 `/plugins/??a/client.js,b/client.js&rev=...`，本机实测单次 11.9 MB、58 个模块），**外层没有 IIFE**。这带来两个独立的坑，都只在「顶层」发生：

**坑一：`const` / `let` 会直接炸掉整段脚本。** classic script 顶层的 `const` / `let` 进的是全局词法环境，同一文档里第二次执行同一段拼接脚本（热重载、unlag 重新注入 combo）会在**解析阶段**抛 `SyntaxError: Identifier 'CSS_LINES' has already been declared`。整段脚本一行都不执行——排在它后面的、所有还没加载的插件一起静默失效。这是 v0.2.4 踩过的，当时的对策就是改用 `var`（`var` 重复声明安全，不抛错）。

**坑二：`var` 不抛错，但它会静默互相覆盖。** 这就是 v0.3.0 查明的真事故：本插件顶层 `var CSS_LINES = [...64 条 .ns-*...]` 与 `dsh-turn-notify` 顶层同名 `var CSS_LINES = [...52 条 .tn-*...]` 撞在一起，后拼进来的赢，于是写进 `<style>` 的全是对方的规则，本插件面板退化成浏览器默认样式。**不报错、不警告**，所以查了三轮才找到。

两个坑的解法是同一个：**别占顶层**。`var` 只是绕开了坑一，坑二照踩。v0.3.0 起 `CSS_LINES` 整个移进 `factory` 函数体内（那里是独立作用域，各插件互不可见），用 `const` 也没问题。

所以现在 `lib/client.js` 顶层**只有一条语句**：`window.__ModuleLoader__.load({...})`。文件其余部分全在 factory 里，`const` / `let` 随便用。对照 `dsh-push-hub`、`dsh-composer-butler`：它们的 `client.js` 顶层也是一条语句都没有，所以从没踩过这两个坑。

**改这个文件时不要把任何声明提回顶层**，不管用 `var` 还是 `const`——`scaffold/test_client_toplevel.mjs` 会红，`scaffold/test_combo_globals.mjs` 会在 vm 里合成一个抢名字的对手验证后果。

#### ⑦ 哪些通道真的需要「发送到」？（v0.2.7）

这是「有些账号点了没反应」的根因。判定不看通道名字好不好听，只看**通道实现里到底读不读 target**——逐条读过 `dsh-push-hub/lib/channels/*.js`：

| 通道 | 需要目标？ | 依据（通道实现里的真实行为） |
|---|---|---|
| telegram | 是 | 先 `targetOf(acc)`，null 就返回「还没选发送到」 |
| feishu | 是 | 同上 |
| qq | 是 | 同上 |
| wechat | 是 | 同上 |
| slack | 是 | 同上 |
| discord | 是 | 同上 |
| matrix | 是 | 同上 |
| wecom_app | 是 | 读 `acc.target.id`，空即报错 |
| email | 是 | 读 `acc.target.id ?? acc.to`，空即报错 |
| synology_chat | **看类型** | `type==='webhook'` 只读 webhookUrl；`type==='bot'` 才需要 `userIds` |
| dingtalk | 否 | 只读 `webhookUrl ?? resource ?? accessToken`，全局无 targetOf |
| wecom | 否 | 只读 `webhookUrl ?? resource ?? key`，全局无 targetOf |

所以 `lib/accounts.js` 里有一个显式的 `needsTarget(channel, acc)` 函数，规则就三条：

```
dingtalk / wecom              → false
synology_chat                 → 仅 type === 'bot' 时为 true
其余所有通道                   → true
```

**为什么 webhook 型不需要目标**：收件人信息（群 ID / 机器人 key）本身编在 webhook 地址里，发出去自然落到那个群。再要求填 target 是多余的，而且本机上群晖那个账号的 `target.id` 恰好是空串 —— 老判定据此把它判成「缺发送目标」，界面上就灰着点不动，可推送中枢里它明明能正常发。

**这条判定的回归断言**在 `scaffold/test_target_rule.mjs`：用合成账号跑，不读本机配置，所以任何机器上结果一致。它同时锁住正反两面——群晖 webhook 必须可用（修复），微信缺 `allowFrom` 必须不可用（这条一直是对的，别被修过头）。

### 6.4 账号发现顺序

`findPushHub()` 按这个顺序找：

1. 环境变量 `NOTIFY_SENDER_PUSH_HUB`
2. `config.json` 的 `pushHubPath`
3. 扫 `~/.dsh/profiles/<profile>/node_modules/@duma520/dsh-push-hub`，profile 顺序：`desktop → default → web → superagent → safe → add`

每一处都要求 `package.json` 和 `lib/bus.js` **同时存在**才算找到——避免撞到空目录。

### 6.5 账号来源

| 来源 | 配置文件 | 当前账号数 |
|---|---|---|
| `push-hub` | `~/.dsh/dsh-push-hub/config.json`（含该文件里的 `own_bots`） | 4 |
| `bridge` | `~/.dsh/dsh-bridge/config.json` | 18 |
| `im-connect` | `~/.dsh/dsh-im-connect/channels.json` | 0（结构为空） |

**`own_bots` 区是会被算进来的**（v0.2.7 更正）：推送中枢把 `own_bots` 展开成标准通道结构、并作为**最高优先级**的账号层合并进 `config.load()` 的结果（见 `dsh-push-hub/lib/config.js` 的 `ownBotsLayer()` 与 `resolveLayers()` 里的 `own` 层）。本机 push-hub 的 4 个账号里，群晖「DSH 通知」就来自 `own_bots.synology_chat[0]`。所以本插件拿到的 push-hub 账号清单，本身就是「用户自己填的 + 自有机器人」合并后的结果，不需要（也不能）另外去读 `own_bots`。

### 6.6 性能与限制

| 项 | 数值 | 说明 |
|---|---|---|
| 账号聚合耗时 | < 10 ms | 纯本地 JSON 读 + 内存去重 |
| push-hub 模块缓存 | 进程内单例 | 改路径后调 `resetHub()` 清缓存 |
| 历史条数上限 | 300 | 超出丢最旧 |
| 正文摘要长度 | 200 字 | 只存摘要 |
| 单次发送 | 1 个账号 | 设计如此 |
| 并发 | 无限制 | 界面按钮在发送期间禁用，避免重复点 |

---

## 7. 给 AI 用的两个工具

### 7.1 `notify_accounts`

列出所有账号。**选账号前必须先调它**，因为 id 是 `通道::来源::账号名` 三段式，猜不出来。

返回：

```json
{
  "ok": true,
  "count": 22,
  "sources": { "counts": { "push-hub": 4, "bridge": 18 }, "disabled": [] },
  "accounts": [
    { "id": "feishu::push-hub::飞书扫码机器人", "channel": "feishu", "name": "飞书扫码机器人", "source": "push-hub", "usable": true, "missingFields": 0, "hasTarget": true, "needTarget": true, "target": "oc_acb...", "targetKind": "user", "credentialHint": "…x9f2", "disabledReason": "" },
    { "id": "synology_chat::push-hub::DSH 通知", "channel": "synology_chat", "name": "DSH 通知", "source": "push-hub", "usable": true, "missingFields": 0, "hasTarget": true, "needTarget": false, "target": "由通道自身投递（webhook 地址里已指定）", "targetKind": "webhook", "credentialHint": "…u%22", "disabledReason": "" }
  ]
}
```

### 7.2 `notify_send`

三档粒度任选其一（也可混用，最终是一个去重后的 id 数组）：

| 参数 | 必填 | 说明 |
|---|---|---|
| `account_id` | 三选一 | 单个账号 id（`notify_accounts` 返回的原文） |
| `account_ids` | 三选一 | 账号 id 数组，发这几个 |
| `all` | 三选一 | `true` = 发到**所有可用**账号 |
| `text` | 是 | 正文，可多行 |
| `title` | 否 | 会变成 `【标题】` |
| `dry_run` | 否 | **默认 true**。确认后才传 false |

**默认 dry_run=true 是刻意的**：AI 不该在你没看见的时候就把消息发出去。它得先把预览给你看。

**用 `all:true` 前先想清楚**：本机当前 18 个可用账号，一次点击就是 18 条真实消息送到 17 个人。工具描述里也写了这句警告 —— 不是限制你，是提醒这一次的代价。

### 7.3 `notify_selfcheck`

只读自检。返回 push-hub 位置、设置/记录文件路径、各通道账号数、可用数。排查「为什么列不出账号」时第一步调它。

---

## 8. HTTP 接口

前缀 `/@duma520/dsh-notify-sender/api`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/info` | 版本号与包名 |
| GET | `/accounts` | 账号列表 + 来源统计 + 上次选择 |
| POST | `/send` | `{accountId \| accountIds \| all, title, text, dryRun}` |
| GET | `/history?limit=20` | 最近记录 |
| GET | `/settings` | 读设置 |
| POST | `/settings` | 写设置（**只接受 7 个已知键**） |
| GET | `/selfcheck` | 自检（含最后一次客户端心跳） |
| POST | `/selftest` | 逐个账号探测 token 是否有效（v0.2.9 新增），可选 `{accountIds}` 限定范围 |
| GET | `/hello` | 读最后一次客户端心跳（v0.2.5 新增） |
| POST | `/hello` | 客户端上报心跳：`{stage, loadId, ua, href, visibility, slots, note}` |

**`/hello` 是干什么的**：插件在浏览器端有没有真的被执行，服务端原本完全看不出来 —— 界面缺入口时无法区分「代码没跑」和「跑失败在哪一步」。客户端半身在 `apply()` 的关键节点各报一次，`slots` 里六个布尔值分别对应六个入口的注册成败。`at` 为空 = 这个进程里还没有页面跑过本插件。详见第 9 章排错手册。

**`/selftest` 的边界**（v0.2.9）：它调的是 push-hub 的 `probeAccount()`，**只能验证 token 能不能用，验证不了消息能不能发出去**。微信尤其如此——token 有效但 `sendmessage` 恒返 `ret=-2 prepare failed` 的账号，`/selftest` 照样报 OK。要判断「能不能真发」请看卡片是不是黄色（依据是真实发送历史）。这个接口是**串行**的，不并发打上游。

危险面控制：

- `/settings` 有**白名单**，只接受 `pushHubPath` / `disabledSources` / `lastAccountId` / `lastAccountIds` / `lastChannel` / `dryRunByDefault` / `targetOverrides`（7 个键），其他键一律丢弃。防止误写进奇怪字段。
- `targetOverrides`（v0.2.9）是「账号 id → 目标」的扁平映射，只存本插件自己的 `~/.dsh/dsh-notify-sender/config.json`，**绝不回写 push-hub / dsh-bridge 的配置**——那是别人的数据。值可以是 `"o9cq…@im.wechat"` 这样的字符串，也可以是 `{kind:'user'|'group', id}`；存空串等于删除该条覆盖。
- `/accounts` 返回的对象经过 `publicList()` 剥壳，**不含 `_raw`**（原始账号对象，里面有凭据）。
- `/send` 失败返回 **502**，成功 200。HTTP 状态码与业务结果一致，不做「永远 200」。
- `/hello` 只接受注册结果与页面地址/UA，**不接收也不回显任何账号或凭据信息**；`note` 字段截断到 400 字符，防止被当成日志灌爆。

---

## 9. 排错手册

### 症状：插件在运行，但侧栏和设置里都找不到「通知发送器」

**现象**：设置 → 插件里能看到 `@duma520/dsh-notify-sender`，状态「运行中」、开关是开的；但设置弹窗左侧导航里没有它，侧栏 ✉ 图标和「插件」下拉菜单里也没有。

**原因**：客户端半身（`lib/client.js`）没有在浏览器里执行成功。分两类，见本文 6.3 的 ⑥：

- **v0.2.4 及以前**：第一行是 `const CSS_LINES`，combo 脚本第二次执行时在解析阶段抛 `SyntaxError`，整段脚本连同后面所有插件一起失效。
- **v0.3.0 之前**：改成 `var` 后不炸了，但与 `dsh-turn-notify` 的同名 `var CSS_LINES` 静默互覆盖——本插件自己的入口还在，但样式全丢（就是「排版问题」的真根因）。

两者都已修掉。现在 `lib/client.js` 顶层只有一条 `window.__ModuleLoader__.load({` 语句，任何声明都在 factory 内。

**诊断**（三条，按顺序）：

1. 看服务端是否已加载：
   ```
   curl http://127.0.0.1:30004/@duma520/dsh-notify-sender/api/info
   ```
   返回 `{"ok":true,"version":"0.3.0",...}` 说明宿主半身没问题，问题在浏览器端。（端口和前缀按你自己的实例改：本机是无认证的 30004，桌面版 GUI 走 27212 且需登录。）
2. 看 combo 里本插件那一段是怎么开头的：
   ```
   curl -s "http://127.0.0.1:30004/plugins/??@duma520/dsh-notify-sender/client.js" | head -20
   ```
   **第一行应是 `window.__ModuleLoader__.load({`**。若看到顶层有 `var CSS_LINES` 或 `const CSS_LINES`（出现在 `load(` 之前），说明跑的是 v0.2.9 及以前的旧代码。
3. 看 `lib/client.js` 顶层还有没有别的语句：
   ```
   grep -nE "^(var|let|const|function|class) " lib/client.js | grep -v "window.__ModuleLoader__"
   ```
   **应该一条都不命中**（v0.3.0 口径）。有命中就把那句话整个挪进 factory 内，不要改写成 `var` 了事——`var` 只是不抛错，依然会被别人顶掉。

**解决**：确认代码是 v0.2.5 及以上 → 在界面里**彻底刷新一次**（Ctrl+R / F5）。只点插件的「刷新」按钮不够，因为 bundle 只在页面 boot 时装配。

### 症状：远程端（3082 端口）看得到入口，本机窗口（30004）看不到

**现象**：同一套插件、同一个进程，从另一台机器访问 DSH 能看到侧栏 ✉ 与设置里的「通知发送器」，但本机桌面窗口里两个都没有。

**原因**：两个页面不是同一个时刻启动的。插件浏览器半身（bundle）只在页面 boot 时按当时的 combo 清单装配一次；**已经在跑的老页面不会自动换上新代码**。老页面跑的是它启动那一刻的旧 combo，新页面启动时才拿到新清单。

**诊断**（v0.2.5 新增的心跳，一句话看清「这个页面到底跑没跑过本插件的 apply()」）：

```
curl http://127.0.0.1:30004/@duma520/dsh-notify-sender/api/hello
```

- `client.at` 为空字符串 → **这个 DSH 进程里还没有任何页面执行过本插件**，入口当然一个都不会有。
- `client.at` 有值、`client.href` 指向你正在看的那个地址 → 那个页面跑过了，再看 `client.slots`。
- `client.slots` 六个布尔值是一份体检表：

  | 字段 | 对应入口 |
  |---|---|
  | `settings` | 设置 → 左侧「通知发送器」 |
  | `bundleConfig` | 插件详情页的配置区 |
  | `main` | 整页主面板 |
  | `panellist` | 侧栏面板行（✉） |
  | `panellistActions` | 侧栏「插件」下拉里的「更多」菜单行 |
  | `detailAction` | 插件详情页的「打开通知发送器」按钮 |

  全部 `true` 而界面仍看不到 → 是宿主渲染层的问题，不是注册失败；某项 `false` → 那一条注册在运行时抛错了，看浏览器控制台。
- `client.stage` 记录它走到哪一步：`apply-start` → `settings-registered` / `bundle-config-registered` / `layout-registered` → `apply-done`。**卡在哪一步，就是那一步之后出了问题。**

**解决**：在本机那个看不到入口的窗口里按 **Ctrl+R**（或关掉该窗口重新打开）。刷新后心跳的 `at` 会更新、`href` 会变成这个窗口的地址。

### 症状：界面上一张账号卡片都没有

**原因**：推送中枢没找到，或所有来源被禁用。

**诊断**：看顶部有没有橙色「推送中枢未就绪」提示。有 → 是找不到 push-hub。

**解决**：
1. 确认 `<插件根目录>/dsh-push-hub` 存在且有 `lib/bus.js`
2. 或者去设置里填「推送中枢目录」
3. 或者检查设置里「禁用来源」是不是全勾上了

### 症状：所有卡片都是灰的

**原因**：账号存在但缺凭据/缺目标。

**诊断**：鼠标悬停看提示是「缺发送目标：…」还是「缺凭据字段：N 组必填项没填」。

**解决**：缺目标 → 让对方先给机器人发一条消息（通道会把 openid 记进配置），或在推送中枢里选一个会话；缺凭据 → 去源头补配置，然后点「刷新账号」。

### 症状：某些卡片灰着点不动，另一些能点

**现象**：同一个通道里有几张卡片能点、有几张不管怎么点都没反应，也没出现「✓ 已选」。

**原因**：那些账号被判成了不可用。v0.2.7 之前这里有个**误判**——只看「有没有 target」，把 webhook 型通道（群晖 Chat / 钉钉 / 企业微信）一并判死，哪怕它配好了 webhookUrl、在推送中枢里能正常发。

**诊断**（三条，直接看服务端算出来的原因）：

1. 看被禁用的那几条到底缺什么：
   ```bash
   curl -s http://127.0.0.1:30004/@duma520/dsh-notify-sender/api/accounts \
     | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{for(const a of JSON.parse(s).accounts) if(!a.usable) console.log(a.id,'| needTarget=',a.needTarget,'| missing=',a.missingFields,'|',a.disabledReason)})"
   ```
2. `needTarget=false` 却 `usable=false` → 这是 bug（webhook 型不该要求目标），升级到 **v0.2.7 及以上**。
3. `needTarget=true` 且 `missingFields=0` → 真的缺「发送到」。这是**正确**的判定：微信 / QQ / Telegram 这类通道，对方没先给机器人发过消息，机器人就拿不到 openid，发不出去。

**解决**：

- webhook 型被误判 → 升级到 v0.2.7 后点「刷新账号」（不需要重启）
- 真的缺目标 → 让对方先给机器人发一条消息，再点「刷新账号」；或在推送中枢里给该账号指定一个会话
- **已经知道对端 ID、不想等对方发消息**（v0.2.9）→ 设置区「手动指定目标」→「加载账号」→ 填 `o9cq…@im.wechat` → 保存。卡片立刻转绿。

**为什么不能「先让它可点，点了再报错」**：`/send` 是整体校验的——只要选中里有一个不可用，整批拒绝。放行一张必然失败的卡片，等于让你一路选到点发送时才被整体打回。

### 症状：卡片是黄的，写着「上游发不出（N 次 ret=-2 prepare failed）」

**这是 v0.2.9 新增的第三态，它在如实告诉你一件事：这个账号的配置没问题，是上游不认它。**

对照：卡片黄 ≠ 你不能点。黄卡仍然可以勾选、可以发，只是提前告诉你「上次这么发是失败的」。

**先分清两个完全不同的原因**：

| 你看到的 | 真实原因 | 能不能修 |
|---|---|---|
| 黄卡 + `ret=-2 prepare failed` | 微信服务端不认这个 bot 的绑定关系（push-hub 源码注释已写明这是服务端行为） | **代码修不了**，只能去微信客户端**重新扫码绑定**该 bot |
| 灰卡 +「缺发送目标」 | 这个 bot 从未收到过任何消息，没有 openid | 让对方先发一条消息给 bot，或用「手动指定目标」填 ID |

**为什么以前看不出来**：v0.2.8 及以前只看「配置齐不齐」。而 push-hub 的 `probe()` 对微信只调 `getconfig`（判据是「响应里有没有 ret 字段」，`ret=-4` 也算通过），**完全不覆盖 `sendmessage`**。于是 token 有效、目标也在的账号全被标绿——本机 9 个微信 bot 里有 5 个就是这样「假绿」，点发送必失败，界面上找不到任何线索。

**怎么办**：

1. **最有效**：去微信客户端把这个 bot **重新扫码绑定**。这是唯一能真正修复 `ret=-2` 的办法。
2. **换通道**：飞书、QQ 两条链路在本机实测一直正常，比微信稳得多。如果是重要通知，建议优先用它们。
3. **不要反复重试**：同样的账号连发多次只会得到同样的 `ret=-2`，不会自愈。
4. 修好之后发一次，成功后黄卡会**自动**恢复成绿色（依据是最近 5 条真发记录里的最新一条）。

**注意 `/selftest` 在这里帮不上忙**：它探的是 token 有效性，这类账号的 token 是好的，`/selftest` 会报 OK。判断能不能真发，只能看卡片颜色。

### 症状：功能都正常，但界面变成浏览器默认样式（按钮是灰方块、输入框没边框）

**这几乎一定是样式表没生效，不是面板坏了。** 判断依据：账号加载、选择、发送全部正常，只是「不好看」——纯浏览器默认渲染。

**真根因（v0.3.0 查明并修掉，前两次只修到了皮毛）：**

宿主 `@deepseek-ai/dsh-client-modules` 的 `buildComboScript()` 会把**所有插件的 `client.js` 用纯字符串拼接成同一个 classic script**，外层没有 IIFE、没有作用域包裹：

```js
let source = "";
for (const resource of resources) source += `${prepareSource(resource).source};\n`;
```

于是几十个插件的客户端代码**共享同一个全局作用域**。本插件旧版在文件顶层写的是 `var CSS_LINES = [...64 条 .ns-* 规则...]`，而另一个插件（`@duma520/dsh-turn-notify`）顶层也写 `var CSS_LINES = [...52 条 .tn-*...]`。`var` 重复声明不报错，**后拼进来的静默覆盖前者**——`ensureStyleIn()` 往 `<style>` 里写进去的其实是对方的规则，本插件 `.ns-*` 一条不剩。

**为什么前两次修不掉**：v0.2.3 改 CSS 内容、v0.2.8 改「不删节点 + 补 shadow root」，两个都是真问题但不是这个。改自己的代码永远无效，因为污染源是别人。

**v0.3.0 的两层解法：**

1. **不占全局名**：`CSS_LINES` 与 `CSS_TEXT` 全部移进 factory 内部，`client.js` 顶层现在**只剩一条语句**（`window.__ModuleLoader__.load({`）。别人的 `var CSS_LINES` 再也盖不到它。
2. **自愈**：`ensureStyleIn()` 命中已有 `<style>` 时不再直接返回，而是比对内容——装的是坏东西就**就地重写**，并让 `styleDiag.repaired` 加一。

另外两个已知成因（v0.2.8 修的，仍然有效）：

1. **热重载把样式节点删掉了。** 插件换新代码时，新实例先 apply（看到旧 `<style>` 还在 → 认为样式已就位），紧接着旧实例 dispose。如果旧实例的清理函数里有 `style.remove()`，页面上就一份样式都不剩。现在 `installStyle()` 返回**空清理函数**，样式节点留着不删。
2. **面板被挂进了 shadow root。** 主文档 `document.head` 里的 `<style>` 对 shadow root 内部完全无效。现在每个入口的根节点都挂了 `useRootStyle()`，它会 `getRootNode()` 找到真实根，往那个根里补一份（同一个 root 只补一次，用 `data-ns-css="1"` 标记幂等）。

**怎么确认到底插进去没有：**

```bash
curl "http://127.0.0.1:17116/@duma520/dsh-notify-sender/api/hello"
```

看返回里的 `client.style`：

| 字段 | 含义 |
|---|---|
| `roots` | `["document"]` 正常；`["document","shadow"]` 说明面板确实在 shadow root 里，已补第二份 |
| `rules` | 解析出的 CSS 规则条数。v0.3.0 应为 **70**（64 条数组串里有几条一行塞了多个选择器）；是 `0` 说明 `<style>` 插进去了但文本没被解析（CSS 语法坏了） |
| `repaired` | v0.3.0 新增。大于 0 表示**自愈触发过**——说明这个 `<style>` 节点原本装的是坏内容（很可能是被别的插件顶掉过），已就地重写 |
| `error` | 非空说明读 `style.sheet.cssRules` 被拒（跨域/安全策略），此时样式可能仍然生效，只是读不到条数 |

`stage` 为 `style-ensured` 的那条心跳就是面板挂载后补样式时发的。

**如果你刚升级完看到旧样子**：先按一次 Ctrl+R。样式节点是页面级的，插件换代码不会让老页面重绘。

**护栏（改客户端代码前先看这条）**：`lib/client.js` 顶层**一条语句都不许有**（不是「别用 const」，是「什么都别写」）。`scaffold/test_client_toplevel.mjs` 会在顶层出现任何实质代码行时 FAIL；`scaffold/test_combo_globals.mjs` 会按宿主的真实拼接方式在 node vm 里跑一遍，并合成一个故意抢 `CSS_LINES` 的对手，两种拼接顺序都验证本插件样式仍完整。这两个测试都在 `npm test` 里。

**能不能防住「别人抢名字」？** 本插件自己已经不占全局名（数组在 factory 内），所以别人抢不到它头上；`ensureStyleIn()` 还会在发现节点内容不对时自愈重写。但**别的插件之间**互相抢，本插件无能为力——那是宿主 `buildComboScript()` 不加 IIFE 的架构代价。想知道当前 profile 里还有没有别处在踩这个坑，跑：

```bash
node scaffold/scan_profile_globals.mjs          # 只读体检，列出所有跨插件同名全局
node scaffold/scan_profile_globals.mjs --strict # 有冲突时退出码 1
```

这个工具是 v0.3.0 加的，**用 vm 真跑每个 client.js 再 `typeof` 验证**，不靠正则数括号——第一版就是靠静态解析误报了 26 组假冲突，教训写在脚本头部注释里。它也会提醒「写了全局但当前没撞上」的插件，那种今天没事、明天装个新插件就可能复发。

### 症状：预览通过，真发失败

**原因**：预览只算分块，不真的碰网络。真正的失败发生在平台侧。

**诊断**：结果区的 `detail` 字段是通道实现给的原话。

**常见 detail**：

| detail 原文 | 含义 | 怎么办 |
|---|---|---|
| `没有名为 X 的账号` | 临时 cfg 里没塞进去（不该发生，是 bug） | 报 issue |
| `还没填发送到` | 该通道的 target 为空 | 补 target |
| `异常 FetchError: ...` | 网络层失败 | 检查代理 / 网络 |
| `HTTP 401` | 凭据失效 | 去源头更新 token |

### 症状：改了设置但界面没变

**原因**：`pushHubPath` 改了要清模块缓存，界面需要重新拉。

**解决**：改完路径后点「刷新账号」。

### 症状：DSH 重启后插件不见了

**原因**：profile 的 `package.json` 或 `node_modules` 链接丢了。

**诊断**：

```powershell
Test-Path "<用户目录>\.dsh\profiles\desktop\node_modules\@duma520\dsh-notify-sender\lib\index.js"
```

**解决**：重新建 junction

```powershell
New-Item -ItemType Junction `
  -Path "<用户目录>\.dsh\profiles\desktop\node_modules\@duma520\dsh-notify-sender" `
  -Target "<插件根目录>\dsh-notify-sender"
```

### 症状：日志里看到 `SyntaxError: Invalid or unexpected token`

**已修复的历史坑**（记下来防复发）：`lib/paths.js` 的注释里写过 `profiles/*/node_modules`，其中的 `*/` 提前终止了块注释。改成 `profiles/<profile>/node_modules` 后正常。

**教训**：JS 块注释里不要出现 `*/` 序列，哪怕在举例。

---

## 10. FAQ

**Q1：它会偷看我的消息吗？**
不会。它不建立任何连接，不注册任何收消息的钩子。全部代码里没有一个 `poll` / `websocket` / `longpoll` 调用。

**Q2：为什么我的微信账号有 9 个，界面只显示 5 个能用的？**
另外 4 个（<你的微信ID> / <你的微信ID> / <你的微信ID> / <你的微信ID>）凭据齐但没填 target，发出去不知道给谁。给它们填上 target 就能用。

**Q3：能一次发给多个账号吗？**
能。卡片是多选的：勾几个发几个，也可以点「全选可用」一次发给全部。勾到 3 个及以上时按钮会要求二次确认。见 6.3 ④。

**Q4：能撤回吗？**
不能。撤回要拿到 message id 并调各平台的撤回接口，那是推送中枢的能力。本插件只负责发。

**Q5：预览和真发有什么区别？**
预览只做本地计算（查账号、算分块、解析目标），**不发任何网络请求**。真发会真的打平台 API。

**Q6：凭据存在哪？**
**本插件不存。** 它们在你原本就有的 `dsh-push-hub/config.json` 和 `dsh-bridge/config.json` 里。本插件只读。

**Q7：为什么 AI 调工具默认是预览？**
怕它手滑。默认 `dry_run=true` 意味着它必须显式传 `false` 才会真发。这是给 AI 加的一道闸。

**Q8：发送记录里为什么看不到完整正文？**
只存前 200 字摘要。完整正文可能有敏感内容，没必要留。

**Q9：改了推送中枢的账号配置，这里要重启吗？**
不用。点「刷新账号」即可。

**Q10：能不能只显示某一个通道？**
目前只能按「来源」禁用（推送中枢 / 桥接 / IM 连接），不能按通道过滤。这是目前的已知限制（v0.2.0 仍未做）。

**Q11：`pushHubPath` 留空时它怎么找？**
按 6.4 的顺序扫 `profiles/<profile>/node_modules`。本机实际命中的是 `desktop`。

**Q12：多个 profile 都有 push-hub 会怎样？**
按 `desktop → default → web → ...` 的顺序取**第一个**找到的。

---

## 11. 版本更新简介

> **开源发布**：本仓库于 2026-11-21 首次公开，内容与 v0.2.7 一致（版本号未变，仅做脱敏与发布动作，按归档号记录）。详见[软件升级迭代记录](软件升级迭代记录.md)最新一段。

| 版本 | 日期 | 一句话变更 |
|---|---|---|
| v0.3.0 | 2026-11-25 | **修「排版问题每次都出现」的真根因**：客户端样式数组 `CSS_LINES` 原本声明在文件顶层，而宿主把几十个插件的 client.js 纯字符串拼接成同一个脚本（无 IIFE），与另一个插件同名的顶层 `var CSS_LINES` 互相覆盖，后执行的赢 —— 写进 `<style>` 的是别人的规则，本插件 `.ns-*` 一条不剩。已把样式收进 factory 内、注入时比对内容并自愈重写；另加两条护栏（顶层零语句 + combo 全局污染，含合成对手双顺序测试），以及一个只读体检工具 `scaffold/scan_profile_globals.mjs`（扫全 profile 有无别的插件在抢全局名，附变异测试证明它真能报错） |
| v0.2.9 | 2026-11-25 | 账号卡从两态改三态：新「黄卡」标出「凭据齐但上游发不出」（依据真实发送历史推导，不再是配置一看齐就绿）；设置页新增「手动指定目标」给灰卡一条出路；新增 `POST /api/selftest` 逐个探测；顺手修掉 `GET /settings` 404 导致设置区永久卡在「正在读取设置…」的老 bug |
| v0.2.8 | 2026-11-22 | 修「功能正常但样式全丢」：卸载不再删样式节点（热重载竞态）+ 面板/设置区自动补样式进 shadow root，并把样式诊断写进 `/api/hello` |
| v0.2.7 | 2026-11-20 | 修「有些账号点了没反应」：webhook 型通道（群晖 Chat / 钉钉 / 企业微信）不再被误判成「缺发送目标」，卡片写明真实原因与修法 |
| v0.2.6 | 2026-11-20 | 选中态一眼可辨：卡片加底色+2px 描边+「✓ 已选」角标，新增已选清单（可点 × 取消）、分组头显示已选数 |
| v0.2.5 | 2026-11-20 | 加客户端心跳 `/api/hello`：一句话判定「这个页面到底跑没跑过插件的 apply()」，六个入口各报注册成败 |
| v0.2.4 | 2026-11-19 | 修「插件在跑但界面找不到」：CSS 数组从顶层 `const` 改 `var`，避免 combo 脚本二次执行时整段语法报错 |
| v0.2.3 | 2026-11-19 | 侧栏入口双保险：图标改 SVG 跟随 size，另注册一条「更多」菜单行，面板行被宿主过滤时仍能从菜单进入 |
| v0.2.2 | 2026-11-19 | 主面板自己能滚了：按窗口实测高度自适应，加 8px 可见滚动条，底部留白不再被内联样式顶掉 |
| v0.2.1 | 2026-11-19 | 正文为空改为发前整体拦截（原先会对每个账号各报一次同样的错） |
| v0.2.0 | 2026-11-19 | 发送粒度改为「勾几个发几个」：单发 / 多选 / 全选三档，串行发送，3 个以上需二次确认 |
| v0.1.0 | 2026-11-19 | 首个版本：22 个账号聚合、单账号发送、中文界面、实时保存、AI 工具 |

---

## 12. 已知限制与安全说明

### 12.1 已知限制

1. **不能群发** —— 刻意如此。
2. **不能撤回 / 编辑** —— 只发。
3. **不能按通道过滤** —— 只能按来源禁用。
4. **不接收消息** —— 明确不做。
5. **`im-connect` 来源通常为空** —— `channels.json` 是空结构，所以这个来源是个预留位。
6. **进度条在等待平台响应时会停住** —— 因为那段时间真的没有进度，不造假。

### 12.2 安全说明

- **凭据零存储**：本插件不写任何 token / secret / webhook 进自己的配置文件。
- **凭据零回传**：`/accounts` 与 `/send` 的响应都经过 `publicList()` 剥壳，不含 `_raw`。回归脚本 `scaffold/test_accounts.mjs` 里有一项 `LEAK_CHECK` 专门断言输出不含 `token|secret|webhook|password` 字样。
- **只读借用**：对 `dsh-bridge/config.json` 与 `dsh-push-hub/config.json` 都只读，从不写。
- **`dryRunByDefault` 的风险**：把它设成 `false`，AI 调 `notify_send` 时**不传 `dry_run` 就会真发**。建议保持 `true`。
- **`pushHubPath` 的风险**：填了一个恶意目录，本插件会去那里 `import` 代码。所以它只在**你手动填**时生效，不会自动接受外部输入。

### 12.3 隐私

发送记录里存的：通道、账号名、来源、摘要（前 200 字）、结果、消息 id、字数、块数、时间。

**不存**：凭据、完整正文、完整目标 id（只在结果区临时展示，不落盘）。

---

## 13. 目录结构与开发

> **开源仓库说明**：本仓库只放插件本体（`lib/`、`cordis.patch.yml`、`package.json`、`README.md`、`docs/`、`LICENSE`、`config.example.json`、迭代记录与界面截图）。**`scaffold/`（开发探针与回归脚本）和 `version/`（历次备份快照）不在仓库里** —— 它们绑定本机路径、本机真实账号与历史数据，公开即泄露。下文凡是 `node scaffold/...` 之类的命令都只在作者本机跑得通，clone 本仓库后这些文件并不存在。

```
dsh-notify-sender/
├── package.json            # 包元数据，dsh.client 声明浏览器半身
├── cordis.patch.yml        # 让 profile 自动加载本插件
├── README.md               # 本文
├── LICENSE                 # AGPL-3.0
├── 软件升级迭代记录.md      # 版本变更记录
├── lib/
│   ├── index.js            # 宿主半身：API + 3 个工具
│   ├── client.js           # 浏览器半身：中文界面
│   ├── accounts.js         # 账号聚合与可用性判定
│   ├── sender.js           # 发送（构造 tempCfg 调 push-hub）
│   ├── history.js          # 发送记录（摘要only）
│   └── paths.js            # 路径解析、push-hub 定位、设置读写
├── scaffold/               # 开发脚本（不进 Release）
│   ├── test_accounts.mjs       # 账号聚合 + 泄漏检查 + dry-run
│   ├── test_style_root.cjs     # 样式注入回归：不删节点 + shadow root 补样式（v0.2.8）
│   ├── test_target_rule.mjs    # 「哪些通道必须填发送目标」回归（v0.2.7）
│   ├── test_client_toplevel.mjs # 客户端顶层零语句（防 combo 下全局名互撞，v0.3.0 改口径）
│   ├── test_combo_globals.mjs  # combo 全局污染回归：顶层零污染 + 合成对手双顺序（v0.3.0）
│   ├── test_deliverable.mjs    # 账号三态与手动目标判定（v0.2.9）
│   ├── test_routes.mjs         # API 路由端到端（v0.2.9）
│   ├── test_select_ui.cjs      # 选中态九条断言（v0.2.6）
│   ├── test_scan_mutation.mjs  # 证明全局名扫描器真能抓到撞名（v0.3.0）
│   ├── scan_profile_globals.mjs # 体检工具：扫全 profile 有无跨插件同名全局（v0.3.0，只读）
│   └── test_host_smoke.mjs     # 宿主半身注册冒烟
└── version/                # 历史归档（不进 Release）
    └── 20261119-v1/
```

### 回归测试

```bash
cd <插件根目录>/dsh-notify-sender

# 1. 账号聚合 + 凭据泄漏检查 + dry-run
node scaffold/test_accounts.mjs

# 2. 「哪些通道必须填发送目标」判定（合成账号，不读本机配置）
node scaffold/test_target_rule.mjs

# 3. 客户端顶层零语句 + combo 全局污染（改客户端/样式必跑）
node scaffold/test_client_toplevel.mjs && node scaffold/test_combo_globals.mjs

# 4. 账号三态与手动目标（合成历史，不读本机 history.json）
node scaffold/test_deliverable.mjs

# 5. 选中态断言
node scaffold/test_select_ui.cjs

# 6. 样式注入：卸载不删节点 + shadow root 也能补样式（v0.2.8）
node scaffold/test_style_root.cjs

# 7. 证明「全局名扫描器」不是摆设（造假的 .dsh 目录，塞两个撞名插件）
node scaffold/test_scan_mutation.mjs

# 8. 宿主半身注册冒烟（不连真 DSH，用假 ctx）
node scaffold/test_host_smoke.mjs

# 额外体检：扫整个 profile，看还有没有别的插件在顶层抢全局名（只读，不改任何文件）
node scaffold/scan_profile_globals.mjs
# 想让它在有冲突时退出码非 0（可挂 CI）：加 --strict

# 8. 全部语法检查
node --check lib/index.js && node --check lib/client.js && \
node --check lib/accounts.js && node --check lib/sender.js && \
node --check lib/history.js && node --check lib/paths.js
```

**期望输出**：

```
HUB {"ok": true, "dir": "<插件根目录>\\dsh-push-hub", "source": "profile:desktop"}
TOTAL: 22 usable: 18
LEAK_CHECK: CLEAN
DRYRUN: feishu 飞书扫码机器人 {"ok":true,"dryRun":true,...}
SMOKE OK
```

### 开发注意

1. **`client.js` 顶层一条语句都不许有** —— 宿主 `buildComboScript()` 把所有插件的 `client.js` **纯字符串拼接**成同一个 classic script，没有 IIFE，所有插件共享同一个全局作用域。顶层任何 `var`/`const`/`function` 都是全局名，与别的插件撞名会被静默覆盖（v0.3.0 真事故：本插件与 `dsh-turn-notify` 同名 `CSS_LINES`，本方样式全丢）。逻辑与样式统统放 factory 内。`scaffold/test_client_toplevel.mjs` + `test_combo_globals.mjs` 守这条线。
2. **`client.js` 手写 ModuleLoader bundle** —— 本机没有 tsc，也没有 DSH 源码 checkout，所以走 `window.__ModuleLoader__.load({id, factory})` 这条已验证路线。
3. **`slots.register` 必须写字面量** —— 注入器的骨架校验用正则匹配 `register\(\{[\s\S]*?name:['"]<白名单>['"]`，包一层函数就匹配不到。
4. **CSS 用 JSON 字符串字面量** —— 手写单引号里混进 `');` 会让整个文件语法错误。踩过。
5. **注释里不要出现 `*/`** —— 见 9 节的坑。

---

## 14. 许可
AGPL-3.0。见 [LICENSE](./LICENSE)。

## 许可

本项目采用 **GNU Affero General Public License v3.0（AGPL-3.0）** 发布。

- 完整许可证条文见仓库根目录 [LICENSE](LICENSE)。
- 你可以自由使用、修改、分发，包括用于商业用途，无需另行获得授权。
- 若你修改后分发，或以网络服务方式提供本软件，必须按 AGPL-3.0 公开相应源代码。
- 本仓库自 2026-11-23 起改用 AGPL-3.0；此前已按 MIT / BSD-3-Clause 发布的版本，其接收者依原许可证获得的授权继续有效。
