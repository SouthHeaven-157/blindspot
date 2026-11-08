import {mountDecrypt} from "./decrypt.mjs";
import * as THREE from "three";

const clamp=THREE.MathUtils.clamp;
const smooth=t=>t*t*(3-2*t);
const records=[
 {title:"01 / 事发现场",code:"INCIDENT_07.LOG",body:"02:13:44　街区电力先于档案接驳上线。\n02:13:45　维护端口出现一次合法写入。\n02:13:47　身份 A-017 被标记为已注销。\n\n现场记录没有删除，只是被转移到了另一位面。"},
 {title:"02 / 身份档案",code:"IDENTITY_A-017",body:"姓名：［已遮蔽］\n权限：市政记忆维护 / 三级\n状态：待一次性签名\n\nCIVIC MEMORY 将所有拒绝意识上传的人类列为待清除对象。你的任务是带走原始名单及签名证据。"},
 {title:"03 / 签名权限",code:"ONE_WRITE.KEY",body:"签名剩余：01\n回滚：不可用\n复制：下载完整档案，提升追踪热度。\n目标文件：HUMAN_PURGE。完成下载后，人类阵营将开启数据流接收通道。\n\n确认后，记录将写入你的义眼。"}
];

function neonMaterial(color,intensity=2.5){
 return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,metalness:.35,roughness:.25});
}
function box(parent,size,position,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);parent.add(mesh);return mesh;
}
function screenTexture(title,lines,color="#83ffe1"){
 const canvas=document.createElement("canvas");canvas.width=768;canvas.height=384;const ctx=canvas.getContext("2d");
 ctx.fillStyle="rgba(2,12,23,.88)";ctx.fillRect(0,0,768,384);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(8,8,752,368);
 ctx.fillStyle=color;ctx.font="24px monospace";ctx.fillText(title,35,55);ctx.fillStyle="#426c78";ctx.fillRect(35,78,695,2);
 ctx.font="20px monospace";lines.forEach((line,i)=>{ctx.fillStyle=i===0?color:"#8baab7";ctx.fillText(line,35,125+i*42);});
 for(let i=0;i<16;i++){ctx.fillStyle=i%3?"#173b46":color;ctx.fillRect(35+i*43,325,28,5+Math.sin(i)*3);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export class DataSpace{
 constructor({scene,camera,effect,onComplete,onExit}){
  this.scene=scene;this.camera=camera;this.effect=effect;this.onComplete=onComplete;this.onExit=onExit;
  this.active=false;this.phase="idle";this.time=0;this.actionTime=-1;this.kind="intercept";this.wallLayer=0;this.wallClock=0;this.wallChannel=0;this.wallOpen=false;this.wallButtons=[];this.group=new THREE.Group();this.group.position.z=-60;this.group.visible=false;scene.add(this.group);
  this.tunnel=new THREE.Group();this.tunnel.visible=false;scene.add(this.tunnel);
  this.core=new THREE.Group();this.core.position.y=2.25;this.group.add(this.core);this.cabinets=[];this.shields=[];this.makeEnvironment();this.makeCore();this.makeTunnel();this.makeUI();
 }
 makeEnvironment(){
  const cyan=neonMaterial(0x38e8e0,2.8),purple=neonMaterial(0x9b4dff,3),metal=new THREE.MeshStandardMaterial({color:0x101c29,metalness:.85,roughness:.26});
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.75,.28,64),new THREE.MeshPhysicalMaterial({color:0x07121f,metalness:.88,roughness:.16,clearcoat:1,clearcoatRoughness:.12}));floor.position.y=-.16;this.group.add(floor);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(4.42,.035,8,96),cyan);ring.rotation.x=Math.PI/2;ring.position.y=.02;this.group.add(ring);
  const grid=new THREE.GridHelper(42,42,0x386c88,0x241d49);grid.material.transparent=true;grid.material.opacity=.28;grid.position.y=-.28;this.group.add(grid);
  for(const side of [-1,1])for(let row=0;row<3;row++){
   const cabinet=new THREE.Group();cabinet.position.set(side*(4.5+row*.5),1.65,-row*2.15);cabinet.rotation.y=side*-.2;this.group.add(cabinet);this.cabinets.push(cabinet);
   box(cabinet,[1.6,3.3,1.05],[0,0,0],metal);
   for(let tray=0;tray<8;tray++){
    box(cabinet,[1.38,.31,.08],[0,-1.3+tray*.37,.56],new THREE.MeshStandardMaterial({color:0x172d3b,metalness:.7,roughness:.36}));
    box(cabinet,[.5,.025,.035],[0,-1.3+tray*.37,.62],tray%3===0?purple:cyan);
    box(cabinet,[.13,.045,.04],[-.54,-1.22+tray*.37,.62],tray%3===0?purple:cyan);
   }
  }
  const screens=[
   {p:[-3.8,3.6,1.3],r:.38,t:"ARCHIVE / INDEX",l:["A-017  MEMORY RECORD","INTEGRITY   98.07%","SIGNATURE  PENDING","PHASE LINK STABLE"]},
   {p:[3.8,3.6,1.3],r:-.38,t:"SECURITY / TRACE",l:["WATCHDOG  DISCONNECTED","VOLUME     ENCRYPTED","ONE WRITE  ARMED","EGRESS     AVAILABLE"]}
  ];
  screens.forEach((data,index)=>{
   const material=new THREE.MeshBasicMaterial({map:screenTexture(data.t,data.l,index?"#c58aff":"#83ffe1"),transparent:true,opacity:.82,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
   const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.9,1.45),material);screen.position.set(...data.p);screen.rotation.y=data.r;this.group.add(screen);
   const frame=new THREE.Mesh(new THREE.BoxGeometry(3.02,1.57,.035),new THREE.MeshBasicMaterial({color:index?0x7035aa:0x277d80,wireframe:true,transparent:true,opacity:.6}));frame.position.copy(screen.position);frame.rotation.copy(screen.rotation);this.group.add(frame);
  });
  const starPositions=new Float32Array(700*3);for(let i=0;i<700;i++)starPositions.set([(Math.random()-.5)*50,Math.random()*20-3,(Math.random()-.5)*50],i*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(starPositions,3));
  this.stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x7c9cff,size:.035,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.stars);
  [[0,5,4,0x33e5dd,75],[5,3,2,0xb148ff,65],[-5,2,0,0x368cff,50]].forEach(([x,y,z,color,intensity])=>{const light=new THREE.PointLight(color,intensity,20,2);light.position.set(x,y,z);this.group.add(light);});
 }
 makeCore(){
  const glass=new THREE.MeshPhysicalMaterial({color:0x7bcbd2,metalness:.12,roughness:.06,transmission:.72,thickness:1.1,transparent:true,opacity:.82,clearcoat:1,envMapIntensity:1.8,emissive:0x101d3d,emissiveIntensity:.6});
  const shell=new THREE.Mesh(new THREE.BoxGeometry(2.85,2.85,2.85,3,3,3),glass);this.core.add(shell);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry),new THREE.LineBasicMaterial({color:0x8ffff0,transparent:true,opacity:.95}));this.core.add(edges);
  this.inner=new THREE.Mesh(new THREE.OctahedronGeometry(1.12,1),neonMaterial(0x924cff,2.2));this.core.add(this.inner);
  const innerWire=new THREE.Mesh(new THREE.IcosahedronGeometry(1.65,1),new THREE.MeshBasicMaterial({color:0x65e7ff,wireframe:true,transparent:true,opacity:.32}));this.core.add(innerWire);this.innerWire=innerWire;
  this.orbits=[];
  [[2.25,0x55ffe2,.25,.4],[2.65,0xa55bff,1.15,-.3],[3.05,0x4d8cff,.7,1.2]].forEach(([radius,color,x,z])=>{
   const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.022,6,128),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));ring.rotation.set(x,0,z);this.core.add(ring);this.orbits.push(ring);
  });
  this.shards=[];
  for(let i=0;i<14;i++){
   const shard=new THREE.Mesh(new THREE.BoxGeometry(.18+.12*Math.random(),.18+.3*Math.random(),.1),neonMaterial(i%2?0x3fffe0:0xab55ff,1.8));
   shard.userData={angle:i/14*Math.PI*2,radius:3.1+Math.random()*.8,height:(Math.random()-.5)*3};this.core.add(shard);this.shards.push(shard);
  }
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.045,.22,8,16,1,true),new THREE.MeshBasicMaterial({color:0x6ae5ff,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.position.y=3.5;this.core.add(beam);
  for(let i=0;i<3;i++){
   const shield=new THREE.Mesh(new THREE.BoxGeometry(3.35+i*.42,3.35+i*.42,3.35+i*.42),new THREE.MeshBasicMaterial({color:i===1?0xaa63ff:0x5fffe4,wireframe:true,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}));shield.visible=false;this.core.add(shield);this.shields.push(shield);
  }
 }
 makeTunnel(){
  const cyan=neonMaterial(0x35f4e4,3.2),purple=neonMaterial(0xa44dff,3.4);
  for(let i=0;i<13;i++){
   const frame=new THREE.Group();frame.position.set(0,2.3,-24-i*2.75);const width=8.8,height=6.2;
   box(frame,[width,.055,.07],[0,height/2,0],i%2?purple:cyan);box(frame,[width,.055,.07],[0,-height/2,0],i%2?cyan:purple);
   box(frame,[.055,height,.07],[width/2,0,0],i%2?purple:cyan);box(frame,[.055,height,.07],[-width/2,0,0],i%2?cyan:purple);
   this.tunnel.add(frame);
  }
  this.firewall=new THREE.Mesh(new THREE.PlaneGeometry(11,8),new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(11.,8.);float grid=pow(max(sin(p.x*7.+time*2.)*sin(p.y*7.-time),0.),10.);float scan=pow(max(sin(p.y*16.-time*7.),0.),18.);float edge=pow(1.-abs(vUv.x-.5)*2.,.3)*pow(1.-abs(vUv.y-.5)*2.,.3);vec3 color=mix(vec3(.05,.8,1.),vec3(.65,.1,1.),vUv.x+sin(time)*.1);gl_FragColor=vec4(color,(grid*.3+scan*.22+.035)*edge);}`}));this.firewall.position.set(0,2.3,-23.8);this.tunnel.add(this.firewall);
  const positions=new Float32Array(1000*3);for(let i=0;i<1000;i++)positions.set([(Math.random()-.5)*9,Math.random()*7-1,-24-Math.random()*36],i*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
  this.flow=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x8d9fff,size:.055,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));this.tunnel.add(this.flow);
 }
 makeUI(){
  this.ui=document.createElement("section");this.ui.id="dataUI";this.ui.innerHTML=`
   <div class="cinemaBars"><i></i><i></i></div><div class="breachLabel"><small>OCULAR / EVENT DRIVEN CAMERA</small><b id="shotLabel">FIREWALL APPROACH</b><span id="shotTime">SHOT 01 · 00:00</span></div>
   <div class="dataTop"><span><i></i> PRIVATE DATA SPACE / 07</span><b id="dataConnection">TUNNELING...</b></div>
   <div class="dataLayout"><aside class="dataPanel dataPrimary"><small id="dataKicker">ENCRYPTED VOLUME</small><h2 id="dataTitle">正在建立连接</h2><div class="dataRule"></div><p id="dataDescription">镜头正在穿过防火墙。</p><div id="recordViewer"><div class="recordTabs"></div><pre class="recordContent"></pre></div><div class="terminalReadout"><span>INJECTION VECTOR</span><b>OCULAR / ZERO_DAY</b><div class="waveform">${"<i></i>".repeat(28)}</div></div><div class="dataProgress"><i></i></div><pre class="dataLog">[00] 等待进入数据空间…</pre></aside>
   <div class="coreCaption"><small>LIVE 3D OBJECT</small><b>A-017 / MEMORY CORE</b><span>旋转数据核心 · 量子签名锁定</span></div>
   <aside class="dataPanel dataSecondary"><small>VOLUME METADATA</small><dl><div><dt>加密协议</dt><dd>AES / ONE_WRITE</dd></div><div><dt>数据完整度</dt><dd>98.07%</dd></div><div><dt>物理层</dt><dd>SECTOR 07</dd></div><div><dt>剩余签名</dt><dd>01</dd></div></dl><div class="volumeMap"><i></i><i></i><i></i><i></i><span>3D VOLUME<br>6 ARCHIVE CABINETS</span></div><div class="dataActions"></div></aside></div>
   <div class="dataFooter"><span>DRAG / 观察数据核心</span><span>REAL-TIME GEOMETRY + HOLOGRAPHIC UI</span></div>`;
  document.body.append(this.ui);
  this.ui.addEventListener("pointerdown",event=>{if(this.phase==="inspect"&&!event.target.closest("button,.dataPanel")){this.dragX=event.clientX;this.dragging=true;this.ui.setPointerCapture?.(event.pointerId);}});
  this.ui.addEventListener("pointermove",event=>{if(this.dragging){this.coreOffset=(this.coreOffset||0)+(event.clientX-this.dragX)*.004;this.dragX=event.clientX;}});
  this.ui.addEventListener("pointerup",()=>this.dragging=false);
 }
 populate(){
  const archive=this.kind==="archive",wall=this.kind==="wall",terminal=this.kind==="key"?"维护密钥终端":"巡逻轮换终端";
  this.ui.classList.toggle("wall-mode",wall);
  this.ui.querySelector("#dataKicker").textContent=wall?"TERMINAL FIREWALL / THREE LAYERS":archive?"ONE WRITE / ARCHIVE VIEWER":"ZERO DAY / HACKER TERMINAL";
  this.ui.querySelector("#dataTitle").textContent=wall?"终端数据墙 / 03":archive?"机密档案 / HUMAN PURGE":terminal;
  this.ui.querySelector("#dataDescription").textContent=wall?"三条协议通道轮流开放。在亮起时点击对应通道，逐层瓦解防火墙。":archive?"立体档案柜已联机。查看三份记录，然后提交唯一签名。":this.kind==="intercept"?"核心投影给出 B → C → A。按顺序写入数据片段，生成连接命令。":"校验式为 5A XOR 69。计算结果并选择有效的 M-09 执行命令。";
  this.ui.querySelector("#recordViewer").style.display=archive?"block":"none";this.ui.querySelector(".terminalReadout").style.display=archive?"none":"block";
  this.ui.querySelector(".terminalReadout>span").textContent=wall?"FIREWALL / OPEN CHANNEL":"INJECTION VECTOR";
  this.ui.querySelector(".terminalReadout>b").textContent=wall?"等待漏洞窗口":this.kind==="intercept"?"SEQUENCE / B-C-A":this.kind==="key"?"5A XOR 69 = ??":"OCULAR / ZERO_DAY";
  this.ui.querySelector(".coreCaption b").textContent=wall?"TERMINAL FIREWALL":"A-017 / MEMORY CORE";
  this.ui.querySelector(".coreCaption span").textContent=wall?"三层协议护盾 · 观察开放通道":"旋转数据核心 · 量子签名锁定";
  const tabs=this.ui.querySelector(".recordTabs");tabs.replaceChildren();
  if(archive)records.forEach((record,index)=>{const button=document.createElement("button");button.textContent=record.title;button.onclick=()=>this.selectRecord(index);tabs.append(button);});
  this.selectRecord(0);
  const actions=this.ui.querySelector(".dataActions");actions.replaceChildren();actions.classList.remove("decrypt-console");this.wallButtons=[];
  this.shields.forEach(shield=>shield.visible=wall);this.orbits.forEach(ring=>ring.visible=true);
  if(wall){
   ["缓存通道","索引通道","签名通道"].forEach((title,index)=>this.addChannel(index,title));
  }else if(archive){
   this.addAction("copy","窃取《人类清除名单》","提交唯一签名 · 下载完成后启动数据流撤离");
  }else if(this.kind==="intercept"){
   this.mountDecryption(actions);
  }else if(this.kind==="key"){
   this.mountDecryption(actions);
  }else this.addAction("hack","执行零日注入","OCULAR PAYLOAD / 约 2 秒");
  this.ui.querySelector(".dataLog").textContent=wall?"[01] 数据墙已接入。\n[02] 等待第一条开放通道。":"[01] 数据空间已稳定。\n[02] 立体档案索引加载完成。";
 }
 selectRecord(index){
  const record=records[index];this.ui.querySelector(".recordContent").textContent=record.code+"\n\n"+record.body;
  this.ui.querySelectorAll(".recordTabs button").forEach((button,i)=>button.classList.toggle("selected",i===index));
  this.cabinets.forEach((cabinet,i)=>cabinet.scale.setScalar(i%3===index?1.04:1));
 }
 addAction(value,title,subtitle){
  const button=document.createElement("button");button.dataset.action=value;button.innerHTML="<b></b><span></span>";button.querySelector("b").textContent=title;button.querySelector("span").textContent=subtitle;
  button.onclick=()=>this.beginAction(value);this.ui.querySelector(".dataActions").append(button);
 }
 mountDecryption(actions){
  this.ui.querySelector("#dataDescription").textContent=this.kind==="intercept"?"旋转管道，接通能源入口与授权出口。":"根据维修记录拨动数字锁，恢复 M-09 的执行权限。";
  this.ui.querySelector(".terminalReadout>b").textContent=this.kind==="intercept"?"PIPE ROUTING / POWER FLOW":"COMBINATION LOCK / FOUR DIGITS";
  mountDecrypt(actions,this.kind,()=>this.phase==="inspect",command=>{
   this.command=command;this.beginAction("decoded");
  });
 }
 addChannel(index,title){
  const button=document.createElement("button");button.dataset.channel=index;button.innerHTML="<b></b><span></span>";button.querySelector("b").textContent=String.fromCharCode(65+index)+" / "+title;button.querySelector("span").textContent="等待协议状态";
  button.onclick=()=>this.injectChannel(index);this.ui.querySelector(".dataActions").append(button);this.wallButtons.push(button);
 }
 injectChannel(index){
  if(this.kind!=="wall"||this.phase!=="inspect")return;
  if(index!==this.wallChannel||!this.wallOpen){
   this.ui.querySelector(".dataLog").textContent="[拒绝] 该通道当前封闭。\n保持连接，等待它亮起。";return;
  }
  this.phase="inject";this.actionTime=0;this.actionStep=0;this.choice="breach";
  this.wallButtons.forEach(button=>button.disabled=true);this.ui.querySelector("#dataConnection").textContent="UPLOAD / CHANNEL "+String.fromCharCode(65+index);
  this.ui.querySelector(".dataLog").textContent="[03] 开放窗口已锁定。\n正在瓦解第 "+(this.wallLayer+1)+" 层协议…";
 }
 updateWall(dt){
  if(this.phase==="inspect"){
   this.wallClock+=dt;const cycle=this.wallClock%1.8;this.wallChannel=Math.floor(this.wallClock/1.8)%3;this.wallOpen=cycle<1.15;
   this.wallButtons.forEach((button,index)=>{const open=index===this.wallChannel&&this.wallOpen;button.classList.toggle("vulnerable",open);button.querySelector("span").textContent=index===this.wallChannel?(open?"OPEN / 点击注入":"RECALIBRATING / 校准中"):"封闭";});
   this.ui.querySelector("#dataConnection").textContent="LAYER 0"+(this.wallLayer+1)+" / 03 · "+(this.wallOpen?"WINDOW OPEN":"RECALIBRATING");
   this.ui.querySelector(".terminalReadout>b").textContent="CHANNEL "+String.fromCharCode(65+this.wallChannel)+" / "+(this.wallOpen?"可注入":"封锁");
  }else if(this.phase==="inject"){
   this.actionTime+=dt;const progress=clamp(this.actionTime/.85,0,1);this.ui.querySelector(".dataProgress i").style.width=(this.wallLayer+progress)/3*100+"%";
   if(progress>=1){
    this.shields[this.wallLayer].visible=false;this.orbits[this.wallLayer].visible=false;this.wallLayer++;
    if(this.wallLayer>=3){
     this.ui.querySelector(".dataProgress i").style.width="100%";
     if(this.finalTerminal){
      this.finalTerminal=false;this.kind="archive";this.phase="inspect";this.actionTime=-1;this.populate();this.ui.querySelector("#dataConnection").textContent="ARCHIVE UNLOCKED / DOCUMENT READY";this.ui.querySelector(".dataLog").textContent="$ unlock /vault/A-017\n[06] 《人类清除名单》已解除封装。";return;
     }
     this.finishAction();return;
    }
    this.phase="inspect";this.actionTime=-1;this.wallClock+=1.07;this.wallButtons.forEach(button=>button.disabled=false);
    this.ui.querySelector(".dataLog").textContent="[04] 第 "+this.wallLayer+" 层协议已瓦解。\n下一层防护正在校准。";
   }
  }
 }
 begin(kind,entry){
  this.active=true;this.finalTerminal=kind==="final";if(this.finalTerminal)kind="wall";this.kind=kind;this.phase="approach";this.time=0;this.actionTime=-1;this.wallLayer=0;this.wallClock=0;this.wallChannel=0;this.wallOpen=false;this.puzzleProgress=0;this.command="";this.entry=entry;this.coreOffset=0;this.group.visible=true;this.tunnel.visible=true;this.populate();
  this.ui.classList.add("visible","cinematic");this.ui.classList.remove("inspect");document.body.classList.add("data-cinematic");
  this.camera.fov=67;this.camera.updateProjectionMatrix();this.effect.progress=0;this.effect.realm=1;
  this.ui.querySelector("#dataConnection").textContent="TUNNELING...";this.ui.querySelector(".dataProgress i").style.width="0%";
 }
 beginAction(choice){
  if(this.phase!=="inspect"||this.kind==="wall"||(this.kind==="archive"&&choice!=="copy"))return;this.phase="inject";this.actionTime=0;this.actionStep=0;this.choice=choice;if(this.kind==="archive")this.command="download /vault/A-017 --document=HUMAN_PURGE";
  this.ui.querySelectorAll("button").forEach(button=>button.disabled=true);this.ui.querySelector("#dataConnection").textContent="WRITING / DO NOT DISCONNECT";
  this.ui.querySelector(".dataLog").textContent=(this.command?"$ "+this.command+"\n":"")+"[03] 命令校验通过，载荷进入数据核心…";
 }
 finishAction(){
  this.onComplete({kind:this.kind,choice:this.choice,command:this.command});this.phase="return";this.time=0;this.returnPosition=this.camera.position.clone();this.returnQuaternion=this.camera.quaternion.clone();
  this.returnPath=new THREE.CatmullRomCurve3([this.returnPosition.clone(),new THREE.Vector3(0,2.3,-43),new THREE.Vector3(0,2.1,-26),this.entry.position.clone()]);
  this.ui.classList.remove("inspect");this.ui.classList.add("cinematic");this.ui.querySelector("#dataConnection").textContent="UPLINK COMPLETE";
  this.effect.progress=0;
 }
 update(dt){
  if(!this.active)return false;this.time+=dt;this.firewall.material.uniforms.time.value+=dt;
  this.core.rotation.y+=dt*.24;this.inner.rotation.x-=dt*.5;this.inner.rotation.y+=dt*.8;this.innerWire.rotation.y-=dt*.22;
  this.orbits.forEach((ring,i)=>{ring.rotation.z+=dt*(i%2?.16:-.12);ring.rotation.y+=dt*.08;});
  this.shields.forEach((shield,i)=>{shield.rotation.x+=dt*(i%2?.11:-.08);shield.rotation.y-=dt*(.12+i*.04);});
  this.shards.forEach((shard,i)=>{const angle=shard.userData.angle+this.time*.16*(i%2?1:-1);shard.position.set(Math.cos(angle)*shard.userData.radius,shard.userData.height+Math.sin(this.time+i)*.15,Math.sin(angle)*shard.userData.radius);shard.rotation.set(angle,angle*.7,angle*.3);});
  this.stars.rotation.y+=dt*.008;
  const positions=this.flow.geometry.attributes.position.array;
  for(let i=0;i<positions.length;i+=3){positions[i+2]+=dt*(this.phase==="return"?-11:11);if(positions[i+2]>-22)positions[i+2]=-60;if(positions[i+2]<-61)positions[i+2]=-23;}
  this.flow.geometry.attributes.position.needsUpdate=true;
  const shot=this.ui.querySelector("#shotLabel"),shotTime=this.ui.querySelector("#shotTime");shotTime.textContent="SHOT 01 · 00:"+String(Math.floor(this.time)).padStart(2,"0");
  if(this.phase==="approach"||this.phase==="tunnel"){
   const approach=clamp(this.time/1.35,0,1),travel=clamp((this.time-1.35)/2.65,0,1);
   if(this.time<1.35){
    this.camera.position.lerpVectors(this.entry.position,new THREE.Vector3(0,2.25,-22),smooth(approach));shot.textContent="FIREWALL APPROACH";
   }else{
    this.phase="tunnel";const z=THREE.MathUtils.lerp(-22,-53,smooth(travel));this.camera.position.set(Math.sin(travel*Math.PI*2)*.45,2.3+Math.sin(travel*Math.PI)*.4,z);this.camera.fov=67+Math.sin(travel*Math.PI)*18;this.camera.updateProjectionMatrix();shot.textContent="PARTICLE STREAM / BREACH";
   }
   this.camera.lookAt(0,2.25,-60);
   if(this.time>=4){this.phase="arrive";this.time=0;this.arrivePosition=this.camera.position.clone();this.effect.progress=0;}
  }else if(this.phase==="arrive"){
   const t=clamp(this.time/1.35,0,1),target=new THREE.Vector3(4.8,3.35,-52.6);this.camera.position.lerpVectors(this.arrivePosition,target,smooth(t));this.camera.lookAt(0,2.25,-60);this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,61,smooth(t));this.camera.updateProjectionMatrix();shot.textContent="DATA CORE REVEAL";
   if(t>=1){this.phase="inspect";this.time=0;this.ui.classList.add("inspect");this.ui.classList.remove("cinematic");this.ui.querySelector("#dataConnection").textContent="SECURE LINK / STABLE";}
  }else if(this.phase==="inspect"||this.phase==="inject"){
   const angle=.55+(this.coreOffset||0)+Math.sin(this.time*.22)*.035;this.camera.position.set(Math.sin(angle)*8.3,3.25+Math.sin(this.time*.35)*.08,-60+Math.cos(angle)*8.3);this.camera.lookAt(0,2.25,-60);
   if(this.kind==="wall")this.updateWall(dt);
   else if(this.phase==="inject"){
    this.actionTime+=dt;const progress=clamp(this.actionTime/2.1,0,1);this.ui.querySelector(".dataProgress i").style.width=progress*100+"%";
    if(progress>.32&&this.actionStep<1){this.actionStep=1;this.ui.querySelector(".dataLog").textContent+=" \n[04] 防火墙规则已重写。";}
    if(progress>.7&&this.actionStep<2){this.actionStep=2;this.ui.querySelector(".dataLog").textContent+="\n[05] 一次性签名正在写入义眼。";}
    if(progress>=1){this.actionStep=0;this.finishAction();}
   }
  }else if(this.phase==="return"){
   const t=clamp(this.time/3,0,1);this.camera.position.copy(this.returnPath.getPoint(smooth(t)));this.camera.lookAt(t<.72?new THREE.Vector3(0,2.2,-60):this.entry.position.clone().add(new THREE.Vector3(0,0,-3)));
   this.camera.fov=67+Math.sin(t*Math.PI)*12;this.camera.updateProjectionMatrix();shot.textContent=t<.7?"RETURN / PARTICLE STREAM":"RESTORING OCULAR CONTROL";
   if(t>=1){
    this.camera.position.copy(this.entry.position);this.camera.quaternion.copy(this.entry.quaternion);this.camera.fov=this.entry.fov;this.camera.updateProjectionMatrix();
    this.active=false;this.phase="idle";this.group.visible=false;this.tunnel.visible=false;this.ui.classList.remove("visible","cinematic","inspect","wall-mode");document.body.classList.remove("data-cinematic");this.onExit();
   }
  }
  return true;
 }
}
