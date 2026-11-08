const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=__dirname,url='http://127.0.0.1:4178/';
async function healthy(){try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(!r.ok)return false;const text=await r.text();if(!text.includes('位面潜入'))throw new Error('Port 4178 is occupied by another app');return true;}catch(e){if(e.message.includes('occupied'))throw e;return false;}}
(async()=>{
 if(!await healthy()){
 const out=fs.openSync(path.join(root,'server.log'),'a'),err=fs.openSync(path.join(root,'server-error.log'),'a');
 const child=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',out,err]});child.unref();fs.closeSync(out);fs.closeSync(err);
 }
 let ready=false;for(let i=0;i<20;i++){if(await healthy()){ready=true;break;}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw new Error('Local game server failed to start.');
 if(!process.argv.includes('--no-browser')){
 const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p));
 if(!chrome)throw new Error('Chrome not found. Open '+url);
 const browser=spawn(chrome,[url],{detached:true,stdio:'ignore'});browser.unref();
 }
 console.log(url);
})().catch(e=>{console.error(e.message);process.exitCode=1;});

