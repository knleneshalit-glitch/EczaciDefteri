"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

/** Ana sayfadaki kazanç kartları için ay/yıl seçici. */
export default function PeriodPicker({
  param,
  value,
  options,
  otherParams,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  otherParams: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
      <CalendarDays className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams({ ...otherParams, [param]: e.target.value });
          router.push(`/dashboard?${params.toString()}`, { scroll: false });
        }}
        className="bg-transparent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
