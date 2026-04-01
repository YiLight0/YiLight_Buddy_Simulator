# Claude Code Buddy Simulator

这是一个从仓库 `src/buddy` 交互里提取并复刻出来的网页模拟器。
它不是一个新的电子宠物养成游戏，而是把 Claude Code 里 `/buddy` 的出现方式、prompt 边 companion 的展示感觉，以及“抽到一只宠物”的入口改造成了可运行的静态网页。

## 这版现在是什么

- 入口是 `/buddy`
- 没有喂食、训练、探险之类新增玩法
- 页面主视觉尽量贴近 Claude Code 终端界面
- 宠物会出现在输入框右侧/下侧，而不是一个独立的大舞台
- 顶部支持 `中文 / English` 切换
- 所有宠物都来自源文件里已经提取出的 18 个物种

## 复刻依据

我这版主要对齐了原仓库里这些行为：

- `src/buddy/useBuddyNotification.tsx`
  没有 companion 时，界面会先出现彩虹 `/buddy` 提示
- `src/buddy/CompanionSprite.tsx`
  companion 贴着 prompt 区域显示，带闲置帧动画、眨眼和气泡
- `src/components/PromptInput/PromptInput.tsx`
  `/buddy` 是 prompt 里的触发入口，footer 里也有 companion 区域
- `src/screens/REPL.tsx`
  companion 在底部输入区域附近，而不是占据整个主界面
- `src/buddy/companion.ts`
  稀有度、眼睛、帽子、闪光和属性的生成思路来自这里

因为原版真正持久化的其实只有一个 companion，所以这里做的是“模拟器扩展版”：
保留原来的 `/buddy` 抽宠入口和 companion 呈现方式，再额外补了一个 10 格仓库，方便你连续抽取和切换展示所有宠物。

## 包含的宠物

当前包含源文件里的全部 18 个物种：

- `duck`
- `goose`
- `blob`
- `cat`
- `dragon`
- `octopus`
- `owl`
- `penguin`
- `turtle`
- `snail`
- `ghost`
- `axolotl`
- `capybara`
- `cactus`
- `robot`
- `rabbit`
- `mushroom`
- `chonk`

这些物种的资料和 ASCII 精灵直接复用自：

- `buddy/src/data/species.js`
- `buddy/src/data/sprites.js`
- `buddy/src/data/types.js`

## 当前逻辑

### 1. 启动时

- 页面初始是“还没有 companion”的状态
- 顶部和终端通知栏会显示彩虹 `/buddy` 提示
- 右下角不会先出现宠物，这点是按原始 buddy 的出现时机来做的

### 2. 抽宠方式

- 页面底部输入框默认就是 `/buddy`
- 点击右侧按钮，或在输入框里按回车，就会执行一次抽宠
- 这不是命令行程序，但保留了命令行风格的输入外观

### 3. 每次 `/buddy` 会发生什么

每次执行 `/buddy`：

1. 先在终端记录一条用户输入 `/buddy`
2. 然后生成一只新宠物
3. 新宠物会自动进入仓库
4. 新宠物会自动成为当前显示在 prompt 边上的 companion
5. transcript 里会追加一条“抽到宠物”的结果消息
6. 右侧 companion 会显示气泡并进入短暂活跃动画

### 4. 抽到的宠物如何生成

每只宠物会生成这些信息：

- `species` 物种
- `rarity` 稀有度
- `eye` 眼睛样式
- `hat` 帽子
- `shiny` 是否闪光
- 五维属性：
  - `DEBUGGING`
  - `PATIENCE`
  - `CHAOS`
  - `WISDOM`
  - `SNARK`
- 一个昵称
- 一个性格标签
- 一句用于气泡显示的台词

生成规则沿用了原始 `src/buddy/companion.ts` 的思路：

- 稀有度权重：
  - `common`: 60
  - `uncommon`: 25
  - `rare`: 10
  - `epic`: 4
  - `legendary`: 1
