import { readFileSync, writeFileSync } from 'fs';
import { dump, load } from 'js-yaml';

const arrowedNetworks = [
    'development',
    'development-arb',
    'staging',
    'staging-arb',
    'sepolia',
    'mainnet',
    'arbitrum-sepolia',
    'arbitrum-one',
] as const;
type Network = (typeof arrowedNetworks)[number];

const devNetworkMap: Partial<Record<Network, string>> = {
    development: 'sepolia',
    'development-arb': 'arbitrum-sepolia',
    staging: 'sepolia',
    'staging-arb': 'arbitrum-sepolia',
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
        const network = devNetworkMap[this.network] || this.network;

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
