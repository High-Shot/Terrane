import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useReveal from '../hooks/useReveal';
import HeroSection from '../components/home/HeroSection';
import ReviewsSection from '../components/home/ReviewsSection';
import DataSection from '../components/home/DataSection';
import EditionSection from '../components/home/EditionSection';
import HowSection from '../components/home/HowSection';
import GallerySection from '../components/home/GallerySection';
import SizesSection from '../components/home/SizesSection';
import GiftingSection from '../components/home/GiftingSection';
import GuaranteeSection from '../components/home/GuaranteeSection';
import CtaSection from '../components/home/CtaSection';

export default function Home() {
  useReveal();

  return (
    <div className="App bg-[var(--bg-0)] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ReviewsSection />
      <DataSection />
      <EditionSection />
      <HowSection />
      <GallerySection />
      <SizesSection />
      <GiftingSection />
      <GuaranteeSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
