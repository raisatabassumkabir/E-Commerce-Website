import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import api from '../services/api';

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Sale'];
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
const FOOTWEAR_SIZES = ['6', '7', '8', '9', '10', '11', '12'];
const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#001F5B' },
  { name: 'Camel', hex: '#C19A6B' },
  { name: 'Sage', hex: '#7DAA92' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Olive', hex: '#556B2F' },
  { name: 'Dusty Rose', hex: '#DCAE96' },
  { name: 'Indigo', hex: '#4B0082' },
  { name: 'Terracotta', hex: '#CC4E2A' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Forest Green', hex: '#228B22' },
];

const PRICE_PRESETS = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100 – $200', min: 100, max: 200 },
  { label: '$200+', min: 200, max: 500 },
];

const Section = ({ id, title, badge, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#E5E0D8] pb-5 mb-5 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between w-full text-neutral-900 hover:text-neutral-600 transition-colors mb-3 group"
      >
        <span className="text-neutral-900 font-semibold tracking-wider text-xs uppercase flex items-center gap-2">
          {title}
          {badge && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-neutral-900 text-white text-[9px] font-bold">
              {badge}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
      </button>
      {open && <div className="animate-fade-in">{children}</div>}
    </div>
  );
};

const FilterPanel = ({ filters, onChange, onClear, productCount }) => {
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    if (!filters.category) {
      setSubcategories([]);
      return;
    }
    api.get(`/products/subcategories?category=${filters.category}`)
      .then(({ data }) => setSubcategories(data.subcategories))
      .catch(() => setSubcategories([]));
  }, [filters.category]);

  const activeFilterCount = [
    filters.category, filters.subcategory, filters.size,
    filters.color, filters.minPrice || filters.maxPrice,
  ].filter(Boolean).length;

  const handleCategoryChange = (cat) => {
    if (filters.category === cat) {
      onChange('category', '');
      onChange('subcategory', '');
    } else {
      onChange('category', cat);
      onChange('subcategory', '');
    }
  };

  const handleSizeToggle = (size) => {
    const current = filters.size ? filters.size.split(',') : [];
    const updated = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];
    onChange('size', updated.join(','));
  };

  const selectedSizes = filters.size ? filters.size.split(',') : [];

  const handleColorToggle = (colorName) => {
    onChange('color', filters.color === colorName ? '' : colorName);
  };

  const handlePricePreset = (preset) => {
    if (filters.minPrice == preset.min && filters.maxPrice == preset.max) {
      onChange('minPrice', '');
      onChange('maxPrice', '');
    } else {
      onChange('minPrice', preset.min);
      onChange('maxPrice', preset.max);
    }
  };

  const sizesToShow = filters.category === 'Footwear' ? FOOTWEAR_SIZES : ALL_SIZES;

  return (
    <aside className="bg-white border border-[#E5E0D8] rounded-none p-6 sticky top-24 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-[#E5E0D8] pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-neutral-900" />
          <span className="text-neutral-900 font-semibold tracking-wider text-xs uppercase">FILTERS</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-neutral-900 text-white text-[9px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            id="filter-clear-all"
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>

      <p className="text-neutral-500 text-[10px] font-bold tracking-widest mb-6 uppercase">{productCount} items</p>

      {/* ── Category ─────────────────────────────────────────────────────────── */}
      <Section id="category" title="Category" badge={filters.category ? 1 : null}>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-3 cursor-pointer group"
              id={`filter-cat-${cat.toLowerCase()}`}
            >
              <input
                type="checkbox"
                checked={filters.category === cat}
                onChange={() => handleCategoryChange(cat)}
                className="accent-neutral-900 h-4 w-4 border-neutral-300 rounded-none cursor-pointer"
              />
              <span className="text-neutral-800 font-medium text-sm transition-colors group-hover:text-neutral-950">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* ── Subcategory */}
      {filters.category && subcategories.length > 0 && (
        <Section id="subcategory" title="Style" badge={filters.subcategory ? 1 : null}>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <button
                key={sub}
                id={`filter-sub-${sub.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => onChange('subcategory', filters.subcategory === sub ? '' : sub)}
                className={`border border-neutral-200 text-xs font-medium py-1.5 px-3 transition-all duration-150 ${
                  filters.subcategory === sub
                    ? 'bg-neutral-950 border-neutral-950 text-white'
                    : 'bg-white text-neutral-900 hover:border-neutral-900'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Availability ─────────────────────────────────────────────────────── */}
      <Section id="availability" title="Availability" defaultOpen={true}>
        <label className="flex items-center gap-3 cursor-pointer group" id="filter-in-stock">
          <input
            type="checkbox"
            checked={filters.inStockOnly === 'true'}
            onChange={() => onChange('inStockOnly', filters.inStockOnly === 'true' ? '' : 'true')}
            className="accent-neutral-900 h-4 w-4 border-neutral-300 rounded-none cursor-pointer custom-checkbox"
          />
          <span className="text-neutral-800 font-medium text-sm transition-colors group-hover:text-neutral-950">
            In Stock Only
          </span>
        </label>
      </Section>

      {/* ── Sizes ────────────────────────────────────────────────────────────── */}
      <Section id="size" title="Size" badge={selectedSizes.length || null}>
        <div className="flex flex-wrap gap-2">
          {sizesToShow.map((size) => (
            <button
              key={size}
              id={`filter-size-${size}`}
              onClick={() => handleSizeToggle(size)}
              className={`border border-neutral-200 text-xs font-medium py-2 px-3 transition-all duration-150 ${
                selectedSizes.includes(size)
                  ? 'bg-neutral-950 border-neutral-950 text-white'
                  : 'bg-white text-neutral-900 hover:border-neutral-900'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Color ────────────────────────────────────────────────────────────── */}
      <Section id="color" title="Color" badge={filters.color ? 1 : null}>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((color) => (
            <button
              key={color.name}
              id={`filter-color-${color.name.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => handleColorToggle(color.name)}
              title={color.name}
              className={`w-6 h-6 rounded-full transition-all cursor-pointer ring-2 ring-offset-2 ${
                filters.color === color.name
                  ? 'scale-110 ring-neutral-900'
                  : 'ring-transparent hover:scale-110 hover:ring-neutral-400'
              } ${color.hex === '#FFFFFF' ? 'border border-neutral-200' : ''}`}
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      </Section>

      {/* ── Price Range ──────────────────────────────────────────────────────── */}
      <Section id="price" title="Price Range" badge={(filters.minPrice || filters.maxPrice) ? 1 : null}>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRICE_PRESETS.map((preset) => {
            const active = filters.minPrice == preset.min && filters.maxPrice == preset.max;
            return (
              <button
                key={preset.label}
                id={`filter-price-preset-${preset.min}`}
                onClick={() => handlePricePreset(preset)}
                className={`border border-neutral-200 text-xs font-medium py-1.5 px-3 transition-all duration-150 ${
                  active
                    ? 'bg-neutral-950 border-neutral-950 text-white'
                    : 'bg-white text-neutral-800 hover:border-neutral-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-neutral-500 text-[10px] font-bold tracking-widest uppercase block mb-1">Min $</label>
            <input
              id="filter-price-min"
              type="number"
              min="0"
              value={filters.minPrice || ''}
              onChange={(e) => onChange('minPrice', e.target.value)}
              placeholder="0"
              className="w-full border border-neutral-200 bg-transparent py-1 px-2 text-sm text-neutral-900 rounded-none focus:outline-none focus:border-neutral-950 transition-colors"
            />
          </div>
          <span className="text-neutral-300 mt-5">—</span>
          <div className="flex-1">
            <label className="text-neutral-500 text-[10px] font-bold tracking-widest uppercase block mb-1">Max $</label>
            <input
              id="filter-price-max"
              type="number"
              min="0"
              value={filters.maxPrice || ''}
              onChange={(e) => onChange('maxPrice', e.target.value)}
              placeholder="500"
              className="w-full border border-neutral-200 bg-transparent py-1 px-2 text-sm text-neutral-900 rounded-none focus:outline-none focus:border-neutral-950 transition-colors"
            />
          </div>
        </div>
      </Section>

    </aside>
  );
};

export default FilterPanel;
