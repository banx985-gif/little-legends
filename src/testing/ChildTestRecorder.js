const MANUAL_MARKS = new Set(['boredom','parent-help','favourite-character','favourite-reward','asked-replay','confusing-instruction']);
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function now(){return Date.now();}

export class ChildTestRecorder {
  constructor({ save = null, clock = now } = {}) {
    this.save=save; this.clock=clock; this.current=null;
  }
  get active(){return Boolean(this.current);}
  start({age=3}={}){
    const startedAt=this.clock();
    this.current={
      schemaVersion:1, age:Math.max(2,Math.min(5,Number(age)||3)), startedAt, endedAt:null, durationMs:0,
      firstTapMs:null, taps:0, incorrectAttempts:0, lostDrags:0, hintCount:0, maxHintLevel:0,
      activitiesStarted:0, activitiesCompleted:0, uniqueActivities:[], repeatActivityStarts:0,
      parentInterventions:0, scenes:[], manual:{boredom:0,parentHelp:0,favouriteCharacter:0,favouriteReward:0,askedReplay:0,confusingInstruction:0},
      notes:[]
    };
    return this.snapshot();
  }
  recordPointer(event){if(!this.current||event?.type!=='down')return;this.current.taps++;if(this.current.firstTapMs==null)this.current.firstTapMs=Math.max(0,this.clock()-this.current.startedAt);}
  recordScene(name){if(!this.current||!name)return;const last=this.current.scenes.at(-1);if(last?.name===name)return;this.current.scenes.push({name,atMs:this.clock()-this.current.startedAt});if(this.current.scenes.length>80)this.current.scenes.shift();if(name==='parentGate')this.current.parentInterventions++;}
  recordActivityStart(id){if(!this.current||!id)return;this.current.activitiesStarted++;if(this.current.uniqueActivities.includes(id))this.current.repeatActivityStarts++;else this.current.uniqueActivities.push(id);}
  recordResponse(event){if(!this.current||!event)return;if(event.outcome==='incorrect')this.current.incorrectAttempts++;}
  recordHint(level=1){if(!this.current)return;this.current.hintCount++;this.current.maxHintLevel=Math.max(this.current.maxHintLevel,Number(level)||0);}
  recordLostDrag(){if(this.current)this.current.lostDrags++;}
  mark(type,note=''){
    if(!this.current||!MANUAL_MARKS.has(type))return false;
    const key=type.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    this.current.manual[key]=(this.current.manual[key]||0)+1;
    if(note)this.current.notes.push({type,text:String(note).slice(0,160),atMs:this.clock()-this.current.startedAt});
    return true;
  }
  recordActivityComplete(){if(this.current)this.current.activitiesCompleted++;}
  snapshot(){if(!this.current)return null;const out=clone(this.current);out.durationMs=(out.endedAt??this.clock())-out.startedAt;out.completionRate=out.activitiesStarted?out.activitiesCompleted/out.activitiesStarted:0;return out;}
  async stop(){if(!this.current)return null;this.current.endedAt=this.clock();this.current.durationMs=this.current.endedAt-this.current.startedAt;const result=this.snapshot();this.current=null;await this.save?.addChildTestSession?.(result);return result;}
}
