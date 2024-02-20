import * as fs from 'fs';

class Main {
    run(network: string) {
        let protocolId = 'ethereum';
        if (
            ['development', 'staging', 'sepolia', 'mainnet'].includes(network)
        ) {
            protocolId = 'ethereum';
        } else if (
            [
                'development-arb',
                'staging-arb',
                'arbitrum-sepolia',
                'arbitrum-one',
            ].includes(network)
        ) {
            protocolId = 'arbitrum';
        } else if (
            ['development-ava', 'staging-ava', 'avalanche-mainnet'].includes(
                network
            )
        ) {
            protocolId = 'avalanche';
        } else if (['polygon-zkevm-mainnet'].includes(network)) {
            protocolId = 'polygon-zkevm';
        }
        const dirPath = 'protocol';
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
        const filePath = `${dirPath}/index.ts`;
        const content = `export const PROTOCOL_ID = '${protocolId}';`;

        fs.writeFileSync(filePath, content);
        console.log(
            `Successfully set PROTOCOL_ID to '${protocolId}' in ${filePath}`
        );
    }
}

const [, , network] = process.argv;
new Main().run(network);
