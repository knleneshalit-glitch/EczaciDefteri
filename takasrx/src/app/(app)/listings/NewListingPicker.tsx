"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function NewListingPicker({
  groups,
}: {
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  return (
    <div className="flex items-center gap-2">
      <select
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
        className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => router.push(`/groups/${groupId}/new`)}
        disabled={!groupId}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Yeni İlan Ver
      </button>
    </div>
  );
}
