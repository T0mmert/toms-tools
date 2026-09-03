const PATHS = {
  sun: (
    <>
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.2V4M10 16V17.8M17.8 10H16M4 10H2.2M15.5 4.5L14.2 5.8M5.8 14.2L4.5 15.5M15.5 15.5L14.2 14.2M5.8 5.8L4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  'cloud-sun': (
    <>
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 2v1.3M11.5 7H10.2M3.8 7H2.5M10 4l-.9.9M4.9 9.1L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6 17h8a3.2 3.2 0 0 0 .5-6.36 4 4 0 0 0-7.6-1.2A3.5 3.5 0 0 0 6 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  cloud: (
    <path
      d="M5.5 16h9a3.2 3.2 0 0 0 .5-6.36 4 4 0 0 0-7.6-1.2A3.5 3.5 0 0 0 5.5 16Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  fog: (
    <>
      <path d="M5.5 12.5h9a3 3 0 0 0 .3-6 3.8 3.8 0 0 0-7.2-1.1A3.3 3.3 0 0 0 5.5 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3.5 15.5h13M4.5 18h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  drizzle: (
    <>
      <path d="M5.5 11.5h9a3 3 0 0 0 .3-6 3.8 3.8 0 0 0-7.2-1.1A3.3 3.3 0 0 0 5.5 11.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 14.5v2M10 14.5v2M13 14.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  rain: (
    <>
      <path d="M5.5 11h9a3 3 0 0 0 .3-6 3.8 3.8 0 0 0-7.2-1.1A3.3 3.3 0 0 0 5.5 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 14L5.5 17M10.5 14L9.5 17M14.5 14L13.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  snow: (
    <>
      <path d="M5.5 10.5h9a3 3 0 0 0 .3-6 3.8 3.8 0 0 0-7.2-1.1A3.3 3.3 0 0 0 5.5 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 14v3M10 14v3M13 14v3M6 15.5l2-1M8 16.5l2 1M9 15.5l2-1M11 16.5l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  storm: (
    <>
      <path d="M5.5 10.5h9a3 3 0 0 0 .3-6 3.8 3.8 0 0 0-7.2-1.1A3.3 3.3 0 0 0 5.5 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10.5 13.5L8 17h3l-1.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

function WeatherIcon({ name, className }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      {PATHS[name] || PATHS.cloud}
    </svg>
  );
}

export default WeatherIcon;
