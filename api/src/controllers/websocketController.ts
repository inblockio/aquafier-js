
// import { ClientConnection,  } from "../server";
import { connectedClients } from "../store/store";
import { ClientConnection } from "../models/types";
import { FastifyInstance } from 'fastify';
import { WebSocket as WSWebSocket } from 'ws';

// Define SocketStream manually
export interface SocketStream {
    socket: WSWebSocket;
    raw: import('http').IncomingMessage;
}
// Function to broadcast message to all connected clients
export function broadcastToAllClients(action: string) {
    try {
        let message = {
            "action": action
        }
        const messageString = JSON.stringify(message);

        connectedClients.forEach((client, userId) => {

            if (client?.socket && client.socket.readyState === WebSocket.OPEN) {
                console.log(`Pinging clients ${userId} `)
                client.socket.send(messageString, (err) => {
                    if (err) {
                        console.error(`Error sending message to user ${userId}:`, err);
                    } else {
                        console.log(`Message sent successfully to user ${userId}`);
                    }
                });
            } else {
                // Remove invalid or disconnected clients

                console.warn(`Removing invalid or disconnected client: ${userId}`);
                connectedClients.delete(userId);
            }
        });
    } catch (e) {
        console.log(`WebSocket BroadcastToAllClients  failed :${e} `);
    }
}

// Function to send message to specific user
export function sendToUserWebsockerAMessage(userId: string, action: string) {
    const client = connectedClients.get(userId);

    if (!client) {
        return { success: false, error: 'User not connected' };
    }

    if (client.socket.readyState === WSWebSocket.OPEN) {
        let message = {
            "action": action
        }
        const messageString = JSON.stringify(message);

        client.socket.send(messageString);
        return { success: true };
    } else {
        connectedClients.delete(userId);
        return { success: false, error: 'User connection is closed' };
    }
}

// Function to send message to multiple users
export function sendToManyUsersWebocketAMessage(userIds: string[], message: string) {
    const results: { [userId: string]: { success: boolean; error?: string } } = {};
    const messageString = JSON.stringify(message);

    userIds.forEach(userId => {
        const client = connectedClients.get(userId);

        if (!client) {
            results[userId] = { success: false, error: 'User not connected' };
            return;
        }

        if (client.socket.readyState === WSWebSocket.OPEN) {
            client.socket.send(messageString);
            results[userId] = { success: true };
        } else {
            connectedClients.delete(userId);
            results[userId] = { success: false, error: 'User connection is closed' };
        }
    });

    return results;
}

export default async function webSocketController(fastify: FastifyInstance) {
    // WebSocket route
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        // Extract user ID from query parameters
        // const userId = (req.query as any)?.userId;
        const userId = (req.query as { userId?: string })?.userId;

        const ws = connection;

        if (!userId) {
            console.log('WebSocket connection rejected: No user ID provided');
            ws.close(1008, 'User ID is required');
            return;
        }

        console.log(`Client connected to WebSocket with user ID: ${userId}`);

        // Check if user is already connected
        if (connectedClients.has(userId)) {
            console.log(`User ${userId} is already connected, closing previous connection`);
            const existingConnection = connectedClients.get(userId);
            existingConnection?.socket.close(1000, 'New connection established');
        }

        // Add client to connected clients map
        const clientConnection: ClientConnection = {
            socket: ws,
            userId: userId,
            connectedAt: new Date()
        };
        connectedClients.set(userId, clientConnection);

        ws.on('message', (message) => {
            console.log(`Received message from user ${userId}:`, message.toString());

            try {
                const parsedMessage = JSON.parse(message.toString());

                // Handle different message types
                if (parsedMessage.type === 'ping') {
                    // Respond to ping with pong
                    ws.send(JSON.stringify({
                        type: 'pong',
                        data: 'Server is alive',
                        timestamp: new Date().toISOString(),
                        userId: userId
                    }));
                } else {
                    // Echo message back to client
                    ws.send(JSON.stringify({
                        type: 'echo',
                        data: parsedMessage,
                        timestamp: new Date().toISOString(),
                        userId: userId
                    }));
                }
            } catch (error) {
                // Handle non-JSON messages
                ws.send(JSON.stringify({
                    type: 'echo',
                    data: message.toString(),
                    timestamp: new Date().toISOString(),
                    userId: userId
                }));
            }
        });

        ws.on('close', () => {
            console.log(`Client ${userId} disconnected from WebSocket`);
            connectedClients.delete(userId);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for user ${userId}:`, error);
            connectedClients.delete(userId);
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'welcome',
            data: `Connected to WebSocket server as user ${userId}`,
            timestamp: new Date().toISOString(),
            userId: userId,
            connectedClients: connectedClients.size
        }));
    });


    // Get connected clients information
    fastify.get('/ws/clients', async (request, reply) => {
        const clientsInfo = Array.from(connectedClients.entries()).map(([userId, client]) => ({
            userId: userId,
            connectedAt: client.connectedAt,
            connectionDuration: Date.now() - client.connectedAt.getTime()
        }));

        return {
            connectedClients: connectedClients.size,
            clients: clientsInfo,
            timestamp: new Date().toISOString()
        };
    });

    // Get connected clients information
    fastify.get('/ping/all', async (request, reply) => {

        broadcastToAllClients("ping all conections get request ")
        return reply.code(200).send({
            data: "ping all"
        });
    });
}