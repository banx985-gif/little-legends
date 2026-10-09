import { BuildObjectActivity } from './BuildObjectActivity.js';
export class PicturePuzzleActivity extends BuildObjectActivity {
  get dropSound(){return 'snap';} // pieces click into place (Job 13)
  start(){
    const pieces=(this.definition.objects??[]).map((o,i)=>({...o,targetId:o.targetId??`puzzle-slot-${i}`}));
    const targets=this.definition.targets??pieces.map((o,i)=>({id:o.targetId,x:620+i*340,y:500,w:190,h:190,accepts:[o.kind??o.category??'piece'],pieceScale:.82}));
    this.definition={...this.definition,objects:pieces,targets};
    super.start();
  }
}
