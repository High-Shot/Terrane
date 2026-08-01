// Crafted place entries for the SEO landing pages at /maps/{slug}.
// Each entry describes a place we love printing, in the site's voice:
// specific, warm, no hype. `terrainNote` says what the RELIEF itself shows —
// that's the product. Coordinates are the frame center (4 decimal places).
//
// Shape: { slug, name, sub, lat, lng, blurb, terrainNote }

export const PLACES = [
  {
    slug: 'lake-tahoe',
    name: 'Lake Tahoe',
    sub: 'Sierra Nevada, California–Nevada',
    lat: 39.0968,
    lng: -120.0324,
    blurb:
      'An alpine lake 1,645 feet deep, held at 6,225 feet in a granite basin between the Sierra Nevada crest and the Carson Range. The shoreline runs 72 miles through two states, from Emerald Bay to the boulders of Sand Harbor. Most people carry one cove, one dock, one stretch of Highway 89 — that is the part worth framing.',
    terrainNote:
      'The relief carries the whole basin: Mount Tallac and Freel Peak standing over a shoreline that drops away into real, measured bathymetry.',
  },
  {
    slug: 'moab',
    name: 'Moab, Utah',
    sub: 'Colorado Plateau, Utah',
    lat: 38.5733,
    lng: -109.5498,
    blurb:
      'A small town wedged into the canyon country of southeastern Utah, between Arches and Canyonlands, where the Colorado River saws through red Entrada sandstone. Slickrock domes, fins, and mesas rise in every direction from the green valley floor, and the La Sal Mountains hold the eastern horizon at over 12,000 feet.',
    terrainNote:
      'In relief, the canyon walls and sandstone fins read as sharp vertical steps against the flat river corridor below.',
  },
  {
    slug: 'acadia',
    name: 'Acadia, Maine',
    sub: 'Mount Desert Island, Maine',
    lat: 44.3386,
    lng: -68.2733,
    blurb:
      'Mount Desert Island is where the mountains of the Maine coast walk straight into the Atlantic. Cadillac Mountain’s 1,530-foot granite summit catches the first sunrise in the United States for much of the year, and Somes Sound nearly splits the island in two on its way to the sea.',
    terrainNote:
      'The relief shows glacially rounded granite ridges dropping to a rocky shoreline, with the deep notch of Somes Sound carved between them.',
  },
  {
    slug: 'boulder',
    name: 'Boulder, Colorado',
    sub: 'Front Range, Colorado',
    lat: 40.015,
    lng: -105.2705,
    blurb:
      'Boulder sits at 5,430 feet, exactly where the Great Plains end against the Front Range. The Flatirons — five slabs of tilted Fountain sandstone — stand over Chautauqua meadow, and Boulder Creek runs out of its canyon straight through downtown.',
    terrainNote:
      'The relief makes the collision plain: flat prairie on one edge of the frame, foothills climbing 3,000 feet on the other, the Flatirons’ tilt unmistakable between them.',
  },
  {
    slug: 'fairhope',
    name: 'Fairhope, Alabama',
    sub: 'Eastern shore, Mobile Bay',
    lat: 30.523,
    lng: -87.9033,
    blurb:
      'Fairhope sits on a rare thing for the Gulf Coast: a bluff. The town looks west over Mobile Bay from about forty feet up, with a long municipal pier reaching into the shallows and live oaks shading the streets down to the water. Sunset over the bay is the local religion.',
    terrainNote:
      'The relief traces the bluff line along the eastern shore and the wide, shallow sweep of the bay’s bathymetry below it.',
  },
  {
    slug: 'grand-canyon',
    name: 'Grand Canyon',
    sub: 'South Rim, Arizona',
    lat: 36.0544,
    lng: -112.1401,
    blurb:
      'From the South Rim near Grand Canyon Village, the land drops nearly a vertical mile to the Colorado River. The canyon is ten miles across here, stepped in bands of Kaibab limestone, Coconino sandstone, and Vishnu schist almost two billion years old. Photographs flatten it; a scale model is the honest way to hold it.',
    terrainNote:
      'In relief, the stepped canyon walls, the side drainages, and temples like Vishnu and Zoroaster read exactly as they do from the rim.',
  },
  {
    slug: 'yosemite-valley',
    name: 'Yosemite Valley',
    sub: 'Sierra Nevada, California',
    lat: 37.7456,
    lng: -119.5936,
    blurb:
      'A glacier-carved trench a mile wide and seven miles long, walled in granite. El Capitan rises 3,000 feet sheer on the north side, Half Dome closes the east end, and the Merced River wanders the flat, meadowed floor between them.',
    terrainNote:
      'The relief makes the valley’s geometry plain — a level floor, near-vertical granite walls, and the high country rolling away behind the rims.',
  },
  {
    slug: 'outer-banks',
    name: 'Outer Banks',
    sub: 'Barrier islands, North Carolina',
    lat: 35.9573,
    lng: -75.624,
    blurb:
      'A two-hundred-mile ribbon of sand standing between the Atlantic and the sounds of North Carolina, nowhere more than a few miles wide. Jockey’s Ridge, the tallest natural dune on the East Coast, shifts near Nags Head, and the Wright brothers flew from the flats at Kill Devil Hills just up the beach road.',
    terrainNote:
      'The relief here is subtle and honest — low dune lines and marsh flats caught between the Atlantic shelf and the shallow bathymetry of the sounds.',
  },
  {
    slug: 'asheville',
    name: 'Asheville, North Carolina',
    sub: 'Blue Ridge Mountains, North Carolina',
    lat: 35.5951,
    lng: -82.5515,
    blurb:
      'Asheville sits in a broad valley at 2,134 feet, where the Swannanoa meets the French Broad — one of the oldest rivers on the continent. The Blue Ridge folds around the city in long forested waves, with Mount Pisgah and the Craggies standing on the skyline.',
    terrainNote:
      'In relief, the ridgelines read as overlapping ranks — the smooth, ancient folds of the southern Appalachians rising past 5,000 feet around the valley.',
  },
  {
    slug: 'big-sur',
    name: 'Big Sur',
    sub: 'Central Coast, California',
    lat: 36.2704,
    lng: -121.8081,
    blurb:
      'Ninety miles of the Santa Lucia Range falling straight into the Pacific, stitched together by Highway 1 and the arc of Bixby Bridge. Cone Peak climbs from the tide line to 5,155 feet in under three miles — one of the steepest coastal gradients in the lower 48.',
    terrainNote:
      'The relief pairs plunging coastal ridgelines with real offshore bathymetry, so the drop does not stop at the waterline.',
  },
];

export const placeBySlug = (slug) => PLACES.find((p) => p.slug === slug) || null;

export default PLACES;
