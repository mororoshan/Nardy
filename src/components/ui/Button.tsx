import type { CSSProperties, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "menu"
  | "menuRejoin";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  style?: CSSProperties;
  /** Optional Tailwind classes merged with variant/size (e.g. for menu overrides). */
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-surface-elevated text-text",
  secondary: "bg-surface text-text border border-border",
  ghost: "bg-transparent text-text",
  menu: "bg-menu-button-bg text-menu-gold-muted border border-menu-gold",
  menuRejoin: "bg-menu-rejoin text-menu-gold-muted border border-menu-gold",
};

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-4 py-2 text-md",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  onClick,
  children,
  disabled = false,
  type = "button",
  title,
  style,
  className: classNameProp,
}: ButtonProps) {
  const className = [
    "border-0 rounded-md cursor-pointer font-medium",
    variantClasses[variant],
    sizeClasses[size],
    disabled && "opacity-60 cursor-not-allowed",
    classNameProp,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
