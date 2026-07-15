import React, { useEffect, useState } from 'react';
import {
  Save, Trash2, ImagePlus, Globe, ShieldAlert, Sparkles,
  User as UserIcon, Search, DollarSign, Truck, Package,
  Bell, Share2, FileText, BarChart3,
} from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';

const CATEGORIES = ['men', 'women', 'accessories', 'footwear', 'kids', 'sale'];

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET - New York)' },
  { value: 'America/Chicago', label: 'Central Time (CT - Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (MT - Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT - Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT - Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST - Honolulu)' },
];

const TABS = [
  { id: 'storefront', label: 'Storefront', icon: Globe },
  { id: 'commerce', label: 'Commerce', icon: DollarSign },
  { id: 'seo', label: 'SEO & Marketing', icon: Search },
  { id: 'policies', label: 'Policies & Notifications', icon: FileText },
];

// ── Reusable Components ─────────────────────────────────────────────────────

const Card = ({ icon: Icon, title, children }) => (
  <div className="bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-2xl p-6 space-y-6">
    <h2 className="text-neutral-900 font-semibold text-base flex items-center gap-2 border-b border-neutral-100 pb-3">
      <Icon size={18} className="text-brand-900" />
      {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-neutral-700">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{hint}</p>}
  </div>
);

const Toggle = ({ label, description, checked, onChange, warning }) => (
  <div className="space-y-3">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-900">{label}</label>
        {description && <p className="text-neutral-400 text-xs leading-relaxed">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer mt-1 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
      </label>
    </div>
    {warning && checked && (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2">
        <ShieldAlert size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-amber-800 text-[11px] font-medium leading-relaxed">{warning}</p>
      </div>
    )}
  </div>
);

// ── Main Component ──────────────────────────────────────────────────────────

const Settings = () => {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('storefront');

  // ── Admin Profile State ─────────────────────────────────────────────────
  const [adminName, setAdminName] = useState(user?.name || '');
  const [adminTimezone, setAdminTimezone] = useState(user?.timezone || 'America/New_York');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Storefront State ────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState('ThreadHaus');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [heroSubtitle, setHeroSubtitle] = useState('NEW SS 2026 COLLECTION');
  const [heroImageMain, setHeroImageMain] = useState('');
  const [heroImageTopRight, setHeroImageTopRight] = useState('');
  const [heroImageBottomLeft, setHeroImageBottomLeft] = useState('');
  const [categoryImages, setCategoryImages] = useState({ men: '', women: '', accessories: '', footwear: '', kids: '', sale: '' });
  const [heroFiles, setHeroFiles] = useState({ heroImageMain: null, heroImageTopRight: null, heroImageBottomLeft: null });
  const [categoryFiles, setCategoryFiles] = useState({ men: null, women: null, accessories: null, footwear: null, kids: null, sale: null });
  const [heroPreviews, setHeroPreviews] = useState({ heroImageMain: '', heroImageTopRight: '', heroImageBottomLeft: '' });
  const [categoryPreviews, setCategoryPreviews] = useState({});

  // ── SEO State ───────────────────────────────────────────────────────────
  const [seoMetaTitle, setSeoMetaTitle] = useState('');
  const [seoMetaDescription, setSeoMetaDescription] = useState('');
  const [seoOgImageUrl, setSeoOgImageUrl] = useState('');

  // ── Currency & Tax State ────────────────────────────────────────────────
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [taxRate, setTaxRate] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);

  // ── Shipping State ──────────────────────────────────────────────────────
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);
  const [shippingFlatRate, setShippingFlatRate] = useState(0);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(5);

  // ── Order Policies State ────────────────────────────────────────────────
  const [autoCancelDays, setAutoCancelDays] = useState(7);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  // ── Notification State ──────────────────────────────────────────────────
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyStatusChange, setNotifyStatusChange] = useState(false);

  // ── Social Links State ──────────────────────────────────────────────────
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');

  // ── Store Policies State ────────────────────────────────────────────────
  const [returnWindowDays, setReturnWindowDays] = useState(30);
  const [refundPolicyUrl, setRefundPolicyUrl] = useState('');
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
  const [termsUrl, setTermsUrl] = useState('');

  // ── Analytics State ─────────────────────────────────────────────────────
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');

  // ── Sync admin profile from auth store ──────────────────────────────────
  useEffect(() => {
    if (user) {
      setAdminName(user.name || '');
      setAdminTimezone(user.timezone || 'America/New_York');
    }
  }, [user]);

  // ── Fetch settings from backend ─────────────────────────────────────────
  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      if (data.success && data.settings) {
        const s = data.settings;
        // Storefront
        setStoreName(s.storeName || 'ThreadHaus');
        setMaintenanceMode(!!s.maintenanceMode);
        setHeroSubtitle(s.heroSubtitle || 'NEW SS 2026 COLLECTION');
        setHeroImageMain(s.heroImageMain || '');
        setHeroImageTopRight(s.heroImageTopRight || '');
        setHeroImageBottomLeft(s.heroImageBottomLeft || '');
        setCategoryImages(s.categoryImages || {});
        // SEO
        setSeoMetaTitle(s.seo?.metaTitle || '');
        setSeoMetaDescription(s.seo?.metaDescription || '');
        setSeoOgImageUrl(s.seo?.ogImageUrl || '');
        // Currency & Tax
        setCurrencySymbol(s.currency?.symbol || '$');
        setCurrencyCode(s.currency?.code || 'USD');
        setTaxRate(s.currency?.taxRate ?? 0);
        setTaxInclusive(!!s.currency?.taxInclusive);
        // Shipping
        setFreeShippingThreshold(s.shipping?.freeShippingThreshold ?? 0);
        setShippingFlatRate(s.shipping?.flatRate ?? 0);
        setEstimatedDeliveryDays(s.shipping?.estimatedDeliveryDays ?? 5);
        // Order Policies
        setAutoCancelDays(s.orderPolicies?.autoCancelDays ?? 7);
        setLowStockThreshold(s.orderPolicies?.lowStockThreshold ?? 5);
        // Notifications
        setNotifyNewOrder(s.notifications?.newOrderEmail ?? true);
        setNotifyLowStock(s.notifications?.lowStockEmail ?? true);
        setNotifyStatusChange(s.notifications?.statusChangeEmail ?? false);
        // Social Links
        setSocialInstagram(s.socialLinks?.instagram || '');
        setSocialTwitter(s.socialLinks?.twitter || '');
        setSocialFacebook(s.socialLinks?.facebook || '');
        setSocialTiktok(s.socialLinks?.tiktok || '');
        // Store Policies
        setReturnWindowDays(s.storePolicies?.returnWindowDays ?? 30);
        setRefundPolicyUrl(s.storePolicies?.refundPolicyUrl || '');
        setPrivacyPolicyUrl(s.storePolicies?.privacyPolicyUrl || '');
        setTermsUrl(s.storePolicies?.termsUrl || '');
        // Analytics
        setGoogleAnalyticsId(s.analytics?.googleAnalyticsId || '');
        setFacebookPixelId(s.analytics?.facebookPixelId || '');
      }
    } catch (_err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // ── Profile Save Handler ────────────────────────────────────────────────
  const handleProfileSave = async () => {
    if (!adminName.trim()) { toast.error('Name is required'); return; }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', { name: adminName, timezone: adminTimezone });
      if (data.success && data.user) {
        updateUser(data.user);
        toast.success('Admin profile updated!', { style: { background: '#1a1a27', color: '#fff' } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSavingProfile(false); }
  };

  // ── Hero / Category File Handlers ───────────────────────────────────────
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

  // ── Main Form Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();

      // Storefront
      fd.append('storeName', storeName);
      fd.append('maintenanceMode', maintenanceMode);
      fd.append('heroSubtitle', heroSubtitle);

      // Hero image files or existing URLs
      ['heroImageMain', 'heroImageTopRight', 'heroImageBottomLeft'].forEach(slot => {
        if (heroFiles[slot]) {
          fd.append(slot, heroFiles[slot]);
        } else {
          let val = '';
          if (slot === 'heroImageMain') val = heroImageMain;
          else if (slot === 'heroImageTopRight') val = heroImageTopRight;
          else val = heroImageBottomLeft;
          fd.append(`existing${slot.charAt(0).toUpperCase() + slot.slice(1)}`, val);
        }
      });

      // Category image files or existing URLs
      CATEGORIES.forEach(cat => {
        if (categoryFiles[cat]) {
          fd.append(`${cat}Image`, categoryFiles[cat]);
        } else {
          fd.append(`existing${cat.charAt(0).toUpperCase() + cat.slice(1)}Image`, categoryImages[cat] || '');
        }
      });

      // SEO
      fd.append('seoMetaTitle', seoMetaTitle);
      fd.append('seoMetaDescription', seoMetaDescription);
      fd.append('seoOgImageUrl', seoOgImageUrl);

      // Currency & Tax
      fd.append('currencySymbol', currencySymbol);
      fd.append('currencyCode', currencyCode);
      fd.append('taxRate', taxRate);
      fd.append('taxInclusive', taxInclusive);

      // Shipping
      fd.append('freeShippingThreshold', freeShippingThreshold);
      fd.append('shippingFlatRate', shippingFlatRate);
      fd.append('estimatedDeliveryDays', estimatedDeliveryDays);

      // Order Policies
      fd.append('autoCancelDays', autoCancelDays);
      fd.append('lowStockThreshold', lowStockThreshold);

      // Notifications
      fd.append('notifyNewOrder', notifyNewOrder);
      fd.append('notifyLowStock', notifyLowStock);
      fd.append('notifyStatusChange', notifyStatusChange);

      // Social Links
      fd.append('socialInstagram', socialInstagram);
      fd.append('socialTwitter', socialTwitter);
      fd.append('socialFacebook', socialFacebook);
      fd.append('socialTiktok', socialTiktok);

      // Store Policies
      fd.append('returnWindowDays', returnWindowDays);
      fd.append('refundPolicyUrl', refundPolicyUrl);
      fd.append('privacyPolicyUrl', privacyPolicyUrl);
      fd.append('termsUrl', termsUrl);

      // Analytics
      fd.append('googleAnalyticsId', googleAnalyticsId);
      fd.append('facebookPixelId', facebookPixelId);

      const { data } = await api.put('/settings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success && data.settings) {
        // Re-sync all state from response
        const s = data.settings;
        setStoreName(s.storeName || 'ThreadHaus');
        setMaintenanceMode(!!s.maintenanceMode);
        setHeroSubtitle(s.heroSubtitle || 'NEW SS 2026 COLLECTION');
        setHeroImageMain(s.heroImageMain || '');
        setHeroImageTopRight(s.heroImageTopRight || '');
        setHeroImageBottomLeft(s.heroImageBottomLeft || '');
        setCategoryImages(s.categoryImages || {});
        setSeoMetaTitle(s.seo?.metaTitle || '');
        setSeoMetaDescription(s.seo?.metaDescription || '');
        setSeoOgImageUrl(s.seo?.ogImageUrl || '');
        setCurrencySymbol(s.currency?.symbol || '$');
        setCurrencyCode(s.currency?.code || 'USD');
        setTaxRate(s.currency?.taxRate ?? 0);
        setTaxInclusive(!!s.currency?.taxInclusive);
        setFreeShippingThreshold(s.shipping?.freeShippingThreshold ?? 0);
        setShippingFlatRate(s.shipping?.flatRate ?? 0);
        setEstimatedDeliveryDays(s.shipping?.estimatedDeliveryDays ?? 5);
        setAutoCancelDays(s.orderPolicies?.autoCancelDays ?? 7);
        setLowStockThreshold(s.orderPolicies?.lowStockThreshold ?? 5);
        setNotifyNewOrder(s.notifications?.newOrderEmail ?? true);
        setNotifyLowStock(s.notifications?.lowStockEmail ?? true);
        setNotifyStatusChange(s.notifications?.statusChangeEmail ?? false);
        setSocialInstagram(s.socialLinks?.instagram || '');
        setSocialTwitter(s.socialLinks?.twitter || '');
        setSocialFacebook(s.socialLinks?.facebook || '');
        setSocialTiktok(s.socialLinks?.tiktok || '');
        setReturnWindowDays(s.storePolicies?.returnWindowDays ?? 30);
        setRefundPolicyUrl(s.storePolicies?.refundPolicyUrl || '');
        setPrivacyPolicyUrl(s.storePolicies?.privacyPolicyUrl || '');
        setTermsUrl(s.storePolicies?.termsUrl || '');
        setGoogleAnalyticsId(s.analytics?.googleAnalyticsId || '');
        setFacebookPixelId(s.analytics?.facebookPixelId || '');

        // Clear file states
        setHeroFiles({ heroImageMain: null, heroImageTopRight: null, heroImageBottomLeft: null });
        setHeroPreviews({ heroImageMain: '', heroImageTopRight: '', heroImageBottomLeft: '' });
        setCategoryFiles({ men: null, women: null, accessories: null, footwear: null, kids: null, sale: null });
        setCategoryPreviews({});

        toast.success('Settings saved successfully!', { style: { background: '#1a1a27', color: '#fff' } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-40"><Spinner size="xl" /></div>;

  // ── Tab Content Renderers ──────────────────────────────────────────────

  const renderStorefrontTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left column */}
      <div className="lg:col-span-1 space-y-6">
        <Card icon={Globe} title="General Configuration">
          <Field label="Store Name">
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="input w-full" placeholder="ThreadHaus" required />
          </Field>
          <div className="pt-2 border-t border-neutral-100/60">
            <Toggle
              label="Maintenance Mode"
              description="Temporarily shut down public checkout and storefront access for scheduled updates."
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
              warning="Warning: Activating maintenance mode will alert visitors and restrict storefront access."
            />
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="lg:col-span-2 space-y-8">
        <Card icon={Sparkles} title="Hero Section CMS">
          <Field label="Hero Subtitle">
            <input type="text" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="input w-full max-w-md" placeholder="NEW SS 2026 COLLECTION" />
          </Field>
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
                              <input type="file" accept="image/*" onChange={(e) => handleHeroFileChange(id, e)} className="hidden" />
                            </label>
                            <button type="button" onClick={() => removeHeroImage(id)} className="p-2 bg-white/95 rounded-full text-red-600 hover:bg-white shadow transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100/50 transition-colors">
                          <ImagePlus size={24} className="text-neutral-400 mb-2" />
                          <span className="text-[11px] font-medium text-neutral-500">Upload Frame Image</span>
                          <input type="file" accept="image/*" onChange={(e) => handleHeroFileChange(id, e)} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card icon={ImagePlus} title="Category Landing Banners">
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
                      <span className="px-3 py-1.5 bg-white/95 rounded-lg text-xs font-medium text-neutral-800 shadow hover:bg-white transition-colors">Swap Image</span>
                      <input type="file" accept="image/*" onChange={(e) => handleCategoryFileChange(cat, e)} className="hidden" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderCommerceTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card icon={DollarSign} title="Currency & Tax">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Currency Symbol">
            <input type="text" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="input w-full" placeholder="$" maxLength={3} />
          </Field>
          <Field label="Currency Code">
            <input type="text" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} className="input w-full" placeholder="USD" maxLength={3} />
          </Field>
        </div>
        <Field label="Tax Rate (%)" hint="Applied to all orders. Set to 0 for no tax.">
          <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="input w-full" min="0" max="100" step="0.01" />
        </Field>
        <Toggle
          label="Tax-Inclusive Pricing"
          description="When enabled, product prices already include tax."
          checked={taxInclusive}
          onChange={setTaxInclusive}
        />
      </Card>

      <Card icon={Truck} title="Shipping Configuration">
        <Field label="Free Shipping Threshold ($)" hint="Orders above this amount get free shipping. Set to 0 to disable.">
          <input type="number" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(parseFloat(e.target.value) || 0)} className="input w-full" min="0" step="0.01" />
        </Field>
        <Field label="Flat Rate Shipping Cost ($)" hint="Applied when order total is below the free shipping threshold.">
          <input type="number" value={shippingFlatRate} onChange={(e) => setShippingFlatRate(parseFloat(e.target.value) || 0)} className="input w-full" min="0" step="0.01" />
        </Field>
        <Field label="Estimated Delivery Days" hint="Shown to customers at checkout as the expected delivery window.">
          <input type="number" value={estimatedDeliveryDays} onChange={(e) => setEstimatedDeliveryDays(parseInt(e.target.value, 10) || 5)} className="input w-full" min="1" max="90" />
        </Field>
      </Card>

      <Card icon={Package} title="Order Policies">
        <Field label="Auto-Cancel Pending Orders (days)" hint="Unpaid orders will be automatically cancelled after this many days.">
          <input type="number" value={autoCancelDays} onChange={(e) => setAutoCancelDays(parseInt(e.target.value, 10) || 7)} className="input w-full" min="1" max="90" />
        </Field>
        <Field label="Low Stock Threshold" hint="Products with inventory below this number will trigger low-stock alerts on the dashboard.">
          <input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 5)} className="input w-full" min="1" max="100" />
        </Field>
      </Card>
    </div>
  );

  const renderSeoTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card icon={Search} title="SEO & Social Meta">
        <Field label="Default Meta Title" hint="Appears in search engine results and browser tabs. Max 60 characters recommended.">
          <input type="text" value={seoMetaTitle} onChange={(e) => setSeoMetaTitle(e.target.value)} className="input w-full" placeholder="ThreadHaus — Premium Clothing" maxLength={120} />
        </Field>
        <Field label="Meta Description" hint="Summarises your store for search engines. Max 160 characters recommended.">
          <textarea value={seoMetaDescription} onChange={(e) => setSeoMetaDescription(e.target.value)} className="input w-full min-h-[80px] resize-y" placeholder="Premium clothing and accessories at ThreadHaus..." maxLength={300} rows={3} />
        </Field>
        <Field label="OG Image URL" hint="Used as the preview image when your store link is shared on social media.">
          <input type="url" value={seoOgImageUrl} onChange={(e) => setSeoOgImageUrl(e.target.value)} className="input w-full" placeholder="https://yourcdn.com/og-image.jpg" />
        </Field>
      </Card>

      <Card icon={Share2} title="Social Media Links">
        <Field label="Instagram">
          <input type="url" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} className="input w-full" placeholder="https://instagram.com/threadhaus" />
        </Field>
        <Field label="Twitter / X">
          <input type="url" value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} className="input w-full" placeholder="https://x.com/threadhaus" />
        </Field>
        <Field label="Facebook">
          <input type="url" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} className="input w-full" placeholder="https://facebook.com/threadhaus" />
        </Field>
        <Field label="TikTok">
          <input type="url" value={socialTiktok} onChange={(e) => setSocialTiktok(e.target.value)} className="input w-full" placeholder="https://tiktok.com/@threadhaus" />
        </Field>
      </Card>

      <Card icon={BarChart3} title="Analytics & Tracking">
        <Field label="Google Analytics Measurement ID" hint="Format: G-XXXXXXXXXX. Leave blank to disable.">
          <input type="text" value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} className="input w-full" placeholder="G-XXXXXXXXXX" />
        </Field>
        <Field label="Facebook Pixel ID" hint="Used for Facebook/Meta ad conversion tracking. Leave blank to disable.">
          <input type="text" value={facebookPixelId} onChange={(e) => setFacebookPixelId(e.target.value)} className="input w-full" placeholder="123456789012345" />
        </Field>
      </Card>
    </div>
  );

  const renderPoliciesTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card icon={FileText} title="Store Policies">
        <Field label="Return Window (days)" hint="Number of days after delivery within which customers can request a return.">
          <input type="number" value={returnWindowDays} onChange={(e) => setReturnWindowDays(parseInt(e.target.value, 10) || 30)} className="input w-full" min="0" max="365" />
        </Field>
        <Field label="Refund Policy URL" hint="Link to your full refund policy page.">
          <input type="url" value={refundPolicyUrl} onChange={(e) => setRefundPolicyUrl(e.target.value)} className="input w-full" placeholder="https://threadhaus.com/refund-policy" />
        </Field>
        <Field label="Privacy Policy URL">
          <input type="url" value={privacyPolicyUrl} onChange={(e) => setPrivacyPolicyUrl(e.target.value)} className="input w-full" placeholder="https://threadhaus.com/privacy" />
        </Field>
        <Field label="Terms & Conditions URL">
          <input type="url" value={termsUrl} onChange={(e) => setTermsUrl(e.target.value)} className="input w-full" placeholder="https://threadhaus.com/terms" />
        </Field>
      </Card>

      <Card icon={Bell} title="Notification Preferences">
        <Toggle
          label="New Order Alerts"
          description="Receive an email notification when a new order is placed."
          checked={notifyNewOrder}
          onChange={setNotifyNewOrder}
        />
        <div className="border-t border-neutral-100/60 pt-4">
          <Toggle
            label="Low Stock Alerts"
            description="Receive an email when a product drops below the low-stock threshold."
            checked={notifyLowStock}
            onChange={setNotifyLowStock}
          />
        </div>
        <div className="border-t border-neutral-100/60 pt-4">
          <Toggle
            label="Order Status Change Alerts"
            description="Receive an email whenever an order status is updated (shipped, delivered, cancelled)."
            checked={notifyStatusChange}
            onChange={setNotifyStatusChange}
          />
        </div>
      </Card>
    </div>
  );

  const tabContentMap = {
    storefront: renderStorefrontTab,
    commerce: renderCommerceTab,
    seo: renderSeoTab,
    policies: renderPoliciesTab,
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-neutral-900 mb-1">Settings</h1>
          <p className="text-neutral-500 text-sm">Configure your store, commerce, SEO, policies, and more</p>
        </div>
        <button type="submit" disabled={saving} className="btn-primary btn-md rounded-xl shadow-md flex items-center gap-2">
          {saving ? <Spinner size="sm" color="white" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white/70 backdrop-blur-md border border-neutral-200/60 rounded-2xl p-1.5 shadow-subtle overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === id
                ? 'bg-brand-900 text-white shadow-elegant'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {tabContentMap[activeTab]()}
      </div>

      {/* Admin Profile — always visible at bottom */}
      <div className="max-w-lg">
        <Card icon={UserIcon} title="Admin Profile">
          <Field label="Display Name">
            <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="input w-full" placeholder="Admin User" required />
          </Field>
          <Field label="USA Timezone" hint="Determines the greeting displayed on your dashboard.">
            <select value={adminTimezone} onChange={(e) => setAdminTimezone(e.target.value)} className="input w-full bg-white">
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </Field>
          <div className="pt-2">
            <button type="button" onClick={handleProfileSave} disabled={savingProfile} className="btn-primary btn-sm w-full rounded-xl flex items-center justify-center gap-2">
              {savingProfile ? <Spinner size="sm" color="white" /> : <Save size={14} />}
              Update Profile
            </button>
          </div>
        </Card>
      </div>
    </form>
  );
};

export default Settings;
