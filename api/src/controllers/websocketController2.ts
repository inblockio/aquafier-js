import { ClientConnection } from "../models/types";
import { FastifyInstance } from 'fastify';
import { WebSocket as WSWebSocket } from 'ws';
import Logger from "../utils/logger";

// Enhanced interface for client connection with wallet address
export interface EnhancedClientConnection extends ClientConnection {
    walletAddress?: string;
    subscriptions: Set<string>; // Topics the client is subscribed to
}

// Store for wallet address to user ID mapping
export const walletToUserMap: Map<string, string> = new Map();
export const enhancedConnectedClients: Map<string, EnhancedClientConnection> = new Map();

// Message types for WebSocket communication
export enum MessageType {
    NOTIFICATION_RELOAD = 'notification_reload',
    WALLET_UPDATE = 'wallet_update',
    CONTRACT_UPDATE = 'contract_update',
    SYSTEM_MESSAGE = 'system_message',
    SUBSCRIPTION_CONFIRM = 'subscription_confirm',
    ERROR = 'error'
}

// Interface for WebSocket messages
export interface WebSocketMessage {
    type: MessageType;
    action: string;
    data?: any;
    timestamp: number;
    targetWallet?: string;
}

// Function to send notification reload message to specific wallet address
export function sendNotificationReloadToWallet(walletAddress: string, notificationData?: any) {
    try {
        const userId = walletToUserMap.get(walletAddress);
        
        if (!userId) {
            Logger.warn(`No user found for wallet address: ${walletAddress}`);
            return { success: false, error: 'Wallet address not connected' };
        }

        const client = enhancedConnectedClients.get(userId);
        
        if (!client) {
            Logger.warn(`No client connection found for user: ${userId}`);
            walletToUserMap.delete(walletAddress); // Clean up stale mapping
            return { success: false, error: 'User not connected' };
        }

        if (client.socket.readyState === WSWebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: MessageType.NOTIFICATION_RELOAD,
                action: 'reload_notifications',
                data: notificationData || {},
                timestamp: Date.now(),
                targetWallet: walletAddress
            };

            const messageString = JSON.stringify(message);
            
            client.socket.send(messageString, (err) => {
                if (err) {
                    Logger.error(`Error sending notification reload to wallet ${walletAddress}:`, err);
                } else {
                    Logger.info(`Notification reload sent successfully to wallet ${walletAddress}`);
                }
            });

            return { success: true };
        } else {
            // Clean up disconnected client
            enhancedConnectedClients.delete(userId);
            walletToUserMap.delete(walletAddress);
            return { success: false, error: 'Client connection is closed' };
        }
    } catch (error) {
        Logger.error(`Error in sendNotificationReloadToWallet: ${error}`);
        return { success: false, error: 'Internal server error' };
    }
}

// Function to send message to wallet address with custom action
export function sendMessageToWallet(walletAddress: string, messageType: MessageType, action: string, data?: any) {
    try {
        const userId = walletToUserMap.get(walletAddress);
        
        if (!userId) {
            return { success: false, error: 'Wallet address not connected' };
        }

        const client = enhancedConnectedClients.get(userId);
        
        if (!client) {
            walletToUserMap.delete(walletAddress);
            return { success: false, error: 'User not connected' };
        }

        if (client.socket.readyState === WSWebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: messageType,
                action: action,
                data: data || {},
                timestamp: Date.now(),
                targetWallet: walletAddress
            };

            const messageString = JSON.stringify(message);
            client.socket.send(messageString);
            
            Logger.info(`Message sent to wallet ${walletAddress}: ${action}`);
            return { success: true };
        } else {
            enhancedConnectedClients.delete(userId);
            walletToUserMap.delete(walletAddress);
            return { success: false, error: 'Client connection is closed' };
        }
    } catch (error) {
        Logger.error(`Error in sendMessageToWallet: ${error}`);
        return { success: false, error: 'Internal server error' };
    }
}

