import { SequenceOrderActivity } from './SequenceOrderActivity.js';
export class FollowDirectionsActivity extends SequenceOrderActivity {
  start(){
    const objects=this.definition.objects??[];
    const correctOrder=this.definition.directions??objects.map(o=>o.id);
    this.definition={...this.definition,objects,correctOrder,subtitle:this.definition.subtitle??'Listen, then tap in order'};
    super.start();
  }
}
