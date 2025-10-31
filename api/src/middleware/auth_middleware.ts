import { prisma } from "../database/db";
import { FastifyReply, FastifyRequest } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {

  user?: {
    address: string;
  };
}

export async function authenticate(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<boolean> {
    const nonce = request.headers['nonce'];
    
    if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
      reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
      return false;
    }
    
    const session = await prisma.siweSession.findUnique({
      where: { nonce: nonce }
    });
    
    if (session == null) {
      reply.code(403).send({ success: false, message: "Nonce is invalid" });
      return false;
    }
    
    // Optionally attach the user info to the request for later use
    request.user = {
      address: session.address
    };
    
    return true;
  }
  
  // Register as a Fastify plugin
  export default async function authMiddleware(fastify : any) {
    fastify.decorate('authenticate', authenticate);
    
    // Create a preHandler hook that can be used across routes
    fastify.decorateRequest('user', null);
    
    // onRequest hook that runs before all route handlers
    fastify.addHook('onRequest', async (request: AuthenticatedRequest, reply: FastifyReply) => {
      // This would apply to ALL routes, which you might not want
      // Use this only if you want authentication globally
    });
  }