import type { CSSProperties, ReactNode } from "react";

const colors = {
  primary: "#6C47FF",
  primaryDark: "#5535CC",
  success: "#00C853",
  warning: "#FFB300",
  error: "#FF5252",
  bg: "#0A0A0F",
  surface: "#14141F",
  surfaceHover: "#1E1E2E",
  border: "#2A2A3C",
  text: "#F0F0F5",
  textMuted: "#8888A0",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  onClick,
  type = "button",
  style,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  const variants: Record<string, CSSProperties> = {
    primary: { background: colors.primary, color: "#fff", border: "none" },
    secondary: { background: colors.surface, color: colors.text, border: `1px solid ${colors.border}` },
    ghost: { background: "transparent", color: colors.textMuted, border: "none" },
    danger: { background: colors.error, color: "#fff", border: "none" },
  };

  const sizes: Record<string, CSSProperties> = {
    sm: { padding: "6px 12px", fontSize: "13px" },
    md: { padding: "10px 20px", fontSize: "14px" },
    lg: { padding: "14px 28px", fontSize: "16px" },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: "8px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
        fontFamily: "inherit",
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <span style={{ fontSize: "13px", color: colors.textMuted, fontWeight: 500 }}>
          {label}
          {required && <span style={{ color: colors.error }}> *</span>}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          padding: "10px 14px",
          color: colors.text,
          fontSize: "14px",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
}) {
  const variantColors: Record<string, { bg: string; text: string }> = {
    default: { bg: colors.surfaceHover, text: colors.textMuted },
    success: { bg: "#00C85320", text: colors.success },
    warning: { bg: "#FFB30020", text: colors.warning },
    error: { bg: "#FF525220", text: colors.error },
    info: { bg: "#6C47FF20", text: colors.primary },
  };

  const c = variantColors[variant];

  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${colors.border}`,
        borderTopColor: colors.primary,
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}

export { colors };
