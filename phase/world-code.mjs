export const defaults=Object.freeze({"gate.open":false,"patrol.enabled":true,"city.power":true});
export function parseDeviceCode(source,current){
 const next={...current};const seen=new Set();
 for(const [index,line] of source.split(/\r?\n/).entries()){
  const clean=line.replace(/\/\/.*$/,"").trim();if(!clean)continue;
  const match=/^(gate\.open|patrol\.enabled|city\.power)\s*=\s*(true|false)\s*;?$/.exec(clean);
  if(!match)throw Error("第 "+(index+1)+" 行无法编译。格式示例：gate.open = true;");
  if(seen.has(match[1]))throw Error("第 "+(index+1)+" 行重复定义 "+match[1]);
  seen.add(match[1]);next[match[1]]=match[2]==="true";
 }
 if(!seen.size)throw Error("请输入至少一条设备指令。");
 return next;
}
export function openCodeEditor(state,apply,close){
 const dialog=document.createElement("dialog");dialog.className="hack-dialog code-dialog";
 dialog.innerHTML='<small>OCULAR / WORLD SOURCE</small><h2>现实正在执行这些代码。</h2><p>修改 true / false，预演后写入设备。控制代码可重复修改，最终档案签名仍只有一次。</p><label for="source-code">WORLD / sector-07.device</label><textarea id="source-code" spellcheck="false" aria-label="世界设备代码"></textarea><div class="code-help">gate.open → 实体封锁升起<br>patrol.enabled → 无人机扫描<br>city.power → 城市照明</div><pre class="compile-output" role="status">修改参数后点击预演。</pre><div class="hack-actions"><button data-action="preview">预演修改</button><button data-action="apply">写入现实</button><button data-action="close">返回街道</button></div>';
 document.body.append(dialog);
 const input=dialog.querySelector("textarea");input.value=Object.entries(state).map(([k,v])=>k+" = "+v+";").join("\n");
 const out=dialog.querySelector(".compile-output");
 dialog.querySelector('[data-action="preview"]').onclick=()=>{try{const next=parseDeviceCode(input.value,state);out.textContent=Object.keys(next).map(k=>k+"  "+state[k]+" → "+next[k]).join("\n");}catch(e){out.textContent=e.message;}};
 dialog.querySelector('[data-action="apply"]').onclick=()=>{try{const next=parseDeviceCode(input.value,state);apply(next);Object.assign(state,next);out.textContent="写入成功。设备状态已同步，返回现实层查看。";}catch(e){out.textContent=e.message;}};
 function dismiss(){dialog.close();dialog.remove();close();}
 dialog.querySelector('[data-action="close"]').onclick=dismiss;dialog.oncancel=e=>{e.preventDefault();dismiss();};dialog.showModal();input.focus();
}

