import { SequenceOrderActivity } from './SequenceOrderActivity.js';
export class OrderBySizeActivity extends SequenceOrderActivity {
  start(){
    const objects=(this.definition.objects??[]).map((o,i)=>({...o,id:o.id??`size-${i}`,sizeMetric:Number(o.sizeMetric??o.size??100)}));
    const descending=this.definition.direction==='big-to-small';
    const correctOrder=[...objects].sort((a,b)=>descending?b.sizeMetric-a.sizeMetric:a.sizeMetric-b.sizeMetric).map(o=>o.id);
    this.definition={...this.definition,objects,correctOrder};
    super.start();
  }
}
