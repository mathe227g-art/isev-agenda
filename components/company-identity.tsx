import Image from "next/image";
export function CompanyIdentity({
  name,
  logo,
  large = false,
  compact = false,
  showLabel = true,
}: {
  name: string;
  logo: string | null;
  large?: boolean;
  compact?: boolean;
  showLabel?: boolean;
}) {
  return (
    <div
      className={`company-identity ${large ? "identity-large" : ""} ${compact ? "identity-compact" : ""}`}
    >
      {logo ? (
        <Image
          unoptimized
          src={logo}
          alt={`Logo de ${name}`}
          width={72}
          height={72}
        />
      ) : (
        <span className="identity-initial">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div>
        {showLabel && (
          <small>{compact ? "Conta da empresa" : "SUA EMPRESA"}</small>
        )}
        <strong>{name}</strong>
      </div>
    </div>
  );
}
