import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
    CreateLendingMarket,
    RotateLendingMarkets,
} from '../generated/LendingMarketController/LendingMarketController';
import {
    AvailableLendingMarket,
    LendingMarket,
    Transaction,
} from '../generated/schema';
import { LendingMarket as LendingMarketTemplate } from '../generated/templates';

export function handleCreateLendingMarket(event: CreateLendingMarket): void {
    const market = new LendingMarket(event.params.marketAddr.toHexString());
    market.currency = event.params.ccy;
    market.maturity = event.params.maturity;
    market.contractAddress = event.params.marketAddr;

    market.createdAt = event.block.timestamp;
    market.blockNumber = event.block.number;
    market.txHash = event.transaction.hash;

    LendingMarketTemplate.create(event.params.marketAddr);
    rollInMarket(event.params.ccy, market);

    market.save();
}

// Load all transactions for the rolling market, and change their maturity to the closest one
export function handleRotateLendingMarkets(event: RotateLendingMarkets): void {
    rollOutMarket(event.params.ccy, event.params.oldMaturity);

    const rollingOutMarket = getMarket(
        event.params.ccy,
        event.params.oldMaturity
    );

    if (rollingOutMarket) {
        updateTransactions(rollingOutMarket);
    }
}

const getMarket = (ccy: Bytes, maturity: BigInt): LendingMarket | null => {
    const availableMarkets = AvailableLendingMarket.load(ccy);
    if (availableMarkets) {
        const markets = availableMarkets.markets;
        if (markets && markets.length > 0) {
            const market = LendingMarket.load(markets[0]);
            if (market && market.maturity.equals(maturity)) {
                return market;
            }
        }
    }
    return null;
};

const getAvailableMarkets = (ccy: Bytes): LendingMarket[] => {
    const availableMarkets = AvailableLendingMarket.load(ccy);
    if (availableMarkets) {
        const markets = availableMarkets.markets;
        if (markets && markets.length > 0) {
            const available: LendingMarket[] = [];
            for (let i = 0; i < markets.length; i++) {
                const market = LendingMarket.load(markets[i]);
                if (market) {
                    available.push(market);
                }
            }
            return available;
        }
    }
    return [];
};

const getShortestMaturityMarket = (ccy: Bytes): LendingMarket | null => {
    const availableMarkets = getAvailableMarkets(ccy);
    let market: LendingMarket | null = null;
    if (availableMarkets && availableMarkets.length > 0) {
        for (let i = 0; i < availableMarkets.length; i++) {
            if (!market || market.maturity.gt(availableMarkets[i].maturity)) {
                market = availableMarkets[i];
            }
        }
    }
    return market;
};

const rollOutMarket = (ccy: Bytes, maturity: BigInt): void => {
    const availableMarkets = getAvailableMarkets(ccy);
    const entity = AvailableLendingMarket.load(ccy);
    if (entity) {
        // Closures are not supported in AssemblyScript
        for (let i = 0; i < availableMarkets.length; i++) {
            if (availableMarkets[i].maturity.equals(maturity)) {
                entity.markets = availableMarkets
                    .splice(i, 1)
                    .map<string>(market => market.id);
                break;
            }
        }
        entity.save();
    }
};

const rollInMarket = (ccy: Bytes, market: LendingMarket): void => {
    const entity = AvailableLendingMarket.load(ccy);
    if (entity) {
        entity.markets.push(market.id);
        entity.save();
    } else {
        const newEntity = new AvailableLendingMarket(ccy);
        newEntity.markets = [market.id];
        newEntity.save();
    }
};

const updateTransactions = (rolledOutMarket: LendingMarket): void => {
    const transactions = rolledOutMarket.transactions;
    if (!transactions || transactions.length == 0) {
        return;
    }

    const closestMarket = getShortestMaturityMarket(rolledOutMarket.currency);
    if (!closestMarket) {
        return;
    }

    for (let i = 0; i < transactions.length; i++) {
        const transaction = Transaction.load(transactions[i]);
        if (!transaction) {
            continue;
        }

        transaction.maturity = closestMarket.maturity;
        transaction.lendingMarket = closestMarket.id;
        transaction.save();

        if (!closestMarket.transactions) {
            closestMarket.transactions = [transaction.id];
        } else {
            closestMarket.transactions.push(transaction.id);
        }

        closestMarket.save();
    }
};
