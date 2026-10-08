export const EGG_STATES=Object.freeze({RECEIVED:'RECEIVED',READY:'READY',INTERACTION_1:'INTERACTION_1',INTERACTION_2:'INTERACTION_2',CRACK:'CRACK',HATCH:'HATCH',CREATURE_UNLOCKED:'CREATURE_UNLOCKED'});
const ORDER=[EGG_STATES.RECEIVED,EGG_STATES.READY,EGG_STATES.INTERACTION_1,EGG_STATES.INTERACTION_2,EGG_STATES.CRACK,EGG_STATES.HATCH,EGG_STATES.CREATURE_UNLOCKED];
export class EggSystem{
  constructor(game){this.game=game;}
  get(id){return this.game.save?.getProfileState?.()?.eggs?.[id]??null;}
  async receive(id,rewardId){const existing=this.get(id);if(existing)return existing;await this.game.save?.saveEgg?.(id,{id,rewardId,state:EGG_STATES.RECEIVED,interactions:0});return this.get(id);}
  async setReady(id){const egg=this.get(id);if(!egg)return null;if(egg.state===EGG_STATES.RECEIVED)await this.game.save.saveEgg(id,{...egg,state:EGG_STATES.READY});return this.get(id);}
  async interact(id){let egg=this.get(id);if(!egg)return null;let i=ORDER.indexOf(egg.state);if(i<0)i=0;if(egg.state===EGG_STATES.RECEIVED){await this.setReady(id);egg=this.get(id);i=ORDER.indexOf(egg.state);}const next=ORDER[Math.min(ORDER.length-1,i+1)];const updated={...egg,state:next,interactions:(egg.interactions??0)+1};await this.game.save.saveEgg(id,updated);if(next===EGG_STATES.CREATURE_UNLOCKED&&egg.rewardId){if(this.game.rewards?.get?.(egg.rewardId))await this.game.rewards.award(egg.rewardId,{stars:1});else await this.game.save?.award?.('creatures',egg.rewardId);}return this.get(id);}
  progress(id){const egg=this.get(id);if(!egg)return 0;return Math.max(0,ORDER.indexOf(egg.state))/(ORDER.length-1);}
}
