// Grid-based grouping of incident locations. Shared by the heatmap, the
// statistics endpoint and the monthly report so all three agree on what a
// "hotspot" is.

// One grid cell in degrees. 0.0005° of latitude is about 55 m, which is
// roughly one campus building: fine enough to be useful, coarse enough that
// an individual report cannot be pinned to a doorway.
const DEFAULT_CELL_DEG = 0.0005;

// Students only see cells that aggregate at least this many reports, so a
// lone incident (and therefore a lone reporter) cannot be singled out.
const PUBLIC_MIN_COUNT = 2;

const toNumber = (v) => (typeof v === 'number' ? v : parseFloat(v));

const hasCoords = (i) => Number.isFinite(toNumber(i?.latitude)) && Number.isFinite(toNumber(i?.longitude));

const cellKey = (lat, lng, cell) =>
  `${Math.floor(lat / cell)}:${Math.floor(lng / cell)}`;

const cellCentre = (lat, lng, cell) => ({
  latitude: (Math.floor(lat / cell) + 0.5) * cell,
  longitude: (Math.floor(lng / cell) + 0.5) * cell,
});

/**
 * Group incidents into grid cells.
 *
 * @param {Array<object>} incidents
 * @param {object} [opts]
 * @param {number} [opts.cell] grid size in degrees
 * @param {(incident: object) => number} [opts.weightOf] per-incident weight (default 1)
 * @param {boolean} [opts.withTypes] include a per-type breakdown
 * @returns {Array<{latitude:number, longitude:number, count:number, weight:number, types?:object}>}
 *          sorted by count descending
 */
const groupByCell = (incidents, { cell = DEFAULT_CELL_DEG, weightOf = () => 1, withTypes = false } = {}) => {
  const cells = new Map();
  for (const incident of incidents) {
    if (!hasCoords(incident)) continue;
    const lat = toNumber(incident.latitude);
    const lng = toNumber(incident.longitude);
    const key = cellKey(lat, lng, cell);
    let entry = cells.get(key);
    if (!entry) {
      entry = { ...cellCentre(lat, lng, cell), count: 0, weight: 0 };
      if (withTypes) entry.types = {};
      cells.set(key, entry);
    }
    entry.count += 1;
    entry.weight += weightOf(incident);
    if (withTypes) {
      const t = incident.type || 'other';
      entry.types[t] = (entry.types[t] || 0) + 1;
    }
  }
  return [...cells.values()].sort((a, b) => b.count - a.count || b.weight - a.weight);
};

/** Severity/recency weight used by the heatmap. */
const heatmapWeight = (incident, now = Date.now()) => {
  let weight = 1;
  if (incident.severity === 'high') weight = 3;
  else if (incident.severity === 'medium') weight = 2;
  const ageDays = (now - new Date(incident.timestamp).getTime()) / 86400000;
  if (Number.isFinite(ageDays) && ageDays > 30) weight *= 0.5;
  return weight;
};

module.exports = {
  DEFAULT_CELL_DEG,
  PUBLIC_MIN_COUNT,
  groupByCell,
  heatmapWeight,
  hasCoords,
};
