import React from 'react';
import Hero from '../components/Hero';
import AboutUs from '../components/AboutUs';
import Programs from '../components/Programs';
import TrainingCenters from '../components/TrainingCenters';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import Contact from '../components/Contact';

export default function HomePage() {
  return (
    <main className="w-full overflow-hidden">
      <Hero />
      <AboutUs />
      <Programs />
      <TrainingCenters />
      <Gallery />
      <Testimonials />
      <FAQ />
      <Contact />
    </main>
  );
}
