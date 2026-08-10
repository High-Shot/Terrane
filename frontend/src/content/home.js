/**
 * Homepage copy.
 *
 * The voice is the original site's and is deliberately preserved — the best
 * lines here ("A place does not have to be famous to matter", "Your cul-de-sac
 * counts as much as Everest. It just has better parking.") are the brand.
 *
 * What changed: the old homepage shipped placeholder strings to production —
 * "(EDIT)", "from N makers — EDIT", "Ships in ~X weeks — EDIT". Every one of
 * those now carries a real figure, sourced from the site's own FAQ, Shipping
 * and Returns pages (see shopify/pages/*.html). Nothing here is invented; if a
 * fact was not already published somewhere in this repo, it is not asserted.
 */

export const PRODUCT = {
  size: '8″ × 8″',
  price: '$249',
  priceValue: 249,
  material: '3D printed in durable PLA, finished by hand',
  mounting: 'Mounted, ready to hang',
  lead: 'Ships within a week of proof approval',
  shipping: 'Free US shipping, tracked',
  contact: 'barcus@terranemaps.com',
};

export const HERO = {
  // Split so the rust accent can be applied without dangling markup in copy.
  headline: [
    { text: 'A place does not' },
    { text: 'have to be' },
    { text: 'famous', tail: ' to', tailAccent: true },
    { text: 'matter.', accent: true },
  ],
  body:
    'The lake where every summer happened. The street that raised you. The trail you still bring up. Terrane builds it from real elevation and street data and prints it in relief, so the place holds a wall the way it holds you.',
  kicker: 'You design it in the studio. Nothing prints until you say so.',
};

/** The four claims that run under the hero. Each one is verifiable. */
export const PROOF_POINTS = [
  { title: 'Real terrain data', sub: 'USGS 3DEP · NOAA · OpenStreetMap' },
  { title: 'True scale', sub: 'Measured, not imagined' },
  { title: 'Proof before print', sub: 'You approve every detail' },
  { title: 'Edition 1 of 1', sub: 'Your file is never resold' },
];

export const SPEC_ROWS = [
  ['Size', '8″ × 8″ square'],
  ['Price', '$249, made to order'],
  ['Relief', 'Raised in true scale from measured elevation'],
  ['Material', 'Printed layer by layer in durable PLA, finished by hand'],
  ['Finish', 'Mounted, ready to hang'],
  ['Coordinates', 'Resolved and recorded to four decimal places'],
  ['Scale', 'Stated as a true ratio, computed from your frame'],
  ['Edition', 'Printed once, for you. Never reproduced or resold'],
];

export const DATA_SOURCES = [
  {
    tag: 'Elevation',
    source: 'USGS 3DEP',
    title: 'Lidar terrain',
    body:
      "Aerial lidar from the U.S. Geological Survey's 3D Elevation Program, accurate enough to catch the rise behind your house. We check it more times than we should.",
  },
  {
    tag: 'Water',
    source: 'NOAA',
    title: 'Bathymetry and shorelines',
    body:
      'Coastlines, bays, and lake beds come from NOAA survey data, so the water on your map sits where the water actually sits.',
  },
  {
    tag: 'Streets',
    source: 'OpenStreetMap',
    title: 'Roads and places',
    body:
      'Street geometry and place names from OpenStreetMap. Your cul-de-sac counts as much as Everest. It just has better parking.',
  },
];

export const LEGEND_POINTS = [
  'The second line of the legend is yours. A date, a name, the reason. We print it and never ask.',
  'Custom designs are printed once, for you. We never reproduce or resell your file.',
  'Coordinates are resolved and recorded to four decimal places.',
  'Scale is stated as a true ratio, computed from your frame and the ground it covers.',
];

export const STEPS = [
  {
    n: '01',
    title: 'Point to your place',
    body:
      'Search an address or city, enter coordinates, or upload a GPX file. If you can point to it, we can build it.',
  },
  {
    n: '02',
    title: 'Frame it',
    body:
      'Set the crop and how tight you zoom. The legend updates live as you move — coordinates and scale.',
  },
  {
    n: '03',
    title: 'Approve the proof',
    body:
      'We build the final render from survey data and email it to you before anything prints. No surprise mountains.',
  },
  {
    n: '04',
    title: 'We print it once',
    body:
      'Your map is built layer by layer, inspected, mounted, and shipped. Edition 1 of 1, and it stays that way.',
  },
];

/** Guarantee chips — every figure below is published on the site's own pages. */
export const GUARANTEES = [
  { icon: 'clock', label: 'Ships within a week of proof approval' },
  { icon: 'truck', label: 'Free US shipping, tracking included' },
  { icon: 'shield', label: 'Damaged or defective? Remade or refunded, free' },
];

export const GIFTING = [
  {
    icon: 'gift',
    title: 'Put their name on it',
    body:
      'The second line of the legend is yours — a name, a date, the reason. We print it and never ask.',
  },
  {
    icon: 'truck',
    title: 'Send it straight to them',
    body:
      'Ship to the recipient or to yourself to give in person. Free tracked shipping within the US either way.',
  },
  {
    icon: 'heart',
    title: 'For the occasions that stick',
    body:
      'Weddings, retirements, the family cabin, the first house. The places people would not think to ask for.',
  },
];

/**
 * Places shown as example plates.
 *
 * `relief` drives the contour rendering (0 = coastal shelf, 1 = mountain
 * country); it is an illustration parameter, not survey data.
 */
export const SHOWCASE = [
  {
    place: 'Fairhope, Alabama',
    sub: 'Eastern shore, Mobile Bay',
    lat: 30.523,
    lng: -87.9033,
    relief: 0.22,
    scale: '1 : 24,000',
    note: 'Low bluffs falling into the bay — relief you would swear was flat until you print it.',
  },
  {
    place: 'Lake Tahoe, California',
    sub: 'Sierra Nevada',
    lat: 39.0968,
    lng: -120.0324,
    relief: 0.62,
    scale: '1 : 90,000',
    note: 'Granite basin and measured bathymetry: the lake bed drops away as far as the peaks rise.',
  },
  {
    place: 'Moab, Utah',
    sub: 'Colorado Plateau',
    lat: 38.5733,
    lng: -109.5498,
    relief: 0.85,
    scale: '1 : 48,000',
    note: 'Canyon walls and sandstone fins read as sharp vertical steps against the valley floor.',
  },
  {
    place: 'Acadia, Maine',
    sub: 'Mount Desert Island',
    lat: 44.3386,
    lng: -68.2733,
    relief: 0.5,
    scale: '1 : 36,000',
    note: 'Coast to summit in a single frame, with the shoreline exactly where NOAA puts it.',
  },
  {
    place: 'Boulder, Colorado',
    sub: 'Front Range foothills',
    lat: 40.015,
    lng: -105.2705,
    relief: 0.72,
    scale: '1 : 40,000',
    note: 'The Flatirons standing off the plain — the tilt is the whole point of printing it in relief.',
  },
  {
    place: 'Your place',
    sub: 'Wherever you can point to',
    relief: 0.4,
    scale: 'Computed from your frame',
    note: 'Search an address, drop a pin, or upload a GPX track. The legend fills itself in.',
    isCta: true,
  },
];

export const NAV_LINKS = [
  { label: 'The studio', href: '/studio' },
  { label: 'How it works', href: '/#how' },
  { label: 'The object', href: '/#object' },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'FAQ', href: '/faq' },
];
