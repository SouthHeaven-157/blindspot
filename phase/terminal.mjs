import {initial,owner,turn,connected,solved,N,E,S,W} from "./circuit.mjs";
let board=initial();
export function openCircuit(getRealm,switchLayer,onClose,onSuccess){
 const dialog=document.createElement("dialog");dialog.className="hack-dialog";
 dialog.innerHTML='<small>MAINTENANCE / SPLIT CIRCUIT</small><h2>接通另一边的自己。</h2><p>把左侧 IN 接到右侧 OUT。点击接口旋转。<br>青色接口属于现实，紫色接口属于数据层。两层共用这张线路图。</p><div class="circuit-layout"><span>IN →</span><div class="circuit-grid"></div><span>→ OUT</span></div><p class="circuit-status"></p><div class="hack-actions"><button class="phase-switch"></button><button class="test-circuit">测试线路</button><button class="leave">离开终端</button></div>';
 document.body.append(dialog);dialog.showModal();
 function close(){dialog.close();dialog.remove();onClose();}
 function draw(){const reachable=connected(board),realm=getRealm(),grid=dialog.querySelector(".circuit-grid");grid.replaceChildren();
 board.forEach((mask,i)=>{
 const b=document.createElement("button");b.disabled=owner[i]!==realm||!mask;b.className=owner[i]+(reachable.includes(i)?" powered":"");b.setAttribute("aria-label","接口 "+(i+1)+" "+(owner[i]==="real"?"现实":"数据"));
 let lines="";for(const [bit,x,y] of [[N,30,0],[E,60,30],[S,30,60],[W,0,30]])if(mask&bit)lines+='<line x1="30" y1="30" x2="'+x+'" y2="'+y+'"/>';
 b.innerHTML='<svg viewBox="0 0 60 60">'+lines+'<circle cx="30" cy="30" r="4"/></svg>';
 b.onclick=()=>{turn(board,i,realm);draw();};grid.append(b);
 });dialog.querySelector(".phase-switch").textContent=realm==="real"?"切换到数据层":"切换到现实层";dialog.querySelector(".circuit-status").textContent=solved(board)?"线路已贯通。执行测试可提取维护密钥。":"已供电接口 "+reachable.length+" / 两个位面共同构成一条线路";
 }
 dialog.querySelector(".phase-switch").onclick=()=>{switchLayer();draw();};
 dialog.querySelector(".test-circuit").onclick=()=>{if(solved(board)){close();onSuccess();}else dialog.querySelector(".circuit-status").textContent="测试失败，电流未到达 OUT。测试不会消耗签名机会。";};
 dialog.querySelector(".leave").onclick=close;dialog.addEventListener("cancel",e=>{e.preventDefault();close();});draw();
}
export function chooseArchive(onChoice,onClose){
 const d=document.createElement("dialog");d.className="hack-dialog";d.innerHTML='<small>ONE SIGNATURE / TWO CONSEQUENCES</small><h2>你要带走什么？</h2><p>一枚签名只能提交一种请求。确认后无法更换。</p><button data-choice="copy"><b>带走记忆</b><span>取回完整档案。系统留下追踪记录，无人机巡逻加速。</span></button><button data-choice="erase"><b>注销身份</b><span>只保留身份注销凭证。城市停止识别你，但你的过去仍封存在档案局。</span></button><button class="leave">暂不提交</button>';
 document.body.append(d);d.showModal();
 function close(){d.close();d.remove();onClose();}
 d.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{const choice=b.dataset.choice;close();onChoice(choice);});
 d.querySelector(".leave").onclick=close;d.addEventListener("cancel",e=>{e.preventDefault();close();});
}

