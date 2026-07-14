import { test } from 'tap';
import JSZip from 'jszip';
import fs from 'fs';
import os from 'os';
import path from 'path';
import buildServer from '../server';
import { prisma } from '../database/db';
import { clearUserData } from '../services/user_data_service';

// Throwaway addresses — these tests run against a live database, so everything
// they touch is namespaced and torn down again.
const TARGET = '0x1111111111111111111111111111111111111111';
const BYSTANDER = '0x2222222222222222222222222222222222222222';
const ADMIN = '0x3333333333333333333333333333333333333333';
const NON_ADMIN = '0x4444444444444444444444444444444444444444';

const SHARED_FILE = 'sharedfilehash0000000000000000000000000000000000000000000000000001';
const OWNED_FILE = 'ownedfilehash00000000000000000000000000000000000000000000000000002';

const revisionOf = (address: string, suffix: string) => `${address}_${suffix}`;

// Real files on disk, so the backup exercises the actual storage read rather than
// quietly skipping a location that does not exist.
const FIXTURE_DIR = path.join(os.tmpdir(), 'aqua-admin-backup-test');
const OWNED_PATH = path.join(FIXTURE_DIR, 'target.txt');
const SHARED_PATH = path.join(FIXTURE_DIR, 'shared.txt');
const OWNED_CONTENT = 'target file contents';

async function seed() {
    await cleanup();

    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    fs.writeFileSync(OWNED_PATH, OWNED_CONTENT);
    fs.writeFileSync(SHARED_PATH, 'shared file contents');

    await prisma.users.createMany({
        data: [
            { address: TARGET },
            { address: BYSTANDER },
            { address: ADMIN, is_admin: true },
            { address: NON_ADMIN },
        ],
    });

    const targetRevision = revisionOf(TARGET, 'aaa');
    const bystanderRevision = revisionOf(BYSTANDER, 'bbb');

    await prisma.revision.createMany({
        data: [
            { pubkey_hash: targetRevision, revision_type: 'file', file_hash: OWNED_FILE },
            { pubkey_hash: bystanderRevision, revision_type: 'file', file_hash: SHARED_FILE },
        ],
    });

    // is_workflow: true is the case the browser-built backup silently drops. The
    // admin export must not.
    await prisma.latest.createMany({
        data: [
            { hash: targetRevision, user: TARGET, is_workflow: true },
            { hash: bystanderRevision, user: BYSTANDER },
        ],
    });

    await prisma.fileName.createMany({
        data: [
            { pubkey_hash: targetRevision, file_name: 'target.txt' },
            { pubkey_hash: bystanderRevision, file_name: 'shared.txt' },
        ],
    });

    await prisma.file.createMany({
        data: [
            { file_hash: OWNED_FILE, file_location: OWNED_PATH, file_size: OWNED_CONTENT.length },
            { file_hash: SHARED_FILE, file_location: SHARED_PATH, file_size: 20 },
        ],
    });

    await prisma.fileIndex.createMany({
        data: [
            // Only the target points at this one, so it should be destroyed.
            { file_hash: OWNED_FILE, pubkey_hash: [targetRevision] },
            // The bystander also points at this one, so it must survive the wipe.
            { file_hash: SHARED_FILE, pubkey_hash: [targetRevision, bystanderRevision] },
        ],
    });

    await prisma.siweSession.createMany({
        data: [
            { address: TARGET, nonce: 'test-nonce-target-1' },
            { address: TARGET, nonce: 'test-nonce-target-2' },
            { address: ADMIN, nonce: 'test-nonce-admin' },
            { address: NON_ADMIN, nonce: 'test-nonce-nonadmin' },
        ],
    });

    return { targetRevision, bystanderRevision };
}

