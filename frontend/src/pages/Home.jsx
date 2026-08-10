import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useReveal from '../hooks/useReveal';
import HeroSection from '../components/home/HeroSection';
import ObjectSection from '../components/home/ObjectSection';
import DataSection from '../components/home/DataSection';
import EditionSection from '../components/home/EditionSection';
import HowSection from '../components/home/HowSection';
import GallerySection from '../components/home/GallerySection';
import GiftingSection from '../components/home/GiftingSection';
import GuaranteeSection from '../components/home/GuaranteeSection';
import ReviewsSection from '../components/home/ReviewsSection';
import CtaSection from '../components/home/CtaSection';

/**
 * Home.
 *
 * Section order is a deliberate loud/quiet cadence rather than a stack of
 * equal blocks. The original ran nine sections that each opened with the same
 * eyebrow, the same H2 size, and the same card grid on the same background,
 * which flattened the whole page into one texture.
 *
 *   Hero        loud     dark, graticule, the way in
 *   Object      medium   band — what you get, and what it costs
 *   Data        medium   ground — provenance
 *   Edition     medium   band — the legend, at full size
 *   How         quiet    ground — a rail, low density
 *   Gallery     medium   ground — plates
 *   Gifting     quiet    band
 *   Guarantee   quiet    ground
 *   Reviews     —        renders only when real reviews exist
 *   CTA         loud     the close
 */
export default function Home() {
  useReveal();

  return (
    <div className="App overflow-x-hidden bg-[var(--bg-0)]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <HeroSection />
        <ObjectSection />
        <DataSection />
        <EditionSection />
        <HowSection />
        <GallerySection />
        <GiftingSection />
        <GuaranteeSection />
        <ReviewsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
