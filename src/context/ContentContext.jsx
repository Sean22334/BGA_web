import React, { useState, useEffect, useCallback } from 'react';
import { getPublicContent } from '../services/cmsApi';
import { ContentContext } from './useContent';
import { normalizeCmsContent } from '../lib/cmsContent';
import {
  ACADEMY_STATS,
  PROGRAMS,
  BRANCHES,
  GALLERY_ITEMS,
  TESTIMONIALS,
  FAQS,
  PARTNER_CRUISE_LINES
} from '../data/bgaData';

const DEFAULT_SETTINGS = {
  hero_badge: 'TESDA Accredited • International Cruise Placement',
  hero_headline: 'Crafting World-Class Careers on',
  hero_headline_highlight: 'International Cruise Ships',
  hero_subheadline: 'TESDA-accredited culinary, hospitality, and maritime training programs designed to prepare aspiring seafarers for high-paying contracts on luxury ocean liners.',
  hero_primary_cta_text: 'Reserve Free Orientation',
  hero_secondary_cta_text: 'Explore Programs',
  hero_trust_badges: ['100% Free Career Orientation', 'Zero Prior Experience Required', 'POEA Manning Agency Endorsements'],
  hero_bg_image: '/images/BGA LOGOOO.png',
  about_badge: 'About Bluechef Global Academy',
  about_headline: 'Crafting World-Class Careers On',
  about_headline_highlight: 'The High Seas',
  about_subheadline: 'Bluechef Global Academy is the premier maritime hospitality and culinary training institute in the Philippines, transforming passionate individuals into high-earning global seafarers.',
  about_mission_title: 'Our Mission',
  about_mission_desc: 'To empower Filipino youth and hospitality professionals with top-tier, international-standard culinary and maritime training, unlocking lucrative global career opportunities and elevating the standard of Filipino seafarers worldwide.',
  about_vision_title: 'Our Vision',
  about_vision_desc: 'To be the most recognized and trusted cruise career training brand in Southeast Asia, preferred by global cruise liners for producing disciplined, highly skilled, and compassionate maritime professionals.',
  about_why_title: 'Why Choose Bluechef Global Academy?',
  about_why_items: [
    { title: 'TESDA-Aligned Curriculum', desc: 'Programs designed strictly according to international maritime (STCW & MLC 2006) and USPH culinary standards.', icon: 'ShieldCheck' },
    { title: 'State-of-the-Art Labs', desc: 'Train in fully equipped commercial kitchens and mock cruise staterooms that mirror real shipboard environments.', icon: 'Building2' },
    { title: 'Direct Agency Placement', desc: 'Exclusive recruitment endorsements with top POEA/DMW licensed manning agencies for major luxury cruise lines.', icon: 'Anchor' },
    { title: 'Veteran Industry Faculty', desc: 'Learn directly from former cruise ship Executive Chefs, F&B Managers, and Chief Housekeepers.', icon: 'Sparkles' }
  ],
  contact_hotline: '+63 956 483 9033 (Globe)',
  contact_email: 'bluechefglobalacademy@gmail.com',
  contact_facebook: 'https://www.facebook.com/bluechefglobalacademy',
  contact_hours: 'Monday - Saturday: 8:00 AM - 5:00 PM',
  contact_map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1144.6745001914448!2d125.80265620350177!3d7.448243878904475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32f9531262cc8317%3A0x16fdd36a831bf336!2sLacor%20Building%2C%20Bonifacio%20St%2C%20Tagum%2C%20Davao%20del%20Norte!5e1!3m2!1sen!2sph!4v1784871359698!5m2!1sen!2sph',
  footer_tagline: 'Premier Cruise Career Training Academy in the Philippines',
  footer_copyright: '© 2026 Bluechef Global Academy. All rights reserved.',
  announcement_text: 'New Saturday Career Orientation schedules are now open across all BGA regional branches!',
  announcement_active: 'true'
};

export function ContentProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState(ACADEMY_STATS);
  const [programs, setPrograms] = useState(PROGRAMS);
  const [branches, setBranches] = useState(BRANCHES);
  const [gallery, setGallery] = useState(GALLERY_ITEMS);
  const [testimonials, setTestimonials] = useState(TESTIMONIALS);
  const [faqs, setFaqs] = useState(FAQS);
  const [partners, setPartners] = useState(PARTNER_CRUISE_LINES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async () => {
    try {
      const content = await getPublicContent();
      const data = content ? normalizeCmsContent(content) : null;
      if (data) {
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
        if (data.stats) setStats(data.stats);
        if (data.programs) setPrograms(data.programs);
        if (data.branches) setBranches(data.branches);
        if (data.gallery) setGallery(data.gallery);
        if (data.testimonials) setTestimonials(data.testimonials);
        if (data.faqs) setFaqs(data.faqs);
        if (data.partners) {
          const partnerNames = data.partners.map((p) => typeof p === 'string' ? p : p.name);
          setPartners(partnerNames);
        }
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Website content could not be refreshed.');
      console.warn('ContentContext fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <ContentContext.Provider
      value={{
        settings,
        stats,
        programs,
        branches,
        gallery,
        testimonials,
        faqs,
        partners,
        loading,
        error,
        refreshContent: fetchContent
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}
