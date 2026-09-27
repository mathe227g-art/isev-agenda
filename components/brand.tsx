export function Brand() {
  return (
    <div className="brand-lockup">
      <span className="brand-art" role="img" aria-label="Logo iSev Agenda">
        <svg viewBox="0 0 64 68" aria-hidden="true">
          <rect
            className="brand-calendar-shell"
            x="5"
            y="8"
            width="50"
            height="51"
            rx="13"
          />
          <path
            className="brand-calendar-face"
            d="M5 26h50v20c0 7.2-5.8 13-13 13H18C10.8 59 5 53.2 5 46V26Z"
          />
          <path className="brand-calendar-ring" d="M17 5v12M43 5v12" />
          <g className="brand-calendar-days">
            <rect x="13" y="32" width="8" height="7" rx="2" />
            <rect x="25" y="32" width="8" height="7" rx="2" />
            <rect x="37" y="32" width="8" height="7" rx="2" />
            <rect x="13" y="43" width="8" height="7" rx="2" />
            <rect x="25" y="43" width="8" height="7" rx="2" />
          </g>
          <circle className="brand-calendar-check" cx="49" cy="51" r="12" />
          <path
            className="brand-calendar-tick"
            d="m43.8 51 3.5 3.5 7-8"
          />
        </svg>
      </span>
      <span className="brand-word">
        <strong>
          <i>i</i>Sev<span> Agenda</span>
        </strong>
        <small>Seu tempo. Mais resultados.</small>
      </span>
    </div>
  );
}
