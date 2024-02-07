import { copyFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import glob from 'glob';

class Main {
    run() {
        const rootDir = process.cwd();
        const modulePath = require
            .resolve('@secured-finance/contracts/package.json')
            .replace('/package.json', '');

        const abiDir = `${rootDir}/abis`;
        if (existsSync(abiDir)) {
            rmSync(abiDir, { recursive: true });
        }
        mkdirSync(abiDir);

        // These files define the smart contracts that emit events, and the subgraph will index data based on these events.
        const filesToCopy = [
            'LendingMarketOperationLogic.json',
            'TokenVault.json',
            'FundManagementLogic.json',
            'LiquidationLogic.json',
            'OrderActionLogic.json',
            'OrderBookLogic.json',
        ];

        filesToCopy.forEach(file => {
            const filePaths = glob.sync(
                `${modulePath}/build/contracts/**/${file}`
            );

            filePaths.forEach(filePath => {
                const destinationPath = `${abiDir}/${filePath
                    .split('/')
                    .pop()}`;
                copyFileSync(filePath, destinationPath);
            });
        });
    }
}

new Main().run();