// Function to broadcast to all wallets with specific message type
export function broadcastToAllWallets(messageType: MessageType, action: string, data?: any) {
    try {
        const message: WebSocketMessage = {
            type: messageType,
            action: action,
            data: data || {},
            timestamp: Date.now()
        };

        const messageString = JSON.stringify(message);
        let successCount = 0;
        let failureCount = 0;

        enhancedConnectedClients.forEach((client, userId) => {
            if (client?.socket && client.socket.readyState === WSWebSocket.OPEN) {
                client.socket.send(messageString, (err) => {
                    if (err) {
                        Logger.error(`Error broadcasting to user ${userId}:`, err);
                        failureCount++;
                    } else {
                        successCount++;
                    }
                });
            } else {
                // Clean up invalid connections
                enhancedConnectedClients.delete(userId);
                if (client?.walletAddress) {
                    walletToUserMap.delete(client.walletAddress);
                }
                failureCount++;
            }
        });

        Logger.info(`Broadcast completed: ${successCount} successful, ${failureCount} failed`);
        return { success: true, successCount, failureCount };
    } catch (error) {
        Logger.error(`Error in broadcastToAllWallets: ${error}`);
        return { success: false, error: 'Broadcast failed' };
    }
}

// Function to get connected wallets
export function getConnectedWallets(): string[] {
    return Array.from(walletToUserMap.keys());
}

// Function to get connection info for a wallet
export function getWalletConnectionInfo(walletAddress: string) {
    const userId = walletToUserMap.get(walletAddress);
    if (!userId) return null;
    
    const client = enhancedConnectedClients.get(userId);
    if (!client) return null;
    
    return {
        userId: client.userId,
        walletAddress: client.walletAddress,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions),
        isConnected: client.socket.readyState === WSWebSocket.OPEN
    };
}

