/* The supplied artwork is displayed unchanged, with a CSS viewport for compact placements. */
export function Brand() {
  return (
    <div className="brand-lockup">
      <span className="brand-art" role="img" aria-label="Logo iSev Agenda" />
      <span className="brand-word">
        <strong>
          <i>i</i>Sev<span> Agenda</span>
        </strong>
        <small>Seu tempo. Mais resultados.</small>
      </span>
    </div>
  );
}
