// Notifications controller for managing user notifications

import { FastifyInstance, FastifyRequest } from "fastify";
import { authenticate, AuthenticatedRequest } from "../middleware/auth_middleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function notificationsController(fastify: FastifyInstance) {
    // Get all notifications for the authenticated user
    fastify.get('/notifications', { 
        preHandler: authenticate 
    }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user?.address;
            
            if (!userAddress) {
                return reply.code(401).send({ error: 'User not authenticated' });
            }
            
            const notifications = await prisma.notifications.findMany({
                where: {
                    receiver: userAddress
                },
                orderBy: {
                    created_on: 'desc'
                }
            });
            
            return reply.code(200).send(notifications);
        } catch (error) {
            request.log.error('Error fetching notifications:', error);
            return reply.code(500).send({ error: 'Failed to fetch notifications' });
        }
    });

    // Create a new notification
    fastify.post<{
        Body: {
            receiver: string;
            content: string;
        }
    }>('/notifications', { 
        preHandler: authenticate 
    }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {
        try {
            const { receiver, content, navigate_to } = request.body as { receiver: string; content: string, navigate_to : string | undefined };
            const sender = request.user?.address;
            
            if (!sender) {
                return reply.code(401).send({ error: 'User not authenticated' });
            }
            
            if (!receiver || !content) {
                return reply.code(400).send({ error: 'Receiver and content are required' });
            }

            let nav= navigate_to
            if(navigate_to==undefined){
                nav=""
            }
            
            const notification = await prisma.notifications.create({
                data: {
                    sender,
                    receiver,
                    content,
                    navigate_to : nav ,
                    is_read: false
                }
            });
            
            return reply.code(201).send(notification);
        } catch (error) {
            request.log.error('Error creating notification:', error);
            return reply.code(500).send({ error: 'Failed to create notification' });
        }
    });

    // Mark a notification as read
    fastify.patch<{
        Params: {
            id: string;
        }
    }>('/notifications/:id/read', { 
        preHandler: authenticate 
    }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {
        try {
            const { id } = request.params as { id: string };
            const userAddress = request.user?.address;
            
            if (!userAddress) {
                return reply.code(401).send({ error: 'User not authenticated' });
            }
            
            // First check if the notification belongs to the user
            const notification = await prisma.notifications.findUnique({
                where: { id }
            });
            
            if (!notification) {
                return reply.code(404).send({ error: 'Notification not found' });
            }
            
            if (notification.receiver !== userAddress) {
                return reply.code(403).send({ error: 'Not authorized to update this notification' });
            }
            
            const updatedNotification = await prisma.notifications.update({
                where: { id },
                data: { is_read: true }
            });
            
            return reply.code(200).send(updatedNotification);
        } catch (error) {
            request.log.error('Error updating notification:', error);
            return reply.code(500).send({ error: 'Failed to update notification' });
        }
    });

    // Mark all notifications as read for the authenticated user
    fastify.patch('/notifications/read-all', { 
        preHandler: authenticate 
    }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user?.address;
            
            if (!userAddress) {
                return reply.code(401).send({ error: 'User not authenticated' });
            }
            
            await prisma.notifications.updateMany({
                where: {
                    receiver: userAddress,
                    is_read: false
                },
                data: {
                    is_read: true
                }
            });
            
            return reply.code(200).send({ message: 'All notifications marked as read' });
        } catch (error) {
            request.log.error('Error marking all notifications as read:', error);
            return reply.code(500).send({ error: 'Failed to update notifications' });
        }
    });

    // Delete a notification
    fastify.delete<{
        Params: {
            id: string;
        }
    }>('/notifications/:id', { 
        preHandler: authenticate 
    }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {
        try {
            const { id } = request.params as { id: string };
            const userAddress = request.user?.address;
            
            if (!userAddress) {
                return reply.code(401).send({ error: 'User not authenticated' });
            }
            
            // First check if the notification belongs to the user
            const notification = await prisma.notifications.findUnique({
                where: { id }
            });
            
            if (!notification) {
                return reply.code(404).send({ error: 'Notification not found' });
            }
            
            if (notification.receiver !== userAddress) {
                return reply.code(403).send({ error: 'Not authorized to delete this notification' });
            }
            
            await prisma.notifications.delete({
                where: { id }
            });
            
            return reply.code(200).send({ message: 'Notification deleted successfully' });
        } catch (error) {
            request.log.error('Error deleting notification:', error);
            return reply.code(500).send({ error: 'Failed to delete notification' });
        }
    });
}