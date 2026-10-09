import { TapRequestedObjectActivity } from './TapRequestedObjectActivity.js';
import { artMap, drawArt } from '../core/art.js';
export class NumberLineActivity extends TapRequestedObjectActivity {
  // Each number sits on a blank number tile (data/art_map.json numberTile).
  drawUnder(ctx,t){drawArt(ctx,artMap()?.numberTile,t.x,t.y,t.size*1.15,t.size*1.15);}
  start(){
    const values=this.definition.values??[1,2,3,4,5];
    const target=Number(this.definition.targetValue??values[Math.floor(values.length/2)]);
    this.definition={...this.definition,request:{kind:'numeral',value:target},objects:values.map((value,i)=>({id:`num-${value}`,kind:'numeral',value,label:String(value),x:520+i*(880/Math.max(1,values.length-1)),y:690,size:140,color:i%2?'blue':'yellow'}))};
    super.start();
  }
}
