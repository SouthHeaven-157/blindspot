export function validatePackets(order,packets){
 let port="BOOT";
 for(const id of order){
  const packet=packets.find(item=>item.id===id);
  if(!packet||packet.from!==port)return false;
  port=packet.to;
 }
 return order.length===packets.length&&new Set(order).size===packets.length&&port==="ROOT";
}
export function challengeChecksum(nonce,mask,rotation){
 const value=nonce^mask;
 return ((value<<rotation)|(value>>(8-rotation)))&255;
}
const hex=value=>value.toString(16).toUpperCase().padStart(2,"0");
export function mountDecrypt(host,kind,canUse,onComplete){
 host.replaceChildren();
 host.classList.add("decrypt-console");
 const status=document.createElement("p");
 status.className="decrypt-feedback";status.setAttribute("role","status");
 const command=document.createElement("pre");
 command.className="decrypt-command";
 const action=(label,callback)=>{
  const button=document.createElement("button");button.textContent=label;
  button.onclick=()=>{if(canUse())callback();};return button;
 };
 const intro=document.createElement("p");
 const workspace=document.createElement("div");
 host.append(intro,workspace,status,command);
 function finish(result){
  command.textContent="$ "+result;
  status.textContent="载荷已验证。检查命令后提交至设备。";
  workspace.replaceChildren(action("执行已解密命令",()=>onComplete(result)));
 }
 if(kind==="intercept"){
  const packets=[
   {id:"D",from:"BOOT",to:"CLK",data:"J"},
   {id:"A",from:"CACHE",to:"AUTH",data:"R"},
   {id:"F",from:"LINK",to:"ROOT",data:"V"},
   {id:"B",from:"CLK",to:"CACHE",data:"K"},
   {id:"C",from:"AUTH",to:"MEM",data:"V"},
   {id:"E",from:"MEM",to:"LINK",data:"W"}
  ];
  const order=[];
  intro.textContent="巡检记录被拆成六个包。从 BOOT 出发，让每个包的 OUT 接到下一个包的 IN，最终抵达 ROOT。连接完成后，解出被偏移的信道名。";
  const bank=document.createElement("div"),slots=document.createElement("div");
  bank.className="packet-bank";slots.className="packet-slots";
  const verify=action("校验链路",()=>{
   if(!validatePackets(order,packets)){status.textContent="链路中断。检查相邻包的 OUT 与 IN，点击已排入的包可撤回。";return;}
   const cipher=order.map(id=>packets.find(p=>p.id===id).data).join("");
   workspace.replaceChildren();
   const clue=document.createElement("p");
   clue.textContent="已恢复密文 "+cipher+"。维护日志：写入时每个字母向后偏移 3 位，Z 后回到 A。逆转偏移以恢复六字母信道。";
   const input=document.createElement("input");
   input.placeholder="输入信道名";input.setAttribute("aria-label","解密后的信道名");input.autocomplete="off";
   workspace.append(clue,input,action("验证信道",()=>{
    if(input.value.trim().toUpperCase()!=="GHOSTS"){status.textContent="信道签名不匹配。按连接顺序读取载荷，再逐字母向前移动 3 位。";return;}
    finish("phase --attach sector07 --channel=GHOSTS");
   }));
   status.textContent="物理链路成立，等待信道授权。";
  });
  function draw(){
   bank.replaceChildren();slots.replaceChildren();
   for(const p of packets){
    const button=action(p.id+"  "+p.from+" → "+p.to+"  ["+p.data+"]",()=>{order.push(p.id);status.textContent="";draw();});
    button.disabled=order.includes(p.id);bank.append(button);
   }
   order.forEach((id,index)=>slots.append(action((index+1)+" · "+id,()=>{order.splice(index,1);draw();})));
   verify.disabled=order.length!==packets.length;
  }
  workspace.append(bank,slots,verify);draw();
 }else{
  const nonce=0x40+Math.floor(Math.random()*128),mask=0x69,rotation=2;
  const bits=Array(8).fill(0);
  intro.textContent="M-09 每次生成新的挑战码。先逐位 XOR，再按维护协议循环左移两位，最后提交十六进制签名。相同位 XOR 得 0，不同位得 1。";
  const readout=document.createElement("pre");
  readout.className="decrypt-command";
  readout.textContent="挑战  "+nonce.toString(2).padStart(8,"0")+"  (0x"+hex(nonce)+")\n掩码  "+mask.toString(2).padStart(8,"0")+"  (0x69)\n操作  XOR → ROL 2 → HEX";
  const row=document.createElement("div");row.className="bit-row";
  const buttons=bits.map((_,index)=>{
   const button=action("0",()=>{bits[index]^=1;button.textContent=bits[index];button.setAttribute("aria-pressed",String(Boolean(bits[index])));});
   button.setAttribute("aria-label","结果第 "+(index+1)+" 位");button.setAttribute("aria-pressed","false");row.append(button);return button;
  });
  const test=action("检测 XOR 总线",()=>{
   if(parseInt(bits.join(""),2)!==(nonce^mask)){status.textContent="总线校验失败。逐列比较挑战码和掩码，只在两位不同时置 1。";return;}
   const input=document.createElement("input");
   input.placeholder="0x??";input.setAttribute("aria-label","循环移位后的十六进制校验值");input.autocomplete="off";
   const clue=document.createElement("p");
   clue.textContent="XOR 总线已锁定。将最左两位移到最右，再把两个四位组转换成十六进制。参考 0000=0，1001=9，1010=A，1111=F。";
   buttons.forEach(button=>button.disabled=true);test.disabled=true;
   workspace.append(clue,input,action("验证执行签名",()=>{
    const value=input.value.trim().replace(/^0x/i,"");
    if(!/^[0-9a-f]{2}$/i.test(value)||parseInt(value,16)!==challengeChecksum(nonce,mask,rotation)){status.textContent="签名无效。循环左移会把移出的位接到右端，结果仍为 8 位。";return;}
    finish("exec M-09 --nonce=0x"+hex(nonce)+" --checksum=0x"+hex(challengeChecksum(nonce,mask,rotation)));
   }));
   status.textContent="第一层校验通过，进入签名转换。";
  });
  workspace.append(readout,row,test);
 }
}
