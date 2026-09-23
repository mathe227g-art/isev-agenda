import Image from "next/image";
export function CompanyIdentity({
  name,
  logo,
  large = false,
}: {
  name: string;
  logo: string | null;
  large?: boolean;
}) {
  return (
    <div className={`company-identity ${large ? "identity-large" : ""}`}>
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
        <small>SUA EMPRESA</small>
        <strong>{name}</strong>
      </div>
    </div>
  );
}
