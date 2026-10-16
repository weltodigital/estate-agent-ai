export interface PostcodeArea {
  admin_county: string | null;
  admin_district: string | null;
  country: string | null;
}

export interface PlaceMatch {
  name_1: string;
  local_type: string;
}

const SETTLEMENT_TYPES = new Set(["City", "Town", "Village"]);

// Welsh areas come back bilingual: "Casnewydd - Newport".
const english = (s: string | null) => (s?.includes(" - ") ? s.split(" - ").pop()! : s)?.trim() || null;

/**
 * A county only when two or more UK towns or villages share the name.
 * Prefers the county, then the unitary authority ("Isle of Wight"). When
 * that's just the town again ("Newport" in Newport), outside England we use
 * the country ("Newport, Wales").
 */
export function chooseCounty(area: PostcodeArea, places: PlaceMatch[], town: string): string | null {
  const name = town.trim().toLowerCase();
  const namesakes = places.filter((p) => p.name_1.trim().toLowerCase() === name && SETTLEMENT_TYPES.has(p.local_type));
  if (namesakes.length < 2) return null;
  const county = english(area.admin_county) ?? english(area.admin_district);
  if (county && county.toLowerCase() !== name) return county;
  return area.country && area.country !== "England" ? area.country : null;
}
