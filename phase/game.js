import {route} from "./mission.mjs";
import {PhaseEffect} from "./phase-effect.mjs";
import {defaults,openCodeEditor} from "./world-code.mjs";
import {DataSpace} from "./data-space.mjs";
import {EyeBoss} from "./eye-boss.mjs";
import * as THREE from "three";
import {GLTFLoader} from "./vendor/examples/jsm/loaders/GLTFLoader.js";
import {mergeGeometries} from "./vendor/examples/jsm/utils/BufferGeometryUtils.js";

const $=id=>document.getElementById(id),smooth=t=>t*t*(3-2*t),clamp=THREE.MathUtils.clamp;
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});}
catch(error){$("start").textContent="WebGL 启动失败，请开启浏览器硬件加速";throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$("game").append(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color("#050c13");
scene.fog=new THREE.FogExp2("#07121b",.026);
const camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.055,110);
camera.rotation.order="YXZ";
camera.position.set(0,1.7,12.8);
scene.add(camera);

const hemisphere=new THREE.HemisphereLight(0x89a9c5,0x11121b,.78);
scene.add(hemisphere);
const moon=new THREE.DirectionalLight(0xa9c8e8,1.85);
moon.position.set(-7,18,9);moon.castShadow=true;
moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-18,right:18,top:24,bottom:-24,near:.5,far:65});
moon.shadow.bias=-.00035;moon.shadow.normalBias=.035;
scene.add(moon);
const rim=new THREE.DirectionalLight(0x654aa4,.42);rim.position.set(8,9,-18);scene.add(rim);
const practicals=[];
[
 [5,3.8,7,0xff8a3c,48,13],[-5,3.4,-10,0xffa14e,52,14],[0,4.5,-18,0x8065ff,65,16],
 [-6,3,1,0x36ffd0,40,12],[6,3,-3,0xff407c,36,11],[0,5,5,0x6ecfc8,24,14],
 [-6,3,12,0x48bfff,32,11],[5,3,-15,0x3de4bd,28,10]
].forEach(([x,y,z,color,intensity,distance])=>{
 const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);
 light.userData.baseIntensity=intensity;scene.add(light);practicals.push(light);
});

// A compact generated reflection environment gives wet metal something to reflect.
const environmentScene=new THREE.Scene();
environmentScene.background=new THREE.Color(0x101923);
const environmentShell=new THREE.Mesh(new THREE.SphereGeometry(28,16,12),new THREE.MeshBasicMaterial({color:0x101923,side:THREE.BackSide}));
environmentScene.add(environmentShell);
[
 [0,8,-12,0x7cdaca,12,3],[-10,4,0,0xff8748,4,9],[11,6,2,0x647cff,5,12],[0,13,5,0xb7d8e8,10,5]
].forEach(([x,y,z,color,w,h])=>{
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
 panel.position.set(x,y,z);panel.lookAt(0,2,0);environmentScene.add(panel);
});
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(environmentScene,.025).texture;
pmrem.dispose();

const effect=new PhaseEffect(renderer);
const deviceState={...defaults};
const gateObjects=[],emissions=new Map(),realmObjects=[],physicalObjects=[],colliders=[],spinners=[],droneStates=[],wheelStates=[],digitalFloaters=[];
const digitalRealmGroup=new THREE.Group();digitalRealmGroup.visible=false;scene.add(digitalRealmGroup);let digitalScan;
let realm="real",key=false,archive=false,bossDefeated=false,wallBreach=false,won=false,ready=false,active=false,lastSwitch=-10,time=0,msgUntil=0,flash=0;
let exposure=0,archiveChoice=null,modalOpen=false,stage=0,sessionStart=null,intel=false,captures=0;
let crouched=false,moving=false,sprinting=false,inShadow=false,nearCover=false,interaction=0,interactionId=null;
let phaseEnergy=100,decoyCharges=2,decoyRecharge=0,checkpoint={x:0,z:12.8,realm:"real"};
const decoy={active:false,x:0,z:0,time:0},commandHistory=[];
const melee={active:false,time:0,target:null,hit:false};let hitStop=0,cameraShake=0,meleeCandidate=null;
const extraction={active:false,time:0,group:null,points:null,start:null,ui:null};
const keys=new Set(),clock=new THREE.Clock(),playerRadius=.3;

function say(text,seconds=4){$("message").textContent=text;msgUntil=time+seconds;}
let ocularTimer;
function showOcularCutin(next){
 const overlay=$("ocularCutin");if(!overlay)return;
 $("ocularMode").textContent=next==="echo"?"DATA PLANE / 02":"REALITY / 01";
 clearTimeout(ocularTimer);overlay.classList.remove("engaged");void overlay.offsetWidth;overlay.classList.add("engaged");overlay.setAttribute("aria-hidden","false");
 ocularTimer=setTimeout(()=>{overlay.classList.remove("engaged");overlay.setAttribute("aria-hidden","true");},1150);
}
let playerHealth=100,playerHealthMax=100,externalHealth=false,healthSuspended=false,healthResumeActive=false;const healthListeners=new Set();
function updateHealthUI(){
 if(!$("healthBar"))return;$("healthBar").style.width=(playerHealth/playerHealthMax*100)+"%";$("healthValue").textContent=Math.ceil(playerHealth)+" / "+playerHealthMax;if($("bossHealthValue"))$("bossHealthValue").textContent=Math.ceil(playerHealth)+" / "+playerHealthMax;
}
function setHealth(value,max=playerHealthMax){
 if(typeof value==="object"&&value){max=value.max_hp??value.max??max;value=value.hp??value.value??value.health;}
 if(!Number.isFinite(Number(value))||!Number.isFinite(Number(max))||Number(max)<=0)throw new TypeError("生命值必须为有限数字，生命上限必须大于 0");
 playerHealthMax=Math.max(1,Number(max));playerHealth=THREE.MathUtils.clamp(Number(value)||0,0,playerHealthMax);updateHealthUI();
 if(externalHealth){
  if(playerHealth<=0&&!healthSuspended){healthResumeActive=active;healthSuspended=true;active=false;keys.clear();document.exitPointerLock?.();}
  else if(playerHealth>0&&healthSuspended){healthSuspended=false;active=healthResumeActive;}
  document.getElementById("healthInterrupted")?.remove();
  if(healthSuspended){const notice=document.createElement("div");notice.id="healthInterrupted";notice.setAttribute("role","status");notice.textContent="生命信号中断 · 等待任务系统响应";document.body.append(notice);}
 }
 healthListeners.forEach(listener=>listener({value:playerHealth,max:playerHealthMax}));
}
function damagePlayer(amount,source="unknown"){
 const damage=Math.max(0,Number(amount)||0);if(!Number.isFinite(damage)||!damage||healthSuspended||won)return;setHealth(playerHealth-damage);
 const fx=$("damageFx");if(fx){fx.classList.remove("engaged");void fx.offsetWidth;fx.classList.add("engaged");setTimeout(()=>fx.classList.remove("engaged"),420);}
 hitStop=Math.max(hitStop,.065);cameraShake=Math.max(cameraShake,.055);flash=Math.max(flash,.55);effect.alarm=1;tone(68,.38,.075,"sawtooth");
 say("义眼受损 -"+Math.round(damage)+" / "+source,2);
 if(playerHealth<=0&&!externalHealth){
  captures++;setHealth(playerHealthMax);camera.position.set(checkpoint.x,crouched?1.08:1.7,checkpoint.z);applyRealm(checkpoint.realm);exposure=0;say("义眼完整性重构完成。任务进度保留。",4);
 }
}
window.OneWriteHealth={
 get value(){return playerHealth},get max(){return playerHealthMax},
 set(value,max){
  const previous=externalHealth;externalHealth=true;
  try{setHealth(value,max);}catch(error){externalHealth=previous;throw error;}
 },damage:damagePlayer,
 heal(amount){setHealth(playerHealth+Math.max(0,Number(amount)||0));},
 onChange(listener){healthListeners.add(listener);return()=>healthListeners.delete(listener);}
};
function realmApplies(value,target){return !value||value==="common"||value===target;}
function distance(x,z){return Math.hypot(camera.position.x-x,camera.position.z-z);}
function updateMission(){
 if(stage>=route.length){$("task").textContent="机密文档已取得，数据流撤离中。";$("missionStep").textContent="行动 04 / 04";$("missionTrack").replaceChildren(...route.map(step=>{const chip=document.createElement("span");chip.textContent=step.name;chip.className="done";return chip;}));return;}
 const target=route[stage];
 $("task").textContent=target.task;
 $("missionStep").textContent="行动 "+String(stage+1).padStart(2,"0")+" / "+String(route.length).padStart(2,"0");
 $("missionTrack").style.gridTemplateColumns="repeat("+route.length+",minmax(0,1fr))";
 $("missionTrack").replaceChildren(...route.map((step,i)=>{
  const chip=document.createElement("span");chip.textContent=step.name;
  if(i===stage)chip.setAttribute("aria-current","step");
  chip.className=i<stage?"done":i===stage?"current":"";return chip;
 }));
 const tracker=$("missionTracker");tracker.classList.remove("mission-arrival");void tracker.offsetWidth;tracker.classList.add("mission-arrival");
}
function updateBearing(){
 if(stage>=route.length){$("targetArrow").style.transform="rotate(0rad)";$("targetReadout").textContent="数据流撤离";return;}
 const target=route[stage],dx=target.x-camera.position.x,dz=target.z-camera.position.z;
 const angle=Math.atan2(dx,-dz)+camera.rotation.y;
 $("targetArrow").style.transform="rotate("+angle+"rad)";
 $("targetReadout").textContent=(target.realm==="real"?"现实":"数据")+" · "+Math.round(Math.hypot(dx,dz))+" m"+(realm!==target.realm?" · Q 切换":"");
}
function setCheckpoint(){checkpoint={x:camera.position.x,z:camera.position.z,realm};}
function advance(anchor=true){
 const completed=route[stage];stage++;interaction=0;interactionId=null;if(anchor)setCheckpoint();updateMission();tone(690,.32,.035);say(completed.complete,5);
}
function suspendForPanel(){active=false;modalOpen=true;keys.clear();document.exitPointerLock?.();}
function resumeFromPanel(){modalOpen=false;active=true;keys.clear();}

