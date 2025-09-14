import * as React from "react";

export function ButtonPrimary(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium
      text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
      disabled:opacity-50 disabled:pointer-events-none ${props.className || ""}`}
    />
  );
}
