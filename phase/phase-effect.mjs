import * as THREE from "three";

const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const quadScene=material=>{
 const scene=new THREE.Scene();
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);
 quad.frustumCulled=false;scene.add(quad);
 return scene;
};

export class PhaseEffect {
 constructor(renderer){
  this.renderer=renderer;this.progress=1;this.time=0;this.alarm=0;this.realm=0;
  this.reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const type=renderer.extensions.has("EXT_color_buffer_float")?THREE.HalfFloatType:THREE.UnsignedByteType;
  this.current=new THREE.WebGLRenderTarget(1,1,{type,samples:renderer.capabilities.isWebGL2?2:0});
  this.previous=this.current.clone();
  this.bloomA=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:false});
  this.bloomB=this.bloomA.clone();
  this.camera=new THREE.Camera();
  this.bright=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:this.current.texture}},vertexShader,fragmentShader:`
   uniform sampler2D source;varying vec2 vUv;
   void main(){vec3 c=texture2D(source,vUv).rgb;float l=max(c.r,max(c.g,c.b));float contribution=smoothstep(.78,1.65,l);gl_FragColor=vec4(c*contribution,1.);}`});
  this.blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:null},direction:{value:new THREE.Vector2()}},vertexShader,fragmentShader:`
   uniform sampler2D source;uniform vec2 direction;varying vec2 vUv;
   void main(){vec3 c=texture2D(source,vUv).rgb*.227027;
    c+=texture2D(source,vUv+direction*1.384615).rgb*.316216;
    c+=texture2D(source,vUv-direction*1.384615).rgb*.316216;
    c+=texture2D(source,vUv+direction*3.230769).rgb*.070270;
    c+=texture2D(source,vUv-direction*3.230769).rgb*.070270;
    gl_FragColor=vec4(c,1.);}`});
  this.uniforms={
   now:{value:this.current.texture},before:{value:this.previous.texture},bloom:{value:this.bloomA.texture},
   progress:{value:1},aspect:{value:1},time:{value:0},alarm:{value:0},realm:{value:0}
  };
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,vertexShader,fragmentShader:`
   uniform sampler2D now;uniform sampler2D before;uniform sampler2D bloom;
   uniform float progress;uniform float aspect;uniform float time;uniform float alarm;uniform float realm;
   varying vec2 vUv;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+time*19.3)*43758.5453);}
   float random2(vec2 p){return fract(sin(dot(p,vec2(41.31,289.17)))*43758.5453);}
   float particleFlow(vec2 uv,float offset){
    vec2 p=(uv-.5)*vec2(aspect,1.);float r=length(p);float a=atan(p.y,p.x);
    vec2 stream=vec2(a*7.+log(r+.08)*5.-progress*9.+offset,r*95.-progress*22.);
    vec2 id=floor(stream);vec2 f=fract(stream)-.5;float n=random2(id);
    float particle=smoothstep(.115,.012,length(f*vec2(.72,2.7)));
    return particle*step(.77,n)*smoothstep(.025,.13,r);
   }
   void main(){
    vec2 center=vUv-.5;center.x*=aspect;float radius=length(center);
    float wave=progress*sqrt(aspect*aspect+1.)*.55;
    float edge=exp(-pow((radius-wave)*25.,2.))*(1.-step(.999,progress));
    vec2 offset=normalize(center+vec2(.0001))*edge*.013;
    vec3 next=texture2D(now,vUv+offset).rgb;
    next.r=texture2D(now,vUv+offset*1.65).r;
    next.b=texture2D(now,vUv-offset*.55).b;
    vec3 old=texture2D(before,vUv-offset).rgb;
    float reveal=progress>=.999?1.:1.-smoothstep(wave-.06,wave+.06,radius);
    vec3 color=mix(old,next,reveal)+edge*vec3(.07,.22,.25);
    float particleEnvelope=sin(clamp(progress,0.,1.)*3.14159265);
    float particles=(particleFlow(vUv,0.)+particleFlow(vUv,2.7)*.65)*particleEnvelope;
    vec3 phaseColor=mix(vec3(.18,1.,.72),vec3(.62,.35,1.),realm);
    color+=phaseColor*particles*(.48+edge*1.4);
    color+=texture2D(bloom,vUv).rgb*.24;
    color*=mix(vec3(1.02,1.,.97),vec3(.9,.91,1.1),realm);
    float vignette=smoothstep(.92,.25,length((vUv-.5)*vec2(aspect,1.)));
    color*=mix(.68,1.,vignette);
    color+=(hash(gl_FragCoord.xy)-.5)*.016;
    color*=1.-sin(vUv.y*1100.)*.008;
    color+=alarm*vec3(.16,.005,.012)*(1.-vignette)*(.65+.35*sin(time*8.));
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.brightScene=quadScene(this.bright);this.blurScene=quadScene(this.blur);this.finalScene=quadScene(this.material);
  this.resize();
 }
 resize(){
  const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());
  this.current.setSize(size.x,size.y);this.previous.setSize(size.x,size.y);
  const w=Math.max(1,Math.floor(size.x/3)),h=Math.max(1,Math.floor(size.y/3));
  this.bloomA.setSize(w,h);this.bloomB.setSize(w,h);
  this.uniforms.aspect.value=size.x/size.y;this.texel=new THREE.Vector2(1/w,1/h);
 }
 capture(scene,camera){
  this.renderer.setRenderTarget(this.previous);this.renderer.render(scene,camera);
  this.renderer.setRenderTarget(null);this.progress=this.reduced?1:0;
 }
 pass(material,scene,target,camera=this.camera){this.renderer.setRenderTarget(target);this.renderer.render(scene,camera);}
 render(scene,camera,dt){
  this.time+=dt;this.progress=Math.min(1,this.progress+dt/1.0);
  this.pass(null,scene,this.current,camera);
  this.bright.uniforms.source.value=this.current.texture;this.pass(this.bright,this.brightScene,this.bloomA);
  for(let i=0;i<2;i++){
   this.blur.uniforms.source.value=this.bloomA.texture;this.blur.uniforms.direction.value.set(this.texel.x,0);this.pass(this.blur,this.blurScene,this.bloomB);
   this.blur.uniforms.source.value=this.bloomB.texture;this.blur.uniforms.direction.value.set(0,this.texel.y);this.pass(this.blur,this.blurScene,this.bloomA);
  }
  this.uniforms.progress.value=this.progress;this.uniforms.time.value=this.time;
  this.uniforms.alarm.value=this.alarm;this.uniforms.realm.value=this.realm;
  this.pass(this.material,this.finalScene,null);
 }
}