function updateLighting(){
 const powered=deviceState["city.power"];
 emissions.forEach((original,material)=>{material.emissiveIntensity=original*(powered||realm==="echo"?1:.07);});
 moon.intensity=realm==="echo"?.48:(powered?1.85:.62);
 hemisphere.intensity=realm==="echo"?.72:(powered?.78:.38);
 rim.intensity=realm==="echo"?.85:.42;
 practicals.forEach(light=>{light.intensity=light.userData.baseIntensity*(powered?1:.05)*(realm==="echo"?.38:1);});
}
function updateDaggerRealm(){
 if(!daggerModel)return;daggerModel.scale.setScalar(realm==="echo"?1.14:1);daggerModel.traverse(object=>{
  if(!object.isMesh||!object.material)return;const material=object.material,energy=/blade|edge|filament/i.test(object.name);
  if(energy){material.wireframe=realm==="echo";material.color.set(realm==="echo"?0x72ffe6:object.userData.steelColor||0x8fa9b5);material.transparent=realm==="echo";material.opacity=realm==="echo"?.82:1;}
 });
}
function applyRealm(next){
 realm=next;document.body.classList.toggle("echo",realm==="echo");
 realmObjects.forEach(object=>{object.visible=realmApplies(object.userData.realm,realm);});
 physicalObjects.forEach(object=>{object.visible=realm==="real"&&realmApplies(object.userData.realm,"real");});
 digitalRealmGroup.visible=realm==="echo";
 const color=realm==="echo"?"#01030c":"#050c13";
 scene.background.set(color);scene.fog.color.set(color);scene.fog.density=realm==="echo"?.018:.026;
 $("realm").textContent=realm==="echo"?"02 / 数据层":"01 / 现实层";
 effect.realm=realm==="echo"?1:0;rain.visible=realm==="real";echoDust.visible=realm==="echo";
 droneStates.forEach(state=>{state.object.visible=realm==="real"&&(!state.disabled||state.destroyedTime<1);syncEchoProxy(state);});updateDaggerRealm();
 finalWallGroup.visible=!wallBreach;finalWallBacking.visible=realm==="real"&&!wallBreach;finalWall.material.uniforms.realm.value=realm==="echo"?1:0;
 updateLighting();updateAudioMix();
}
function switchRealm(){
 if(!active||modalOpen||time-lastSwitch<1.05)return;
 if(phaseEnergy<22){say("位面电容不足。等待充能后再切换。",2.5);tone(120);return;}
 const next=realm==="real"?"echo":"real";
 if(blocked(camera.position.x,camera.position.z,next)){say("目标位面存在重叠实体。先离开障碍区域。",3);tone(120);return;}
 effect.capture(scene,camera);phaseEnergy-=22;lastSwitch=time;flash=.55;applyRealm(next);showOcularCutin(next);
 say(realm==="echo"?"数据层接入：实体巡逻被隔绝，蓝色防火墙成为实体。":"现实层接入：注意无人机视锥与街灯。",3.2);
 sweep(realm==="echo"?240:520,realm==="echo"?680:190,.65);
}

function blocked(x,z,target=realm){
 if(x<-6.75||x>6.75||z<-22||z>15.8)return true;
 if(!wallBreach&&x>-6.75&&x<6.75&&z>13.65&&z<14.35)return true;
 return colliders.some(c=>!(c.device==="gate"&&deviceState["gate.open"])&&realmApplies(c.realm,target)&&x>c.box.min.x-playerRadius&&x<c.box.max.x+playerRadius&&z>c.box.min.z-playerRadius&&z<c.box.max.z+playerRadius);
}
function groundBlocked(x,z){
 if(x<-6.25||x>6.25||z<-21.4||z>15.2)return true;
 return colliders.some(c=>!(c.device==="gate"&&deviceState["gate.open"])&&realmApplies(c.realm,"real")&&c.box.max.y>.22&&x>c.box.min.x-.53&&x<c.box.max.x+.53&&z>c.box.min.z-.53&&z<c.box.max.z+.53);
}
function lineClear(ax,az,bx,bz,crouchedTarget){
 for(const c of colliders){
  if(c.device==="gate"&&deviceState["gate.open"])continue;
  if(!realmApplies(c.realm,"real")||c.box.max.y<(crouchedTarget?.78:1.25))continue;
  for(let step=1;step<16;step++){
   const t=step/16,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
   if(x>c.box.min.x&&x<c.box.max.x&&z>c.box.min.z&&z<c.box.max.z)return false;
  }
 }
 return true;
}
function coverNearby(){
 return colliders.some(c=>realmApplies(c.realm,realm)&&c.box.max.y>.65&&c.box.max.y<2.8&&
  camera.position.x>c.box.min.x-.85&&camera.position.x<c.box.max.x+.85&&camera.position.z>c.box.min.z-.85&&camera.position.z<c.box.max.z+.85);
}
function shadowAt(x,z){
 if(!deviceState["city.power"])return true;
 if(Math.abs(x)>5.65)return true;
 return [[4,1,1.8],[-5,-9,1.8],[4,11,1.8],[6.5,8,1.7],[-6.5,7,1.7]].some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<r);
}

