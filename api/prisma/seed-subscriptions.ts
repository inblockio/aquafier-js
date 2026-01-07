import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const subscriptionPlans: Prisma.SubscriptionPlanCreateInput[] = [
  {
    name: 'free',
    display_name: 'Free',
    description: 'Perfect for individuals getting started with Aquafier',
    price_monthly_usd: new Prisma.Decimal(0),
    price_yearly_usd: new Prisma.Decimal(0),
    features: {
      storage_gb: 1,
      api_calls_monthly: 1000,
      witnesses_monthly: 10,
      revisions_monthly: 100,
      templates: 3,
      collaborators: 1,
      support: 'community',
      custom_branding: false,
      advanced_analytics: false,
      priority_processing: false,
    },
    is_active: true,
    sort_order: 1,
  },
  // {
  //   name: 'basic',
  //   display_name: 'Basic',
  //   description: 'Great for individuals and small teams',
  //   price_monthly_usd: new Prisma.Decimal(9.99),
  //   price_yearly_usd: new Prisma.Decimal(99.99),
  //   features: {
  //     storage_gb: 10,
  //     api_calls_monthly: 10000,
  //     witnesses_monthly: 100,
  //     revisions_monthly: 1000,
  //     templates: 20,
  //     collaborators: 5,
  //     support: 'email',
  //     custom_branding: false,
  //     advanced_analytics: false,
  //     priority_processing: false,
  //   },
  //   is_active: true,
  //   sort_order: 2,
  // },
  {
    name: 'pro',
    display_name: 'Pro',
    description: 'For growing teams and businesses',
    price_monthly_usd: new Prisma.Decimal(29.99),
    price_yearly_usd: new Prisma.Decimal(299.99),
    features: {
      storage_gb: 100,
      api_calls_monthly: 100000,
      witnesses_monthly: 1000,
      revisions_monthly: 10000,
      templates: 100,
      collaborators: 20,
      support: 'priority_email',
      custom_branding: true,
      advanced_analytics: true,
      priority_processing: true,
    },
    is_active: true,
    sort_order: 3,
  },
  {
    name: 'enterprise',
    display_name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price_monthly_usd: new Prisma.Decimal(99.99),
    price_yearly_usd: new Prisma.Decimal(999.99),
    features: {
      storage_gb: 1000,
      api_calls_monthly: 1000000,
      witnesses_monthly: 10000,
      revisions_monthly: 100000,
      templates: -1, // unlimited
      collaborators: -1, // unlimited
      support: 'dedicated',
      custom_branding: true,
      advanced_analytics: true,
      priority_processing: true,
      custom_integrations: true,
      sla: true,
      dedicated_infrastructure: true,
    },
    is_active: true,
    sort_order: 4,
  },
];

async function seedSubscriptionPlans() {
  console.log('Seeding subscription plans...');

  for (const plan of subscriptionPlans) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { name: plan.name },
    });

    if (existing) {
      console.log(`Plan "${plan.name}" already exists, updating...`);
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: plan,
      });
    } else {
      console.log(`Creating plan "${plan.name}"...`);
      await prisma.subscriptionPlan.create({
        data: plan,
      });
    }
  }

  console.log('Subscription plans seeded successfully!');
}

async function main() {
  try {
    await seedSubscriptionPlans();
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
