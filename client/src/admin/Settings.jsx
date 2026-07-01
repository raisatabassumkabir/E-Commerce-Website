import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, ImagePlus, Globe, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = ['men', 'women', 'accessories', 'footwear', 'kids', 'sale'];

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [storeName, setStoreName] = useState('ThreadHaus');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [heroSubtitle, setHeroSubtitle] = useState('NEW SS 2026 COLLECTION');
  const [heroImageMain, setHeroImageMain] = useState('');
  const [heroImageTopRight, setHeroImageTopRight] = useState('');
  const [heroImageBottomLeft, setHeroImageBottomLeft] = useState('');
  const [categoryImages, setCategoryImages] = useState({
    men: '',
    women: '',
    accessories: '',
    footwear: '',
    kids: '',
    sale: '',
  });

  // State to hold new local files selected for upload
  const [heroFiles, setHeroFiles] = useState({
    heroImageMain: null,
    heroImageTopRight: null,
    heroImageBottomLeft: null,
  });
  const [categoryFiles, setCategoryFiles] = useState({
    men: null,
    women: null,
    accessories: null,
    footwear: null,
    kids: null,
    sale: null,
  });

  // Preview URLs for new local files
  const [heroPreviews, setHeroPreviews] = useState({
    heroImageMain: '',
    heroImageTopRight: '',
    heroImageBottomLeft: '',
  });
  const [categoryPreviews, setCategoryPreviews] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      if (data.success && data.settings) {
        setStoreName(data.settings.storeName || 'ThreadHaus');
        setMaintenanceMode(!!data.settings.maintenanceMode);
        setHeroSubtitle(data.settings.heroSubtitle || 'NEW SS 2026 COLLECTION');
        setHeroImageMain(data.settings.heroImageMain || '');
        setHeroImageTopRight(data.settings.heroImageTopRight || '');
        setHeroImageBottomLeft(data.settings.heroImageBottomLeft || '');
        setCategoryImages(data.settings.categoryImages || {});
      }
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleHeroFileChange = (slot, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setHeroFiles(prev => ({ ...prev, [slot]: file }));
    setHeroPreviews(prev => ({ ...prev, [slot]: URL.createObjectURL(file) }));
  };

  const removeHeroImage = (slot) => {
    setHeroFiles(prev => ({ ...prev, [slot]: null }));
    setHeroPreviews(prev => ({ ...prev, [slot]: '' }));
    if (slot === 'heroImageMain') setHeroImageMain('');
    if (slot === 'heroImageTopRight') setHeroImageTopRight('');
    if (slot === 'heroImageBottomLeft') setHeroImageBottomLeft('');
  };

  const getHeroPreview = (slot) => {
    if (heroPreviews[slot]) return heroPreviews[slot];
    if (slot === 'heroImageMain') return heroImageMain;
    if (slot === 'heroImageTopRight') return heroImageTopRight;
    return heroImageBottomLeft;
  };

  const handleCategoryFileChange = (cat, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCategoryFiles(prev => ({ ...prev, [cat]: file }));
    setCategoryPreviews(prev => ({ ...prev, [cat]: URL.createObjectURL(file) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const fd = new FormData();
      fd.append('storeName', storeName);
      fd.append('maintenanceMode', maintenanceMode);
      fd.append('heroSubtitle', heroSubtitle);

      // Append hero image files or existing URLs
      const heroSlots = ['heroImageMain', 'heroImageTopRight', 'heroImageBottomLeft'];
      heroSlots.forEach(slot => {
        if (heroFiles[slot]) {
          fd.append(slot, heroFiles[slot]);
        } else {
          let existingVal = '';
          if (slot === 'heroImageMain') existingVal = heroImageMain;
          else if (slot === 'heroImageTopRight') existingVal = heroImageTopRight;
          else existingVal = heroImageBottomLeft;
          fd.append(`existing${slot.charAt(0).toUpperCase() + slot.slice(1)}`, existingVal);
        }
      });

      // Append category images files and/or existing strings
      CATEGORIES.forEach(cat => {
        if (categoryFiles[cat]) {
          fd.append(`${cat}Image`, categoryFiles[cat]);
        } else {
          fd.append(`existing${cat.charAt(0).toUpperCase() + cat.slice(1)}Image`, categoryImages[cat] || '');
        }
      });

      const { data } = await api.put('/settings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success && data.settings) {
        setStoreName(data.settings.storeName || 'ThreadHaus');
        setMaintenanceMode(!!data.settings.maintenanceMode);
        setHeroSubtitle(data.settings.heroSubtitle || 'NEW SS 2026 COLLECTION');
        setHeroImageMain(data.settings.heroImageMain || '');
        setHeroImageTopRight(data.settings.heroImageTopRight || '');
        setHeroImageBottomLeft(data.settings.heroImageBottomLeft || '');
        setCategoryImages(data.settings.categoryImages || {});
        
        // Clear local file states
        setHeroFiles({
          heroImageMain: null,
          heroImageTopRight: null,
          heroImageBottomLeft: null,
        });
        setHeroPreviews({
          heroImageMain: '',
          heroImageTopRight: '',
          heroImageBottomLeft: '',
        });
        setCategoryFiles({
          men: null,
          women: null,
          accessories: null,
          footwear: null,
          kids: null,
          sale: null,
        });
        setCategoryPreviews({});
        
        toast.success('Settings updated successfully!', { style: { background: '#1a1a27', color: '#fff' } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-40"><Spinner size="xl" /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-display text-2xl text-neutral-900 mb-1">Storefront Settings</h1>
          <p className="text-neutral-500 text-sm">Configure Hero carousels, category imagery, and general defaults</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary btn-md rounded-xl shadow-md flex items-center gap-2"
        >
          {saving ? <Spinner size="sm" color="white" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {/* Main Glassmorphic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - General settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-2xl p-6 space-y-6">
            <h2 className="text-neutral-900 font-semibold text-base flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Globe size={18} className="text-brand-900" />
              General Configuration
            </h2>

            {/* Store Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="input w-full"
                placeholder="ThreadHaus"
                required
              />
            </div>

            {/* Maintenance Mode */}
            <div className="space-y-4 pt-2 border-t border-neutral-100/60">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-neutral-900">Maintenance Mode</label>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    Temporarily shut down public checkout and storefront access for scheduled updates.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
                </label>
              </div>

              {maintenanceMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2">
                  <ShieldAlert size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-800 text-[11px] font-medium leading-relaxed">
                    Warning: Activating maintenance mode will alert visitors and restrict storefront access.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Storefront Assets */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Content & Image Slots CMS */}
          <div className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-2xl p-6 space-y-6">
            <h2 className="text-neutral-900 font-semibold text-base flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Sparkles size={18} className="text-brand-900" />
              Hero Section CMS
            </h2>

            {/* Hero Subtitle Text Field */}
            <div className="space-y-2 max-w-md">
              <label className="block text-sm font-semibold text-neutral-700">Hero Subtitle</label>
              <input
                type="text"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="input w-full"
                placeholder="NEW SS 2026 COLLECTION"
              />
            </div>

            {/* Hero Image Slots */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-neutral-700">Hero Layout Image Slots</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { id: 'heroImageMain', label: 'Frame 1 (Main Center)', desc: 'Large foreground focal image' },
                  { id: 'heroImageTopRight', label: 'Frame 2 (Top Right Offset)', desc: 'Background right offset image' },
                  { id: 'heroImageBottomLeft', label: 'Frame 3 (Bottom Left Offset)', desc: 'Background left offset image' },
                ].map(({ id, label, desc }) => {
                  const preview = getHeroPreview(id);
                  return (
                    <div key={id} className="space-y-3">
                      <div>
                        <span className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">{label}</span>
                        <span className="block text-[11px] text-neutral-400 mt-0.5">{desc}</span>
                      </div>
                      
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 shadow-sm group">
                        {preview ? (
                          <>
                            <img src={preview} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <label className="p-2 bg-white/95 rounded-full text-neutral-800 hover:bg-white shadow cursor-pointer transition-colors">
                                <ImagePlus size={16} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleHeroFileChange(id, e)}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeHeroImage(id)}
                                className="p-2 bg-white/95 rounded-full text-red-600 hover:bg-white shadow transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100/50 transition-colors">
                            <ImagePlus size={24} className="text-neutral-400 mb-2" />
                            <span className="text-[11px] font-medium text-neutral-500">Upload Frame Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleHeroFileChange(id, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Banner Blocks */}
          <div className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-2xl p-6 space-y-6">
            <h2 className="text-neutral-900 font-semibold text-base flex items-center gap-2 border-b border-neutral-100 pb-3">
              <ImagePlus size={18} className="text-brand-900" />
              Category Landing Banners
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {CATEGORIES.map(cat => {
                const preview = categoryPreviews[cat] || categoryImages[cat];
                return (
                  <div key={cat} className="space-y-2">
                    <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">{cat}</label>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-neutral-200/80 bg-neutral-50 shadow-sm group">
                      {preview ? (
                        <img src={preview} alt={cat} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                          <ImagePlus size={20} className="mb-1" />
                          <span className="text-[10px]">No Banner Uploaded</span>
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <span className="px-3 py-1.5 bg-white/95 rounded-lg text-xs font-medium text-neutral-800 shadow hover:bg-white transition-colors">
                          Swap Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCategoryFileChange(cat, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default Settings;
