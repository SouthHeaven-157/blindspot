import * as THREE from "three";

const clamp=THREE.MathUtils.clamp;
const smooth=t=>t*t*(3-2*t);

export class EyeBoss{
 constructor({scene,camera,effect,onComplete,onExit,onDamage,onTone,onTool}){
  this.scene=scene;this.camera=camera;this.effect=effect;this.onComplete=onComplete;this.onExit=onExit;this.onDamage=onDamage;this.onTone=onTone;this.onTool=onTool;
  this.active=false;this.phase="idle";this.health=3;this.hits=0;this.playerX=0;this.left=false;this.right=false;this.cooldown=0;this.group=new THREE.Group();this.group.position.z=-60;this.group.visible=false;scene.add(this.group);
  this.makeArena();this.makeEye();this.makeEffects();this.makeUI();
 }
 makeArena(){
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(7.2,7.5,.24,64),new THREE.MeshPhysicalMaterial({color:0x050b17,metalness:.85,roughness:.2,clearcoat:1}));platform.position.y=-.15;this.group.add(platform);
  const grid=new THREE.GridHelper(18,18,0x396cff,0x193743);grid.material.transparent=true;grid.material.opacity=.28;grid.position.y=.01;this.group.add(grid);
  for(const radius of [4.8,6.2,7.3]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,6,96),new THREE.MeshBasicMaterial({color:0x5de9ff,transparent:true,opacity:.6,blending:THREE.AdditiveBlending}));ring.rotation.x=Math.PI/2;this.group.add(ring);}
  const positions=new Float32Array(600*3);for(let i=0;i<600;i++)positions.set([(Math.random()-.5)*36,Math.random()*16-2,(Math.random()-.5)*36],i*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));this.stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x789cff,size:.045,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.stars);
  const cyan=new THREE.PointLight(0x4adfff,90,24,2);cyan.position.set(-4,5,4);this.group.add(cyan);const purple=new THREE.PointLight(0xb04fff,80,24,2);purple.position.set(4,3,1);this.group.add(purple);
  for(let i=0;i<10;i++){
   const frame=new THREE.Group();frame.position.set(0,2.8,-24-i*3);const material=new THREE.MeshBasicMaterial({color:i%2?0x8b4dff:0x4df4e4});
   for(const y of [-3.2,3.2]){const bar=new THREE.Mesh(new THREE.BoxGeometry(9,.05,.06),material);bar.position.y=y;frame.add(bar);}for(const x of [-4.5,4.5]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.05,6.4,.06),material);bar.position.x=x;frame.add(bar);}this.group.add(frame);
  }
 }
 makeEye(){
  this.eye=new THREE.Group();this.eye.position.set(0,3.7,0);this.eye.scale.setScalar(1.18);this.group.add(this.eye);
  const shellMaterial=new THREE.MeshStandardMaterial({color:0x7e8995,metalness:.82,roughness:.26});
  const shell=new THREE.Mesh(new THREE.SphereGeometry(2.55,48,32),shellMaterial);this.eye.add(shell);
  const irisUniforms={time:{value:0},alert:{value:0},open:{value:1}};
  this.irisMaterial=new THREE.ShaderMaterial({uniforms:irisUniforms,transparent:true,side:THREE.DoubleSide,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;uniform float alert;uniform float open;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float fibers=.5+.5*sin(a*94.+sin(r*31.-time*2.)*2.4+r*18.);float rings=.5+.5*sin(r*95.-time*4.);vec3 cyan=vec3(.03,.62,.82),purple=vec3(.35,.08,.62),red=vec3(1.,.025,.09);vec3 base=mix(mix(cyan,purple,alert*.55),red,smoothstep(.55,1.,alert));float iris=smoothstep(1.,.88,r)*smoothstep(.24,.34,r);vec3 color=base*(.16+fibers*.7+rings*.2);color*=iris;float pupil=1.-smoothstep(.23,.27,r);color=mix(color,vec3(.001,.003,.008),pupil);float scan=pow(max(sin(a*4.-time*3.),0.),18.)*.8;color+=base*scan*iris;gl_FragColor=vec4(color,iris*open);}`});
  const iris=new THREE.Mesh(new THREE.CircleGeometry(1.62,64),this.irisMaterial);iris.position.z=2.39;this.eye.add(iris);
  const socket=new THREE.Mesh(new THREE.TorusGeometry(1.72,.19,16,64),new THREE.MeshStandardMaterial({color:0x101822,metalness:.9,roughness:.22}));socket.position.z=2.4;this.eye.add(socket);
  this.irisRing=new THREE.Mesh(new THREE.TorusGeometry(1.47,.028,8,64),new THREE.MeshBasicMaterial({color:0x63f3ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));this.irisRing.position.z=2.59;this.eye.add(this.irisRing);
  this.eyelids=[];
  const top=new THREE.Mesh(new THREE.SphereGeometry(2.68,48,16,0,Math.PI*2,0,Math.PI/2),shellMaterial);const bottom=new THREE.Mesh(new THREE.SphereGeometry(2.68,48,16,0,Math.PI*2,Math.PI/2,Math.PI/2),shellMaterial);this.eye.add(top,bottom);this.eyelids.push(top,bottom);
  for(let i=0;i<14;i++){
   const angle=i/14*Math.PI*2,plate=new THREE.Mesh(new THREE.BoxGeometry(.62,.34,.18),new THREE.MeshStandardMaterial({color:i%3?0x252e39:0x8e9aa5,metalness:.85,roughness:.3}));plate.position.set(Math.cos(angle)*2.55,Math.sin(angle)*2.55,.45);plate.rotation.z=angle;this.eye.add(plate);
   if(i%2===0){const light=new THREE.Mesh(new THREE.BoxGeometry(.22,.06,.04),new THREE.MeshBasicMaterial({color:i%4?0xf44fff:0x65f7ff}));light.position.set(Math.cos(angle)*2.62,Math.sin(angle)*2.62,1.1);light.rotation.z=angle;this.eye.add(light);}
  }
  this.orbits=[];for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(3.15+i*.28,.025,6,96),new THREE.MeshBasicMaterial({color:i===1?0xb05cff:0x62f4e8,transparent:true,opacity:.55,blending:THREE.AdditiveBlending}));ring.rotation.set(i*.6,.4+i*.5,i*.3);this.eye.add(ring);this.orbits.push(ring);}
 }
 makeEffects(){
  this.lane=new THREE.Mesh(new THREE.PlaneGeometry(1.1,11),new THREE.MeshBasicMaterial({color:0xff264f,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));this.lane.rotation.x=-Math.PI/2;this.lane.position.set(0,.035,4.5);this.group.add(this.lane);
  this.beam=new THREE.Mesh(new THREE.CylinderGeometry(.07,.28,10,16,1,true),new THREE.MeshBasicMaterial({color:0xff315f,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.beam);
  this.lance=new THREE.Mesh(new THREE.ConeGeometry(.09,.8,10),new THREE.MeshBasicMaterial({color:0x8ffff0,transparent:true,opacity:1,blending:THREE.AdditiveBlending}));this.lance.visible=false;this.scene.add(this.lance);this.lanceTime=-1;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(90*3),3));this.burst=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x8ffff0,size:.09,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.burst);this.burstLife=0;
 }
 makeUI(){
  this.ui=document.createElement("section");this.ui.id="bossUI";this.ui.innerHTML=`<div class="bossHeader"><small>EYE-07 / AERIAL SURVEILLANCE</small><h2>空中电子眼</h2><div class="bossSegments"><i></i><i></i><i></i></div><div class="bossVitals">INTEGRITY <b id="bossHealthValue">100 / 100</b></div><b id="bossStatus">主控区接入中</b><p id="bossLog">等待虹膜开放。</p></div><div class="bossHelp"><span>A / D　规避扫描轨道</span><span>V　相位处决</span></div>`;document.body.append(this.ui);
 }
 begin(entry){
  this.entry=entry;this.active=true;this.phase="intro";this.time=0;this.health=3;this.hits=0;this.playerX=0;this.cooldown=0;this.group.visible=true;this.ui.classList.add("visible");document.body.classList.add("data-cinematic");this.camera.fov=61;this.camera.updateProjectionMatrix();this.eye.scale.setScalar(1.18);this.lane.material.opacity=0;this.beam.material.opacity=0;this.lance.visible=false;this.ui.querySelectorAll(".bossSegments i").forEach(segment=>segment.classList.remove("lost"));this.lanceTime=-1;this.setMode("open",2.4);
 }
 setMode(mode,duration){this.mode=mode;this.modeTime=0;this.modeDuration=duration;this.fired=false;}
 fireLance(){
  if(!this.active||this.phase!=="combat"||this.cooldown>0)return;
  this.onTool();this.cooldown=.38;
  if(this.mode!=="open"){this.ui.querySelector("#bossLog").textContent="虹膜封闭。等待下一次扫描窗口。";this.onTone(130,.16,.025,"square");return;}
  this.lanceTime=0;this.lanceStart=this.camera.position.clone();this.lance.visible=true;this.onTone(780,.16,.045,"square");this.ui.querySelector("#bossLog").textContent="相位处决器已发射。";
 }
 hitEye(){
  this.health=Math.max(0,this.health-(this.attackPower||1));this.hits++;this.burstLife=.65;const positions=this.burst.geometry.attributes.position.array;
  for(let i=0;i<positions.length;i+=3){const a=Math.random()*Math.PI*2,r=Math.random()*2;positions.set([Math.cos(a)*r,(Math.random()-.5)*3,2.4+Math.sin(a)*r],i);}
  this.burst.geometry.attributes.position.needsUpdate=true;this.burst.material.opacity=1;this.onTone(90,.25,.075,"sawtooth");this.effect.alarm=.35;
  this.ui.querySelectorAll(".bossSegments i").forEach((segment,index)=>segment.classList.toggle("lost",index>=this.health));
  if(this.health<=0){this.phase="dying";this.modeTime=0;this.lane.material.opacity=0;this.beam.material.opacity=0;this.ui.querySelector("#bossStatus").textContent="EYE-07 / SIGNAL LOST";this.ui.querySelector("#bossLog").textContent="电子眼主控核心已瓦解。";return;}
  this.setMode("stagger",.6);this.ui.querySelector("#bossLog").textContent="命中！虹膜结构受损，扫描速度提升。";
 }
 handleKey(code){
  if(!this.active||this.phase!=="combat")return false;
  if(code==="KeyA"||code==="ArrowLeft"){this.left=true;return true;}if(code==="KeyD"||code==="ArrowRight"){this.right=true;return true;}
  if(code==="KeyV"){this.fireLance();return true;}return false;
 }
 handleKeyUp(code){if(code==="KeyA"||code==="ArrowLeft")this.left=false;if(code==="KeyD"||code==="ArrowRight")this.right=false;}
 update(dt){
  if(!this.active)return false;this.time+=dt;this.modeTime+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.irisMaterial.uniforms.time.value=this.time;this.stars.rotation.y+=dt*.01;
  this.orbits.forEach((ring,index)=>{ring.rotation.x+=dt*(.12+index*.05);ring.rotation.z+=dt*(index%2?.18:-.13);});this.eye.rotation.y=Math.sin(this.time*.35)*.12;
  if(this.burstLife>0){this.burstLife=Math.max(0,this.burstLife-dt);this.burst.material.opacity=this.burstLife/.65;this.burst.scale.setScalar(1+( .65-this.burstLife)*3);}
  if(this.phase==="intro"){
   const t=clamp(this.time/2.6,0,1),start=this.entry.position,end=new THREE.Vector3(0,2.6,-51);this.camera.position.lerpVectors(start,end,smooth(t));this.camera.lookAt(0,3.7,-60);
   if(t>=1){this.phase="combat";this.modeTime=0;this.setMode("open",2.4);}
  }else if(this.phase==="combat"){
   const speed=4.4;this.playerX=clamp(this.playerX+((this.right?1:0)-(this.left?1:0))*dt*speed,-3.4,3.4);
   this.camera.position.set(this.playerX,2.6+Math.sin(this.time*1.3)*.06,-51);this.camera.lookAt(0,3.7,-60);
   const open=this.mode==="open";this.irisMaterial.uniforms.open.value=THREE.MathUtils.damp(this.irisMaterial.uniforms.open.value,open?1:.35,8,dt);this.irisMaterial.uniforms.alert.value=this.mode==="telegraph"||this.mode==="fire"?1:open?0:.55;
   this.eyelids[0].position.y=THREE.MathUtils.damp(this.eyelids[0].position.y,open?1.05:.15,8,dt);this.eyelids[1].position.y=THREE.MathUtils.damp(this.eyelids[1].position.y,open?-1.05:-.15,8,dt);
   this.irisRing.material.color.set(this.mode==="telegraph"||this.mode==="fire"?0xff355f:0x63f3ff);
   this.ui.querySelector("#bossStatus").textContent=open?"虹膜开放 / 按 V 处决":this.mode==="telegraph"?"轨道锁定 / 立即规避":this.mode==="fire"?"扫描束发射":this.mode==="stagger"?"核心受损":"协议重构";
   if(this.mode==="open"&&this.modeTime>=this.modeDuration){this.targetX=this.playerX;this.lane.position.x=this.targetX;this.setMode("telegraph",Math.max(.65,1.25-this.hits*.15));this.onTone(190,.3,.03,"square");}
   else if(this.mode==="stagger"&&this.modeTime>=this.modeDuration){this.targetX=this.playerX;this.lane.position.x=this.targetX;this.setMode("telegraph",Math.max(.65,1.25-this.hits*.15));}
   else if(this.mode==="telegraph"){
    this.lane.material.opacity=.22+Math.sin(this.time*18)*.14;
    if(this.modeTime>=this.modeDuration){this.setMode("fire",.34);this.beam.material.opacity=.85;this.onTone(70,.34,.065,"sawtooth");}
   }else if(this.mode==="fire"){
    this.lane.material.opacity=.5;const start=new THREE.Vector3(0,3.7,-57.6),end=new THREE.Vector3(this.targetX,1.3,-50),direction=end.clone().sub(start),mid=start.clone().add(end).multiplyScalar(.5);this.beam.position.copy(this.group.worldToLocal(mid));this.beam.scale.y=direction.length()/10;this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    if(!this.fired&&Math.abs(this.playerX-this.targetX)<.7){this.fired=true;this.onDamage(20,"EYE-07 扫描束");}
    if(this.modeTime>=this.modeDuration){this.beam.material.opacity=0;this.lane.material.opacity=0;this.setMode("open",Math.max(1.45,2.4-this.hits*.25));}
   }
  }else if(this.phase==="dying"){
   const t=clamp(this.modeTime/1.5,0,1);this.eye.scale.setScalar(1.18*(1-smooth(t)*.8));this.eye.rotation.z+=dt*2.4;this.irisMaterial.uniforms.open.value=1-t;
   if(t>=1){this.phase="return";this.modeTime=0;this.returnPosition=this.camera.position.clone();this.onComplete({kind:"boss",command:"exec unlock --eye=DISABLED"});}
  }else if(this.phase==="return"){
   const t=clamp(this.modeTime/1.6,0,1);this.camera.position.lerpVectors(this.returnPosition,this.entry.position,smooth(t));this.camera.lookAt(this.entry.position.clone().add(new THREE.Vector3(0,0,-3)));
   if(t>=1){this.camera.position.copy(this.entry.position);this.camera.quaternion.copy(this.entry.quaternion);this.camera.fov=this.entry.fov;this.camera.updateProjectionMatrix();this.active=false;this.phase="idle";this.group.visible=false;this.ui.classList.remove("visible");document.body.classList.remove("data-cinematic");this.onExit();}
  }
  if(this.lanceTime>=0){
   this.lanceTime+=dt;const t=clamp(this.lanceTime/.24,0,1),end=new THREE.Vector3(0,3.7,-57.6);this.lance.position.lerpVectors(this.lanceStart,end,t);this.lance.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(this.lanceStart).normalize());
   if(t>=1){this.lanceTime=-1;this.lance.visible=false;this.hitEye();}
  }
  return true;
 }
}
