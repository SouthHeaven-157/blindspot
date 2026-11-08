// Platform state is separate from standalone practice. No persistence or synthetic relay saves.
export function createRelay({embedded,sdk,readIncoming=()=>sdk().ready(),getHealth,applySave,notify=()=>{}}){
 let state='idle',save=null,pending=null,connecting=null,receipt=null;
 const emit=(next,detail)=>{state=next;notify(next,detail);};
 const accept=incoming=>{
  if(!incoming?.player||!Number.isFinite(incoming.player.hp)||!Number.isFinite(incoming.player.max_hp)||incoming.player.max_hp<=0||incoming.player.hp<0||incoming.player.hp>incoming.player.max_hp)throw Error('大厅生命存档无效，请返回大厅检查。');
  save=structuredClone(incoming);applySave(structuredClone(save));
 };
 return {
  embedded,get state(){return state},get save(){return save?structuredClone(save):null},
  connect(){
   if(state==='ready')return Promise.resolve(save);
   if(connecting)return connecting;
   emit('loading');
   connecting=(async()=>{
    if(!embedded){emit('ready');return null;}
    const bridge=sdk();if(!bridge?.ready)throw Error('官方接力 SDK 加载失败，请重新加载；未启用默认生命。');
    accept(await readIncoming());emit('ready');return save;
   })().catch(error=>{emit('connection-error',error);throw error;}).finally(()=>{connecting=null;});
   return connecting;
  },
  receiveAdmin(incoming){
   if(!embedded||!save||pending||receipt)return false;
   accept(incoming);emit('ready');return true;
  },
  submit(action,reason='行动终止'){
   if(pending)return pending;
   if(receipt)return Promise.resolve(receipt);
   if(!embedded||!save||!['ready','submission-error'].includes(state))return Promise.reject(Error('尚未收到本次接力存档。'));
   if(!['complete','fail'].includes(action))return Promise.reject(Error('未知交接动作。'));
   const health=getHealth();
   if(!Number.isFinite(health.value)||!Number.isFinite(health.max)||health.max<=0||health.value<0||health.value>health.max)return Promise.reject(Error('生命状态无效，未提交。'));
   const outgoing=structuredClone(save);
   outgoing.player.hp=Math.min(health.value,outgoing.player.max_hp);
   emit('submitting',{action});
   pending=Promise.resolve().then(()=>action==='complete'?sdk().complete(outgoing,{acquiredItemIds:[]}):sdk().fail(reason,outgoing,{acquiredItemIds:[]})).then(result=>{
    if(result?.persisted!==true&&result?.preview!==true)throw Error('未确认保存，请返回大厅核对进度，不要重复提交。');
    receipt=result;emit(result.persisted===true?'saved':'preview',result);return result;
   }).catch(error=>{emit('submission-error',error);throw error;}).finally(()=>{pending=null;});
   return pending;
  }
 };
}
