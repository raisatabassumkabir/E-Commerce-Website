import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, maxStars = 5, size = 16, interactive = false, onRate = null }) => {
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'group' : 'img'} aria-label={`${rating} out of ${maxStars} stars`}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;

        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onClick={() => interactive && onRate?.(i + 1)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} p-0.5`}
          >
            <Star
              size={size}
              className={`transition-colors ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : partial
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'fill-transparent text-white/20'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
