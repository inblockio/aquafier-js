
import { createTreeAndSave, CreateTreeAndSaveParams } from '../utils/create_tree_and_save';

// Mock function to test compilation
async function testCompilation() {
    const params: CreateTreeAndSaveParams = {
        walletAddress: '0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7',
        fileBuffer: Buffer.from('test content'),
        filename: 'test.txt',
        isForm: false,
        enableContent: true,
        enableScalar: true,
        host: 'localhost:3000',
        protocol: 'http',
        serverAutoSign: true
    };

    console.log('Test file compiling, createTreeAndSave is importable.');
    let res = await createTreeAndSave(params);
    console.log('Result: ', res);
    // We don't actually run it because it needs DB connection and real dependencies
}

testCompilation();
