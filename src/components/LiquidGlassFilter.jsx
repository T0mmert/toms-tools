/**
 * The actual refraction behind the liquid-glass widgets.
 *
 * `feDisplacementMap` physically warps the backdrop pixels, using a second
 * image as the displacement field: the red channel drives horizontal shift,
 * the green channel vertical. The field below is built so that
 *   - the outer edges run black -> red / black -> green (strong outward push)
 *   - a blurred neutral-grey rounded rect covers the middle (128,128 = no
 *     shift at all)
 * which is what makes light bend at the bevel and stay straight through the
 * centre, exactly how a real slab of glass behaves.
 *
 * Chromium honours SVG filters in `backdrop-filter`; Safari and Firefox do
 * not, and fall back to the plain blur declared alongside it.
 */

const DISPLACEMENT_MAP = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
  <defs>
    <linearGradient id="dx" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000"/>
      <stop offset="100%" stop-color="#f00"/>
    </linearGradient>
    <linearGradient id="dy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000"/>
      <stop offset="100%" stop-color="#0f0"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" fill="#808080"/>
  <rect width="120" height="120" fill="url(#dx)" style="mix-blend-mode:screen"/>
  <rect width="120" height="120" fill="url(#dy)" style="mix-blend-mode:screen"/>
  <rect x="11" y="11" width="98" height="98" rx="19" fill="#808080" style="filter:blur(11px)"/>
</svg>`;

const MAP_URI = `data:image/svg+xml;utf8,${encodeURIComponent(DISPLACEMENT_MAP)}`;

function LiquidGlassFilter() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%">
          <feImage
            href={MAP_URI}
            preserveAspectRatio="none"
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="85"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default LiquidGlassFilter;
