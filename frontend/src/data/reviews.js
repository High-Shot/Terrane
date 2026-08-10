/**
 * Real customer testimonials.
 *
 * This file previously shipped six invented quotes attributed to "First L. —
 * EDIT" in "City, State — EDIT", alongside a hard-coded five-star rating and
 * "from N makers — EDIT". That was rendering on the live site.
 *
 * It is now empty on purpose. ReviewsSection renders nothing at all while this
 * array is empty, so the page simply omits social proof until there is some —
 * which is a far better look than visible placeholder text, and avoids
 * publishing testimonials nobody gave.
 *
 * To turn the section on, add real entries:
 *
 *   { quote: '…', name: 'Dana R.', location: 'Bozeman, MT' }
 *
 * Optional: set AGGREGATE below once there are enough reviews to quote a score.
 * Leave it null and the rating chip stays hidden.
 */

export const REVIEWS = [];

/** e.g. { score: 4.9, count: 128 } — must reflect real, collected reviews. */
export const AGGREGATE = null;

export default REVIEWS;
