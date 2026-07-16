/** Botão CTA reutilizável. Todos apontam para o mesmo checkout do produto. */

const CHECKOUT_URL =
  "https://payfast.greenn.com.br/x4tv742/offer/EH1p7y?ch_id=136193&b_id_1=n9vm2px";

type Variant = "lg" | "wide" | "base";

const variantClass: Record<Variant, string> = {
  base: "",
  lg: "btn--lg",
  wide: "btn--wide",
};

export default function Cta({
  children,
  href = CHECKOUT_URL,
  variant = "base",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <a href={href} className={`btn ${variantClass[variant]} ${className}`.trim()}>
      {children}
    </a>
  );
}
