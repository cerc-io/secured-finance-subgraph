import { BigNumber } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { dump, load } from 'js-yaml';

const arrowedNetworks = [
    'development',
    'development-arb',
    'development-ava',
    'development-fil',
    'staging',
    'staging-arb',
    'staging-ava',
    'staging-fil',
    'sepolia',
    'mainnet',
    'arbitrum-sepolia',
    'arbitrum-one',
    'avalanche-mainnet',
    'polygon-zkevm-mainnet',
    'filecoin-mainnet',
] as const;
type Network = (typeof arrowedNetworks)[number];

const networkMap: Partial<Record<Network, string>> = {
    development: 'sepolia',
    'development-arb': 'arbitrum-sepolia',
    'development-ava': 'fuji',
    'development-fil': 'filecoin-testnet',
    staging: 'sepolia',
    'staging-arb': 'arbitrum-sepolia',
    'staging-ava': 'fuji',
    'staging-fil': 'filecoin-testnet',
    'avalanche-mainnet': 'avalanche',
    'polygon-zkevm-mainnet': 'polygon-zkevm',
};

class Main {
    private network: Network;

    constructor(network: string) {
        if (!arrowedNetworks.includes(network as Network)) {
            console.error('Invalid network:', network);
            process.exit(1);
        }

        this.network = network as Network;
    }

    async run() {
        const rootDir = process.cwd();
        const yamlText = readFileSync(`${rootDir}/subgraph.yaml`, 'utf8');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = load(yamlText) as any;
        const network = networkMap[this.network] || this.network;

        if (!network) {
            console.error('Network not found:', this.network);
            process.exit(1);
        }

        for (const dataSource of data.dataSources) {
            const deployment = await import(
                `@secured-finance/contracts/deployments/${this.network}/${dataSource.source.abi}.json`
            );

            const proxyAddress = deployment.address;
            dataSource.source.address = proxyAddress;
            // Handle contract deployment hex block numbers in deployment JSON
            dataSource.source.startBlock = BigNumber.from(
                deployment.receipt.blockNumber
            ).toNumber();
            dataSource.network = network;
        }

        for (const template of data.templates) {
            template.network = network;
        }

        const newYamlText = dump(data);

        writeFileSync(
            `${rootDir}/subgraph.${this.network}.yaml`,
            newYamlText,
            'utf8'
        );
    }
}

const [, , network] = process.argv;
new Main(network).run();
