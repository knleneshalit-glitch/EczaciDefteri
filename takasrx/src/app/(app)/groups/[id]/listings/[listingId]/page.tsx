import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  PackageCheck,
  MessagesSquare,
  Send,
  Check,
  X,
  CircleDot,
  CheckCircle2,
  Lock,
  Unlock,
  Clock,
  XCircle,
  Pencil,
  Truck,
  Tag,
  QrCode,
  Sparkles,
  PackageSearch,
  ArrowRightLeft,
  Users,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  CopyPlus,
  History,
  Ban,
  Layers,
  Share2,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import {
  createOfferAction,
  updateOfferAction,
  respondOfferAction,
  closeListingAction,
  reopenListingAction,
  pauseListingAction,
  convertToStockAction,
  confirmOfferPriceChangeAction,
  withdrawOfferAction,
  recommendListingAction,
} from "@/app/actions/listings";
import { effectiveUnitPrice, priceWithoutVat, tierUnitPrice, reachedTier } from "@/lib/pricing";
import { statusBadgeClass } from "@/lib/status-styles";
import { closeExpiredTargetListings } from "@/lib/listings";
import { LISTING_CHANGE_LABEL } from "@/lib/listing-changes";
import { toggleFavoriteAction } from "@/app/actions/favorites";
import BackButton from "@/components/BackButton";
import MedicineImageUpload from "@/components/MedicineImageUpload";

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  HAZIRLANIYOR: "Sevkiyata Hazırlanıyor",
  TESLIM_ALINDI: "Sevkiyatçı Teslim Aldı",
  TESLIM_EDILDI: "Teslim Edildi",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
  PASSIVE: "Pasif",
};

const STATUS_ICON: Record<string, LucideIcon> = {
  OPEN: CircleDot,
  MATCHED: CheckCircle2,
  CLOSED: Lock,
  PASSIVE: PauseCircle,
};

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
};

const OFFER_STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