- 属性生成仍然采用“一个峰值属性 + 一个短板属性 + 其余属性随机分布”的结构
- 不同稀有度会提高属性下限
- `shiny` 仍然是低概率事件

### 5. “每次抽一个新的宠物” 的具体含义

这版按你现在的要求做成了：

- 当前仓库里不会出现重复物种
- 每次 `/buddy` 都会从“当前仓库尚未拥有”的物种里抽一只
- 如果你删除了某个物种，它之后就会重新回到可抽池里

也就是说：

- 仓库中的 10 只永远互不重复
- 删除后才能继续向剩余物种推进，或重新抽回被删掉的物种

### 6. 仓库规则

- 仓库上限固定 `10` 只
- 当仓库满 `10/10` 时，再执行 `/buddy` 不会成功抽取
- 这时 transcript 会提示仓库已满
- 同时会自动打开仓库面板，提示你先删除一只

仓库里每个槽位支持：

- 选中查看详情
- `设为当前 / Set Active`
- `删除 / Delete`

### 7. 当前 companion 规则

- 新抽到的宠物会自动成为当前 companion
- 点击仓库中的 `设为当前` 可以把任意仓库宠物切到输入框旁显示
- 删除当前 companion 时，会自动把仓库中的下一只宠物顶上来
- 如果仓库被删空，界面会回到“只有 `/buddy` 提示、没有 companion”的状态

### 8. 界面表现

为了贴近 Claude Code 原始 buddy，我保留了这些视觉规则：

- 没有宠物时先显示彩虹 `/buddy` 提示
- 宠物不占据主舞台，而是靠着底部 prompt 区域显示
- 宠物会做轻量闲置动画
- 宠物说话时会显示 speech bubble
- transcript 会保留命令行消息流的样子
- footer 区域提供 companion pill 和 warehouse pill

### 9. 语言切换

页面顶部可以切换：

- `中文`
- `English`

切换后会同步更新：

- 标题与状态栏
- transcript 文案
- 仓库与详情面板文案
- 宠物物种标题、简介、性格与气泡台词

宠物昵称本身会保持为抽取时生成的名字，不会因为切语言而改名。

### 10. 存档方式

- 这版不再使用之前终端版的 `save.json`
- 网页状态保存在浏览器 `localStorage`
- 保留内容包括：
  - 语言
  - 仓库宠物
  - 当前 active companion
  - transcript 记录

## 如何运行

### 推荐方式

在仓库根目录执行：

```powershell
cd buddy
node index.js
```

启动后会看到类似输出：

```text
Claude Code Buddy Simulator is running at http://127.0.0.1:4173
```

然后在浏览器打开：

```text
http://127.0.0.1:4173
```

### 也可以用 npm

```powershell
cd buddy
npm start
```

### 自定义端口

```powershell
cd buddy
node index.js --port 5050
```

然后打开：

```text
http://127.0.0.1:5050
```

## 常用操作

- 抽新宠：输入 `/buddy` 后回车，或直接点右侧按钮
- 打开仓库：点底部 `仓库 / Warehouse` 按钮
- 查看当前 companion：点底部 `伙伴 / Companion` 按钮
- 删除后继续抽：在仓库删除一只，再回到底部继续执行 `/buddy`

## 关键文件

- `buddy/index.html`
  页面结构
- `buddy/styles.css`
  终端风格样式
- `buddy/app.js`
  页面交互、抽宠、仓库、动画、本地存档
- `buddy/i18n.js`
  中英文文案
- `buddy/index.js`
  本地静态服务器入口
- `buddy/src/data/species.js`
  宠物资料来源
- `buddy/src/data/sprites.js`
  宠物 ASCII 精灵来源
- `buddy/src/data/types.js`
  稀有度、权重、属性名等基础数据

## 校验

如果你只想先检查脚本语法：

```powershell
cd buddy
npm run check
```
