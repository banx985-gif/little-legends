const LEVELS=['EASIER','FOUNDATION','GROWING','CHALLENGE'];
export class AdaptiveDifficulty{
  constructor({clock=()=>Date.now()}={}){this.clock=clock;}
  metrics(profile,skillId){
    const skill=profile?.getSkill?.(skillId);const events=profile?.getAttemptEvents?.().filter(e=>e.skillIds.includes(skillId)).slice(-8)??[];const hints=profile?.getHintEvents?.().filter(e=>e.skillIds.includes(skillId)).slice(-8)??[];
    let streak=0;for(let i=events.length-1;i>=0&&events[i].outcome==='success'&&!events[i].assisted;i--)streak++;
    const times=events.map(e=>e.responseTimeMs).filter(Number.isFinite);const averageResponseMs=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;
    const correctionCount=events.filter(e=>e.correction).length;
    const daysSincePractice=skill?.lastPractisedAt?Math.max(0,(this.clock()-skill.lastPractisedAt)/86400000):Infinity;
    return{skill,events,hints,successRate:skill?.recentAccuracy??0,hintRate:events.length?hints.length/events.length:0,averageResponseMs,correctionCount,streak,daysSincePractice};
  }
  choose(profile,skillId){
    const m=this.metrics(profile,skillId);if(!m.skill||m.skill.attempts<2)return{level:'FOUNDATION',index:1,...m};
    let score=0;if(m.successRate>=.88)score+=2;else if(m.successRate>=.72)score+=1;else if(m.successRate<.5)score-=2;else if(m.successRate<.65)score-=1;
    if(m.hintRate>.45)score-=1;if(m.streak>=3)score+=1;if(m.correctionCount>=3)score-=1;if(m.averageResponseMs!=null&&m.averageResponseMs>9000)score-=1;if(m.daysSincePractice>14)score-=1;
    const index=Math.max(0,Math.min(3,1+score));return{level:LEVELS[index],index,...m};
  }
  apply(definition,profile){
    const skillId=definition?.adaptiveSkill;if(!skillId||!definition.adaptive)return definition;const choice=this.choose(profile,skillId);const out=typeof structuredClone==='function'?structuredClone(definition):JSON.parse(JSON.stringify(definition));out.adaptiveResolved=choice.level;
    if(out.adaptive.kind==='count'){const min=out.adaptive.min??1,max=out.adaptive.max??5;const span=max-min;out.targetCount=Math.round(min+(span*choice.index/3));}
    if(out.adaptive.optionCounts){out.optionCount=out.adaptive.optionCounts[choice.index]??out.optionCount;}
    out.hintDelayMultiplier=[.72,.9,1,1.15][choice.index];return out;
  }
}
