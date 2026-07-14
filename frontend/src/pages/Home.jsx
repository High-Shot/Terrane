import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useReveal from '../hooks/useReveal';
import HeroSection from '../components/home/HeroSection';
import DataSection from '../components/home/DataSection';
import EditionSection from '../components/home/EditionSection';
import HowSection from '../components/home/HowSection';
import SizesSection from '../components/home/SizesSection';
import CtaSection from '../components/home/CtaSection';

export default function Home() {
  useReveal();

  return (
    <div className="App bg-[var(--bg-0)] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <DataSection />
      <EditionSection />
      <HowSection />
      <SizesSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
