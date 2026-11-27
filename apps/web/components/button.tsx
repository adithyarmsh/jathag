// Button (design spec §3.1): primary (gold fill), quiet (card fill, field-border edge) and the
// destructive confirm (ink fill, profile delete only). Disabled = 50 % and no hover grow.
// `main` makes it the 50 px main action of a screen ("See my chart").

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "quiet" | "destructive";

export function buttonClass(variant: ButtonVariant = "primary", main = false, extra = "") {
  return ["btn", `btn-${variant}`, main ? "btn-main" : "", extra].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  main = false,
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; main?: boolean }) {
  return <button type={type} className={buttonClass(variant, main, className)} {...rest} />;
}

/** A link that looks like a button (navigation, e.g. "Go to the home page"). */
export function ButtonLink({
  href,
  id,
  variant = "primary",
  main = false,
  className = "",
  children,
}: {
  href: string;
  id?: string;
  variant?: ButtonVariant;
  main?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} id={id} className={buttonClass(variant, main, className)}>
      {children}
    </Link>
  );
}
