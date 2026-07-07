import { prisma } from "./prisma";

export async function createNotification({
  userId,
  senderId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  senderId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  // Don't notify yourself
  if (senderId && userId === senderId) return null;

  return prisma.notification.create({
    data: { userId, senderId, type, title, message, link },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
