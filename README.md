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

外部生命归零会暂停战斗，宿主可通过 set 或 heal 恢复生命。
当前预留生命接口，尚未接入赛事平台的正式接档与交档 SDK。
