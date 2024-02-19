import * as fs from 'fs';

class Main {
    run(network: string) {
        let protocolId = 'ethereum';
        if (
            network === 'development' ||
            network === 'staging' ||
            network === 'sepolia' ||
            network === 'mainnet'
        ) {
            protocolId = 'ethereum';
        } else if (
            network === 'development-arb' ||
            network === 'staging-arb' ||
            network === 'arbitrum-sepolia' ||
            network === 'arbitrum-one'
        ) {
            protocolId = 'arbitrum';
        } else if (
            network === 'development-ava' ||
            network === 'staging-ava' ||
            network === 'avalanche-mainnet'
        ) {
            protocolId = 'avalanche';
        } else if (network === 'polygon-zkevm-mainnet') {
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
