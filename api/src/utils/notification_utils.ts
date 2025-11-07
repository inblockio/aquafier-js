import { sendNotificationReloadToWallet } from "../controllers/websocketController2";
import { prisma } from "../database/db";


export async function createNotificationAndSendWebSocketNotification(sender: string, receiver: string, content: string, navigate_to?: string) {
    const notification = await prisma.notifications.create({
        data: {
            sender,
            receiver,
            content,
            navigate_to: navigate_to,
            is_read: false
        }
    });

    sendNotificationReloadToWallet(receiver);
    return notification;
}
