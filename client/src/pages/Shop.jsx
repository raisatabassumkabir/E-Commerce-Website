import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import FilterPanel from '../components/FilterPanel';
import Spinner from '../components/Spinner';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating-desc', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'name-asc', label: 'Name: A → Z' },
];

const DEFAULT_FILTERS = {
  category: '',
  subcategory: '',
  size: '',
  color: '',
  minPrice: '',
  maxPrice: '',
  inStockOnly: '',
};

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Debounced search term
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [localKeyword, setLocalKeyword] = useState(searchParams.get('keyword') || '');
  
  const [sort, setSort] = useState('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || '',
    size: searchParams.get('size') || '',
    color: searchParams.get('color') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    inStockOnly: searchParams.get('inStockOnly') || '',
  });

  // Debounce logic for search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(localKeyword);
    }, 400);
    return () => clearTimeout(timer);
  }, [localKeyword]);

  // Sync search keyword with URL param if it changes externally
  useEffect(() => {
    const urlKeyword = searchParams.get('keyword') || '';
    if (urlKeyword !== localKeyword) {
      setLocalKeyword(urlKeyword);
      setKeyword(urlKeyword);
    }
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, page, limit: 12 });
      if (keyword) params.set('keyword', keyword);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (searchParams.get('featured')) params.set('featured', 'true');

      const { data } = await api.get(`/products?${params.toString()}`);
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, sort, page, keyword, searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync filter changes back to URL for shareability
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    if (keyword) params.set('keyword', keyword);
    if (sort !== 'newest') params.set('sort', sort);
    setSearchParams(params, { replace: true });
  }, [filters, keyword, sort]);

  const handleFilterChange = (key, value) => {
    setFilters((p) => ({ ...p, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setLocalKeyword('');
    setKeyword('');
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (keyword ? 1 : 0);
  const pageTitle = filters.category || (keyword ? `Results for "${keyword}"` : '') || 'All Products';

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Page header */}
      <div className="mb-10 text-center">
        <h1 className="heading-display text-4xl text-brand-900 mb-2">{pageTitle}</h1>
        <p className="text-brand-900/50 text-sm uppercase tracking-widest">
          {loading ? 'Loading...' : `${total} item${total !== 1 ? 's' : ''}`}
          {filters.subcategory && <span className="text-brand-900/30"> · {filters.subcategory}</span>}
        </p>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            const labels = {
              category: value, subcategory: value,
              size: `Size: ${value}`, color: `Color: ${value}`,
              minPrice: `Min $${value}`, maxPrice: `Max $${value}`,
              inStockOnly: 'In Stock Only',
            };
            return (
              <button
                key={key}
                onClick={() => handleFilterChange(key, '')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-nude-50 border border-line text-[10px] uppercase tracking-widest text-brand-900 hover:bg-line transition-all"
              >
                {labels[key]} <X size={10} />
              </button>
            );
          })}
          {keyword && (
            <button
              onClick={() => { setLocalKeyword(''); setKeyword(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-nude-50 border border-line text-[10px] uppercase tracking-widest text-brand-900 hover:bg-line transition-all"
            >
              Search: "{keyword}" <X size={10} />
            </button>
          )}
          <button
            onClick={handleClearFilters}
            className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-brand-900/50 hover:text-brand-900 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10">
        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterPanel
            filters={filters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
            productCount={total}
          />
        </aside>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Search + Sort toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Mobile filter toggle */}
            <button
              id="mobile-filter-toggle"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden btn-secondary btn-sm flex items-center gap-2"
            >
              <SlidersHorizontal size={14} />
              <span className="text-xs uppercase tracking-widest font-semibold">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-brand-900 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-900/40 pointer-events-none" />
              <input
                id="shop-search-input"
                type="search"
                value={localKeyword}
                onChange={(e) => setLocalKeyword(e.target.value)}
                placeholder="Search products..."
                className="input pl-10 pr-4 text-sm"
              />
            </form>

            <div className="relative flex-shrink-0">
              <select
                id="shop-sort-select"
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="input appearance-none pr-10 min-w-[200px] cursor-pointer text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-900/40 pointer-events-none" />
            </div>
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="flex justify-center items-center py-40">
              <Spinner size="xl" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32 bg-white border border-line">
              <p className="text-4xl mb-4 text-brand-900/20">🔍</p>
              <p className="text-brand-900 font-medium mb-2">No items found</p>
              <p className="text-brand-900/50 text-sm mb-6">Try adjusting your filters or search terms</p>
              <button
                id="shop-clear-filters-empty"
                onClick={handleClearFilters}
                className="btn-secondary btn-md text-xs uppercase tracking-widest"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-16 flex-wrap">
                  <button
                    id="shop-prev-page"
                    disabled={page === 1}
                    onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="px-4 py-2 text-xs uppercase tracking-widest font-semibold border border-line disabled:opacity-30 bg-white hover:bg-nude-50 transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p;
                    if (totalPages <= 7) {
                      p = i + 1;
                    } else if (i === 0) {
                      p = 1;
                    } else if (i === 6) {
                      p = totalPages;
                    } else {
                      p = Math.max(2, Math.min(page - 1, totalPages - 5)) + i - 1;
                    }
                    return (
                      <button
                        key={p}
                        id={`shop-page-${p}`}
                        onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-9 h-9 text-xs font-semibold border transition-all ${
                          page === p
                            ? 'bg-brand-900 border-brand-900 text-white'
                            : 'bg-white border-line text-brand-900/60 hover:text-brand-900'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    id="shop-next-page"
                    disabled={page === totalPages}
                    onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="px-4 py-2 text-xs uppercase tracking-widest font-semibold border border-line disabled:opacity-30 bg-white hover:bg-nude-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Drawer ───────────────────────────────────────────── */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-brand-900/20 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[90vw] z-50 overflow-y-auto bg-white border-r border-line animate-slide-in-right p-5">
            <div className="flex items-center justify-between mb-5 border-b border-line pb-4">
              <h3 className="font-semibold text-xs uppercase tracking-widest text-brand-900">Filters</h3>
              <button
                id="mobile-filter-close"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 text-brand-900/50 hover:text-brand-900 transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              onChange={(k, v) => { handleFilterChange(k, v); }}
              onClear={() => { handleClearFilters(); setMobileFiltersOpen(false); }}
              productCount={total}
            />
            <button
              id="mobile-filter-apply"
              onClick={() => setMobileFiltersOpen(false)}
              className="btn-primary btn-md w-full mt-6"
            >
              Show {total} Results
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Shop;
