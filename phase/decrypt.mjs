import {initial,rotate,connected,solved,N,E,S,W} from "./circuit.mjs";

export function createLock(seed=Math.floor(Math.random()*3)+1){
 const first=Math.max(1,Math.min(3,seed));
 return {digits:[first,first+3,first+4,first-1],sum:first*2+3};
}
export function mountDecrypt(host,kind,canUse,onComplete){
 host.replaceChildren();
 host.classList.add("decrypt-console");
 let completed=false,submitted=false;
 const intro=document.createElement("p");
 const workspace=document.createElement("div");
 const status=document.createElement("p");
 status.className="decrypt-feedback";status.setAttribute("role","status");
 const command=document.createElement("pre");
 command.className="decrypt-command";command.hidden=true;
 const action=(text,callback)=>{
  const button=document.createElement("button");
  button.type="button";button.textContent=text;
  button.onclick=()=>{if(canUse()&&!submitted)callback();};
  return button;
 };
 host.append(intro,workspace,status,command);
 function finish(result){
  if(completed)return;
  completed=true;
  command.hidden=false;command.textContent="$ "+result;
  status.textContent="授权已恢复。执行命令即可进入下一阶段。";
  workspace.replaceChildren(action("执行已解密命令",()=>{
   if(submitted)return;submitted=true;onComplete(result);
  }));
 }
 if(kind==="intercept"){
  const board=initial();
  intro.textContent="点击管道顺时针旋转 90°，让第二行左侧入口的能量流到右侧出口。亮起的管道代表能量已经到达。";
  const schematic=document.createElement("div");
  schematic.className="pipe-schematic";
  const input=document.createElement("span");input.className="pipe-port inlet";input.textContent="IN →";
  const output=document.createElement("span");output.className="pipe-port outlet";output.textContent="→ OUT";
  const grid=document.createElement("div");grid.className="pipe-grid";
  grid.setAttribute("aria-label","四行四列管道拼图");
  schematic.append(input,grid,output);
  const test=action("测试通路",()=>{
   if(solved(board))finish("phase --attach sector07 --channel=GHOST");
   else status.textContent="出口尚未通电。沿亮起的管道检查下一格，两侧接口必须相接。";
  });
  const reset=action("重置管道",()=>{board.splice(0,board.length,...initial());draw();});
  reset.className="puzzle-reset";
  const buttons=board.map((mask,index)=>{
   const button=action("",()=>{board[index]=rotate(board[index]);draw();});
   button.disabled=!mask;
   button.setAttribute("aria-label","第 "+(Math.floor(index/4)+1)+" 行第 "+(index%4+1)+" 列，旋转管道");
   grid.append(button);return button;
  });
  function draw(){
   const powered=new Set(connected(board));
   board.forEach((mask,index)=>{
    const button=buttons[index];
    button.className=mask?"pipe-cell":"pipe-cell empty";
    button.classList.toggle("powered",powered.has(index));
    let paths="";
    for(const [bit,x,y] of [[N,30,0],[E,60,30],[S,30,60],[W,0,30]])
     if(mask&bit)paths+='<path d="M30 30 L'+x+' '+y+'"/>';
    button.innerHTML='<svg viewBox="0 0 60 60" aria-hidden="true"><g class="pipe-wall">'+paths+'</g><g class="pipe-flow">'+paths+'</g><circle cx="30" cy="30" r="5"/></svg>';
   });
   const complete=solved(board);
   output.classList.toggle("connected",complete);
   test.textContent=complete?"通路已连通 · 生成命令":"测试通路";
   status.textContent=complete?"出口已供电，点击生成命令。":"已供电 "+powered.size+" 段 · 旋转管道连接出口";
  }
  workspace.append(schematic,test,reset);draw();
 }else{
  const lock=createLock(),values=[0,0,0,0];
  intro.textContent="维修员留下了四条线索。拨动四个数字轮，重建 M-09 的授权密码。数字从 0 到 9 循环。";
  const clues=document.createElement("ol");clues.className="lock-clues";
  for(const text of [
   "第一位与第二位相加等于 "+lock.sum+"。",
   "第二位比第一位大 3。",
   "第三位比第二位大 1。",
   "第四位比第一位小 1。"
  ]){const item=document.createElement("li");item.textContent=text;clues.append(item);}
  const wheels=document.createElement("div");wheels.className="lock-wheels";
  values.forEach((_,index)=>{
   const wheel=document.createElement("div");wheel.className="lock-wheel";
   const label=document.createElement("small");label.textContent="0"+(index+1);
   const digit=document.createElement("output");digit.textContent="0";
   digit.setAttribute("aria-label","密码第 "+(index+1)+" 位");digit.setAttribute("aria-live","polite");
   function turn(delta){
    values[index]=(values[index]+delta+10)%10;
    digit.textContent=values[index];
    digit.classList.remove("dial-turn");void digit.offsetWidth;digit.classList.add("dial-turn");
    status.textContent="密码已调整，按解锁验证。";
   }
   const up=action("▲",()=>turn(1)),down=action("▼",()=>turn(-1));
   up.setAttribute("aria-label","增加第 "+(index+1)+" 位");
   down.setAttribute("aria-label","减少第 "+(index+1)+" 位");
   wheel.append(label,up,digit,down);wheels.append(wheel);
  });
  workspace.append(clues,wheels,action("解锁 M-09",()=>{
   const matches=values.filter((value,index)=>value===lock.digits[index]).length;
   if(matches!==4){status.textContent="锁芯未打开 · "+matches+" / 4 位正确。结合前两条线索确定第一位。";return;}
   finish("exec M-09 --access-code="+values.join("")+" --unlock");
  }));
  status.textContent="四个锁轮等待校准。";
 }
}
