/**
 * Parse natural language timezone references into IANA timezone strings.
 * Covers US timezones + Indian Standard Time.
 */

const TIMEZONE_MAP: Record<string, string> = {
  // Direct names
  eastern: "America/New_York",
  central: "America/Chicago",
  mountain: "America/Denver",
  pacific: "America/Los_Angeles",
  alaska: "America/Anchorage",
  hawaii: "Pacific/Honolulu",

  // Abbreviations
  est: "America/New_York",
  edt: "America/New_York",
  et: "America/New_York",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  ct: "America/Chicago",
  mst: "America/Denver",
  mdt: "America/Denver",
  mt: "America/Denver",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pt: "America/Los_Angeles",
  akst: "America/Anchorage",
  akdt: "America/Anchorage",
  hst: "Pacific/Honolulu",

  // Coasts
  "east coast": "America/New_York",
  "west coast": "America/Los_Angeles",

  // Major cities
  "new york": "America/New_York",
  nyc: "America/New_York",
  boston: "America/New_York",
  philadelphia: "America/New_York",
  miami: "America/New_York",
  atlanta: "America/New_York",
  orlando: "America/New_York",
  charlotte: "America/New_York",
  pittsburgh: "America/New_York",
  detroit: "America/New_York",
  cleveland: "America/New_York",
  tampa: "America/New_York",
  jacksonville: "America/New_York",
  washington: "America/New_York",
  "washington dc": "America/New_York",
  dc: "America/New_York",
  baltimore: "America/New_York",
  raleigh: "America/New_York",
  nashville: "America/Chicago",
  chicago: "America/Chicago",
  houston: "America/Chicago",
  dallas: "America/Chicago",
  "san antonio": "America/Chicago",
  austin: "America/Chicago",
  memphis: "America/Chicago",
  milwaukee: "America/Chicago",
  "new orleans": "America/Chicago",
  "minneapolis": "America/Chicago",
  "st louis": "America/Chicago",
  "kansas city": "America/Chicago",
  "oklahoma city": "America/Chicago",
  denver: "America/Denver",
  phoenix: "America/Denver",
  "salt lake city": "America/Denver",
  "salt lake": "America/Denver",
  albuquerque: "America/Denver",
  boise: "America/Denver",
  "los angeles": "America/Los_Angeles",
  // "la" omitted — too short, matches common words. Use "los angeles" or "LA" in context.
  "san francisco": "America/Los_Angeles",
  sf: "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  portland: "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  "san jose": "America/Los_Angeles",
  sacramento: "America/Los_Angeles",
  "las vegas": "America/Los_Angeles",
  vegas: "America/Los_Angeles",
  anchorage: "America/Anchorage",
  honolulu: "Pacific/Honolulu",

  // States
  "new york state": "America/New_York",
  connecticut: "America/New_York",
  massachusetts: "America/New_York",
  "new jersey": "America/New_York",
  pennsylvania: "America/New_York",
  maryland: "America/New_York",
  virginia: "America/New_York",
  "west virginia": "America/New_York",
  "north carolina": "America/New_York",
  "south carolina": "America/New_York",
  georgia: "America/New_York",
  florida: "America/New_York",
  maine: "America/New_York",
  "new hampshire": "America/New_York",
  vermont: "America/New_York",
  "rhode island": "America/New_York",
  delaware: "America/New_York",
  ohio: "America/New_York",
  michigan: "America/New_York",
  indiana: "America/New_York",
  kentucky: "America/New_York",
  tennessee: "America/Chicago",
  illinois: "America/Chicago",
  texas: "America/Chicago",
  wisconsin: "America/Chicago",
  minnesota: "America/Chicago",
  iowa: "America/Chicago",
  missouri: "America/Chicago",
  arkansas: "America/Chicago",
  louisiana: "America/Chicago",
  mississippi: "America/Chicago",
  alabama: "America/Chicago",
  oklahoma: "America/Chicago",
  kansas: "America/Chicago",
  nebraska: "America/Chicago",
  "south dakota": "America/Chicago",
  "north dakota": "America/Chicago",
  colorado: "America/Denver",
  "new mexico": "America/Denver",
  utah: "America/Denver",
  wyoming: "America/Denver",
  montana: "America/Denver",
  idaho: "America/Denver",
  arizona: "America/Denver",
  california: "America/Los_Angeles",
  oregon: "America/Los_Angeles",
  washington_state: "America/Los_Angeles",
  nevada: "America/Los_Angeles",

  // India
  ist: "Asia/Kolkata",
  "indian standard time": "Asia/Kolkata",
  india: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  bengaluru: "Asia/Kolkata",
  hyderabad: "Asia/Kolkata",
  chennai: "Asia/Kolkata",
  kolkata: "Asia/Kolkata",
  pune: "Asia/Kolkata",
  ahmedabad: "Asia/Kolkata",
  jaipur: "Asia/Kolkata",
  lucknow: "Asia/Kolkata",
  chandigarh: "Asia/Kolkata",
  gurgaon: "Asia/Kolkata",
  gurugram: "Asia/Kolkata",
  noida: "Asia/Kolkata",
  goa: "Asia/Kolkata",
  kochi: "Asia/Kolkata",
  coimbatore: "Asia/Kolkata",
  indore: "Asia/Kolkata",
  nagpur: "Asia/Kolkata",
  surat: "Asia/Kolkata",
  visakhapatnam: "Asia/Kolkata",
  vizag: "Asia/Kolkata",
  thiruvananthapuram: "Asia/Kolkata",
  trivandrum: "Asia/Kolkata",
  bhopal: "Asia/Kolkata",
  patna: "Asia/Kolkata",
  mangalore: "Asia/Kolkata",
  mysore: "Asia/Kolkata",
  mysuru: "Asia/Kolkata",
};

/**
 * Parse a user message for timezone references.
 * Returns an IANA timezone string or null if no timezone detected.
 */
export function parseTimezone(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // Try exact match first
  if (TIMEZONE_MAP[lower]) return TIMEZONE_MAP[lower];

  // Try matching known keys within the input (longest match first)
  const keys = Object.keys(TIMEZONE_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    // Use word boundary matching to avoid partial matches
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      return TIMEZONE_MAP[key]!;
    }
  }

  // Handle "washington state" vs "washington dc" — if they say "washington"
  // alone it's ambiguous, but DC is more common in conversation
  // (already handled by the map defaulting to Eastern)

  return null;
}