export default async function ListingDetailPage(
  props: PageProps<"/groups/[id]/listings/[listingId]">
) {
  const user = await requireUser();
  const { id, listingId } = await props.params;
  await requireApprovedMember(id, user);

  await closeExpiredTargetListings(id);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: true,
      targetUser: true,
      offers: { include: { user: true, shipment: true }, orderBy: { createdAt: "desc" } },
      changes: { orderBy: { createdAt: "desc" }, take: 20 },
      tiers: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!listing || listing.groupId !== id) notFound();
  if (
    listing.targetUserId &&
    listing.targetUserId !== user.id &&
    listing.userId !== user.id &&
    !user.isSuperAdmin
  ) {
    notFound();
  }

  const recommendCandidates =
    listing.status === "OPEN" && (!listing.targetUserId || listing.userId === user.id)
      ? await prisma.groupMember.findMany({
          where: { groupId: id, status: "APPROVED", userId: { notIn: [user.id, listing.userId] } },
          include: { user: { select: { id: true, pharmacyName: true, contactName: true } } },
          orderBy: { user: { pharmacyName: "asc" } },
        })
      : [];

  const isFavorite =
    (await prisma.favoriteProduct.count({
      where: { userId: user.id, medicineName: listing.medicineName },
    })) > 0;

  const approvedImage = listing.barkod
    ? await prisma.medicineImage.findFirst({
        where: { barkod: listing.barkod, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const isOwner = listing.userId === user.id;
  const myPendingOffer = listing.offers.find((o) => o.userId === user.id && o.status === "PENDING");
  const StatusIcon = STATUS_ICON[listing.status];
  const targetReached = listing.status === "OPEN" && listing.targetReachedAt != null;
  const isDepoOzelSart = listing.listingKind === "DEPO_OZEL_SART";

  let expiryWarning: { label: string; className: string } | null = null;
  if (listing.expiryDate) {
    const daysUntilExpiry = Math.ceil((listing.expiryDate.getTime() - Date.now()) / 86400000);
    if (daysUntilExpiry < 91) {
      expiryWarning = {
        label: "3 Ay Altında Miad",
        className: "border-red-400 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
      };
    } else if (daysUntilExpiry < 182) {
      expiryWarning = {
        label: "6 Ay Altında Miad",
        className: "border-orange-400 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400",
      };
    } else if (daysUntilExpiry < 365) {
      expiryWarning = {
        label: "1 Yıl Altında Miad",
        className: "border-yellow-400 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400",
      };
    }
  }

  const acceptedQty = listing.offers
    .filter((o) => o.status === "ACCEPTED")
    .reduce((sum, o) => sum + o.quantity, 0);
  const demandQty = listing.offers
    .filter((o) => o.status === "PENDING" || o.status === "ACCEPTED")
    .reduce((sum, o) => sum + o.quantity, 0);
  const demandPharmacyCount = new Set(
    listing.offers.filter((o) => o.status === "PENDING" || o.status === "ACCEPTED").map((o) => o.userId)
  ).size;
  const remaining =
    listing.totalStock != null
      ? isDepoOzelSart
        ? listing.allowExceedDemand
          ? null
          : listing.totalStock - demandQty
        : listing.totalStock - acceptedQty
      : null;
  const netFiyat = effectiveUnitPrice(listing);
  const priceChanged =
    myPendingOffer != null &&
    myPendingOffer.unitPrice != null &&
    netFiyat != null &&
    Math.abs(myPendingOffer.unitPrice - netFiyat) > 0.001;
  const hasBonus =
    listing.dealBonusQuantity != null &&
    listing.totalStock != null &&
    listing.dealBonusQuantity > 0 &&
    listing.dealBonusQuantity < listing.totalStock;

  const currentTier = reachedTier(listing.tiers, demandQty);
  const qtyStep = listing.alimKatlari ?? 1;
  const minQty = Math.max(listing.minAlim ?? 1, qtyStep);
  const convertDefaults = currentTier
    ? {
        totalStock: currentTier.alimMiktari + currentTier.mfMiktari,
        bonus: currentTier.mfMiktari,
        iskontoYuzde: currentTier.iskontoYuzde,
        iskontoTL: currentTier.iskontoTL,
      }
    : {
        totalStock: listing.totalStock,
        bonus: listing.dealBonusQuantity,
        iskontoYuzde: listing.ekstraIskontoYuzde,
        iskontoTL: listing.ekstraIndirim,
      };

  const baseMaxQty =
    remaining != null && listing.maxAlim != null
      ? Math.min(remaining, listing.maxAlim)
      : (remaining ?? listing.maxAlim ?? undefined);

  // Grupta bakiye kısıtlaması varsa kalan limite göre en fazla alınabilecek adet.
  const groupLimit = await prisma.group.findUnique({
    where: { id },
    select: { balanceLimitEnabled: true, balanceLimit: true },
  });
  let creditLeft: number | null = null;
  if (!isOwner && groupLimit?.balanceLimitEnabled && groupLimit.balanceLimit != null) {
    const [ledgerSum, pendingSum] = await Promise.all([
      prisma.ledgerEntry.aggregate({ where: { groupId: id, userId: user.id }, _sum: { amount: true } }),
      prisma.offer.aggregate({
        where: {
          userId: user.id,
          status: "PENDING",
          listing: { groupId: id },
          ...(myPendingOffer ? { id: { not: myPendingOffer.id } } : {}),
        },
        _sum: { totalPrice: true },
      }),
    ]);
    creditLeft = (ledgerSum._sum.amount ?? 0) - (pendingSum._sum.totalPrice ?? 0) + groupLimit.balanceLimit;
  }
  const creditQty =
    creditLeft != null && netFiyat
      ? Math.max(0, Math.floor(Math.floor(creditLeft / netFiyat + 1e-9) / qtyStep) * qtyStep)
      : null;
  const maxQty = creditQty != null ? Math.min(baseMaxQty ?? creditQty, creditQty) : baseMaxQty;
  const blockedByLimit = creditQty != null && creditQty < minQty;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4">
        <BackButton />
      </div>
      <div
        className={`rounded-2xl border p-4 sm:p-6 shadow-sm ${
          targetReached
            ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {approvedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={approvedImage.dataUrl}
                alt={listing.medicineName}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
            )}
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-5 w-5 shrink-0 text-violet-500" strokeWidth={1.75} />
              {listing.title}
            </h1>
            <form
              action={toggleFavoriteAction.bind(null, listing.medicineName, listing.barkod, `/groups/${id}/listings/${listingId}`)}
            >
              <button
                title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle — gruba çıkınca bildirim al"}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  isFavorite
                    ? "border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                    : "border-slate-300 text-slate-600 hover:border-amber-400 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-400 text-amber-500" : ""}`} strokeWidth={1.75} />
                {isFavorite ? "Favorilerimde" : "Favorilere Ekle"}
              </button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDepoOzelSart && (
              <span className="flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400">
                <PackageSearch className="h-3.5 w-3.5" strokeWidth={1.75} />
                Depo Özel Şartı
              </span>
            )}
            {listing.targetUser && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                Sadece {listing.targetUser.pharmacyName ?? listing.targetUser.contactName} İçin
              </span>
            )}
            {isOwner && (
              <Link
                href={`/groups/${id}/listings/${listingId}/edit`}
                className="flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-800 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                Düzenle
              </Link>
            )}
            {isOwner && (
              <Link
                href={`/groups/${id}/new?from=${listingId}`}
                className="flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                <CopyPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                Aynı Şartlarda Yeni İlan
              </Link>
            )}
            {isOwner && listing.status === "OPEN" && (
              <form action={pauseListingAction.bind(null, id, listingId)}>
                <button className="flex items-center gap-1 rounded-full border border-orange-300 dark:border-orange-800 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10">
                  <PauseCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Pasife Çek
                </button>
              </form>
            )}
            {isOwner && listing.status === "OPEN" && (
              <form action={closeListingAction.bind(null, id, listingId)}>
                <button className="flex items-center gap-1 rounded-full border border-red-300 dark:border-red-800 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  İlanı Kapat
                </button>
              </form>
            )}
            {isOwner && listing.status === "PASSIVE" && (
              <form action={reopenListingAction.bind(null, id, listingId)}>
                <button className="flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-800 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                  <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Yayına Al
                </button>
              </form>
            )}
            {isOwner && listing.status === "CLOSED" && (
              <form action={reopenListingAction.bind(null, id, listingId)}>
                <button className="flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                  <Unlock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Yeniden Yayınla
                </button>
              </form>
            )}
            {targetReached ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Hedefe Ulaşıldı
              </span>
            ) : (
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(listing.status)}`}>
                <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {STATUS_LABEL[listing.status]}
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium">İlaç:</span> {listing.medicineName}
          {listing.barkod ? ` · ${listing.barkod}` : ""}
        </p>
        {listing.quantity && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Miktar:</span> {listing.quantity}
          </p>
        )}
        {(listing.minAlim || listing.maxAlim) && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Kişi Başı:</span>{" "}
            {listing.minAlim ? `min ${listing.minAlim}` : ""}
            {listing.maxAlim ? ` · maks ${listing.maxAlim}` : ""}
          </p>
        )}
        {listing.alimKatlari && listing.alimKatlari > 1 && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Alım Katları:</span> {listing.alimKatlari} adet ve katları
          </p>
        )}
        {listing.expiryDate && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span>
              <span className="font-medium">SKT:</span>{" "}
              {listing.expiryDate.toLocaleDateString("tr-TR")}
            </span>
            {expiryWarning && (
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${expiryWarning.className}`}>
                {expiryWarning.label}
              </span>
            )}
          </p>
        )}
        {listing.description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{listing.description}</p>
        )}
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          İlan sahibi: {listing.user.pharmacyName}
        </p>
        {listing.barkod && <MedicineImageUpload barkod={listing.barkod} />}
      </div>

      {isDepoOzelSart && (
        <section className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={1.75} />
                Toplam Talep: {demandQty} adet · {demandPharmacyCount} eczane
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {isOwner
                  ? "Ürün henüz depodan temin edilmedi. Teklifler burada birikiyor, siz stoğa dönüştürene kadar Gönderimlerim ekranınıza düşmez ve kabul/red edilemez."
                  : "Ürün henüz depodan temin edilmedi. Teklifler burada birikiyor."}
                {listing.totalStock != null &&
                  (listing.allowExceedDemand
                    ? " Talep sınırsız kabul ediliyor (girilen stoğu geçebilir)."
                    : ` Talep en fazla ${listing.totalStock} adede kadar kabul edilir.`)}
              </p>
            </div>
          </div>

          {listing.tiers.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-violet-500/30 bg-white/60 dark:bg-slate-900/60">
              <p className="flex items-center gap-1.5 border-b border-violet-500/20 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Layers className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" strokeWidth={1.75} />
                Depo Kademeleri — grubun toplam talebi kademeye ulaştıkça şart iyileşir
              </p>
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5">Kademe</th>
                    <th className="px-3 py-1.5">Net Birim (KDV&apos;li / KDV&apos;siz)</th>
                    <th className="px-3 py-1.5">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.tiers.map((t) => {
                    const size = t.alimMiktari + t.mfMiktari;
                    const net = tierUnitPrice(listing.birimFiyat, t);
                    const reached = size <= demandQty;
                    const isCurrent = currentTier?.id === t.id;
                    return (
                      <tr
                        key={t.id}
                        className={`border-t border-violet-500/10 ${isCurrent ? "bg-emerald-500/10 font-semibold" : ""}`}
                      >
                        <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">
                          {t.alimMiktari}+{t.mfMiktari}
                          {t.iskontoYuzde ? ` · %${t.iskontoYuzde}` : ""}
                          {t.iskontoTL ? ` · ${t.iskontoTL.toFixed(0)} ₺` : ""}
                        </td>
                        <td className="px-3 py-1.5 text-emerald-700 dark:text-emerald-400">
                          {net != null ? `${net.toFixed(2)} ₺ / ${priceWithoutVat(net, listing.kdvOrani)!.toFixed(2)} ₺` : "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          {reached ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              ✓ Ulaşıldı{isCurrent ? " (geçerli kademe)" : ""}
                            </span>
                          ) : (
                            <span className="text-slate-500">{size - demandQty} adet talep kaldı</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {isOwner && listing.status === "OPEN" && (
            <form
              action={convertToStockAction.bind(null, id, listingId)}
              className="mt-4 rounded-lg border border-violet-500/30 bg-white/60 dark:bg-slate-900/60 p-3"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Ürünü depodan aldınız mı? Kesinleşen şartı girip stoğa dönüştürün
                {currentTier ? " (ulaşılan kademe dolduruldu)" : ""}.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <label className="text-[11px] text-slate-500">
                  Toplam Adet
                  <input
                    type="number"
                    name="finalTotalStock"
                    min={1}
                    required
                    defaultValue={convertDefaults.totalStock ?? ""}
                    className="mt-0.5 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="text-[11px] text-slate-500">
                  Bunun Kaçı MF
                  <input
                    type="number"
                    name="finalBonus"
                    min={0}
                    defaultValue={convertDefaults.bonus ?? ""}
                    className="mt-0.5 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="text-[11px] text-slate-500">
                  İskonto %
                  <input
                    type="number"
                    name="finalIskontoYuzde"
                    min={0}
                    max={100}
                    step="0.01"
                    defaultValue={convertDefaults.iskontoYuzde ?? ""}
                    className="mt-0.5 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="text-[11px] text-slate-500">
                  İskonto ₺ (toplam)
                  <input
                    type="number"
                    name="finalIskontoTL"
                    min={0}
                    step="0.01"
                    defaultValue={convertDefaults.iskontoTL ?? ""}
                    className="mt-0.5 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500">
                  <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Ürünü Temin Ettim → Stoğa Dönüştür
                </button>
                <span className="text-[11px] text-slate-500">
                  Net fiyat düşerse bekleyen teklifler yeni fiyata otomatik güncellenir.
                </span>
              </div>
            </form>
          )}
        </section>
      )}

      {netFiyat != null && (
        <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {hasBonus ? "Mal Fazlalı Depo Şartı" : "Depo Fiyatı"}
            </p>
            {hasBonus && (
              <span className="rounded-full border-2 border-orange-400 bg-orange-100 dark:bg-orange-500/20 px-3 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-400">
                {listing.totalStock! - listing.dealBonusQuantity!}+{listing.dealBonusQuantity} MF
              </span>
            )}
            {targetReached && (
              <span className="rounded-full border-2 border-red-500 bg-red-100 dark:bg-red-500/20 px-3 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">
                Hedefe Ulaşıldı
              </span>
            )}
            {listing.ekstraIskontoYuzde != null && listing.ekstraIskontoYuzde > 0 && (
              <span className="rounded-full bg-blue-100 dark:bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                %{listing.ekstraIskontoYuzde} Yüzde İskonto
              </span>
            )}
            {listing.ekstraIndirim != null && listing.ekstraIndirim > 0 && (
              <span className="rounded-full bg-purple-100 dark:bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                {listing.ekstraIndirim.toFixed(0)} ₺ Nakit İndirim
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Efektif Birim Fiyat (KDV&apos;li)</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{netFiyat.toFixed(2)} ₺</p>
              <p className="text-xs text-slate-500">
                KDV&apos;siz {priceWithoutVat(netFiyat, listing.kdvOrani)!.toFixed(2)} ₺ · KDV %{listing.kdvOrani}
              </p>
              {isDepoOzelSart && currentTier && (
                <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-400">
                  Ulaşılan kademeyle tahmini net:{" "}
                  {tierUnitPrice(listing.birimFiyat, currentTier)?.toFixed(2)} ₺ (stoğa dönüştürülünce kesinleşir)
                </p>
              )}
            </div>
            {hasBonus && listing.birimFiyat != null && (
              <div>
                <p className="text-xs text-slate-500">Depo Liste Fiyatı</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-through">
                  {listing.birimFiyat.toFixed(2)} ₺
                </p>
              </div>
            )}
            {remaining != null && (
              <div>
                <p className="text-xs text-slate-500">Kalan Stok</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{remaining} adet</p>
              </div>
            )}
          </div>
          {hasBonus && (
            <p className="mt-3 text-xs text-slate-500">
              {listing.totalStock! - listing.dealBonusQuantity!} adet parayla alınıp{" "}
              {listing.dealBonusQuantity} adet mal fazlası kazanılmış (toplam {listing.totalStock}{" "}
              adet); grup üyeleri bu sayede indirimli birim fiyattan alım yapıyor.
            </p>
          )}
        </section>
      )}

      {!isOwner && !myPendingOffer && listing.status === "OPEN" && blockedByLimit && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          Grubun bakiye kısıtlaması nedeniyle şu an bu ilana teklif veremezsiniz (kalan limitiniz{" "}
          {Math.max(0, creditLeft ?? 0).toFixed(2)} ₺). Önce cari bakiyenizi kapatın.
        </div>
      )}

      {!isOwner && !myPendingOffer && listing.status === "OPEN" && !blockedByLimit && (
        <form
          action={createOfferAction.bind(null, id, listing.id)}
          className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-500/5 p-4"
        >
          {isDepoOzelSart && (
            <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-400">
              <PackageSearch className="h-3.5 w-3.5" strokeWidth={1.75} />
              Bu, depo özel şartı için verilen bir talep. İlan sahibi ürünü temin edip stoğa
              dönüştürünce değerlendirilecek.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Alım Miktarı
              </label>
              <input
                type="number"
                name="quantity"
                required
                min={minQty}
                step={qtyStep}
                max={maxQty}
                defaultValue={minQty}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Not (opsiyonel)
              </label>
              <input
                name="message"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          {creditLeft != null && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Bakiye kısıtlaması: bu grupta en fazla {Math.max(0, creditLeft).toFixed(2)} ₺ ({creditQty} adet) alım
              yapabilirsiniz.
            </p>
          )}
          <button className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Alım Teklifi Ver
          </button>
        </form>
      )}

      {!isOwner && myPendingOffer && priceChanged && listing.status === "OPEN" && (
        <div className="mt-6 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-500/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            Bu ilanın şartları değişti
          </p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Teklif verdiğinizde birim fiyat <strong>{myPendingOffer.unitPrice?.toFixed(2)} ₺</strong> idi,
            şimdi <strong>{netFiyat?.toFixed(2)} ₺</strong> oldu. Bu yeni fiyatla devam etmek istiyor musunuz?
          </p>
          <div className="mt-3 flex gap-2">
            <form action={confirmOfferPriceChangeAction.bind(null, id, listing.id, myPendingOffer.id)}>
              <button className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                Evet, Yeni Fiyatla Devam Et
              </button>
            </form>
            <form action={withdrawOfferAction.bind(null, id, listing.id, myPendingOffer.id)}>
              <button className="flex items-center gap-1.5 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Hayır, Teklifimi İptal Et
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOwner && myPendingOffer && !priceChanged && listing.status === "OPEN" && (
        <form
          action={updateOfferAction.bind(null, id, listing.id, myPendingOffer.id)}
          className="mt-6 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-500/5 p-4"
        >
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Bu ilana verdiğiniz teklif henüz onaylanmadı — düzenleyebilirsiniz.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Alım Miktarı
              </label>
              <input
                type="number"
                name="quantity"
                required
                min={minQty}
                step={qtyStep}
                max={maxQty}
                defaultValue={myPendingOffer.quantity}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Not (opsiyonel)
              </label>
              <input
                name="message"
                defaultValue={myPendingOffer.message ?? ""}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            Teklifi Güncelle
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <MessagesSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
          Teklifler ({listing.offers.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {listing.offers.map((offer) => {
            const OfferStatusIcon = OFFER_STATUS_ICON[offer.status];
            return (
              <li key={offer.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {offer.user.pharmacyName}
                  </span>
                  <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(offer.status)}`}>
                    <OfferStatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {OFFER_STATUS_LABEL[offer.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {offer.quantity} adet
                  {offer.unitPrice != null ? ` · ${offer.unitPrice.toFixed(2)} ₺/adet` : ""}
                  {offer.totalPrice != null ? ` · Toplam: ${offer.totalPrice.toFixed(2)} ₺` : ""}
                </p>
                {offer.message && (
                  <p className="mt-1 text-sm text-slate-500">{offer.message}</p>
                )}
                {isOwner && offer.status === "PENDING" && listing.status === "OPEN" && !isDepoOzelSart && (
                  <div className="mt-2 flex gap-2">
                    <form action={respondOfferAction.bind(null, id, listing.id, offer.id, true)}>
                      <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        Kabul Et
                      </button>
                    </form>
                    <form action={respondOfferAction.bind(null, id, listing.id, offer.id, false)}>
                      <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                        Reddet
                      </button>
                    </form>
                  </div>
                )}

                {offer.status === "ACCEPTED" && (
                  <div className="mt-2 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                    {offer.shipment?.barcodesUploadedAt ? (
                      <>
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(offer.shipment.status)}`}>
                          <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {SHIPMENT_STATUS_LABEL[offer.shipment.status]}
                        </span>
                        <Link
                          href={`/groups/${id}/listings/${listingId}/offers/${offer.id}/label`}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <Tag className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Etiketi Görüntüle
                        </Link>
                      </>
                    ) : isOwner ? (
                      <Link
                        href={`/groups/${id}/listings/${listingId}/offers/${offer.id}/prepare`}
                        className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Sevkiyatı Hazırla
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">
                        İlan sahibi sevkiyatı hazırlıyor.
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {listing.offers.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Henüz teklif yok.</p>
          )}
        </ul>
      </section>

      {recommendCandidates.length > 0 && (
        <details className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Share2 className="h-4 w-4 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
            Teklif Yönlendirme — bu ilanı gruptaki bir eczaneye önerin
          </summary>
          <form action={recommendListingAction.bind(null, id, listing.id)} className="mt-3 flex flex-wrap items-end gap-2">
            <select
              name="targetUserId"
              required
              defaultValue=""
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="" disabled>
                Eczane seçin
              </option>
              {recommendCandidates.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.pharmacyName ?? m.user.contactName}
                </option>
              ))}
            </select>
            <input
              name="note"
              maxLength={200}
              placeholder="Not (opsiyonel)"
              className="min-w-[200px] flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
            />
            <button className="flex items-center gap-1.5 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
              <Share2 className="h-4 w-4" strokeWidth={1.75} />
              Yönlendir
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Seçtiğiniz eczaneye ilanın bağlantısıyla bildirim gider.</p>
        </details>
      )}

      {listing.changes.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <History className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
            Güncelleme Geçmişi ({listing.changes.length})
          </h2>
          <ol className="mt-3 flex flex-col gap-2 border-l-2 border-blue-500/30 pl-4">
            {listing.changes.map((c) => (
              <li key={c.id} className="text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {LISTING_CHANGE_LABEL[c.changeType] ?? c.changeType}
                  </span>
                  <span className="text-xs text-slate-500">
                    {c.createdAt.toLocaleString("tr-TR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Europe/Istanbul",
                    })}
                  </span>
                </p>
                {(c.oldValue || c.newValue) && (
                  <p className="whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">
                    {c.oldValue ? (
                      <>
                        <span className="line-through">{c.oldValue}</span> →{" "}
                      </>
                    ) : null}
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.newValue ?? "—"}</span>
                  </p>
                )}
                {c.note && <p className="text-xs italic text-slate-500">“{c.note}”</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
