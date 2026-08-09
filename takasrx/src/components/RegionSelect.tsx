import { REGIONS } from "@/lib/regions";

export default function RegionSelect({
  name,
  defaultValue,
  required = true,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
    >
      <option value="" disabled>
        Bölge seçin
      </option>
      {REGIONS.map((region) => (
        <option key={region} value={region}>
          {region}
        </option>
      ))}
    </select>
  );
}
