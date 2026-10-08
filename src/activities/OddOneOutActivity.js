import { TapRequestedObjectActivity } from './TapRequestedObjectActivity.js';
export class OddOneOutActivity extends TapRequestedObjectActivity {
  start(){
    if(!this.definition.request){
      const odd=(this.definition.objects??[]).find(o=>o.odd)??(this.definition.objects??[]).at(-1);
      this.definition={...this.definition,request:odd?{matchKey:'id',matchValue:odd.id}:{}};
    }
    super.start();
  }
}
