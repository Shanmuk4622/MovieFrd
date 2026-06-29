// Local, dependency-free image fallbacks (replaces the dead via.placeholder.com URLs).
// Encoded as inline SVG data URIs so they never trigger a network request.

const posterSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
  <rect width="500" height="750" fill="#1e293b"/>
  <g fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="170" y="285" width="160" height="160" rx="16"/>
    <path d="M250 320v90M205 365h90"/>
  </g>
  <text x="250" y="520" fill="#64748b" font-family="system-ui, sans-serif" font-size="30" font-weight="600" text-anchor="middle">No Image</text>
</svg>`;

const profileSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <rect width="200" height="300" fill="#1e293b"/>
  <g fill="#475569">
    <circle cx="100" cy="120" r="42"/>
    <path d="M40 250c0-38 27-64 60-64s60 26 60 64z"/>
  </g>
</svg>`;

const toDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;

export const POSTER_FALLBACK = toDataUri(posterSvg);
export const PROFILE_FALLBACK = toDataUri(profileSvg);

/** onError handler that swaps in a fallback once and stops further error loops. */
export const handleImageError =
  (fallback: string = POSTER_FALLBACK) =>
  (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src === fallback) return;
    img.src = fallback;
    img.onerror = null;
  };
