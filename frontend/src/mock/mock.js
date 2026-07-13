// Mock data for Terrane clone - all data mocked for frontend-only teaser

export const NAV_LINKS = [
  { label: 'Studio', href: '/studio' },
  { label: 'The Data', href: '/#the-data' },
  { label: 'Edition 1 of 1', href: '/#edition' },
  { label: 'How it works', href: '/#how' },
  { label: 'Sizes', href: '/#sizes' },
];

export const HERO = {
  eyebrow: 'Real terrain · Proof before print · Edition 1 of 1',
  titleLines: [
    { text: 'A place does not', accent: false },
    { text: 'have to be', accent: false },
    { text: 'famous', accent: false, tail: ' to', accentTail: true },
    { text: 'matter.', accent: true },
  ],
  body: 'The lake where every summer happened. The street that raised you. The trail you still bring up. Terrane builds it from real elevation and street data and prints it in relief, so the place holds a wall the way it holds you. You design it in the studio. Nothing prints until you say so.',
  image: 'https://images.unsplash.com/photo-1678653091742-e3c0e8ea3657',
};

export const FEATURES = [
  { title: 'Real terrain data', sub: 'USGS · NOAA · OSM' },
  { title: 'True scale', sub: 'Measured, not imagined' },
  { title: 'Proof before print', sub: 'You approve every detail' },
  { title: 'Edition 1 of 1', sub: 'Your file is never resold' },
];

export const DATA_SOURCES = [
  {
    tag: 'Elevation · USGS 3DEP',
    title: 'Lidar terrain',
    body: "Aerial lidar from the U.S. Geological Survey's 3D Elevation Program, accurate enough to catch the rise behind your house. We check it more times than we should.",
    image: 'https://images.unsplash.com/photo-1780256001162-1076668eb095?crop=entropy&cs=srgb&fm=jpg&q=85',
  },
  {
    tag: 'Water · NOAA',
    title: 'Bathymetry and shorelines',
    body: 'Coastlines, bays, and lake beds come from NOAA survey data, so the water on your map sits where the water actually sits.',
    image: 'https://images.unsplash.com/photo-1504203328729-b937e8e102f2?crop=entropy&cs=srgb&fm=jpg&q=85',
  },
  {
    tag: 'Streets · OpenStreetMap',
    title: 'Roads and places',
    body: 'Street geometry and place names from OpenStreetMap. Your cul-de-sac counts as much as Everest. It just has better parking.',
    image: 'https://images.unsplash.com/photo-1717343824623-06293a62a70d?crop=entropy&cs=srgb&fm=jpg&q=85',
  },
];

export const LEGEND_POINTS = [
  'The second line of the legend is yours. A date, a name, the reason. We print it and never ask.',
  'Custom designs are printed once, for you. We never reproduce or resell your file.',
  'Coordinates are resolved and recorded to four decimal places.',
  'Scale is stated as a true ratio, computed from your frame and the ground it covers.',
];

export const SAMPLE_LEGEND = {
  place: 'Fairhope, Alabama',
  sub: 'Eastern shore, Mobile Bay',
  coords: '30.5230 N, 87.9033 W',
  scale: '1 : 24,000 · True scale',
  data: 'USGS 3DEP · NOAA · OpenStreetMap',
  edition: '1 of 1',
  image: 'https://images.unsplash.com/photo-1776954879284-2ff15c48e659',
};

export const STEPS = [
  { n: '01', title: 'Point to your place', body: 'Search an address or city, enter coordinates, or upload a GPX file. If you can point to it, we can build it.' },
  { n: '02', title: 'Frame it', body: 'Set the crop, orientation, and size. The legend updates live as you move: coordinates, scale, the works.' },
  { n: '03', title: 'Approve the proof', body: 'We build the final render from survey data and email it to you before anything prints. No surprise mountains.' },
  { n: '04', title: 'We print it once', body: 'Your map is built layer by layer, inspected, mounted, and shipped. Edition 1 of 1, and it stays that way.' },
];

export const SIZES = [
  { size: '12" \u00d7 16"', desc: 'The desk-to-wall size. Right for a single neighborhood, a stretch of shoreline, or the dock you learned to fish from.', price: '$249' },
  { size: '16" \u00d7 20"', desc: 'The statement size. Room for a whole town, a bay, or a route with the terrain that earned it.', price: '$249' },
];

// Studio map styles with representative preview textures
export const MAP_STYLES = [
  { id: 'harbor', name: 'Harbor', img: 'https://images.unsplash.com/photo-1776954879284-2ff15c48e659', tint: 'linear-gradient(160deg, rgba(14,34,49,0.55), rgba(11,28,41,0.8))' },
  { id: 'chart', name: 'Chart', img: 'https://images.unsplash.com/photo-1777760538099-3165aea3a2dd', tint: 'linear-gradient(160deg, rgba(242,234,214,0.12), rgba(205,123,65,0.10))' },
  { id: 'basalt', name: 'Basalt', img: 'https://images.unsplash.com/photo-1760783320600-32f1d32f5ded', tint: 'linear-gradient(160deg, rgba(0,0,0,0.5), rgba(0,0,0,0.75))' },
];

export const SAMPLE_PLACES = [
  { name: 'Fairhope, Alabama', sub: 'Eastern shore, Mobile Bay', lat: 30.5230, lng: -87.9033, elev: 141 },
  { name: 'Lake Tahoe, California', sub: 'Sierra Nevada', lat: 39.0968, lng: -120.0324, elev: 6225 },
  { name: 'Moab, Utah', sub: 'Colorado Plateau', lat: 38.5733, lng: -109.5498, elev: 4026 },
  { name: 'Acadia, Maine', sub: 'Mount Desert Island', lat: 44.3386, lng: -68.2733, elev: 1530 },
  { name: 'Boulder, Colorado', sub: 'Front Range foothills', lat: 40.0150, lng: -105.2705, elev: 5328 },
];
