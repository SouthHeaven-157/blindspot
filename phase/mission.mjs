export const route = [
  {
    id:"intercept", name:"巡检一", verb:"接入第一巡检终端", duration:1.15,
    x:5, z:7, realm:"real",
    task:"第一阶段：接入东侧巡检终端，重构数据序列并取得连接命令。",
    complete:"连接命令已确认。第二巡检终端的加密校验已暴露。"
  },
  {
    id:"key", name:"巡检二", verb:"接入第二巡检终端", duration:1.35,
    x:-5, z:-10, realm:"real",
    task:"第二阶段：穿过封锁，在西侧 M-09 破解校验值并取得执行命令。",
    complete:"执行命令有效。电子眼主控区已在数据层显形。"
  },
  {
    id:"boss", name:"电子眼", verb:"接入电子眼主控区", duration:1.8,
    x:0, z:-10, realm:"echo",
    task:"第三阶段：在数据层挑战空中电子眼。A/D 躲避锁定，V 使用处决工具。",
    complete:"电子眼已失效。最终终端的防火墙开始崩解。"
  },
  {
    id:"archive", name:"最终终端", verb:"窃取机密文档", duration:1.6,
    x:0, z:13, realm:"echo",
    task:"第四阶段：返回南端最终终端，瓦解剩余防火墙并窃取《人类清除名单》。",
    complete:"机密文档已接收。数据流撤离开始。"
  }
];
