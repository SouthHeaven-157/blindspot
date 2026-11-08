# 一次写入 · ONE WRITE

霓虹都市双位面潜入游戏。破解两座巡检终端，在数据层击败电子眼，窃取机密文档后化为数据流撤离。

## 运行

需要 Node.js 22 或更新版本。项目自带 Three.js 和美术资源，无需安装 npm 依赖。

双击“开始3D游戏.cmd”，或在项目目录运行：

    node phase/launch.cjs

默认地址 http://127.0.0.1:4178/ ，启动器使用 Chrome。
只启动服务可运行 node phase/launch.cjs --no-browser 。

## 操作

WASD 移动，鼠标转向，Q 切换位面，按住 E 接入终端，V 在数据层处决，C 蹲伏，Shift 疾跑，F 诱饵，T 世界代码终端。

## 源文件与接口

phase/once-write.blend 为 Blender 场景源文件。
phase/game.js 为游戏主逻辑，phase/data-space.mjs 为终端解密，phase/eye-boss.mjs 为 Boss 战。

外部生命接口在游戏模块初始化后可用：

    window.OneWriteHealth.set({ hp: 2, max_hp: 3 });
    window.OneWriteHealth.damage(1);
    window.OneWriteHealth.heal(1);
    const unsubscribe = window.OneWriteHealth.onChange(({ value, max }) => {
      console.log(value, max);
    });

大厅模式生命归零提交失败；独立试玩手动接入外部生命接口时，归零暂停，宿主可通过 set 或 heal 恢复。
已接入官方外链 SDK：大厅 iframe 内先等待 WL.ready()，接收真实生命、旧背包、线索和前序留言；成功调用 WL.complete，生命归零或主动终止调用 WL.fail。只有 persisted:true 才显示正式保存，preview 回执仅显示试玩校验通过。独立打开网站仍为独立试玩，不提交赛事旅程。

投稿时另行上传仓库根目录 global-items.json（空声明）。本关工具和机密文档不带出；保留原背包，不重复结算 on_enter 道具。被动攻击道具增强 Boss 处决，被动理智道具降低侦测速度，阵亡援助降低巡检灵敏度。

当前未完成真实大厅的正式交接验收和 270 秒完整路线实测。GitHub Pages 资源有 Access-Control-Allow-Origin:*，但无法在仓库配置 Cross-Origin-Resource-Policy 响应头；本地服务器已补齐两个头。如主办方严格要求 CORP，需使用可设置响应头的托管。

## GitHub Pages

在仓库 Settings → Pages 中选择 Deploy from a branch，分支 main，目录 / (root)。入口为根目录 index.html，资源通过相对路径 ./phase/ 加载，支持仓库子路径。

预计地址 https://southheaven-157.github.io/-/ ，需先在仓库启用 Pages。