export default async function enhancedWebSocketController(fastify: FastifyInstance) {
    // Enhanced WebSocket route with wallet address support
    fastify.get('/ws/notifications/:wallet_address', { websocket: true }, (connection, req) => {
        const { wallet_address } = req.params as { wallet_address: string };
        const userId = (req.query as { userId?: string })?.userId;
        const ws = connection;

        if (!userId) {
            Logger.error('WebSocket connection rejected: No user ID provided');
            ws.close(1008, 'User ID is required');
            return;
        }

        if (!wallet_address) {
            Logger.error('WebSocket connection rejected: No wallet address provided');
            ws.close(1008, 'Wallet address is required');
            return;
        }

        Logger.info(`Enhanced WebSocket client connected - User: ${userId}, Wallet: ${wallet_address}`);

        // Check if user is already connected
        if (enhancedConnectedClients.has(userId)) {
            Logger.info(`User ${userId} is already connected, closing previous connection`);
            const existingConnection = enhancedConnectedClients.get(userId);
            if (existingConnection?.walletAddress) {
                walletToUserMap.delete(existingConnection.walletAddress);
            }
            existingConnection?.socket.close(1000, 'New connection established');
        }

        // Create enhanced client connection
        const clientConnection: EnhancedClientConnection = {
            socket: ws,
            userId: userId,
            walletAddress: wallet_address,
            connectedAt: new Date(),
            subscriptions: new Set(['notifications']) // Default subscription
        };

        // Store connections
        enhancedConnectedClients.set(userId, clientConnection);
        walletToUserMap.set(wallet_address, userId);

        // Send connection confirmation
        const confirmMessage: WebSocketMessage = {
            type: MessageType.SUBSCRIPTION_CONFIRM,
            action: 'connection_established',
            data: {
                userId: userId,
                walletAddress: wallet_address,
                subscriptions: Array.from(clientConnection.subscriptions)
            },
            timestamp: Date.now()
        };

        ws.send(JSON.stringify(confirmMessage));

        // Handle incoming messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                Logger.info(`Received message from ${wallet_address}:`, message);

                // Handle subscription management
                if (message.action === 'subscribe') {
                    const topic = message.topic;
                    if (topic) {
                        clientConnection.subscriptions.add(topic);
                        const response: WebSocketMessage = {
                            type: MessageType.SUBSCRIPTION_CONFIRM,
                            action: 'subscribed',
                            data: { topic },
                            timestamp: Date.now()
                        };
                        ws.send(JSON.stringify(response));
                        Logger.info(`Wallet ${wallet_address} subscribed to ${topic}`);
                    }
                } else if (message.action === 'unsubscribe') {
                    const topic = message.topic;
                    if (topic) {
                        clientConnection.subscriptions.delete(topic);
                        const response: WebSocketMessage = {
                            type: MessageType.SUBSCRIPTION_CONFIRM,
                            action: 'unsubscribed',
                            data: { topic },
                            timestamp: Date.now()
                        };
                        ws.send(JSON.stringify(response));
                        Logger.info(`Wallet ${wallet_address} unsubscribed from ${topic}`);
                    }
                }
            } catch (error) {
                Logger.error(`Error processing message from ${wallet_address}:`, error);
                const errorMessage: WebSocketMessage = {
                    type: MessageType.ERROR,
                    action: 'message_error',
                    data: { error: 'Invalid message format' },
                    timestamp: Date.now()
                };
                ws.send(JSON.stringify(errorMessage));
            }
        });

        // Handle connection close
        ws.on('close', (code, reason) => {
            Logger.info(`WebSocket connection closed for wallet ${wallet_address} - Code: ${code}, Reason: ${reason}`);
            enhancedConnectedClients.delete(userId);
            walletToUserMap.delete(wallet_address);
        });

        // Handle connection errors
        ws.on('error', (error) => {
            Logger.error(`WebSocket error for wallet ${wallet_address}:`, error);
            enhancedConnectedClients.delete(userId);
            walletToUserMap.delete(wallet_address);
        });
    });

    // REST endpoint to trigger notification reload for specific wallet
    fastify.post('/api/notifications/:wallet_address', async (request, reply) => {
        const { wallet_address } = request.params as { wallet_address: string };
        const { data } = request.body as { data?: any };

        const result = sendNotificationReloadToWallet(wallet_address, data);
        
        if (result.success) {
            return reply.code(200).send({
                success: true,
                message: `Notification reload sent to wallet ${wallet_address}`
            });
        } else {
            return reply.code(404).send({
                success: false,
                error: result.error
            });
        }
    });

    // REST endpoint to send custom message to wallet
    fastify.post('/api/wallet/message/:wallet_address', async (request, reply) => {
        const { wallet_address } = request.params as { wallet_address: string };
        const { messageType, action, data } = request.body as { 
            messageType: MessageType; 
            action: string; 
            data?: any 
        };

        if (!messageType || !action) {
            return reply.code(400).send({
                success: false,
                error: 'messageType and action are required'
            });
        }

        const result = sendMessageToWallet(wallet_address, messageType, action, data);
        
        if (result.success) {
            return reply.code(200).send({
                success: true,
                message: `Message sent to wallet ${wallet_address}`
            });
        } else {
            return reply.code(404).send({
                success: false,
                error: result.error
            });
        }
    });

    // REST endpoint to get connected wallets
    fastify.get('/api/wallets/connected', async (request, reply) => {
        const connectedWallets = getConnectedWallets();
        return reply.code(200).send({
            success: true,
            wallets: connectedWallets,
            count: connectedWallets.length
        });
    });

    // REST endpoint to get wallet connection info
    fastify.get('/api/wallet/info/:wallet_address', async (request, reply) => {
        const { wallet_address } = request.params as { wallet_address: string };
        const info = getWalletConnectionInfo(wallet_address);
        
        if (info) {
            return reply.code(200).send({
                success: true,
                connectionInfo: info
            });
        } else {
            return reply.code(404).send({
                success: false,
                error: 'Wallet not connected'
            });
        }
    });
}
