// src/components/ui.tsx
import * as React from "react";

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">{children}</div>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white/70 shadow-sm backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-black text-white hover:bg-gray-900",
    secondary: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${props.className || ""}`}
    />
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{children}</span>;
}
