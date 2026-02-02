
import { PrismaClient } from '@prisma/client';
import { calculateStorageUsage } from './src/utils/stats';
import { usageService } from './src/services/usageService';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting verification...');

    const userAddress = '0xTestUser' + Date.now();
    console.log(`Testing with user: ${userAddress}`);

    // Create user in DB to satisfy foreign key
    await prisma.users.create({
        data: {
            address: userAddress,
        }
    });

    // 1. Initial State
    let usage = await prisma.userUsage.findUnique({ where: { user_address: userAddress } });
    if (usage) throw new Error('Usage should be null initially');

    // 2. Simulate File Upload (Increment)
    console.log('Testing UsageService increment...');
    await usageService.incrementFiles(userAddress, 1);
    await usageService.incrementStorage(userAddress, 1024);

    usage = await prisma.userUsage.findUnique({ where: { user_address: userAddress } });
    console.log('Usage after increment:', usage);

    if (!usage || usage.files_count !== 1 || usage.storage_usage_bytes !== BigInt(1024)) {
        throw new Error('Increment failed');
    }

    // 3. Test UsageRecord Sync (Simulate API Logic)
    console.log('Testing UsageRecord sync...');
    const now = new Date();

    // Create a plan and subscription
    const plan = await prisma.subscriptionPlan.create({
        data: {
            id: 'free_test_' + Date.now(),
            name: 'Free Test ' + Date.now(),
            display_name: 'Free Test',
            max_files: 10,
            max_storage_gb: 1
        }
    });

    const sub = await prisma.subscription.create({
        data: {
            user_address: userAddress,
            plan_id: plan.id,
            status: 'ACTIVE',
            current_period_start: now,
            current_period_end: new Date(now.getTime() + 10000000),
            payment_method: 'CRYPTO', // Added required field
            billing_period: 'MONTHLY' // Added required field if present in schema, let's err on safe side or check schema.
            // checking schema from previous reads: billing_period is present.
        }
    });

    // Create/Update Record (Manual sync logic mimicking subscriptions.ts)
    const usageData = {
        storage_used_bytes: usage.storage_usage_bytes,
        files_count: usage.files_count,
        contracts_count: usage.contracts_count,
        templates_count: usage.templates_count,
        updatedAt: new Date()
    };

    const usageRecord = await prisma.usageRecord.create({
        data: {
            subscription_id: sub.id,
            user_address: userAddress,
            period_start: sub.current_period_start,
            period_end: sub.current_period_end,
            ...usageData
        }
    });

    console.log('UsageRecord created:', usageRecord);
    if (!usageRecord) throw new Error('Failed to create UsageRecord');
    if (usageRecord.files_count !== 1) throw new Error('UsageRecord files_count mismatch');

    console.log('Verification successful!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
