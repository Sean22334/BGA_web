import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  Plus,
  Trash2,
  Edit,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  MapPin,
  HelpCircle,
  MessageSquare,
  Quote,
  GraduationCap,
  Globe,
  X
} from 'lucide-react';
import {
  getAdminCMSContent,
  updateSiteSettings,
  saveCollectionItem,
  deleteCollectionItem,
  uploadImage
} from '../../services/cmsApi';
import { useContent } from '../../context/ContentContext';

export default function ContentManager() {
  const { refreshContent } = useContent();
  const [activeTab, setActiveTab] = useState('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // CMS State
  const [settings, setSettings] = useState({});
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [faqs, setFaqs] = useState([]);

  // Modal & Form States
  const [activeModal, setActiveModal] = useState(null); // 'program', 'branch', 'gallery', 'testimonial', 'faq', 'delete'
  const [modalItem, setModalItem] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminCMSContent();
      if (data) {
        setSettings(data.settings || {});
        setPrograms(data.programs || []);
        setBranches(data.branches || []);
        setGallery(data.gallery || []);
        setTestimonials(data.testimonials || []);
        setFaqs(data.faqs || []);
        setPartners(data.partners || []);
        setStats(data.stats || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load CMS data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSiteSettings(settings);
      await refreshContent();
      showToast('Website settings saved & published live!');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, onComplete) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      try {
        const result = await uploadImage(uploadEvent.target.result, file.name);
        onComplete(result.url);
        showToast('Image uploaded successfully!');
      } catch (err) {
        showToast(err.message || 'Image upload failed', 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // CRUD Handlers
  const handleSaveItem = async (collection, item, isEdit) => {
    setSaving(true);
    try {
      await saveCollectionItem(collection, item, isEdit);
      await loadData();
      await refreshContent();
      setActiveModal(null);
      showToast(`${collection.slice(0, -1)} saved successfully!`);
    } catch (err) {
      showToast(err.message || 'Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCollectionItem(deleteTarget.collection, deleteTarget.id);
      await loadData();
      await refreshContent();
      setDeleteTarget(null);
      showToast('Item deleted successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to delete item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'hero', name: 'Hero & Branding', icon: Sparkles },
    { id: 'about', name: 'About & Mission', icon: Info },
    { id: 'programs', name: 'Programs & Courses', icon: GraduationCap },
    { id: 'branches', name: 'Branches & Locations', icon: MapPin },
    { id: 'gallery', name: 'Campus Gallery', icon: ImageIcon },
    { id: 'testimonials', name: 'Testimonials', icon: Quote },
    { id: 'faqs', name: 'FAQs', icon: HelpCircle },
    { id: 'contact', name: 'Contact & Social', icon: MessageSquare }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#2670f2]" />
        <p className="text-sm font-medium">Loading BGA Content Management System...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-[#2670f2]/20 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2670f2]/10 border border-[#2670f2]/30 text-[#2670f2] text-xs font-semibold mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Public Website CMS Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Website Content <span className="text-gold-gradient">Management System</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Edit text, upload images, manage courses, FAQs, testimonials, and contact details without changing layout or design.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Reload CMS Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn text-sm font-medium ${
          toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gold-gradient text-slate-950 shadow-lg shadow-[#2670f2]/20'
                  : 'glass-panel text-slate-300 hover:text-white hover:border-white/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: HERO & BRANDING */}
      {/* ==================================================================== */}
      {activeTab === 'hero' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Hero Section & Branding</h2>
              <p className="text-xs text-slate-400">Manage headline text, subheadlines, hero background image, and CTAs.</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary text-xs !py-2.5 !px-5 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Save & Publish Hero'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Top Announcement Badge Text
              </label>
              <input
                type="text"
                value={settings.hero_badge || ''}
                onChange={(e) => setSettings({ ...settings, hero_badge: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Main Headline Text
              </label>
              <input
                type="text"
                value={settings.hero_headline || ''}
                onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Headline Highlight Text (Gold Gradient)
              </label>
              <input
                type="text"
                value={settings.hero_headline_highlight || ''}
                onChange={(e) => setSettings({ ...settings, hero_headline_highlight: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Primary Button CTA Text
              </label>
              <input
                type="text"
                value={settings.hero_primary_cta_text || ''}
                onChange={(e) => setSettings({ ...settings, hero_primary_cta_text: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Subheadline Paragraph
              </label>
              <textarea
                rows="3"
                value={settings.hero_subheadline || ''}
                onChange={(e) => setSettings({ ...settings, hero_subheadline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Hero Background Banner Image
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={settings.hero_bg_image || ''}
                  onChange={(e) => setSettings({ ...settings, hero_bg_image: e.target.value })}
                  placeholder="/images/BGA LOGOOO.png or https://..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
                />
                <label className="px-4 py-3 rounded-xl bg-[#2670f2]/20 hover:bg-[#2670f2]/30 text-[#2670f2] border border-[#2670f2]/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, (url) => setSettings({ ...settings, hero_bg_image: url }))}
                  />
                </label>
              </div>
              {settings.hero_bg_image && (
                <div className="h-36 rounded-2xl overflow-hidden border border-white/10 relative">
                  <img src={settings.hero_bg_image} alt="Hero Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex items-end">
                    <span className="text-[10px] text-slate-300 font-mono">Image Preview</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ABOUT & MISSION */}
      {/* ==================================================================== */}
      {activeTab === 'about' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">About Us, Mission & Vision</h2>
              <p className="text-xs text-slate-400">Edit mission statement, vision statement, and section intro.</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary text-xs !py-2.5 !px-5 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Save & Publish About'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Section Badge Title
              </label>
              <input
                type="text"
                value={settings.about_badge || ''}
                onChange={(e) => setSettings({ ...settings, about_badge: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Section Main Headline
              </label>
              <input
                type="text"
                value={settings.about_headline || ''}
                onChange={(e) => setSettings({ ...settings, about_headline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Intro Paragraph
              </label>
              <textarea
                rows="2"
                value={settings.about_subheadline || ''}
                onChange={(e) => setSettings({ ...settings, about_subheadline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Our Mission Statement
              </label>
              <textarea
                rows="4"
                value={settings.about_mission_desc || ''}
                onChange={(e) => setSettings({ ...settings, about_mission_desc: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Our Vision Statement
              </label>
              <textarea
                rows="4"
                value={settings.about_vision_desc || ''}
                onChange={(e) => setSettings({ ...settings, about_vision_desc: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PROGRAMS & COURSES */}
      {/* ==================================================================== */}
      {activeTab === 'programs' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Programs & Course Catalog</h2>
              <p className="text-xs text-slate-400">Add, edit, or hide training course cards on the public site.</p>
            </div>
            <button
              onClick={() => {
                setModalItem({
                  title: '',
                  category: 'Culinary',
                  badge: 'Popular',
                  short_description: '',
                  duration: '2 Months Intensive',
                  eligibility: 'High School Graduate',
                  image: '/images/culinary_lab.jpg',
                  overview: '',
                  highlights: ['TESDA & USPH Compliant'],
                  is_published: 1
                });
                setActiveModal('program');
              }}
              className="btn-primary text-xs !py-2.5 !px-4 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Program</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((prog) => (
              <div key={prog.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="h-36 rounded-xl overflow-hidden mb-3 relative">
                    <img src={prog.image} alt={prog.title} className="w-full h-full object-cover" />
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      prog.is_published ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {prog.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#2670f2] font-bold uppercase tracking-wider block">{prog.category}</span>
                  <h3 className="font-bold text-white text-lg mt-0.5">{prog.title}</h3>
                  <p className="text-slate-400 text-xs mt-2 line-clamp-2">{prog.shortDescription || prog.short_description}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setModalItem({
                        ...prog,
                        short_description: prog.shortDescription || prog.short_description,
                        highlights: Array.isArray(prog.highlights) ? prog.highlights : (typeof prog.highlights === 'string' ? JSON.parse(prog.highlights) : [])
                      });
                      setActiveModal('program');
                    }}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-[#2670f2] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#2670f2]" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget({ collection: 'programs', id: prog.id, title: prog.title });
                      setActiveModal('delete');
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: BRANCHES & LOCATIONS */}
      {/* ==================================================================== */}
      {activeTab === 'branches' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Branch Locations & Hotlines</h2>
              <p className="text-xs text-slate-400">Manage regional training center addresses, emails, and phone numbers.</p>
            </div>
            <button
              onClick={() => {
                setModalItem({
                  name: '',
                  address: '',
                  phone: '',
                  email: '',
                  hours: 'Mon - Sat: 8:00 AM - 5:00 PM',
                  map_url: '',
                  image: '/images/hero_cruise_ship.jpg',
                  features: ['Training Lab'],
                  is_published: 1
                });
                setActiveModal('branch');
              }}
              className="btn-primary text-xs !py-2.5 !px-4 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branches.map((b) => (
              <div key={b.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-lg">{b.name}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    b.is_published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {b.is_published ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-xs text-slate-300"><strong className="text-slate-400">Address:</strong> {b.address}</p>
                <p className="text-xs text-slate-300"><strong className="text-slate-400">Phone:</strong> {b.phone}</p>
                <p className="text-xs text-slate-300"><strong className="text-slate-400">Email:</strong> {b.email}</p>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setModalItem({
                        ...b,
                        features: Array.isArray(b.features) ? b.features : (typeof b.features === 'string' ? JSON.parse(b.features) : [])
                      });
                      setActiveModal('branch');
                    }}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-[#2670f2] text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#2670f2]" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget({ collection: 'branches', id: b.id, title: b.name });
                      setActiveModal('delete');
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: CAMPUS GALLERY */}
      {/* ==================================================================== */}
      {activeTab === 'gallery' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Campus Photo Gallery</h2>
              <p className="text-xs text-slate-400">Upload new campus pictures or update categories.</p>
            </div>
            <button
              onClick={() => {
                setModalItem({
                  title: '',
                  category: 'Training',
                  image: '/images/culinary_lab.jpg',
                  is_published: 1
                });
                setActiveModal('gallery');
              }}
              className="btn-primary text-xs !py-2.5 !px-4 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Photo</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <div key={item.id} className="group relative h-48 rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#2670f2] bg-slate-950/80 px-2 py-0.5 rounded self-start">
                    {item.category}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setModalItem(item);
                          setActiveModal('gallery');
                        }}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      >
                        <Edit className="w-3 h-3 text-[#2670f2]" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget({ collection: 'gallery', id: item.id, title: item.title });
                          setActiveModal('delete');
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: TESTIMONIALS */}
      {/* ==================================================================== */}
      {activeTab === 'testimonials' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Alumni Testimonials</h2>
              <p className="text-xs text-slate-400">Manage graduate quotes, avatars, and cruise line placement tags.</p>
            </div>
            <button
              onClick={() => {
                setModalItem({
                  name: '',
                  role: 'Commis de Cuisine',
                  company: 'Royal Caribbean',
                  quote: '',
                  avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=250&q=80',
                  branch_tag: 'Tagum Graduate',
                  is_published: 1
                });
                setActiveModal('testimonial');
              }}
              className="btn-primary text-xs !py-2.5 !px-4 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t) => (
              <div key={t.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-[#2670f2]" />
                    <div>
                      <h4 className="font-bold text-white text-base">{t.name}</h4>
                      <div className="text-xs text-slate-400">{t.role} • {t.company}</div>
                    </div>
                  </div>
                  <p className="text-slate-300 text-xs italic">"{t.quote}"</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <span className="text-[#2670f2] font-semibold">{t.branch_tag || t.branch}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setModalItem(t);
                        setActiveModal('testimonial');
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#2670f2]" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget({ collection: 'testimonials', id: t.id, title: t.name });
                        setActiveModal('delete');
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: FAQS */}
      {/* ==================================================================== */}
      {activeTab === 'faqs' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-400">Manage accordion Q&A content on the home page.</p>
            </div>
            <button
              onClick={() => {
                setModalItem({
                  question: '',
                  answer: '',
                  category: 'General',
                  is_published: 1
                });
                setActiveModal('faq');
              }}
              className="btn-primary text-xs !py-2.5 !px-4 flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          </div>

          <div className="space-y-4">
            {faqs.map((f, idx) => (
              <div key={f.id || idx} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] text-[#2670f2] font-bold uppercase tracking-wider">{f.category || 'General'}</span>
                  <h4 className="font-bold text-white text-base">{f.question}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{f.answer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setModalItem(f);
                      setActiveModal('faq');
                    }}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#2670f2]" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget({ collection: 'faqs', id: f.id, title: f.question });
                      setActiveModal('delete');
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 8: CONTACT & SOCIAL */}
      {/* ==================================================================== */}
      {activeTab === 'contact' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Contact Hotlines & Social Channels</h2>
              <p className="text-xs text-slate-400">Update phone numbers, email, Facebook URL, and Google Maps iframe link.</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary text-xs !py-2.5 !px-5 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Save & Publish Contact'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Headquarters Phone Hotline
              </label>
              <input
                type="text"
                value={settings.contact_hotline || ''}
                onChange={(e) => setSettings({ ...settings, contact_hotline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Official Email Address
              </label>
              <input
                type="email"
                value={settings.contact_email || ''}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Official Facebook Page URL
              </label>
              <input
                type="url"
                value={settings.contact_facebook || ''}
                onChange={(e) => setSettings({ ...settings, contact_facebook: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Business Hours Notice
              </label>
              <input
                type="text"
                value={settings.contact_hours || ''}
                onChange={(e) => setSettings({ ...settings, contact_hours: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Google Maps Embed URL (Iframe Src)
              </label>
              <input
                type="text"
                value={settings.contact_map_url || ''}
                onChange={(e) => setSettings({ ...settings, contact_map_url: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Footer Tagline
              </label>
              <input
                type="text"
                value={settings.footer_tagline || ''}
                onChange={(e) => setSettings({ ...settings, footer_tagline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-[#2670f2]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: PROGRAM EDITOR */}
      {/* ==================================================================== */}
      {activeModal === 'program' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 max-w-2xl w-full my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {modalItem.id ? 'Edit Program Card' : 'Create New Program'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={modalItem.title || ''}
                  onChange={(e) => setModalItem({ ...modalItem, title: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={modalItem.category || ''}
                  onChange={(e) => setModalItem({ ...modalItem, category: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={modalItem.badge || ''}
                  onChange={(e) => setModalItem({ ...modalItem, badge: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Duration</label>
                <input
                  type="text"
                  value={modalItem.duration || ''}
                  onChange={(e) => setModalItem({ ...modalItem, duration: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Eligibility</label>
                <input
                  type="text"
                  value={modalItem.eligibility || ''}
                  onChange={(e) => setModalItem({ ...modalItem, eligibility: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Short Description</label>
                <textarea
                  rows="2"
                  value={modalItem.short_description || ''}
                  onChange={(e) => setModalItem({ ...modalItem, short_description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Cover Image URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={modalItem.image || ''}
                    onChange={(e) => setModalItem({ ...modalItem, image: e.target.value })}
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                  <label className="px-3 py-3 rounded-xl bg-[#2670f2]/20 text-[#2670f2] border border-[#2670f2]/40 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => setModalItem({ ...modalItem, image: url }))}
                    />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Detailed Overview</label>
                <textarea
                  rows="3"
                  value={modalItem.overview || ''}
                  onChange={(e) => setModalItem({ ...modalItem, overview: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(modalItem.is_published)}
                    onChange={(e) => setModalItem({ ...modalItem, is_published: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-[#2670f2]"
                  />
                  <span>Published & Visible on Website</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleSaveItem('programs', modalItem, Boolean(modalItem.id))}
                disabled={saving || !modalItem.title}
                className="btn-primary text-xs !py-2.5 !px-5"
              >
                {saving ? 'Saving...' : 'Save Program'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: BRANCH EDITOR */}
      {/* ==================================================================== */}
      {activeModal === 'branch' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 max-w-2xl w-full my-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {modalItem.id ? 'Edit Branch Location' : 'Add New Branch Location'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={modalItem.name || ''}
                  onChange={(e) => setModalItem({ ...modalItem, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Hotlines</label>
                <input
                  type="text"
                  value={modalItem.phone || ''}
                  onChange={(e) => setModalItem({ ...modalItem, phone: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Address</label>
                <input
                  type="text"
                  value={modalItem.address || ''}
                  onChange={(e) => setModalItem({ ...modalItem, address: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Branch Email</label>
                <input
                  type="email"
                  value={modalItem.email || ''}
                  onChange={(e) => setModalItem({ ...modalItem, email: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Business Hours</label>
                <input
                  type="text"
                  value={modalItem.hours || ''}
                  onChange={(e) => setModalItem({ ...modalItem, hours: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Google Maps URL</label>
                <input
                  type="text"
                  value={modalItem.map_url || modalItem.mapUrl || ''}
                  onChange={(e) => setModalItem({ ...modalItem, map_url: e.target.value, mapUrl: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Campus Cover Image</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={modalItem.image || ''}
                    onChange={(e) => setModalItem({ ...modalItem, image: e.target.value })}
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                  <label className="px-3 py-3 rounded-xl bg-[#2670f2]/20 text-[#2670f2] border border-[#2670f2]/40 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => setModalItem({ ...modalItem, image: url }))}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleSaveItem('branches', modalItem, Boolean(modalItem.id))}
                disabled={saving || !modalItem.name}
                className="btn-primary text-xs !py-2.5 !px-5"
              >
                {saving ? 'Saving...' : 'Save Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: GALLERY EDITOR */}
      {/* ==================================================================== */}
      {activeModal === 'gallery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {modalItem.id ? 'Edit Gallery Photo' : 'Upload Gallery Photo'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Photo Title *</label>
                <input
                  type="text"
                  value={modalItem.title || ''}
                  onChange={(e) => setModalItem({ ...modalItem, title: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category Tag</label>
                <select
                  value={modalItem.category || 'Training'}
                  onChange={(e) => setModalItem({ ...modalItem, category: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="Training">Training</option>
                  <option value="Kitchen Lab">Kitchen Lab</option>
                  <option value="Orientation">Orientation</option>
                  <option value="Graduation">Graduation</option>
                  <option value="Student Activities">Student Activities</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Image URL / File</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={modalItem.image || ''}
                    onChange={(e) => setModalItem({ ...modalItem, image: e.target.value })}
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                  <label className="px-3 py-3 rounded-xl bg-[#2670f2]/20 text-[#2670f2] border border-[#2670f2]/40 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => setModalItem({ ...modalItem, image: url }))}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleSaveItem('gallery', modalItem, Boolean(modalItem.id))}
                disabled={saving || !modalItem.title || !modalItem.image}
                className="btn-primary text-xs !py-2.5 !px-5"
              >
                {saving ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: TESTIMONIAL EDITOR */}
      {/* ==================================================================== */}
      {activeModal === 'testimonial' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {modalItem.id ? 'Edit Alumni Testimonial' : 'Add Alumni Testimonial'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Alumni Name *</label>
                <input
                  type="text"
                  value={modalItem.name || ''}
                  onChange={(e) => setModalItem({ ...modalItem, name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-[#2670f2] mb-1">Job Role</label>
                  <input
                    type="text"
                    value={modalItem.role || ''}
                    onChange={(e) => setModalItem({ ...modalItem, role: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-[#2670f2] mb-1">Cruise Line Company</label>
                  <input
                    type="text"
                    value={modalItem.company || ''}
                    onChange={(e) => setModalItem({ ...modalItem, company: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Quote Statement *</label>
                <textarea
                  rows="3"
                  value={modalItem.quote || ''}
                  onChange={(e) => setModalItem({ ...modalItem, quote: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Branch Tag</label>
                <input
                  type="text"
                  value={modalItem.branch_tag || modalItem.branch || ''}
                  onChange={(e) => setModalItem({ ...modalItem, branch_tag: e.target.value, branch: e.target.value })}
                  placeholder="e.g. Tagum Branch Graduate"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Avatar Image URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={modalItem.avatar || ''}
                    onChange={(e) => setModalItem({ ...modalItem, avatar: e.target.value })}
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                  <label className="px-3 py-3 rounded-xl bg-[#2670f2]/20 text-[#2670f2] border border-[#2670f2]/40 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url) => setModalItem({ ...modalItem, avatar: url }))}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleSaveItem('testimonials', modalItem, Boolean(modalItem.id))}
                disabled={saving || !modalItem.name || !modalItem.quote}
                className="btn-primary text-xs !py-2.5 !px-5"
              >
                {saving ? 'Saving...' : 'Save Testimonial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: FAQ EDITOR */}
      {/* ==================================================================== */}
      {activeModal === 'faq' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#2670f2]/40 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {modalItem.id ? 'Edit FAQ Item' : 'Add FAQ Item'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Question *</label>
                <input
                  type="text"
                  value={modalItem.question || ''}
                  onChange={(e) => setModalItem({ ...modalItem, question: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Answer *</label>
                <textarea
                  rows="4"
                  value={modalItem.answer || ''}
                  onChange={(e) => setModalItem({ ...modalItem, answer: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleSaveItem('faqs', modalItem, Boolean(modalItem.id))}
                disabled={saving || !modalItem.question || !modalItem.answer}
                className="btn-primary text-xs !py-2.5 !px-5"
              >
                {saving ? 'Saving...' : 'Save FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ==================================================================== */}
      {activeModal === 'delete' && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/40 max-w-md w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg">Confirm Item Deletion</h3>
            <p className="text-slate-300 text-xs">
              Are you sure you want to delete <strong className="text-white">"{deleteTarget.title}"</strong> from the public website? This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg cursor-pointer"
              >
                {saving ? 'Deleting...' : 'Yes, Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
