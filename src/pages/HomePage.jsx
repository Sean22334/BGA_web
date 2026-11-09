import React from 'react';
import Hero from '../components/Hero';
import AboutUs from '../components/AboutUs';
import Programs from '../components/Programs';
import TrainingCenters from '../components/TrainingCenters';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import Contact from '../components/Contact';
import PublishingPreview from '../components/PublishingPreview';

export default function HomePage() {
  return (
    <main className="w-full overflow-hidden">
      <Hero />
      <AboutUs />
      <Programs />
      <TrainingCenters />
      <PublishingPreview kind="updates" />
      <Gallery />
      <PublishingPreview kind="alumni" />
      <Testimonials />
      <FAQ />
      <Contact />
    </main>
  );
}