async function cleanup() {
    const addresses = [TARGET, BYSTANDER, ADMIN, NON_ADMIN];
    const revisions = [revisionOf(TARGET, 'aaa'), revisionOf(BYSTANDER, 'bbb')];

    await prisma.siweSession.deleteMany({ where: { address: { in: addresses } } });
    await prisma.fileIndex.deleteMany({ where: { file_hash: { in: [SHARED_FILE, OWNED_FILE] } } });
    await prisma.file.deleteMany({ where: { file_hash: { in: [SHARED_FILE, OWNED_FILE] } } });
    await prisma.fileName.deleteMany({ where: { pubkey_hash: { in: revisions } } });
    await prisma.latest.deleteMany({ where: { user: { in: addresses } } });
    await prisma.revision.deleteMany({ where: { pubkey_hash: { in: revisions } } });
    await prisma.userUsage.deleteMany({ where: { user_address: { in: addresses } } });
    await prisma.users.deleteMany({ where: { address: { in: addresses } } });
}

test('clearUserData wipes the target and spares everyone else', async (t) => {
    const { targetRevision, bystanderRevision } = await seed();
    t.after(cleanup);

    await clearUserData(TARGET, { sessionScope: { kind: 'all' } });

    t.equal(
        await prisma.revision.count({ where: { pubkey_hash: targetRevision } }),
        0,
        "the target's revision is gone"
    );
    t.equal(
        await prisma.latest.count({ where: { user: TARGET } }),
        0,
        "the target's tree heads are gone"
    );
    t.equal(
        await prisma.file.count({ where: { file_hash: OWNED_FILE } }),
        0,
        'a file only the target referenced is destroyed'
    );

    // The reference-counting is the part most likely to break in a refactor: a file
    // shared with another user must lose only the target's reference.
    const shared = await prisma.fileIndex.findUnique({ where: { file_hash: SHARED_FILE } });
    t.ok(shared, 'a file shared with another user survives');
    t.notOk(
        shared?.pubkey_hash.includes(targetRevision),
        "the target's reference to the shared file is dropped"
    );
    t.ok(
        shared?.pubkey_hash.includes(bystanderRevision),
        "the bystander's reference to the shared file is kept"
    );

    t.equal(
        await prisma.revision.count({ where: { pubkey_hash: bystanderRevision } }),
        1,
        "the bystander's own data is untouched"
    );
    t.ok(
        await prisma.users.findUnique({ where: { address: TARGET } }),
        'the Users row itself survives, so the address can sign back in'
    );
});

test("sessionScope 'all' signs the target out everywhere", async (t) => {
    await seed();
    t.after(cleanup);

    await clearUserData(TARGET, { sessionScope: { kind: 'all' } });

    t.equal(
        await prisma.siweSession.count({ where: { address: TARGET } }),
        0,
        'every session the target held is gone'
    );
    t.equal(
        await prisma.siweSession.count({ where: { address: ADMIN } }),
        1,
        "the admin's own session is left alone"
    );
});

test("sessionScope 'nonce' drops only the calling session", async (t) => {
    await seed();
    t.after(cleanup);

    await clearUserData(TARGET, {
        sessionScope: { kind: 'nonce', nonce: 'test-nonce-target-1' },
    });

    const remaining = await prisma.siweSession.findMany({ where: { address: TARGET } });
    t.equal(remaining.length, 1, 'the other session survives');
    t.equal(remaining[0].nonce, 'test-nonce-target-2', 'and it is the one that was not used');
});

test('the admin routes are closed to everyone but admins', async (t) => {
    await seed();
    const fastify = await buildServer();
    t.after(async () => {
        await fastify.close();
        await cleanup();
    });

    const unauthenticated = await fastify.inject({
        method: 'GET',
        url: '/admin/backup/users',
    });
    t.equal(unauthenticated.statusCode, 401, 'no nonce is rejected');

    const nonAdmin = await fastify.inject({
        method: 'GET',
        url: '/admin/backup/users',
        headers: { nonce: 'test-nonce-nonadmin' },
    });
    t.equal(nonAdmin.statusCode, 403, 'a signed-in non-admin is rejected');

    const nonAdminDelete = await fastify.inject({
        method: 'DELETE',
        url: `/admin/user_data/${TARGET}`,
        headers: { nonce: 'test-nonce-nonadmin' },
    });
    t.equal(nonAdminDelete.statusCode, 403, 'a non-admin cannot delete anybody');

    t.equal(
        await prisma.revision.count({ where: { pubkey_hash: revisionOf(TARGET, 'aaa') } }),
        1,
        'and the rejected delete really did not delete anything'
    );
});

