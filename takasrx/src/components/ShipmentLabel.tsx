/**
 * 60 x 40 mm termal sevkiyat etiketi. Alıcı eczane ve ürünler iri ve kalın
 * yazılır; karekod, gönderen ve kod küçük ama okunaklı kalır.
 */
export default function ShipmentLabel({
  code,
  qrDataUrl,
  senderName,
  receiver,
  items,
  date,
}: {
  code: string;
  qrDataUrl: string;
  senderName: string;
  receiver: { name: string; region: string; district: string | null };
  items: { quantity: number; name: string }[];
  date: Date;
}) {
  const visible = items.slice(0, 3);
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex h-[40mm] w-[60mm] flex-col overflow-hidden rounded-md border-2 border-black bg-white p-[1.6mm] text-black print:break-after-page print:rounded-none print:border-0">
      <div className="flex items-start gap-[1.5mm]">
        <div className="min-w-0 flex-1">
          <p className="text-[6pt] font-bold uppercase tracking-wide">Alıcı</p>
          <p className="line-clamp-2 text-[11pt] font-black uppercase leading-[1.05]">{receiver.name}</p>
          <p className="truncate text-[6.5pt] font-semibold uppercase">
            {receiver.region}
            {receiver.district ? ` / ${receiver.district}` : ""}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Sevkiyat karekodu" className="h-[15mm] w-[15mm] shrink-0" />
      </div>

      <div className="mt-[1mm] border-t-2 border-black pt-[0.8mm]">
        {visible.map((item, i) => (
          <p
            key={i}
            className={`font-extrabold uppercase leading-tight ${
              items.length === 1 ? "line-clamp-2 text-[10pt]" : "truncate text-[8.5pt]"
            }`}
          >
            {item.quantity} X {item.name}
          </p>
        ))}
        {items.length > visible.length && (
          <p className="text-[7pt] font-bold">+{items.length - visible.length} ürün daha</p>
        )}
      </div>

      <div className="mt-auto flex items-end justify-between gap-1 border-t border-black pt-[0.6mm] text-[6pt] font-semibold leading-tight">
        <span className="min-w-0 truncate">
          Gönderen: <span className="font-bold uppercase">{senderName}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono font-bold">{code}</span>
          {items.length > 1 ? `${items.length} ürün · ` : ""}
          {totalQty} adet · {date.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
        </span>
      </div>
    </div>
  );
}
