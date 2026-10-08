import { DragToTargetActivity } from './DragToTargetActivity.js';

export class ShapeMatchActivity extends DragToTargetActivity {
  accepts(target, token) {
    const expected = target.shape ?? target.kind ?? target.accepts?.[0];
    if (expected) return token.kind === expected || token.category === expected;
    return super.accepts(target, token);
  }
}
