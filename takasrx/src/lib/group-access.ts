import { prisma } from "@/lib/prisma";

export async function requireApprovedMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || membership.status !== "APPROVED") {
    throw new Error("Bu grubun onaylı üyesi değilsiniz.");
  }
  return membership;
}
