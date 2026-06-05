/** Botão CTA reutilizável. Todos apontam para o mesmo checkout (# placeholder). */

type Variant = "lg" | "wide" | "base";

const variantClass: Record<Variant, string> = {
  base: "",
  lg: "btn--lg",
  wide: "btn--wide",
};

export default function Cta({
  children,
  href = "#",
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