test('the delete guardrails refuse the deletes an operator would regret', async (t) => {
    await seed();
    const fastify = await buildServer();
    t.after(async () => {
        await fastify.close();
        await cleanup();
    });

    const malformed = await fastify.inject({
        method: 'DELETE',
        url: '/admin/user_data/not-an-address',
        headers: { nonce: 'test-nonce-admin' },
    });
    t.equal(malformed.statusCode, 400, 'a malformed address is rejected');

    const missing = await fastify.inject({
        method: 'DELETE',
        url: '/admin/user_data/0x9999999999999999999999999999999999999999',
        headers: { nonce: 'test-nonce-admin' },
    });
    t.equal(missing.statusCode, 404, 'an address with no Users row is rejected');

    const self = await fastify.inject({
        method: 'DELETE',
        url: `/admin/user_data/${ADMIN}`,
        headers: { nonce: 'test-nonce-admin' },
    });
    t.equal(self.statusCode, 403, 'an admin cannot delete themselves through this route');
});

test('the backup route streams a real, importable zip', async (t) => {
    await seed();
    const fastify = await buildServer();
    t.after(async () => {
        await fastify.close();
        await cleanup();
    });

    const response = await fastify.inject({
        method: 'GET',
        url: `/admin/backup/${TARGET}`,
        headers: { nonce: 'test-nonce-admin' },
    });

    t.equal(response.statusCode, 200, 'the backup is served');
    t.equal(response.headers['content-type'], 'application/zip', 'as a zip');
    t.match(
        response.headers['content-disposition'],
        /workspace_0x1111/,
        'named after the user it belongs to'
    );

    const zip = await JSZip.loadAsync(response.rawPayload);

    const manifestFile = zip.file('aqua.json');
    t.ok(manifestFile, 'the archive carries a manifest');

    const manifest = JSON.parse(await manifestFile!.async('string'));
    t.equal(
        manifest.type,
        'aqua_workspace_backup',
        'declared as aqua_workspace_backup, which is what the import route demands'
    );
    t.ok(Array.isArray(manifest.name_with_hash), 'with the name_with_hash index');

    // The target's only tree is is_workflow: true — the exact kind the Info page
    // backup drops on the floor. If this is empty, the export is losing data.
    const treeFiles = Object.keys(zip.files).filter((name) => name.endsWith('.aqua.json'));
    t.ok(treeFiles.length > 0, 'and a workflow tree, which the old backup would have skipped');

    // The asset bytes have to be read out of storage and embedded, not left as the
    // `${url}/files/<hash>` placeholder the tree builder hands back.
    const asset = zip.file('target.txt');
    t.ok(asset, "the user's actual file is in the archive");
    t.equal(
        await asset!.async('string'),
        OWNED_CONTENT,
        'with its real bytes, read straight out of storage'
    );
});

test('an admin can export the user list and delete a target', async (t) => {
    await seed();
    const fastify = await buildServer();
    t.after(async () => {
        await fastify.close();
        await cleanup();
    });

    const list = await fastify.inject({
        method: 'GET',
        url: '/admin/backup/users',
        headers: { nonce: 'test-nonce-admin' },
    });
    t.equal(list.statusCode, 200, 'the admin can list users');

    const listed = list.json().users.find((u: { address: string }) => u.address === TARGET);
    t.equal(listed?.treeCount, 1, 'and the list reports the tree count it will export');

    const deleted = await fastify.inject({
        method: 'DELETE',
        url: `/admin/user_data/${TARGET}`,
        headers: { nonce: 'test-nonce-admin' },
    });
    t.equal(deleted.statusCode, 200, 'the admin can delete the target');
    t.ok(deleted.json().deleted, 'and gets back a per-table count of what went');

    t.equal(
        await prisma.latest.count({ where: { user: TARGET } }),
        0,
        "the target's data is actually gone"
    );
});
