import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create subscription plans
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      display_name: 'Free Plan',
      description: 'Perfect for getting started with basic features',
      price_monthly_usd: 0,
      price_yearly_usd: 0,
      crypto_monthly_price_usd: 0,
      crypto_yearly_price_usd: 0,
      max_storage_gb: 1,
      max_files: 50,
      max_contracts: 10,
      max_templates: 3,
      features: {
        cloud_storage: true,
        file_versioning: false,
        advanced_templates: false,
        priority_support: false,
        custom_branding: false,
        api_access: false,
        team_collaboration: false,
        analytics_dashboard: false,
      },
      sort_order: 1,
      is_active: true,
      is_public: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      name: 'pro',
      display_name: 'Professional Plan',
      description: 'Advanced features for professionals and small teams',
      price_monthly_usd: 29.99,
      price_yearly_usd: 299.99, // ~16% discount
      crypto_monthly_price_usd: 29.99,
      crypto_yearly_price_usd: 299.99,
      stripe_monthly_price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null,
      stripe_yearly_price_id: process.env.STRIPE_PRO_YEARLY_PRICE_ID || null,
      max_storage_gb: 50,
      max_files: 1000,
      max_contracts: 100,
      max_templates: 25,
      features: {
        cloud_storage: true,
        file_versioning: true,
        advanced_templates: true,
        priority_support: true,
        custom_branding: false,
        api_access: true,
        team_collaboration: false,
        analytics_dashboard: true,
      },
      sort_order: 2,
      is_active: true,
      is_public: true,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'enterprise' },
    update: {},
    create: {
      name: 'enterprise',
      display_name: 'Enterprise Plan',
      description: 'Full-featured solution for large teams and organizations',
      price_monthly_usd: 99.99,
      price_yearly_usd: 999.99, // ~17% discount
      crypto_monthly_price_usd: 99.99,
      crypto_yearly_price_usd: 999.99,
      stripe_monthly_price_id: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || null,
      stripe_yearly_price_id: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || null,
      max_storage_gb: 500,
      max_files: 10000,
      max_contracts: 1000,
      max_templates: 100,
      features: {
        cloud_storage: true,
        file_versioning: true,
        advanced_templates: true,
        priority_support: true,
        custom_branding: true,
        api_access: true,
        team_collaboration: true,
        analytics_dashboard: true,
      },
      sort_order: 3,
      is_active: true,
      is_public: true,
    },
  });

  console.log('Subscription plans created:', {
    free: freePlan.id,
    pro: proPlan.id,
    enterprise: enterprisePlan.id,
  });

  // Save the free plan ID to .env file (for reference)
  console.log('\n⚠️  IMPORTANT: Add the following to your .env file:');
  console.log(`DEFAULT_FREE_PLAN_ID=${freePlan.id}`);
  console.log('\n✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
