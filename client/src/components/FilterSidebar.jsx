import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Sale'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const FilterSidebar = ({ filters, onChange, onClear, productCount }) => {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    size: true,
    price: true,
  });

  const toggle = (section) =>
    setExpandedSections((p) => ({ ...p, [section]: !p[section] }));

  const Section = ({ id, title, children }) => (
    <div className="border-b border-neutral-200 pb-5 mb-5">
      <button
        onClick={() => toggle(id)}
        className="flex items-center justify-between w-full text-neutral-800 hover:text-neutral-900 transition-colors mb-3"
      >
        <span className="font-medium">{title}</span>
        {expandedSections[id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expandedSections[id] && <div className="animate-fade-in">{children}</div>}
    </div>
  );

  return (
    <aside className="glass-sm rounded-2xl p-5 sticky top-24 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand-900" />
          <span className="font-semibold text-neutral-900">Filters</span>
        </div>
        {(filters.category || filters.size || filters.minPrice || filters.maxPrice) && (
          <button
            onClick={onClear}
            id="filter-clear-btn"
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      <p className="text-neutral-500 text-sm mb-6">{productCount} products</p>

      {/* Category */}
      <Section id="category" title="Category">
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-3 cursor-pointer group"
              id={`filter-cat-${cat.toLowerCase()}`}
            >
              <input
                type="radio"
                name="category"
                value={cat}
                checked={filters.category === cat}
                onChange={() => onChange('category', filters.category === cat ? '' : cat)}
                className="w-4 h-4 accent-neutral-900 cursor-pointer"
              />
              <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors text-sm">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Size */}
      <Section id="size" title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              id={`filter-size-${size}`}
              onClick={() => onChange('size', filters.size === size ? '' : size)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 border
                ${filters.size === size
                  ? 'bg-neutral-950 border-neutral-950 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-brand-500 hover:text-neutral-900'
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Section>

      {/* Price Range */}
      <Section id="price" title="Price Range">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="label text-xs">Min ($)</label>
              <input
                id="filter-price-min"
                type="number"
                min="0"
                value={filters.minPrice || ''}
                onChange={(e) => onChange('minPrice', e.target.value)}
                placeholder="0"
                className="input text-sm py-2"
              />
            </div>
            <div className="flex-1">
              <label className="label text-xs">Max ($)</label>
              <input
                id="filter-price-max"
                type="number"
                min="0"
                value={filters.maxPrice || ''}
                onChange={(e) => onChange('maxPrice', e.target.value)}
                placeholder="500"
                className="input text-sm py-2"
              />
            </div>
          </div>
        </div>
      </Section>
    </aside>
  );
};

export default FilterSidebar;
