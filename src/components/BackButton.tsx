"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  href,
  label = "Back",
}: {
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  }

  return (
    <button
      onClick={handleClick}
      className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
    >
      <span>&larr;</span> {label}
    </button>
  );
}
