import type { CSSProperties, ReactNode } from "react";
import { theme } from "../../theme";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  style?: CSSProperties;
}

const sizeStyles: Record<"sm" | "md" | "lg", CSSProperties> = {
  sm: {
    padding: "4px 8px",
    fontSize: theme.fontSize.xs,
  },
  md: {
    padding: "8px 16px",
    fontSize: theme.fontSize.md,
  },
  lg: {
    padding: "12px 24px",
    fontSize: theme.fontSize.lg,
  },
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.text,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
  },
  ghost: {
    backgroundColor: "transparent",
    color: theme.colors.text,
  },
};

const baseStyle: CSSProperties = {
  border: "none",
  borderRadius: theme.borderRadius.md,
  cursor: "pointer",
  fontWeight: 500,
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
}: ButtonProps) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...(disabled && { opacity: 0.6, cursor: "not-allowed" }),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
