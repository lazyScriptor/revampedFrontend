/** New sort_order values for a list of siblings after moving one item up (-1) or down (+1). Only changed rows are returned. */
export function reorderSiblings<T extends { id: number; sort_order?: number }>(list: T[], index: number, dir: -1 | 1): Array<{ id: number; sort_order: number }> {
  const to = index + dir;
  if (index < 0 || to < 0 || index >= list.length || to >= list.length) return [];
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next
    .map((x, i) => ({ id: x.id, sort_order: i * 10, was: x.sort_order }))
    .filter((x) => x.was !== x.sort_order)
    .map(({ id, sort_order }) => ({ id, sort_order }));
}
