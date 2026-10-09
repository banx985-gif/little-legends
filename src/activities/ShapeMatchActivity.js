import { DragToTargetActivity } from './DragToTargetActivity.js';

export class ShapeMatchActivity extends DragToTargetActivity {
  get dropSound(){return 'snap';} // pieces click into place (Job 13)
  accepts(target, token) {
    const expected = target.shape ?? target.kind ?? target.accepts?.[0];
    if (expected) return token.kind === expected || token.category === expected;
    return super.accepts(target, token);
  }
}