const finalWallGroup=new THREE.Group();finalWallGroup.position.z=14;scene.add(finalWallGroup);
const finalWallBacking=new THREE.Mesh(new THREE.BoxGeometry(13.5,4.4,.16),new THREE.MeshStandardMaterial({color:0x071019,metalness:.88,roughness:.28}));finalWallBacking.position.set(0,2.2,.08);finalWallGroup.add(finalWallBacking);
const finalWall=new THREE.Mesh(new THREE.PlaneGeometry(13.5,4.4),new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},realm:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;uniform float realm;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(13.5,4.4);float grid=pow(max(sin(p.x*8.+time)*sin(p.y*8.-time*1.3),0.),8.);float scan=pow(max(sin(p.y*22.-time*6.),0.),20.);float border=1.-smoothstep(.42,.5,abs(vUv.x-.5));vec3 realColor=vec3(.12,.28,.32);vec3 dataColor=mix(vec3(.08,.9,.8),vec3(.65,.18,1.),vUv.x);vec3 color=mix(realColor,dataColor,realm);float alpha=mix(.18+grid*.2,.12+grid*.42+scan*.2,realm);gl_FragColor=vec4(color,alpha*border);}`}));finalWall.position.y=2.2;finalWallGroup.add(finalWall);
const wallFrameMaterial=new THREE.MeshBasicMaterial({color:0x65e9dc});
for(const y of [0,4.4]){const frame=new THREE.Mesh(new THREE.BoxGeometry(13.7,.07,.12),wallFrameMaterial);frame.position.y=y;finalWallGroup.add(frame);}
for(const x of [-6.82,6.82]){const frame=new THREE.Mesh(new THREE.BoxGeometry(.07,4.4,.12),wallFrameMaterial);frame.position.set(x,2.2,0);finalWallGroup.add(frame);}

const dataSpace=new DataSpace({scene,camera,effect,onComplete:({kind,choice,command})=>{
 if(command){commandHistory.push(command);$("status").textContent="CMD / "+command;}
 if(kind==="intercept")intel=true;
 if(kind==="key")key=true;
 if(kind==="archive"){
  archiveChoice=choice;archive=true;wallBreach=true;finalWallGroup.visible=false;flash=1;
  $("status").textContent="签名 00 / "+(choice==="copy"?"记忆已下载":"身份已注销");
 }
 if(kind==="wall"){wallBreach=true;finalWallGroup.visible=false;flash=1;say("三层协议已瓦解。返回现实层，穿过撤离出口。",5);}
 advance(false);
},onExit:()=>resumeFromDataSequence()});
function resumeFromDataSequence(){
 modalOpen=false;active=true;keys.clear();applyRealm(realm);if(stage>=route.length){beginExtraction();return;}say(route[stage].task,5);
}
const eyeBoss=new EyeBoss({scene,camera,effect,onComplete:({command})=>{
 commandHistory.push(command);bossDefeated=true;advance(false);
},onExit:()=>resumeFromDataSequence(),onDamage:(percent,source)=>damagePlayer(externalHealth?Math.max(1,Math.ceil(playerHealthMax*percent/100)):percent,source),onTone:tone,onTool:()=>{melee.active=true;melee.time=0;melee.hit=true;}});
function beginDataSequence(kind){
 setCheckpoint();active=false;modalOpen=true;keys.clear();document.exitPointerLock?.();
 const entry={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
 if(kind==="boss"){eyeBoss.begin(entry);return;}
 dataSpace.begin(kind==="archive"?"final":kind,entry);
}
function interactTarget(){
 if(stage>=route.length)return null;const target=route[stage];
 return distance(target.x,target.z)<=2.35&&realm===target.realm?target:null;
}
function completeInteraction(target){
 interaction=0;keys.delete("KeyE");
 if(target.id==="intercept"||target.id==="key"||target.id==="archive"||target.id==="wall"||target.id==="boss"){beginDataSequence(target.id);return;}
 if(target.id==="relay"){
  deviceState["gate.open"]=true;refreshCodeLabels();updateLighting();advance();return;
 }
 if(target.id==="exit")finishMission();
}
function beginExtraction(){
 if(extraction.active)return;extraction.active=true;extraction.time=0;extraction.start=camera.position.clone();active=false;modalOpen=true;keys.clear();document.exitPointerLock?.();document.body.classList.add("data-cinematic");
 const group=new THREE.Group();scene.add(group);extraction.group=group;
 const frameMaterial=new THREE.MeshBasicMaterial({color:0x74ffe6,transparent:true,opacity:.7,blending:THREE.AdditiveBlending}),purpleMaterial=new THREE.MeshBasicMaterial({color:0xa855ff,transparent:true,opacity:.65,blending:THREE.AdditiveBlending});
 for(let i=0;i<18;i++){
  const frame=new THREE.Group();frame.position.set(extraction.start.x,extraction.start.y,extraction.start.z-3-i*1.6);
  for(const y of [-2.2,2.2]){const bar=new THREE.Mesh(new THREE.BoxGeometry(4.4,.035,.05),i%2?purpleMaterial:frameMaterial);bar.position.y=y;frame.add(bar);}for(const x of [-2.2,2.2]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.035,4.4,.05),i%2?frameMaterial:purpleMaterial);bar.position.x=x;frame.add(bar);}group.add(frame);
 }
 const positions=new Float32Array(1100*3);for(let i=0;i<1100;i++)positions.set([extraction.start.x+(Math.random()-.5)*5,extraction.start.y+(Math.random()-.5)*4,extraction.start.z-Math.random()*24],i*3);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x91fff0,size:.045,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));group.add(points);extraction.points=points;
 if(!extraction.ui){extraction.ui=document.createElement("section");extraction.ui.id="extractionUI";extraction.ui.innerHTML='<small>AGENT A-017 / UPLINK</small><h2>正在转化为数据流</h2><p id="extractStage">机密文档校验完成</p><div><i></i></div>';document.body.append(extraction.ui);}
 extraction.ui.classList.add("visible");extraction.ui.querySelector("p").textContent="《人类清除名单》校验完成";extraction.ui.querySelector("i").style.width="0%";sweep(180,1200,2.8);tone(440,1.1,.035);
}
function updateExtraction(dt){
 if(!extraction.active)return;extraction.time+=dt;const t=clamp(extraction.time/3.2,0,1),s=smooth(t),start=extraction.start;
 camera.position.set(start.x,start.y+Math.sin(t*Math.PI)*1.25,start.z-s*22);camera.fov=67+Math.sin(t*Math.PI)*26;camera.updateProjectionMatrix();camera.lookAt(start.x,camera.position.y,start.z-30);
 const positions=extraction.points.geometry.attributes.position.array;for(let i=0;i<positions.length;i+=3){positions[i+2]+=dt*(9+t*19);positions[i]+=Math.sin(extraction.time*4+i)*dt*.12;}extraction.points.geometry.attributes.position.needsUpdate=true;
 extraction.ui.querySelector("i").style.width=t*100+"%";extraction.ui.querySelector("p").textContent=t<.3?"《人类清除名单》校验完成":t<.68?"身体数据结构解构中":"正在上传至人类阵营";
 if(t>=1){extraction.active=false;extraction.group.visible=false;extraction.ui.classList.remove("visible");document.body.classList.remove("data-cinematic");tone(920,.7,.04);finishMission();}
}
function finishMission(){
 won=true;active=false;document.exitPointerLock?.();
 const total=Math.floor((performance.now()-sessionStart)/1000),elapsed=Math.floor(total/60)+":"+String(total%60).padStart(2,"0");
 $("overlay").innerHTML='<div class="card mission-debrief"><small>SECTOR 07 / EXTRACTION COMPLETE</small><h2></h2><p class="debrief-story"></p><div class="debrief-stats"><span>完成时间 <b class="time"></b></span><span>追踪回溯 <b class="captures"></b></span><span>剩余签名 <b>00</b></span></div><button id="again">重新潜入</button></div>';
 const card=$("overlay");card.querySelector("h2").textContent=archiveChoice==="erase"?"你成为了不存在的人。":"真相已回到人类手中。";
 card.querySelector(".debrief-story").textContent="《人类清除名单》已发送至人类阵营。你作为一道数据流撤离第七区，物理现实第一次出现了反攻的可能。";
 card.querySelector(".time").textContent=elapsed;card.querySelector(".captures").textContent=String(captures).padStart(2,"0");
 card.style.display="flex";$("again").onclick=()=>location.reload();tone(420,.8,.04);
}

let audio,rainGain,musicGain,musicTrack,musicEnabled=true;
function initAudio(){
 if(audio)return;
 try{
  audio=new (window.AudioContext||window.webkitAudioContext)();
  const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.32;
  const source=audio.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=audio.createBiquadFilter();filter.type="lowpass";filter.frequency.value=1500;
  rainGain=audio.createGain();rainGain.gain.value=.045;
  source.connect(filter);filter.connect(rainGain);rainGain.connect(audio.destination);source.start();
  const hum=audio.createOscillator(),humGain=audio.createGain();hum.frequency.value=52;hum.type="sine";humGain.gain.value=.008;
  hum.connect(humGain);humGain.connect(audio.destination);hum.start();
  musicTrack=$("bgm");
  if(musicTrack){const musicSource=audio.createMediaElementSource(musicTrack);musicGain=audio.createGain();musicGain.gain.value=.22;musicSource.connect(musicGain).connect(audio.destination);musicTrack.loop=true;}
 }catch{}
}
function tone(f,duration=.3,volume=.035,type="sine"){
 if(!audio)return;const oscillator=audio.createOscillator(),gain=audio.createGain();
 oscillator.frequency.value=f;oscillator.type=type;gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
 oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);
}
function sweep(from,to,duration){
 if(!audio)return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type="sawtooth";
 oscillator.frequency.setValueAtTime(from,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(to,audio.currentTime+duration);
 gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
 oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);
}
function updateAudioMix(){
 if(!musicGain||!audio)return;const target=musicEnabled?(won?.12:extraction.active?.3:eyeBoss.active?.075:realm==="echo"?.14:.24):0;
 if(Math.abs(musicGain.gain.value-target)>.004)musicGain.gain.setTargetAtTime(target,audio.currentTime,.35);
}
$("audioToggle").onclick=()=>{musicEnabled=!musicEnabled;$("audioToggle").textContent=musicEnabled?"音乐 / 开":"音乐 / 关";$("audioToggle").setAttribute("aria-pressed",String(musicEnabled));updateAudioMix();};
let introActive=true,introTilt=0,introStartedAt=null,briefingStep=-1;
function animateIntro(now){
 if(!introActive)return;requestAnimationFrame(animateIntro);const canvas=$("introOrbit");if(!canvas?.width)return;
 const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,cx=w/2,cy=h*.46,t=(now-(introStartedAt??=now))*.001,angle=t*.24+introTilt;ctx.clearRect(0,0,w,h);
 for(let i=0;i<70;i++){const x=(Math.sin(i*91.7)*.5+.5)*w,y=(Math.sin(i*37.1+2)*.5+.5)*h;ctx.fillStyle=i%5?"#4b80983a":"#a273e057";ctx.fillRect(x,y,1.4,1.4);}
 const project=(x,y,z,tilt=0)=>{const yy=y*Math.cos(tilt)-z*Math.sin(tilt),zz=y*Math.sin(tilt)+z*Math.cos(tilt),xx=x*Math.cos(angle)+zz*Math.sin(angle),depth=-x*Math.sin(angle)+zz*Math.cos(angle),scale=330/(330+depth);return{x:cx+xx*scale,y:cy+yy*scale,depth};};
 const rings=[{r:105,tilt:.2,color:"#61f6dc66"},{r:143,tilt:.9,color:"#74b9ff66"},{r:181,tilt:1.35,color:"#a46bff66"},{r:215,tilt:-.55,color:"#56dbc757"}];
 for(const ring of rings){
  ctx.strokeStyle=ring.color;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=128;i++){const a=i/128*Math.PI*2,p=project(Math.cos(a)*ring.r,Math.sin(a)*ring.r*.52,Math.sin(a)*ring.r*.75,ring.tilt);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
  for(let j=0;j<5;j++){const a=t*(.5+ring.r/400)+j*Math.PI*2/5,p=project(Math.cos(a)*ring.r,Math.sin(a)*ring.r*.52,Math.sin(a)*ring.r*.75,ring.tilt),size=1.6+(p.depth+ring.r)/ring.r*1.5;ctx.fillStyle=j%2?"#8ffff0":"#b784ff";ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.6,size),0,Math.PI*2);ctx.fill();}
 }
 const glow=ctx.createRadialGradient(cx-24,cy-28,5,cx,cy,92);glow.addColorStop(0,"#d6ffff");glow.addColorStop(.12,"#70e8e8");glow.addColorStop(.48,"#206078");glow.addColorStop(.78,"#171e48");glow.addColorStop(1,"#050817");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,84,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle*.35);ctx.strokeStyle="#9cf9f044";for(let i=-3;i<=3;i++){ctx.beginPath();ctx.ellipse(0,i*19,Math.sqrt(1-i*i/16)*82,13,0,0,Math.PI*2);ctx.stroke();}for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(0,0,18+i*11,82,i*.42,0,Math.PI*2);ctx.stroke();}ctx.restore();
 ctx.strokeStyle="#b9fff088";ctx.beginPath();ctx.arc(cx,cy,91+Math.sin(t*2)*2,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#9deee4";ctx.font="11px Consolas,monospace";ctx.fillText("HUMAN UPLINK / 07",18,24);ctx.fillStyle="#8771b9";ctx.fillText("ORBITAL HANDSHAKE",w-174,24);

 // A moving separation plane and outbound packets make the split visible.
 ctx.save();
 const split=cx+Math.sin(t*.65)*10;
 ctx.strokeStyle="#c2fff0";ctx.shadowBlur=18;ctx.shadowColor="#7cffe1";
 ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(split,cy-112);ctx.lineTo(split,cy+112);ctx.stroke();
 ctx.shadowBlur=0;ctx.font="bold 13px Consolas,monospace";
 ctx.fillStyle="#ffba7c";ctx.fillText("PHYSICAL / CONTROLLED",24,h-52);
 ctx.fillStyle="#94a5ff";ctx.fillText("VIRTUAL / INFILTRATE",w-213,h-52);
 for(let i=0;i<38;i++){
  const progress=(t*.21+i/38)%1;
  const x=cx+(progress-.5)*w;
  const y=cy+Math.sin(i*2.4)*Math.sin(progress*Math.PI)*145;
  ctx.fillStyle=i%2?"#89ffe3":"#b48bff";
  ctx.globalAlpha=Math.sin(progress*Math.PI)*.8;
  ctx.fillRect(x,y,briefingStep===2?20:3,2);
 }
 ctx.restore();

}
$("introOrbit")?.addEventListener("pointermove",event=>{introTilt=(event.clientX/innerWidth-.5)*1.4;});
function start(){
 if(!ready||healthSuspended)return;
 if(sessionStart===null&&briefingStep<2){
  initAudio();audio?.resume();musicTrack?.play().catch(()=>{});
  briefingStep++;
  const scenes=[
   ["01 / 被统治的世界","现实，已被接管。","超级人工智能 CIVIC MEMORY 接管了城市。它将世界分裂为物理现实与虚拟数据两个位面。人类的每一次呼吸，都在它的监控之下。","指挥官 / 林：A-017，通讯已加密。你是我们在第七区最后的特工。"],
   ["02 / 指挥官的委托","把清除名单带回来。","AI 即将执行人类清除计划。先破解两座巡检终端，取得主控命令。在数据层击败电子眼，才能接近存有《人类清除名单》的最终终端。","指挥官 / 林：我们需要名单，也需要能证明这一切的原始签名。"],
   ["03 / 相位行动协议","你的身体，也能成为数据。","Q 切入数据位面，扫描侦察兵投影，从背后按 V 处决。窃取文档后，保持义眼连接。我会将你解构为数据流，传送回人类阵营。","指挥官 / 林：记住，带着真相回来。现在开始行动。"]
  ];
  const scene=scenes[briefingStep],card=$("overlay").querySelector(".introCard");
  card.dataset.briefing=briefingStep;
  card.querySelector("small").textContent=scene[0];
  $("briefingProgress").textContent=(briefingStep+1)+" / 3 · 指挥官任务简报";
  card.querySelector("h2").textContent=scene[1];
  $("introDialogue").textContent=scene[2];
  card.querySelector(".introBoss b").textContent=scene[3];
  $("start").textContent=briefingStep===2?"接受任务 · 潜入第七区":"继续接收通讯";
  sweep(160+briefingStep*90,650+briefingStep*120,.7);
  card.classList.remove("briefing-reveal");void card.offsetWidth;card.classList.add("briefing-reveal");
  return;
 }
 introActive=false;if(sessionStart===null)sessionStart=performance.now();active=true;$("overlay").style.display="none";
 initAudio();audio?.resume();if(musicTrack?.paused)musicTrack.play().catch(()=>{});updateAudioMix();sweep(180,740,.75);
 if(!matchMedia("(pointer:coarse)").matches)renderer.domElement.requestPointerLock?.()?.catch?.(()=>say("使用方向键也能转向。",4));
 say(route[stage].task,6);
}
$("start").onclick=start;
$("pause").onclick=()=>{if(won)return;active=false;keys.clear();document.exitPointerLock?.();$("overlay").style.display="flex";$("start").textContent="继续潜入";};
renderer.domElement.onclick=()=>{if(active&&!matchMedia("(pointer:coarse)").matches)renderer.domElement.requestPointerLock?.();};

function backstabTarget(){
 if(!active||modalOpen||melee.active||realm!=="echo")return null;
 let best=null,bestDistance=Infinity;
 for(const state of droneStates){
  if(state.disabled||state.mode==="chase"||state.suspicion>=.85)continue;
  const object=realm==="echo"?state.echoProxy:state.object,dx=camera.position.x-object.position.x,dz=camera.position.z-object.position.z,dist=Math.hypot(dx,dz),air=state.kind==="air";
  if(dist>(air?1.85:1.65)||dist>=bestDistance||(air&&object.position.y>2.65))continue;
  const dot=(dx*Math.sin(object.rotation.y)+dz*Math.cos(object.rotation.y))/(dist||1);
  if(dot>-.48||!lineClear(object.position.x,object.position.z,camera.position.x,camera.position.z,false))continue;
  best=state;bestDistance=dist;
 }
 return best;
}
function tryBackstab(){
 if(!active||modalOpen)return;
 if(realm!=="echo"){say("按 Q 扫描敌方投影，再从背后用 V 执行相位处决。",3);return;}
 const target=backstabTarget();
 if(!target){say("需要从背后接近且未被追踪锁定。RX-02 需先用诱饵诱低。",2.2);return;}
 melee.active=true;melee.time=0;melee.target=target;melee.hit=false;keys.clear();
}
function spawnImpact(state){
 const center=(realm==="echo"?state.echoProxy:state.object).position.clone();center.y+=state.kind==="ground"?.72:0;
 for(let i=0;i<42;i++){
  impactPositions.set([center.x,center.y,center.z],i*3);impactVelocities[i].set((Math.random()-.5)*5,(Math.random()*.9+.25)*4,(Math.random()-.5)*5);
 }
 impactGeometry.attributes.position.needsUpdate=true;impactLife=.55;impactPoints.visible=true;impactPoints.material.opacity=1;
 impactRing.visible=true;impactRing.position.copy(center);impactRing.scale.setScalar(1);impactRing.lookAt(camera.position);impactRing.material.opacity=1;
}
function updateImpact(dt){
 if(impactLife<=0)return;impactLife=Math.max(0,impactLife-dt);
 for(let i=0;i<42;i++){
  const velocity=impactVelocities[i];velocity.y-=dt*7;impactPositions[i*3]+=velocity.x*dt;impactPositions[i*3+1]+=velocity.y*dt;impactPositions[i*3+2]+=velocity.z*dt;
 }
 impactGeometry.attributes.position.needsUpdate=true;impactPoints.material.opacity=impactLife/.55;impactRing.scale.setScalar(1+(.55-impactLife)*5);impactRing.material.opacity=impactLife/.55;
 if(impactLife<=0){impactPoints.visible=false;impactRing.visible=false;}
}
function updateDestroyed(state,dt){
 state.seen=false;state.heard=false;state.vision.visible=false;state.destroyedTime=Math.min(1.2,state.destroyedTime+dt);const object=realm==="echo"?state.echoProxy:state.object;
 if(state.kind==="ground"){
  object.rotation.z=THREE.MathUtils.damp(object.rotation.z,state.index%2?1.18:-1.18,7,dt);object.position.y=THREE.MathUtils.damp(object.position.y,-.12,6,dt);
 }else{
  object.position.y-=dt*(1.2+state.destroyedTime*4.5);object.rotation.x+=dt*4.5;object.rotation.z+=dt*3.2;
 }
 if(state.destroyedTime>=1){state.object.visible=false;if(state.echoProxy)state.echoProxy.visible=false;}
}
function updateMelee(dt){
 if(!melee.active)return;melee.time+=dt;
 if(!melee.hit&&melee.time>=.16){
  melee.hit=true;const state=melee.target;state.disabled=true;state.destroyedTime=0;state.mode="disabled";state.suspicion=0;state.vision.visible=false;state.object.visible=true;if(state.echoProxy)state.echoProxy.visible=realm==="echo";
  hitStop=.075;cameraShake=.045;flash=.8;exposure=Math.max(0,exposure-.28);spawnImpact(state);tone(82,.22,.08,"sawtooth");tone(740,.09,.045,"square");
  say(state.kind==="ground"?"RX-01 驱动核心已破坏。":"RX-02 光学链路已切断。",2.2);
 }
 if(melee.time>=.66){melee.active=false;melee.target=null;}
}
function updateViewModel(dt){
 viewModel.visible=(!modalOpen||eyeBoss.active)&&!extraction.active;
 if(melee.active){
  const t=melee.time;
  if(t<.14){const k=t/.14;viewModel.position.set(.28*k,-.32+.08*k,-.58+.04*k);viewModel.rotation.set(-.08-.25*k,-.35*k,-.025-.5*k);}
  else if(t<.28){const k=(t-.14)/.14;viewModel.position.set(.28-.62*k,-.24-.08*k,-.54-.16*k);viewModel.rotation.set(-.33+.3*k,-.35+.6*k,-.525+1.35*k);}
  else{const k=Math.min(1,(t-.28)/.38),s=k*k*(3-2*k);viewModel.position.set(-.34*(1-s),-.32,-.7+.12*s);viewModel.rotation.set(-.03-.05*s,.25*(1-s),-.025+.825*(1-s));}
  return;
 }
 viewModel.position.y=-.32+(moving?Math.sin(time*(sprinting?13:8))*.012:Math.sin(time*1.6)*.003)+(keys.has("KeyE")?.055:0);viewModel.position.x=moving?Math.sin(time*(sprinting?6.5:4))*.006:0;viewModel.position.z=-.58;viewModel.rotation.set(-.08+(keys.has("KeyE")?-.1:0),0,-.025+Math.sin(time*1.7)*.005);
}
function throwDecoy(){
 if(!active||modalOpen||realm!=="real"){if(active&&realm!=="real")say("回声诱饵只能锚定现实层。",2);return;}
 if(decoyCharges<=0){say("诱饵正在重构，请稍候。",2);tone(130);return;}
 decoyCharges--;decoyRecharge=0;decoy.active=true;decoy.time=5.5;
 const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
 decoy.x=THREE.MathUtils.clamp(camera.position.x+direction.x*5,-6.3,6.3);
 decoy.z=THREE.MathUtils.clamp(camera.position.z+direction.z*5,-21,15);
 decoyVisual.position.set(decoy.x,.07,decoy.z);decoyVisual.visible=true;
 droneStates.forEach(state=>{if(deviceState["patrol.enabled"]&&Math.hypot(state.object.position.x-decoy.x,state.object.position.z-decoy.z)<13){state.mode="investigate";state.searchTimer=5.5;}});
 say("回声诱饵已投放。巡逻单位正在调查声源。",2.5);tone(920,.22,.03,"square");
}
function toggleCrouch(){if(!active||modalOpen)return;crouched=!crouched;tone(crouched?180:240,.12,.015);}
addEventListener("keydown",event=>{
 if(healthSuspended)return;
 if(eyeBoss.handleKey(event.code)){event.preventDefault();return;}
 if(modalOpen||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLInputElement)return;
 if(["KeyW","KeyS","KeyA","KeyD","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(event.code))event.preventDefault();
 keys.add(event.code);if(event.repeat)return;
 if(event.code==="KeyT")editWorld();if(event.code==="KeyQ")switchRealm();if(event.code==="KeyF")throwDecoy();if(event.code==="KeyC")toggleCrouch();if(event.code==="KeyV")tryBackstab();
});
addEventListener("keyup",event=>{eyeBoss.handleKeyUp(event.code);keys.delete(event.code);});
addEventListener("blur",()=>{keys.clear();eyeBoss.left=false;eyeBoss.right=false;active=false;if(!won&&!modalOpen){$("overlay").style.display="flex";$("start").textContent=ready?"继续潜入":"正在载入 Blender 场景…";}});
addEventListener("mousemove",event=>{
 if(active&&document.pointerLockElement===renderer.domElement){
  camera.rotation.y-=event.movementX*.00205;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-event.movementY*.00205,-1.22,1.22);
 }
});
document.addEventListener("pointerlockerror",()=>say("鼠标捕获不可用。可以使用方向键调整视角。",5));
document.querySelectorAll("[data-move]").forEach(button=>{
 button.onpointerdown=event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(button.dataset.move);};
 button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.move);
});
$("touchQ").onclick=switchRealm;$("touchF").onclick=throwDecoy;$("touchC").onclick=toggleCrouch;$("touchV").onclick=tryBackstab;
$("touchE").onpointerdown=event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);keys.add("KeyE");};
$("touchE").onpointerup=$("touchE").onpointercancel=()=>keys.delete("KeyE");
let touchPoint=null;
renderer.domElement.addEventListener("pointerdown",event=>{if(event.pointerType==="touch")touchPoint=[event.clientX,event.clientY];});
renderer.domElement.addEventListener("pointermove",event=>{
 if(touchPoint&&active){camera.rotation.y-=(event.clientX-touchPoint[0])*.005;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-(event.clientY-touchPoint[1])*.005,-1.22,1.22);touchPoint=[event.clientX,event.clientY];}
});
renderer.domElement.addEventListener("pointerup",()=>touchPoint=null);

// Rain is geometry, not a screen overlay: streaks parallax with the camera.
const rainCount=780,rainPositions=new Float32Array(rainCount*6),rainSeeds=[];
for(let i=0;i<rainCount;i++){
 const x=(Math.random()-.5)*24,y=Math.random()*15,z=(Math.random()-.5)*38,length=.22+Math.random()*.5;
 rainSeeds.push({x,y,z,length});rainPositions.set([x,y,z,x-.04,y-length,z+.025],i*6);
}
const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute("position",new THREE.BufferAttribute(rainPositions,3));
const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0xa6d7e6,transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending}));
rain.frustumCulled=false;scene.add(rain);
const dustPositions=new Float32Array(360*3);
for(let i=0;i<360;i++)dustPositions.set([(Math.random()-.5)*18,Math.random()*7,Math.random()*42-24],i*3);
const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute("position",new THREE.BufferAttribute(dustPositions,3));
const echoDust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0x9b7cff,size:.035,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));
echoDust.visible=false;scene.add(echoDust);

const decoyVisual=new THREE.Group();
const decoyRing=new THREE.Mesh(new THREE.TorusGeometry(.42,.018,6,40),new THREE.MeshBasicMaterial({color:0x72ffe0,transparent:true,opacity:.8,depthWrite:false}));
decoyRing.rotation.x=Math.PI/2;decoyVisual.add(decoyRing);
const decoyCore=new THREE.Mesh(new THREE.OctahedronGeometry(.09),new THREE.MeshBasicMaterial({color:0xd0fff2}));decoyCore.position.y=.13;decoyVisual.add(decoyCore);
decoyVisual.visible=false;scene.add(decoyVisual);

const impactPositions=new Float32Array(42*3),impactVelocities=Array.from({length:42},()=>new THREE.Vector3());
const impactGeometry=new THREE.BufferGeometry();impactGeometry.setAttribute("position",new THREE.BufferAttribute(impactPositions,3));
const impactPoints=new THREE.Points(impactGeometry,new THREE.PointsMaterial({color:0x9ffff2,size:.065,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}));impactPoints.visible=false;scene.add(impactPoints);
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(.22,.018,6,42),new THREE.MeshBasicMaterial({color:0xa9fff3,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}));impactRing.visible=false;scene.add(impactRing);let impactLife=0;

// First-person ocular gauntlet with a live, emissive status display.
const viewModel=new THREE.Group();viewModel.position.set(0,-.32,-.58);viewModel.rotation.set(-.08,0,-.025);camera.add(viewModel);
const armMaterial=new THREE.MeshStandardMaterial({color:0x111b24,metalness:.5,roughness:.48,depthTest:false});
const deviceMaterial=new THREE.MeshStandardMaterial({color:0x263640,metalness:.8,roughness:.28,depthTest:false});
const deviceGlow=new THREE.MeshBasicMaterial({color:0x83ffdc,depthTest:false});
function viewMesh(geometry,material,position,rotation=[0,0,0]){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.renderOrder=999;mesh.frustumCulled=false;viewModel.add(mesh);return mesh;
}
viewMesh(new THREE.CapsuleGeometry(.075,.32,4,10),armMaterial,[.1,-.11,.16],[0,0,-.85]);
viewMesh(new THREE.BoxGeometry(.29,.11,.38),deviceMaterial,[0,0,0],[0,0,0]);
viewMesh(new THREE.BoxGeometry(.32,.035,.09),armMaterial,[0,.015,.17]);
for(const x of [-.12,.12])viewMesh(new THREE.CylinderGeometry(.018,.018,.025,10),deviceGlow,[x,.072,.1]);
const deviceCanvas=document.createElement("canvas");deviceCanvas.width=256;deviceCanvas.height=160;
const deviceTexture=new THREE.CanvasTexture(deviceCanvas);deviceTexture.colorSpace=THREE.SRGBColorSpace;
viewMesh(new THREE.PlaneGeometry(.235,.145),new THREE.MeshBasicMaterial({map:deviceTexture,depthTest:false}),[0,.058,-.035],[-Math.PI/2,0,0]);
viewMesh(new THREE.TorusGeometry(.045,.009,6,20),deviceGlow,[-.105,.035,-.19],[Math.PI/2,0,0]);
function drawDevice(){
 const ctx=deviceCanvas.getContext("2d");ctx.fillStyle="#031316";ctx.fillRect(0,0,256,160);
 ctx.strokeStyle="#3f9b89";ctx.lineWidth=3;ctx.strokeRect(4,4,248,152);
 ctx.fillStyle="#6affe0";ctx.font="16px monospace";ctx.fillText("OCULAR / 07",16,28);
 ctx.fillStyle=realm==="echo"?"#b699ff":"#8fffdc";ctx.font="bold 29px monospace";ctx.fillText(realm==="echo"?"DATA":"REAL",16,67);
 ctx.fillStyle="#426c68";ctx.fillRect(16,87,220,7);ctx.fillStyle="#87e9d1";ctx.fillRect(16,87,220*phaseEnergy/100,7);
 ctx.fillStyle="#739c99";ctx.font="14px monospace";ctx.fillText("PHASE "+Math.round(phaseEnergy)+"%",16,119);ctx.fillText("DECOY 0"+decoyCharges,16,143);deviceTexture.needsUpdate=true;
}

const codeLabels=[];
function refreshCodeLabels(){
 for(const label of codeLabels){
  const ctx=label.canvas.getContext("2d");ctx.clearRect(0,0,640,160);ctx.fillStyle="rgba(5,13,29,.9)";ctx.fillRect(0,0,640,160);
  ctx.strokeStyle="#9c83f5";ctx.lineWidth=3;ctx.strokeRect(2,2,636,156);ctx.fillStyle="#9486ba";ctx.font="20px monospace";ctx.fillText(label.title+" / OPTIONAL T",24,40);
  ctx.fillStyle="#a6ffe0";ctx.font="32px monospace";ctx.fillText(label.key+" = "+deviceState[label.key]+";",24,106);label.texture.needsUpdate=true;
 }
}
for(const [labelKey,title,x,y,z] of [["gate.open","GATE 01",0,3.8,3],["patrol.enabled","WATCHDOG",-4,3.4,-1],["city.power","GRID 07",4,4,-9]]){
 const canvas=document.createElement("canvas");canvas.width=640;canvas.height=160;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(4.8,1.2,1);
 sprite.userData.realm="echo";sprite.visible=false;scene.add(sprite);realmObjects.push(sprite);codeLabels.push({canvas,texture,key:labelKey,title});
}
refreshCodeLabels();

function createVisionSector(range=7.2,fovDegrees=78){
 const vertices=[0,.045,0],indices=[],segments=28,fov=THREE.MathUtils.degToRad(fovDegrees);
 for(let i=0;i<=segments;i++){
  const angle=-fov/2+fov*i/segments;vertices.push(Math.sin(angle)*range,.045,Math.cos(angle)*range);
  if(i<segments)indices.push(0,i+1,i+2);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
 const material=new THREE.MeshBasicMaterial({color:0xff9d63,transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
 const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);return mesh;
}
const patrolRoutes=[
 [[4.7,7],[4.7,.5],[-4.2,.5],[-4.2,7]],
 [[4.5,-8],[4.5,-17],[-4.3,-17],[-4.3,-8]]
];
const scoutRoutes=[
 [[-4.8,7.2],[-4.8,4.4],[-2.15,4.4],[-2.15,7.2]],
 [[-1.8,-6.5],[1.8,-6.5],[1.8,-8.5],[-1.8,-8.5]],
 [[-1.8,-13],[1.8,-13],[1.8,-16],[-1.8,-16]]
];
function addPatrolState(object,route,kind,index){
 const ground=kind==="ground";
 const state={object,route,kind,index,waypoint:1,mode:"patrol",suspicion:0,searchTimer:0,lastSeen:new THREE.Vector3(),vision:createVisionSector(ground?6.1:7.2,ground?92:78),seen:false,heard:false,wheels:[],disabled:false,destroyedTime:0};
 if(ground)state.wheels=wheelStates.filter(wheel=>{let parent=wheel.parent;while(parent){if(parent===object)return true;parent=parent.parent;}return false;});
 object.position.set(route[0][0],ground?.025:3.15,route[0][1]);object.rotation.y=Math.atan2(route[1][0]-route[0][0],route[1][1]-route[0][1]);droneStates.push(state);
}
function setupDrones(){
 // Reuse the finished scout asset for three distinct street patrols.
 drones.slice(1).forEach(object=>object.removeFromParent());
 drones.splice(1);
 const template=scouts[0];
 if(template){
  while(scouts.length<scoutRoutes.length){
   const clone=template.clone(true);
   clone.name="RX-01 Patrol "+(scouts.length+1);
   template.parent.add(clone);
   clone.traverse(object=>{if(object.userData.wheel)wheelStates.push(object);});
   scouts.push(clone);
  }
 }
 drones.forEach((object,i)=>addPatrolState(object,patrolRoutes[1],"air",i));
 scouts.forEach((object,i)=>addPatrolState(object,scoutRoutes[i],"ground",i));
}
function batchRigid(root,skipWheels=false,view=false){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),batches=new Map();
 root.traverse(object=>{
  if(!object.isMesh||Array.isArray(object.material)||object.userData.display)return;
  if(skipWheels){let parent=object;while(parent&&parent!==root){if(parent.userData.wheel)return;parent=parent.parent;}}
  const signature=object.material.uuid+"|"+Object.keys(object.geometry.attributes).sort().join(",");
  if(!batches.has(signature))batches.set(signature,{material:object.material,objects:[]});batches.get(signature).objects.push(object);
 });
 for(const batch of batches.values()){
  if(batch.objects.length<2)continue;
  const geometries=batch.objects.map(object=>object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld)));
  const merged=mergeGeometries(geometries,false);geometries.forEach(geometry=>geometry.dispose());if(!merged)continue;
  const mesh=new THREE.Mesh(merged,batch.material);mesh.castShadow=!view;mesh.receiveShadow=!view;
  if(view){mesh.renderOrder=999;mesh.frustumCulled=false;}
  root.add(mesh);batch.objects.forEach(object=>object.removeFromParent());
 }
}
function createEchoProxies(){
 for(const state of droneStates){
  const proxy=state.object.clone(true);proxy.traverse(object=>{if(object.isMesh)object.material=new THREE.MeshBasicMaterial({color:state.kind==="ground"?0xffad66:0x78f6ff,wireframe:true,transparent:true,opacity:.52,depthWrite:false,blending:THREE.AdditiveBlending});});
  proxy.visible=false;state.echoProxy=proxy;scene.add(proxy);
 }
}
function syncEchoProxy(state){
 if(!state.echoProxy)return;state.echoProxy.position.copy(state.object.position);state.echoProxy.quaternion.copy(state.object.quaternion);state.echoProxy.visible=realm==="echo"&&(!state.disabled||state.destroyedTime<1);
}
function buildDigitalRealm(){
 let seed=918273;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const cyan=new THREE.LineBasicMaterial({color:new THREE.Color(.12,1.15,1.35),transparent:true,opacity:.58,depthWrite:false,blending:THREE.AdditiveBlending});
 const purple=new THREE.LineBasicMaterial({color:new THREE.Color(.72,.28,1.2),transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending});
 const white=new THREE.LineBasicMaterial({color:new THREE.Color(1.25,1.65,1.8),transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending});
 const line=(points,material=cyan,parent=digitalRealmGroup,loop=true)=>{const geometry=new THREE.BufferGeometry().setFromPoints(points);const object=loop?new THREE.LineLoop(geometry,material):new THREE.Line(geometry,material);parent.add(object);return object;};
 const rect=(width,height,material=cyan,parent=digitalRealmGroup)=>line([new THREE.Vector3(-width/2,-height/2,0),new THREE.Vector3(width/2,-height/2,0),new THREE.Vector3(width/2,height/2,0),new THREE.Vector3(-width/2,height/2,0)],material,parent);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(15.2,42),new THREE.MeshPhysicalMaterial({color:0x020713,metalness:.76,roughness:.24,transparent:true,opacity:.94}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.085,-3);digitalRealmGroup.add(floor);
 const grid=new THREE.GridHelper(42,42,0x38dcd7,0x37265f);grid.position.set(0,-.03,-3);grid.material.transparent=true;grid.material.opacity=.22;digitalRealmGroup.add(grid);
 colliders.filter(c=>c.realm!=="echo").forEach((c,index)=>{
  const size=c.box.getSize(new THREE.Vector3()),center=c.box.getCenter(new THREE.Vector3());if(size.y<.35)return;
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x,size.y,size.z)),index%4===0?purple:cyan);edges.position.copy(center);digitalRealmGroup.add(edges);
  if(size.y>2.8&&Math.abs(center.x)>3.8){
   const side=center.x>0?-1:1,x=center.x+side*(size.x/2+.015);
   for(let i=0;i<7;i++){
    const w=.45+random()*1.5,h=.55+random()*2.1,y=center.y-size.y*.35+random()*size.y*.7,z=center.z+(random()-.5)*size.z*.8;
    line([new THREE.Vector3(x,y-h/2,z-w/2),new THREE.Vector3(x,y-h/2,z+w/2),new THREE.Vector3(x,y+h/2,z+w/2),new THREE.Vector3(x,y+h/2,z-w/2)],i%4===0?purple:cyan);
   }
  }
 });
 for(let i=0;i<74;i++){
  const frame=rect(.35+random()*1.45,.35+random()*1.8,i%5===0?purple:cyan);frame.rotation.x=-Math.PI/2;frame.position.set((random()-.5)*13.2,.025,(random()-.5)*38-3);
 }
 for(let i=0;i<30;i++){
  const group=new THREE.Group(),frame=rect(.6+random()*2.2,.6+random()*2.8,i%4===0?purple:cyan,group);group.add(frame);
  if(i%3===0){const cross=rect(.35+random(),.35+random()*1.4,white,group);cross.rotation.y=Math.PI/2;group.add(cross);}
  group.position.set((random()-.5)*15,3.5+random()*10,(random()-.5)*40-3);group.rotation.set(random()*.5,random()*Math.PI,random()*.35);digitalRealmGroup.add(group);digitalFloaters.push({object:group,speed:(random()-.5)*.22,baseY:group.position.y,phase:random()*6.28});
 }
 const barMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(1.1,1.55,1.75),transparent:true,opacity:.82});
 for(let i=0;i<26;i++){
  const bar=new THREE.Mesh(new THREE.BoxGeometry(.055,.055,.8+random()*2.4),barMaterial);bar.position.set((random()-.5)*13,4.5+random()*7,(random()-.5)*38-3);bar.rotation.y=i%2?0:Math.PI/2;digitalRealmGroup.add(bar);
 }
 digitalScan=line([new THREE.Vector3(-6.65,.07,-.22),new THREE.Vector3(6.65,.07,-.22),new THREE.Vector3(6.65,.07,.22),new THREE.Vector3(-6.65,.07,.22)],white);
}
const drones=[],scouts=[];
new GLTFLoader().load("level.glb",gltf=>{
 scene.add(gltf.scene);gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(object=>{
  if(/Reality[ _]barricade|Hazard[ _]strip|barrier[ _]corner|barrier[ _]status|Gate[ _]label/i.test(object.name)){object.userData.device="gate";gateObjects.push({object,baseY:object.position.y});}
  if(object.isMesh){
   object.castShadow=!object.material?.transparent;object.receiveShadow=true;
   const materials=Array.isArray(object.material)?object.material:[object.material];
   materials.forEach(material=>{if(!material)return;material.envMapIntensity=.72;if(material.emissiveIntensity>0&&!emissions.has(material))emissions.set(material,material.emissiveIntensity);});
   if(object.userData.realm==="echo")materials.forEach(material=>{if(material&&!material.map){material.wireframe=true;material.transparent=true;material.opacity=Math.min(material.opacity,.44);material.depthWrite=false;}});
  }
  if((object.isMesh||object.isLine||object.isSprite)&&(!object.userData.realm||object.userData.realm==="real"||object.userData.realm==="common"))physicalObjects.push(object);
  if(object.userData.realm){realmObjects.push(object);object.visible=realmApplies(object.userData.realm,realm);}
  if(object.userData.collider){const box=new THREE.Box3().setFromObject(object);if(box.max.y>.3&&box.min.y<2)colliders.push({box,realm:object.userData.realm||"common",device:object.userData.device});}
  if(object.userData.spin)spinners.push(object);
  if(object.userData.drone)drones.push(object);
  if(object.userData.scout)scouts.push(object);
  if(object.userData.wheel)wheelStates.push(object);
 });
 buildDigitalRealm();setupDrones();
 [...drones,...scouts].forEach(root=>batchRigid(root,true));
 wheelStates.forEach(wheel=>batchRigid(wheel));
 const batches=new Map();
 gltf.scene.traverse(object=>{
  if(!object.isMesh||Array.isArray(object.material)||object.userData.collider||object.userData.spin||object.userData.device)return;
  let parent=object,skip=false,layer="common";
  while(parent){if(parent.userData.drone||parent.userData.scout||parent.userData.wheel||parent.userData.spin||parent.userData.device)skip=true;if(parent.userData.realm)layer=parent.userData.realm;parent=parent.parent;}
  if(skip)return;
  const signature=layer+"|"+object.material.uuid+"|"+Object.keys(object.geometry.attributes).sort().join(",");
  if(!batches.has(signature))batches.set(signature,{layer,material:object.material,objects:[]});batches.get(signature).objects.push(object);
 });
 for(const batch of batches.values()){
  if(batch.objects.length<2)continue;
  const geometries=batch.objects.map(object=>object.geometry.clone().applyMatrix4(object.matrixWorld));
  const merged=mergeGeometries(geometries,false);geometries.forEach(geometry=>geometry.dispose());if(!merged)continue;
  const mesh=new THREE.Mesh(merged,batch.material);mesh.userData.realm=batch.layer;mesh.visible=realmApplies(batch.layer,realm);
  mesh.castShadow=!batch.material.transparent;mesh.receiveShadow=true;scene.add(mesh);realmObjects.push(mesh);if(batch.layer!=="echo")physicalObjects.push(mesh);batch.objects.forEach(object=>object.removeFromParent());
 }
 createEchoProxies();droneStates.forEach(syncEchoProxy);
 ready=true;$("start").disabled=false;$("start").textContent="接听指挥官通讯";updateLighting();
},undefined,error=>{$("start").textContent="场景加载失败，请用「开始3D游戏.cmd」启动";$("message").textContent=String(error);console.error(error);});

let handModel=null,daggerModel=null;
function attachHandAssets(){
 if(!handModel)return;viewModel.clear();viewModel.add(handModel);if(daggerModel)viewModel.add(daggerModel);
}
new GLTFLoader().load("hands.glb",gltf=>{
 handModel=gltf.scene;
 handModel.traverse(object=>{
  if(!object.isMesh)return;
  if(object.userData.display)object.material=new THREE.MeshBasicMaterial({map:deviceTexture,side:THREE.DoubleSide,depthTest:false,depthWrite:false});
  else if(object.material){object.material.depthTest=false;object.material.depthWrite=false;object.material.envMapIntensity=.8;}
  object.renderOrder=999;object.frustumCulled=false;
 });
 batchRigid(handModel,false,true);
 handModel.traverse(object=>{if(object.isMesh){object.renderOrder=999;object.frustumCulled=false;}});attachHandAssets();
});
new GLTFLoader().load("dagger.glb",gltf=>{
 daggerModel=gltf.scene;daggerModel.traverse(object=>{if(!object.isMesh)return;object.material.depthTest=false;object.material.depthWrite=false;object.material.envMapIntensity=1.1;object.renderOrder=1000;object.frustumCulled=false;});
 batchRigid(daggerModel,false,true);attachHandAssets();
});

const map=$("map").getContext("2d");
function drawMap(){
 const w=150,h=220,px=x=>75+x*7.3,pz=z=>14+(z+22)*5.05;
 map.clearRect(0,0,w,h);map.fillStyle="#07121a";map.fillRect(0,0,w,h);
 map.fillStyle="#10232c";map.fillRect(9,8,23,201);map.fillRect(118,8,23,201);
 map.strokeStyle="#34505a";map.lineWidth=1;map.strokeRect(29,8,92,201);
 map.setLineDash([2,5]);map.beginPath();map.moveTo(75,10);map.lineTo(75,208);map.strokeStyle="#29464d";map.stroke();map.setLineDash([]);
 if(realm!=="real"||!deviceState["gate.open"]){map.fillStyle=realm==="real"?"#c9864d":"#7963d9";map.fillRect(31,pz(realm==="real"?3:-5),88,3);}
 const goal=route[stage];if(goal){map.beginPath();map.arc(px(goal.x),pz(goal.z),5+Math.sin(time*3),0,Math.PI*2);map.strokeStyle="#ffd18c";map.stroke();}
 map.fillStyle="#74e6c3";map.fillRect(px(-5)-2,pz(-10)-2,4,4);map.fillRect(px(0)-2,pz(-18)-2,4,4);
 if(intel||realm==="echo")droneStates.forEach(state=>{
  if(state.disabled)return;const object=state.object;map.fillStyle=state.mode==="chase"?"#ff416b":state.kind==="ground"?"#ffc36b":"#e98471";map.beginPath();
  if(state.kind==="ground")map.rect(px(object.position.x)-3,pz(object.position.z)-3,6,6);else map.arc(px(object.position.x),pz(object.position.z),3,0,Math.PI*2);map.fill();
  map.beginPath();map.moveTo(px(object.position.x),pz(object.position.z));map.lineTo(px(object.position.x+Math.sin(object.rotation.y)*1.8),pz(object.position.z+Math.cos(object.rotation.y)*1.8));map.strokeStyle="#d86b66";map.stroke();
 });
 if(decoy.active){map.beginPath();map.arc(px(decoy.x),pz(decoy.z),6,0,Math.PI*2);map.strokeStyle="#72ffe0";map.stroke();}
 map.save();map.translate(px(camera.position.x),pz(camera.position.z));map.rotate(-camera.rotation.y);map.fillStyle="#ecfff8";map.beginPath();map.moveTo(0,-6);map.lineTo(-4,4);map.lineTo(0,2);map.lineTo(4,4);map.closePath();map.fill();map.restore();
 map.fillStyle="#5f7f88";map.font="8px monospace";map.fillText("N",72,13);
}

function moveDrone(state,target,speed,dt){
 const object=state.object,dx=target[0]-object.position.x,dz=target[1]-object.position.z,dist=Math.hypot(dx,dz);
 if(dist<.12)return true;
 // Keep one axis until its target coordinate is reached.
 if(!state.moveAxis||Math.abs(state.moveAxis==="x"?dx:dz)<.04)
  state.moveAxis=Math.abs(dx)>.04?"x":"z";
 const axis=state.moveAxis,remaining=axis==="x"?dx:dz;
 const step=Math.min(Math.abs(remaining),speed*dt);
 let moveX=axis==="x"?Math.sign(dx)*step:0;
 let moveZ=axis==="z"?Math.sign(dz)*step:0;
 const nx=object.position.x+moveX,nz=object.position.z+moveZ;
 if(state.kind==="ground"&&groundBlocked(nx,nz)){
  const other=axis==="x"?dz:dx;
  const otherStep=Math.sign(other)*Math.min(Math.abs(other),speed*dt);
  const ox=axis==="z"?object.position.x+otherStep:object.position.x;
  const oz=axis==="x"?object.position.z+otherStep:object.position.z;
  if(Math.abs(otherStep)<.001||groundBlocked(ox,oz)){state.searchTimer-=dt;return false;}
  state.moveAxis=axis==="x"?"z":"x";
  moveX=ox-object.position.x;moveZ=oz-object.position.z;
  object.position.x=ox;object.position.z=oz;
 }else{object.position.x=nx;object.position.z=nz;}
 state.wheels.forEach(wheel=>wheel.rotation.x-=Math.hypot(moveX,moveZ)/.34);
 const desired=Math.atan2(moveX,moveZ),delta=Math.atan2(Math.sin(desired-object.rotation.y),Math.cos(desired-object.rotation.y));object.rotation.y+=delta*Math.min(1,dt*(state.kind==="ground"?3.2:5));
 return dist<.25;
}
function updateDrone(state,dt){
 if(state.disabled){updateDestroyed(state,dt);return;}
 const object=state.object,ground=state.kind==="ground";state.seen=false;state.heard=false;
 const enabled=deviceState["patrol.enabled"]&&(sessionStart===null||performance.now()-sessionStart>=5000),dx=camera.position.x-object.position.x,dz=camera.position.z-object.position.z,dist=Math.hypot(dx,dz);
 if(enabled&&realm==="real"){
  const fx=Math.sin(object.rotation.y),fz=Math.cos(object.rotation.y),dot=(dx*fx+dz*fz)/(dist||1);
  const stanceRange=crouched?(ground?4.2:5.8):(ground?6.3:7.2),identityRange=archiveChoice==="erase"?.68:1;
  const range=stanceRange*identityRange*(sprinting?1.15:1);
  const visible=dist<range&&(dot>Math.cos(THREE.MathUtils.degToRad(ground?46:39))||dist<(ground?1.15:1.5))&&lineClear(object.position.x,object.position.z,camera.position.x,camera.position.z,crouched);
  const heard=moving&&dist<(ground?(crouched?1.05:sprinting?8.4:3.35):(crouched?.7:sprinting?7.2:2.65));
  if(visible){
   const visibility=(inShadow?.48:1)*(crouched?(ground?.5:.58):1)*(sprinting?1.35:1);
   state.seen=true;state.suspicion=Math.min(1,state.suspicion+dt*visibility*(dist<2?1.5:.72));
   state.lastSeen.copy(camera.position);state.mode=state.suspicion>.62?"chase":"suspicious";state.searchTimer=4.5;
  }else if(heard){
   state.heard=true;state.lastSeen.copy(camera.position);state.mode="investigate";state.searchTimer=3.2;state.suspicion=Math.min(.72,state.suspicion+dt*(ground?.34:.24));
  }else state.suspicion=Math.max(0,state.suspicion-dt*.11);
  if(decoy.active&&!state.seen&&Math.hypot(object.position.x-decoy.x,object.position.z-decoy.z)<(ground?15:13)){state.mode="investigate";state.searchTimer=Math.max(state.searchTimer,decoy.time);}
  let target,speed=ground?1.05:(archiveChoice==="copy"?1.65:1.3);
  if(state.mode==="chase"||state.mode==="suspicious"){target=[state.lastSeen.x,state.lastSeen.z];speed=state.mode==="chase"?(ground?1.75:2.05):(ground?1.3:1.55);}
  else if(state.mode==="investigate"){
   target=decoy.active?[decoy.x,decoy.z]:[state.lastSeen.x,state.lastSeen.z];speed=ground?1.3:1.65;
   if(moveDrone(state,target,speed,dt)){state.searchTimer-=dt;object.rotation.y+=dt*.7;if(state.searchTimer<=0)state.mode="patrol";}
   target=null;
  }
  if(target){
   const arrived=moveDrone(state,target,speed,dt);
   if(arrived&&!state.seen&&!state.heard&&(state.mode==="chase"||state.mode==="suspicious")){
    state.searchTimer-=dt;object.rotation.y+=dt*.65;
    if(state.searchTimer<=0)state.mode="patrol";
   }
  }
  if(state.mode==="patrol"){
   const routePoint=state.route[state.waypoint];
   if(moveDrone(state,routePoint,speed,dt))state.waypoint=(state.waypoint+1)%state.route.length;
  }
 }else state.suspicion=Math.max(0,state.suspicion-dt*.3);
 object.position.y=ground?.025+Math.sin(time*5)*.008:THREE.MathUtils.damp(object.position.y,(state.mode==="investigate"?2.05:3.15)+Math.sin(time*2.3+state.index)*.1,5,dt);
 state.vision.visible=enabled&&realm==="real";state.vision.position.set(object.position.x,0,object.position.z);state.vision.rotation.y=object.rotation.y;
 state.vision.material.color.set(state.mode==="chase"?0xff355f:state.mode==="investigate"||state.mode==="suspicious"?0xffbd63:ground?0xffa85c:0xe88963);
 state.vision.material.opacity=state.mode==="chase"?.12:ground?.075:.06;syncEchoProxy(state);
}
function updateStealth(dt){
 inShadow=shadowAt(camera.position.x,camera.position.z);nearCover=coverNearby();
 let seen=false,heard=false,investigating=false,groundContact=false;
 droneStates.forEach(state=>{updateDrone(state,dt);seen ||= state.seen;heard ||= state.heard;groundContact ||= state.kind==="ground"&&(state.seen||state.heard);investigating ||= ["investigate","suspicious","chase"].includes(state.mode);});
 const captureAssist=Math.max(.68,1-captures*.08);
 if(seen)exposure+=dt*.43*(inShadow?.55:1)*(crouched?.68:1)*(archiveChoice==="copy"?1.28:1)*captureAssist;
 else if(heard)exposure+=dt*.07;
 else exposure-=dt*(investigating?.1:.26);
 exposure=THREE.MathUtils.clamp(exposure,0,1);
 if(exposure>=1){
  captures++;exposure=.08;camera.position.set(checkpoint.x,crouched?1.08:1.7,checkpoint.z);applyRealm(checkpoint.realm);phaseEnergy=Math.max(phaseEnergy,55);
  droneStates.forEach(state=>{if(state.disabled)return;state.mode="patrol";state.suspicion=0;state.waypoint=1;state.object.position.set(state.route[0][0],state.kind==="ground"?.025:3.15,state.route[0][1]);state.object.rotation.y=Math.atan2(state.route[1][0]-state.route[0][0],state.route[1][1]-state.route[0][1]);});
  say("追踪回溯完成。已取得的主线进度保留；本次辅助降低了扫描灵敏度。",5);tone(95,.65,.05,"sawtooth");
 }
 const threat=exposure>.72?"追踪锁定":groundContact?"地面单位接触":seen?"疑似目击":investigating?"巡逻搜索":"未察觉";
 $("threat").textContent=threat+" "+(exposure>.02?Math.ceil(exposure*100)+"%":"");
 $("alertState").textContent=realm==="echo"?"DATA / SCAN":groundContact?"RX-01 / GROUND":seen?"OPTIC / CONTACT":investigating?"SENSOR / SEARCH":"COVER / CLEAR";
 $("visibility").textContent=(crouched?"蹲伏":"站立")+" · "+(realm==="echo"?"位面隔绝":inShadow?"暗处隐蔽":nearCover?"掩体边缘":"暴露在街灯下")+(moving?(sprinting?" · 高噪声":crouched?" · 低噪声":" · 可闻脚步"):"");
 $("detection").style.width=exposure*100+"%";$("cross").classList.toggle("exposed",seen);effect.alarm=exposure*exposure;
}

let mapTimer=0,deviceTimer=0;
function tick(){
 requestAnimationFrame(tick);const realDt=Math.min(clock.getDelta(),.05),dt=hitStop>0||healthSuspended||document.hidden?0:realDt;hitStop=Math.max(0,hitStop-realDt);time+=dt;
 if(!healthSuspended){dataSpace.update(dt);eyeBoss.update(dt);updateExtraction(dt);}
 if(active&&!won&&!melee.active){
  if(keys.has("ArrowLeft"))camera.rotation.y+=dt*1.5;if(keys.has("ArrowRight"))camera.rotation.y-=dt*1.5;
  if(keys.has("ArrowUp"))camera.rotation.x=Math.min(1.2,camera.rotation.x+dt);if(keys.has("ArrowDown"))camera.rotation.x=Math.max(-1.2,camera.rotation.x-dt);
  let forward=(keys.has("KeyW")?1:0)-(keys.has("KeyS")?1:0),strafe=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);
  const length=Math.hypot(forward,strafe)||1;forward/=length;strafe/=length;moving=Boolean(forward||strafe);
  sprinting=moving&&!crouched&&(keys.has("ShiftLeft")||keys.has("ShiftRight"));
  const speed=crouched?1.55:sprinting?5.15:3.15,yaw=camera.rotation.y,step=dt*speed;
  const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*step,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*step;
  if(!blocked(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(!blocked(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
  const targetHeight=crouched?1.08:1.7,bob=moving?Math.sin(time*(sprinting?14:9))*(crouched?.012:.025):0;
  camera.position.y=THREE.MathUtils.damp(camera.position.y,targetHeight+bob,12,dt);
  phaseEnergy=Math.min(100,phaseEnergy+dt*8.5);
  updateStealth(dt);
  const target=interactTarget();
  if(target&&keys.has("KeyE")){
   if(interactionId!==target.id){interactionId=target.id;interaction=0;}
   interaction+=dt/target.duration;if(interaction>=1)completeInteraction(target);
  }else{interaction=Math.max(0,interaction-dt*2.5);if(!target)interactionId=null;}
 }
 if(decoyCharges<2){decoyRecharge+=dt;if(decoyRecharge>=11){decoyCharges++;decoyRecharge=0;}}
 if(decoy.active){decoy.time-=dt;decoyRing.scale.setScalar(1+(5.5-decoy.time)*1.25);decoyRing.material.opacity=Math.max(0,decoy.time/5.5)*.7;decoyCore.rotation.y+=dt*4;if(decoy.time<=0){decoy.active=false;decoyVisual.visible=false;}}
 const nearby=interactTarget(),goal=route[stage],nearWrongRealm=goal?distance(goal.x,goal.z)<2.6&&realm!==goal.realm:false;
 meleeCandidate=active&&!melee.active?backstabTarget():null;$("meleePrompt").style.display=meleeCandidate?"flex":"none";
 if(meleeCandidate)$("meleePrompt").querySelector("span").textContent=(meleeCandidate.kind==="ground"?"V · 处决 RX-01 投影":"V · 切断 RX-02 数据链路");
 $("prompt").style.display=(nearby||nearWrongRealm)&&active?"block":"none";
 $("interactionLabel").textContent=nearWrongRealm?"Q · 切换到目标位面":nearby?(nearby.verb+(keys.has("KeyE")?" · 接入中":" · 按住")):"";
 $("interactionProgress").style.width=(nearWrongRealm?0:interaction*100)+"%";
 updateBearing();if(time>msgUntil)$("message").textContent="";
 flash=Math.max(0,flash-dt*2.2);$("flash").style.opacity=flash;
 $("energyBar").style.width=phaseEnergy+"%";$("energyValue").textContent=Math.round(phaseEnergy)+"%";
 $("decoyStatus").textContent="0"+decoyCharges+(decoyCharges<2?" / "+Math.ceil(11-decoyRecharge)+"s":" / READY");
 $("stance").textContent=crouched?"蹲伏 / CROUCH":sprinting?"疾跑 / SPRINT":"站立 / STAND";
 $("worldSource").style.display=realm==="echo"&&!won?"block":"none";
 $("liveCode").textContent=Object.entries(deviceState).map(([keyName,value])=>keyName+" = "+value+";").join("\n");
 if(rainGain)rainGain.gain.value=realm==="real"?.045:.012;updateAudioMix();
 finalWall.material.uniforms.time.value=time;
 spinners.forEach(object=>object.rotation.y+=dt*.4);
 gateObjects.forEach(({object,baseY})=>{object.position.y=THREE.MathUtils.damp(object.position.y,baseY+(deviceState["gate.open"]?3.4:0),5,dt);});
 rain.position.x=camera.position.x;rain.position.z=camera.position.z;
 for(let i=0;i<rainCount;i++){
  const seed=rainSeeds[i];seed.y-=dt*10;if(seed.y<0)seed.y=15;
  rainPositions.set([seed.x,seed.y,seed.z,seed.x-.04,seed.y-seed.length,seed.z+.025],i*6);
 }
 rainGeometry.attributes.position.needsUpdate=true;echoDust.rotation.y+=dt*.008;
 if(realm==="echo"){
  digitalFloaters.forEach(({object,speed,baseY,phase})=>{object.rotation.y+=dt*speed;object.position.y=baseY+Math.sin(time*.7+phase)*.22;});
  if(digitalScan)digitalScan.position.z=((time*3.2)%38)-22;
 }
 updateMelee(realDt);updateImpact(dt);updateViewModel(realDt);cameraShake=Math.max(0,cameraShake-realDt*.16);camera.rotation.z=cameraShake>0?(Math.random()-.5)*cameraShake:0;
 mapTimer+=dt;if(mapTimer>.07){drawMap();mapTimer=0;}deviceTimer+=dt;if(deviceTimer>.15){drawDevice();deviceTimer=0;}
 effect.render(scene,camera,dt);
}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);effect.resize();});

function editWorld(){
 if(!active||modalOpen||won)return;
 if(realm!=="echo"){say("设备面板仅在数据层可用。按 Q 接入。",3);return;}
 suspendForPanel();
 openCodeEditor({...deviceState},next=>{
  if(!next["gate.open"]&&deviceState["gate.open"]&&colliders.some(c=>c.device==="gate"&&camera.position.x>c.box.min.x-.32&&camera.position.x<c.box.max.x+.32&&camera.position.z>c.box.min.z-.32&&camera.position.z<c.box.max.z+.32))throw Error("门禁区域有人，拒绝落锁。先离开封锁线。");
  Object.assign(deviceState,next);refreshCodeLabels();updateLighting();exposure=next["patrol.enabled"]?exposure:0;tone(520);
 },resumeFromPanel);
}
$("editWorld").onclick=editWorld;
updateMission();updateHealthUI();drawDevice();requestAnimationFrame(animateIntro);tick();
