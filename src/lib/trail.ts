/**
 * A fixed-size history of recent positions (ring buffer), e.g. for drawing trails behind
 * moving bodies. Pushing allocates nothing; once full, the oldest point is overwritten.
 *
 *   const trail = createTrail(200, 2);  // 200 points in 2D
 *   trail.push(x, y);
 *   for (let i = 0; i < trail.length; i++) { const x = trail.get(i, 0), y = trail.get(i, 1); }
 *   // i = 0 is the oldest point, i = trail.length − 1 the newest
 */
export function createTrail(capacity: number, dims: 2 | 3) {
  const data = new Float64Array(capacity * dims);
  let start = 0;
  let length = 0;
  return {
    capacity,
    get length() {
      return length;
    },
    push(x: number, y: number, z = 0) {
      const slot = ((start + length) % capacity) * dims;
      data[slot] = x;
      data[slot + 1] = y;
      if (dims === 3) data[slot + 2] = z;
      if (length < capacity) length++;
      else start = (start + 1) % capacity;
    },
    /** Coordinate `axis` (0 = x, 1 = y, 2 = z) of the i-th point, oldest first. */
    get(i: number, axis: number) {
      return data[((start + i) % capacity) * dims + axis];
    },
    clear() {
      start = 0;
      length = 0;
    },
  };
}

export type Trail = ReturnType<typeof createTrail>;
