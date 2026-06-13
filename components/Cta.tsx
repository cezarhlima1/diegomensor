/** Botão CTA reutilizável. Todos apontam para o mesmo checkout do produto. */

const CHECKOUT_URL =
  "https://payfast.greenn.com.br/redirect/267726?utm_source=ig&utm_medium=social&utm_content=link_in_bio";

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
