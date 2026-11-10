/** The Doyo wordmark, the same artwork the website uses. */
export function Wordmark() {
  return (
    <svg className="wordmark" viewBox="0 0 302 144" role="img" aria-label="Doyo">
      <g transform="translate(4 6)">
      <g fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="34" cy="68" r="26"/>
        <path d="M60 6V94"/>
        <circle cx="118" cy="68" r="26"/>
        <path d="M164 42L190 94"/>
        <path d="M216 42L173 128"/>
        <circle cx="262" cy="68" r="26"/>
      </g>
      <circle cx="262" cy="68" r="7" fill="#00BAF0"/>
      <path fill="#00BAF0" d="M27 0Q29.5 11.5 41 14Q29.5 16.5 27 28Q24.5 16.5 13 14Q24.5 11.5 27 0Z"/>
    </g>
    </svg>
  );
}
