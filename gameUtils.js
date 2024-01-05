const countNeighboringFlags = (tile) => {
  return tile.neighbors.filter((n) => n.flagged).length;
}

// Returns a list of tiles which are exposed, and whose value is greater than their surrounding flags.
const getFrontier = (tiles) => {
  return tiles.filter((tile) => tile.exposed && tile.value > countNeighboringFlags(tile));
}

const getClickable = (tiles) => {
  return tiles.filter((tile) => tile.exposed && tile.value === countNeighboringFlags(tile))
}

const getUnexposedUnflaggedNeighbors = (tile) => {
  return tile.neighbors.filter((n) => !n.exposed && !n.flagged);
}

const gameUtils = {
  countNeighboringFlags,
  getFrontier,
  getUnexposedUnflaggedNeighbors,
  getClickable,
}

export default gameUtils;