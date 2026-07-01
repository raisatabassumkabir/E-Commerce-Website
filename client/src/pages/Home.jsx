import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Shield, Truck } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

const DEFAULT_CATEGORY_IMAGES = {
  men: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=600',
  women: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600',
  kids: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600',
  accessories: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600',
  footwear: 'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600',
  sale: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=600',
};

const FEATURES = [
  { icon: Truck, title: 'Complimentary Shipping', desc: 'On orders above $100' },
  { icon: Shield, title: 'Secure Checkout', desc: 'Encrypted payment processing' },
  { icon: TrendingUp, title: 'Curated Quality', desc: 'Exceptional materials & fit' },
];

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedAndSettings = async () => {
      try {
        const [{ data: prodData }, { data: settingsData }] = await Promise.all([
          api.get('/products?featured=true&limit=8'),
          api.get('/settings'),
        ]);
        setFeatured(prodData.products);
        if (settingsData.success) {
          setSettings(settingsData.settings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedAndSettings();
  }, []);

  const categoriesList = [
    { name: 'Men', img: settings?.categoryImages?.men || DEFAULT_CATEGORY_IMAGES.men },
    { name: 'Women', img: settings?.categoryImages?.women || DEFAULT_CATEGORY_IMAGES.women },
    { name: 'Kids', img: settings?.categoryImages?.kids || DEFAULT_CATEGORY_IMAGES.kids },
    { name: 'Accessories', img: settings?.categoryImages?.accessories || DEFAULT_CATEGORY_IMAGES.accessories },
    { name: 'Footwear', img: settings?.categoryImages?.footwear || DEFAULT_CATEGORY_IMAGES.footwear },
    { name: 'Sale', img: settings?.categoryImages?.sale || DEFAULT_CATEGORY_IMAGES.sale },
  ];

  return (
    <div className="animate-fade-in bg-nude-50">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center border-b border-line">
        <div className="container-page relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          {/* Left Text */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-line rounded-sm mb-8 text-xs font-medium uppercase tracking-widest text-brand-900/60">
              {settings?.heroSubtitle || 'NEW COLLECTION'}
            </div>
            <h1 className="font-display font-medium text-6xl lg:text-7xl mb-8 text-balance text-brand-900 leading-tight">
              Wear What You Feel.
            </h1>
            <p className="text-brand-900/60 text-lg max-w-md mb-10 leading-relaxed font-sans">
              Curated premium clothing for every occasion. Sustainable materials, timeless style, exceptional fit.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                id="hero-shop-cta"
                onClick={() => navigate('/shop')}
                className="btn-primary btn-lg"
              >
                Shop Collection
              </button>
              <button
                onClick={() => navigate('/shop?featured=true')}
                className="btn-secondary btn-lg"
              >
                Featured Picks
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-x-10 gap-y-6 mt-16 pt-8 border-t border-line/50">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="mt-1">
                    <Icon size={16} className="text-brand-900/40" />
                  </div>
                  <div>
                    <p className="text-brand-900 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-brand-900/50 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Clean editorial layout */}
          <div className="relative hidden lg:block h-[700px]">
            <div className="absolute top-0 right-0 w-72 h-[450px] overflow-hidden shadow-elegant bg-nude-100 border border-line p-2">
              <img src={settings?.heroImageTopRight || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600"} alt="Top Right" className="w-full h-full object-cover grayscale-[20%]" />
            </div>
            <div className="absolute bottom-0 left-0 w-64 h-[400px] overflow-hidden shadow-elegant bg-white border border-line p-2 z-10">
              <img src={settings?.heroImageBottomLeft || "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600"} alt="Bottom Left" className="w-full h-full object-cover grayscale-[20%]" />
            </div>
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-48 h-64 overflow-hidden shadow-elegant border border-line p-1 bg-white z-20">
              <img src={settings?.heroImageMain || "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400"} alt="Main Foreground" className="w-full h-full object-cover grayscale-[10%]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Grid ─────────────────────────────────────────────────────── */}
      <section className="container-page py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="heading-display text-3xl mb-2">Shop by Category</h2>
            <p className="text-brand-900/50">Find your style in our curated collections</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {categoriesList.map((cat) => (
            <Link
              key={cat.name}
              to={`/shop?category=${cat.name}`}
              id={`home-cat-${cat.name.toLowerCase()}`}
              className="group block"
            >
              <div className="relative overflow-hidden aspect-[3/4] bg-nude-100 mb-4 border border-line/50">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700 grayscale-[15%]"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-900 font-medium tracking-wide uppercase text-sm">{cat.name}</span>
                <ArrowRight size={14} className="text-brand-900/30 group-hover:text-brand-900 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ──────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-line">
        <div className="container-page py-24">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="heading-display text-3xl mb-2">Featured Picks</h2>
              <p className="text-brand-900/50">Handpicked by our style team</p>
            </div>
            <Link to="/shop?featured=true" className="text-xs font-semibold uppercase tracking-widest text-brand-900 border-b border-brand-900 pb-1 hidden sm:inline-block hover:text-brand-900/60 hover:border-brand-900/60 transition-colors">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {featured.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Banner CTA ─────────────────────────────────────────────────────────── */}
      <section className="container-page py-24">
        <div className="bg-nude-200 border border-line p-16 md:p-24 text-center flex flex-col items-center">
          <h2 className="font-display font-medium text-4xl md:text-5xl mb-6 text-brand-900">
            Get 20% Off Your First Order
          </h2>
          <p className="text-brand-900/60 mb-10 text-lg max-w-lg">
            Join ThreadHaus and unlock exclusive member benefits, early access to new collections, and free shipping.
          </p>
          <Link id="home-register-cta" to="/register" className="btn-primary btn-lg">
            Create Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
