export interface ScreenPoint {
  x: number;
  y: number;
}
export const POINT_SPACING = 12;

// Carry distance across event boundaries, including turns. Sampling depends on
// the travelled CSS-pixel path, rather than event rate or devicePixelRatio.
export class PointStroke {
  private previous: ScreenPoint;
  private remainder = 0;
  constructor(
    start: ScreenPoint,
    private spacing = POINT_SPACING,
  ) {
    this.previous = { ...start };
  }
  advance(next: ScreenPoint, capacity: number): ScreenPoint[] {
    const dx = next.x - this.previous.x,
      dy = next.y - this.previous.y;
    const length = Math.hypot(dx, dy),
      result: ScreenPoint[] = [];
    if (length > 0) {
      for (
        let distance = this.spacing - this.remainder;
        distance <= length + 1e-9 && result.length < capacity;
        distance += this.spacing
      ) {
        const t = Math.min(1, distance / length);
        result.push({
          x: this.previous.x + dx * t,
          y: this.previous.y + dy * t,
        });
      }
      this.remainder = (this.remainder + length) % this.spacing;
      if (this.remainder < 1e-8 || this.spacing - this.remainder < 1e-8)
        this.remainder = 0;
    }
    this.previous = { ...next };
    return result;
  }
}
