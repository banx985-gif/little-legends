import { DragToTargetActivity } from './DragToTargetActivity.js';

export class BuildObjectActivity extends DragToTargetActivity {
  accepts(target, token) {
    if (token.targetId) return target.id === token.targetId;
    return super.accepts(target, token);
  }

  onValidDrop(token, target) {
    super.onValidDrop(token, target);
    if (token.placed) token.targetScale = target.pieceScale ?? 0.9;
  }
}
