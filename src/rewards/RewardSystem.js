const PHASES=['anticipation','reveal','name','reaction','use'];
const PHASE_DURATIONS={anticipation:.7,reveal:.8,name:.9,reaction:.8,use:0};

export class RewardSystem {
  constructor(game){this.game=game;this.definitions=new Map();this.loaded=false;this.reveal=null;}
  setDefinitions(data){const list=Array.isArray(data)?data:data?.rewards??[];this.definitions.clear();for(const r of list)if(r?.id&&r?.type)this.definitions.set(r.id,r);this.loaded=true;return this.definitions.size;}
  async ensureLoaded(assetLoader,url='./data/rewards.json'){if(this.loaded)return this.definitions.size;const data=await assetLoader.load({id:'reward-definitions',type:'json',url});return this.setDefinitions(data);}
  get(id){return this.definitions.get(id)??null;}
  list(){return [...this.definitions.values()];}
  listCatalog(type=null){return this.list().filter(r=>r.catalog&&(type==null||r.type===type));}
  isUnlocked(id){const reward=this.get(id);if(!reward)return false;const state=this.game.save?.getProfileState?.();return Boolean((state?.unlocks?.[reward.type]??[]).includes(id));}
  async unlockWithStars(id){const reward=this.get(id);if(!reward||!reward.catalog)return{ok:false,reason:'missing'};if(this.isUnlocked(id))return{ok:true,already:true,reward};const cost=Math.max(0,Number(reward.starCost)||0);const spent=await this.game.save?.spendDiscoveryStars?.(cost);if(!spent)return{ok:false,reason:'stars',cost,reward};await this.game.save?.award?.(reward.type,id);return{ok:true,cost,reward};}
  async award(id,{stars=null}={}){const reward=this.get(id);if(!reward)throw new Error(`Unknown reward: ${id}`);const before=this.game.save?.getProfileState?.();const firstUnlock=!(before?.unlocks?.[reward.type]??[]).includes(id);await this.game.save?.award?.(reward.type,id);const amount=stars??reward.stars??0;if(firstUnlock&&amount>0)await this.game.save?.addDiscoveryStars?.(amount);return reward;}
  beginReveal(id){const reward=this.get(id);if(!reward)return false;this.reveal={id,phaseIndex:0,t:0,finished:false};return true;}
  update(dt){if(!this.reveal||this.reveal.finished)return;const phase=PHASES[this.reveal.phaseIndex];const duration=PHASE_DURATIONS[phase]??0;if(duration<=0){this.reveal.finished=true;return;}this.reveal.t+=dt;if(this.reveal.t>=duration){this.reveal.t=0;this.reveal.phaseIndex++;if(this.reveal.phaseIndex>=PHASES.length-1)this.reveal.finished=true;}}
  getRevealState(){if(!this.reveal)return null;return{...this.reveal,phase:PHASES[Math.min(this.reveal.phaseIndex,PHASES.length-1)],reward:this.get(this.reveal.id)};}
  clearReveal(){this.reveal=null;}
}
