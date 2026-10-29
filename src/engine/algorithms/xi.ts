/** Xi steep-area extraction, with predecessor correction (Ankerst 1999;
 * Schubert & Gertz 2018). Implementation cross-checked against sklearn's
 * BSD-licensed reference. See THIRD_PARTY_NOTICES.md. All indices inclusive. */
export function extractXi(
  order: number[],
  reach: number[],
  predecessor: number[],
  xi: number,
  minSamples: number,
  minSize: number,
) {
  const r = [...order.map((i) => reach[i]), Infinity],
    ratio = order.map((_, i) => r[i] / r[i + 1]),
    up = ratio.map((v) => v <= 1 - xi),
    down = ratio.map((v) => v >= 1 / (1 - xi));
  const extend = (start: number, steep: boolean[], opposite: boolean[]) => {
    let end = start,
      flat = 0;
    for (let i = start; i < order.length; i++) {
      if (steep[i]) {
        flat = 0;
        end = i;
      } else if (opposite[i] || ++flat > minSamples) break;
    }
    return end;
  };
  let areas: { start: number; end: number; maximum: number }[] = [],
    cursor = 0,
    maximum = 0;
  const intervals: [number, number][] = [];
  const filter = () => {
    areas = Number.isFinite(maximum)
      ? areas
          .filter((a) => maximum <= r[a.start] * (1 - xi))
          .map((a) => ({ ...a, maximum: Math.max(a.maximum, maximum) }))
      : [];
  };
  for (let i = 0; i < order.length; i++) {
    if (i < cursor || (!up[i] && !down[i])) continue;
    maximum = Math.max(maximum, ...r.slice(cursor, i + 1));
    filter();
    if (down[i]) {
      const end = extend(
        i,
        down,
        ratio.map((v) => v < 1),
      );
      areas.push({ start: i, end, maximum: 0 });
      cursor = end + 1;
      maximum = r[cursor];
    } else {
      const end = extend(
        i,
        up,
        ratio.map((v) => v > 1),
      );
      cursor = end + 1;
      maximum = r[cursor];
      const candidates: [number, number][] = [];
      for (const area of areas) {
        let left = area.start,
          right = end;
        const ceiling = r[end + 1],
          startHeight = r[area.start];
        if (ceiling * (1 - xi) < area.maximum) continue;
        if (startHeight * (1 - xi) >= ceiling) {
          while (left < area.end && r[left + 1] > ceiling) left++;
        } else if (ceiling * (1 - xi) >= startHeight) {
          while (right > i && r[right - 1] > startHeight) right--;
        }
        // A candidate end must have a predecessor within the valley, unless the
        // starting reachability is strictly higher than the final reachability.
        while (
          left < right &&
          r[left] <= r[right] &&
          !order.slice(left, right).includes(predecessor[order[right]])
        )
          right--;
        if (
          left < right &&
          right - left + 1 >= minSize &&
          left <= area.end &&
          right >= i
        )
          candidates.push([left, right]);
      }
      intervals.push(...candidates.reverse());
    }
  }
  const ordered = Array(order.length).fill(-1);
  let label = 0;
  for (const [a, b] of intervals)
    if (ordered.slice(a, b + 1).every((l) => l === -1)) {
      for (let i = a; i <= b; i++) ordered[i] = label;
      label++;
    }
  const labels = Array(order.length).fill(-1);
  order.forEach((i, j) => (labels[i] = ordered[j]));
  return { labels, intervals };
}
