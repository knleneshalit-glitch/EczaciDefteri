import { prisma } from "@/lib/prisma";

type MinimalUser = { id: string; isSuperAdmin: boolean };

/**
 * Bir kullanıcının gruba onaylı üye olarak erişimini doğrular. Süper adminler
 * (isSuperAdmin) üye olmasalar bile her gruba yönetici yetkisiyle erişebilir
 * — programlayıcı/işletmeci için dışarıdan tam yetki sağlar.
 */
export async function requireApprovedMember(groupId: string, user: MinimalUser) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });

  if (user.isSuperAdmin) {
    return (
      membership ?? {
        id: "",
        groupId,
        userId: user.id,
        role: "MANAGER" as const,
        status: "APPROVED" as const,
        joinedAt: new Date(),
      }
    );
  }

  if (!membership || membership.status !== "APPROVED") {
    throw new Error("Bu grubun onaylı üyesi değilsiniz.");
  }
  return membership;
}
