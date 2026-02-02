import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database/db';
import Logger, { EventCategory, EventOutcome, EventType } from "../utils/logger";
import { ethers } from 'ethers';

interface SocialLoginRequest {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
  walletAddress?: string; // Optional: for linking to existing wallet
}

export default async function oauthController(fastify: FastifyInstance) {
  // Social login endpoint - handles authenticated users from AppKit
  fastify.post('/auth/social', async (request: FastifyRequest<{ Body: SocialLoginRequest }>, reply: FastifyReply) => {
    const { provider, providerId, email, name, picture, walletAddress } = request.body;
    const startTime = Date.now();

    try {
      // Validate required fields
      if (!provider || !providerId || !email) {
        return reply.code(400).send({
          success: false,
          message: "Missing required fields: provider, providerId, email"
        });
      }

      // Check if OAuth account already exists
      let oauthAccount = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider,
            providerId
          }
        },
        include: {
          User: true
        }
      });

      let userAddress: string;
      let authProvider: string;

      if (oauthAccount) {
        // Existing OAuth account - use existing user
        userAddress = oauthAccount.userId;
        authProvider = oauthAccount.User.auth_provider || provider;

        // Update OAuth account info
        await prisma.oAuthAccount.update({
          where: { id: oauthAccount.id },
          data: {
            email,
            name,
            picture,
            updatedAt: new Date()
          }
        });
      } else {
        // New OAuth account
        if (walletAddress) {
          // Link to existing wallet user
          const checksumAddress = ethers.getAddress(walletAddress);

          // Check if user exists
          const existingUser = await prisma.users.findUnique({
            where: { address: checksumAddress }
          });

          if (existingUser) {
            userAddress = checksumAddress;
            authProvider = 'hybrid';

            // Update user to hybrid auth
            await prisma.users.update({
              where: { address: checksumAddress },
              data: {
                email,
                auth_provider: 'hybrid'
              }
            });
          } else {
            // Create new user with wallet address
            userAddress = checksumAddress;
            authProvider = 'hybrid';

            await prisma.users.create({
              data: {
                address: checksumAddress,
                email,
                auth_provider: 'hybrid'
              }
            });
          }

          // Create OAuth account linked to wallet
          await prisma.oAuthAccount.create({
            data: {
              userId: userAddress,
              provider,
              providerId,
              email,
              name,
              picture
            }
          });
        } else {
          // Create new user with OAuth only (no wallet yet)
          // Generate a deterministic address from provider ID for database
          const deterministicAddress = ethers.keccak256(
            ethers.toUtf8Bytes(`${provider}:${providerId}`)
          ).slice(0, 42);

          userAddress = deterministicAddress;
          authProvider = provider;

          // Check if user already exists
          const existingUser = await prisma.users.findUnique({
            where: { address: userAddress }
          });

          if (!existingUser) {
            await prisma.users.create({
              data: {
                address: userAddress,
                email,
                auth_provider: provider
              }
            });

            // Create welcome notification
            await prisma.notifications.create({
              data: {
                sender: "system",
                receiver: userAddress,
                content: `Welcome to Aqua! You've signed in with ${provider}. Connect a wallet to unlock all features.`,
                navigate_to: "",
                is_read: false,
                created_on: new Date()
              }
            });

            // Create default settings
            await prisma.settings.create({
              data: {
                user_pub_key: userAddress,
                cli_pub_key: "",
                cli_priv_key: "",
                alchemy_key: "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ",
                witness_network: process.env.DEFAULT_WITNESS_NETWORK ?? "sepolia",
                theme: "light",
                witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            });
          }

          // Create OAuth account
          await prisma.oAuthAccount.create({
            data: {
              userId: userAddress,
              provider,
              providerId,
              email,
              name,
              picture
            }
          });
        }
      }

      // Create session
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const session = await prisma.siweSession.create({
        data: {
          address: userAddress,
          nonce,
          issuedAt: new Date(),
          expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
          provider
        }
      });

      // Get user settings
      const settingsData = await prisma.settings.findFirst({
        where: {
          user_pub_key: userAddress
        }
      });

      const duration = Date.now() - startTime;
      Logger.logAuthEvent('social-login', EventOutcome.SUCCESS, userAddress);
      Logger.logEvent('Social login successful', {
        category: EventCategory.DATABASE,
        type: EventType.CREATION,
        action: 'social-login',
        outcome: EventOutcome.SUCCESS,
        duration,
        metadata: {
          userId: userAddress,
          provider,
          authProvider
        }
      });

      return reply.code(201).send({
        success: true,
        session: {
          address: session.address,
          nonce: session.nonce,
          issued_at: session.issuedAt,
          expiration_time: session.expirationTime,
          provider: session.provider
        },
        user_settings: settingsData,
        auth_provider: authProvider
      });

    } catch (error: any) {
      Logger.error('Social login failed:', error);
      return reply.code(500).send({
        success: false,
        message: "Internal server error during social login",
        error: error.message
      });
    }
  });

  // Link wallet to existing social login account
  fastify.post('/auth/link-wallet', async (request: FastifyRequest<{ Body: { socialNonce: string, walletAddress: string } }>, reply: FastifyReply) => {
    const { socialNonce, walletAddress } = request.body;

    try {
      // Validate inputs
      if (!socialNonce || !walletAddress) {
        return reply.code(400).send({
          success: false,
          message: "Missing required fields: socialNonce, walletAddress"
        });
      }

      // Get social session
      const socialSession = await prisma.siweSession.findUnique({
        where: { nonce: socialNonce }
      });

      if (!socialSession || socialSession.provider === 'wallet') {
        return reply.code(404).send({
          success: false,
          message: "Social login session not found"
        });
      }

      const checksumAddress = ethers.getAddress(walletAddress);

      // Get OAuth account
      const oauthAccount = await prisma.oAuthAccount.findFirst({
        where: { userId: socialSession.address }
      });

      if (!oauthAccount) {
        return reply.code(404).send({
          success: false,
          message: "OAuth account not found"
        });
      }

      // Check if wallet user already exists
      const existingWalletUser = await prisma.users.findUnique({
        where: { address: checksumAddress }
      });

      if (existingWalletUser) {
        // Merge: update OAuth account to point to wallet address
        await prisma.oAuthAccount.update({
          where: { id: oauthAccount.id },
          data: {
            userId: checksumAddress
          }
        });

        // Update wallet user to hybrid
        await prisma.users.update({
          where: { address: checksumAddress },
          data: {
            email: oauthAccount.email,
            auth_provider: 'hybrid'
          }
        });

        // Delete old social-only user
        await prisma.users.delete({
          where: { address: socialSession.address }
        });
      } else {
        // Create new wallet user
        await prisma.users.create({
          data: {
            address: checksumAddress,
            email: oauthAccount.email,
            auth_provider: 'hybrid'
          }
        });

        // Update OAuth account
        await prisma.oAuthAccount.update({
          where: { id: oauthAccount.id },
          data: {
            userId: checksumAddress
          }
        });

        // Delete old social-only user
        await prisma.users.delete({
          where: { address: socialSession.address }
        });

        // Create default settings for new wallet user
        await prisma.settings.create({
          data: {
            user_pub_key: checksumAddress,
            cli_pub_key: "",
            cli_priv_key: "",
            alchemy_key: "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ",
            witness_network: process.env.DEFAULT_WITNESS_NETWORK ?? "sepolia",
            theme: "light",
            witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
          }
        });
      }

      // Update session to use wallet address
      await prisma.siweSession.update({
        where: { nonce: socialNonce },
        data: {
          address: checksumAddress,
          provider: 'hybrid'
        }
      });

      Logger.info('Wallet linked to social account successfully', {
        socialAddress: socialSession.address,
        walletAddress: checksumAddress
      });

      return reply.send({
        success: true,
        message: "Wallet linked successfully",
        address: checksumAddress
      });

    } catch (error: any) {
      Logger.error('Failed to link wallet:', error);
      return reply.code(500).send({
        success: false,
        message: "Failed to link wallet",
        error: error.message
      });
    }
  });
}
