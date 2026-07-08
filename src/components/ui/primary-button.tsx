"use client";

import React from "react";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: string;
  className?: string;
  variant?: "primary" | "secondary";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  form?: string;
}

export default function PrimaryButton({
  children,
  onClick,
  icon,
  className = "",
  variant = "primary",
  type = "button",
  disabled = false,
  form,
  ...props
}: PrimaryButtonProps) {
  const bgColor =
    variant === "primary"
      ? "bg-[#003366] hover:bg-[#002952]"
      : "bg-[#3E7DBB] hover:bg-[#2d5f8f]";

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      {...props}
      className={`px-6 py-3 ${bgColor} rounded-2xl inline-flex justify-center items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer ${className}`}
    >
      {icon && <span className={`${icon} text-2xl text-white`}></span>}
      <span className="text-white text-lg font-semibold">{children}</span>
    </button>
  );
}
