/** Stroke icon from a path on the 20x20 grid used by the page registry. */
function PageIcon({ d, strokeWidth = 1.6 }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default PageIcon;
