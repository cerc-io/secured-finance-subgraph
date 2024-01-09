import { readFileSync, writeFileSync } from 'fs';

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

const EMPTY_DEPLOYMENT = {
    version: '0.0.0',
    isMajorUpdate: false,
    isMinorUpdate: false,
};

class Main {
    private network: Network;

    constructor(network: string) {
        if (!arrowedNetworks.includes(network as Network)) {
            console.error('error: invalid network:', network);
            process.exit(1);
        }

        this.network = network as Network;
    }

    run() {
        const path = `${process.cwd()}/deployment.json`;
        const jsonText = readFileSync(path, 'utf8');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = JSON.parse(jsonText) as any;

        if (!data[this.network]) {
            data[this.network] = EMPTY_DEPLOYMENT;
        }

        const { version, isMajorUpdate, isMinorUpdate } = data[this.network];
        const versions: string[] = version.split('.');

        if (isMajorUpdate) {
            versions[0] = String(Number(versions[0]) + 1);
            versions[1] = '0';
            versions[2] = '0';
        } else if (isMinorUpdate) {
            versions[1] = String(Number(versions[1]) + 1);
            versions[2] = '0';
        } else {
            versions[2] = String(Number(versions[2]) + 1);
        }

        data[this.network].version = versions.join('.');
        data[this.network].isMajorUpdate = false;
        data[this.network].isMinorUpdate = false;
        const newYamlText = JSON.stringify(data, null, 2);

        writeFileSync(path, newYamlText, 'utf8');
    }
}

const [, , network] = process.argv;

new Main(network).run();
