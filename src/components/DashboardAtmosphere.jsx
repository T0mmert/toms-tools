import forestImg from '../assets/dashboard-forest.webp';

// Purely decorative — a foggy pine forest (Greg Zaal / Poly Haven, CC0, via
// Wikimedia Commons) fixed behind the dashboard's glass widgets, full height.
// The gradient is layered on top in CSS (not baked into the file) so it stays
// theme-aware: darker at the top for the header, a lighter consistent tint
// for the rest — it never fades to a solid colour, since the photo is meant
// to show through everywhere the page scrolls, not just near the top.
function DashboardAtmosphere() {
  return (
    <div
      className="dashboard-atmosphere"
      style={{
        backgroundImage: `linear-gradient(180deg, var(--atmosphere-scrim-top) 0%, var(--atmosphere-scrim-mid) 100%), url(${forestImg})`,
      }}
      aria-hidden="true"
    />
  );
}

export default DashboardAtmosphere;
