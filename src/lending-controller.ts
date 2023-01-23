import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
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
import { buildLendingMarketId } from './utils/string';

export function handleCreateLendingMarket(event: CreateLendingMarket): void {
    LendingMarketTemplate.create(event.params.marketAddr);
    const market = createLendingMarket(
        event.params.ccy,
        event.params.maturity,
        event
    );

    rollInMarket(event.params.ccy, market);
}

// Load all transactions for the rolling market, and change their maturity to the closest one
export function handleRotateLendingMarkets(event: RotateLendingMarkets): void {
    let rollingInMarket = LendingMarket.load(
        buildLendingMarketId(event.params.ccy, event.params.newMaturity)
    );

    if (!rollingInMarket) {
        rollingInMarket = createLendingMarket(
            event.params.ccy,
            event.params.newMaturity,
            event
        );
    }

    rollInMarket(event.params.ccy, rollingInMarket);

    const rollingOutMarket = LendingMarket.load(
        buildLendingMarketId(event.params.ccy, event.params.oldMaturity)
    );

    if (rollingOutMarket) {
        rollOutMarket(event.params.ccy, rollingOutMarket);
        updateTransactions(rollingOutMarket);
    } else {
        throw new Error('No market found');
    }
}

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
            if (market == null) {
                market = availableMarkets[i];
            }
            if (availableMarkets[i].maturity.lt(market.maturity)) {
                market = availableMarkets[i];
            }
        }
    }
    return market;
};

const rollOutMarket = (ccy: Bytes, market: LendingMarket): void => {
    const availableMarkets = getAvailableMarkets(ccy);
    const entity = AvailableLendingMarket.load(ccy);
    if (entity) {
        // Closures are not supported in AssemblyScript
        for (let i = 0; i < availableMarkets.length; i++) {
            if (availableMarkets[i].maturity.equals(market.maturity)) {
                availableMarkets.splice(i, 1);
                entity.markets = availableMarkets.map<string>(
                    market => market.id
                );
                break;
            }
        }
        entity.save();
    }

    market.isActive = false;
    market.save();
};

const rollInMarket = (ccy: Bytes, market: LendingMarket): void => {
    const entity = AvailableLendingMarket.load(ccy);
    if (entity) {
        // Array.push is not working with entities
        entity.markets = entity.markets.concat([market.id]);
        entity.save();
    } else {
        const newEntity = new AvailableLendingMarket(ccy);
        newEntity.markets = [market.id];
        newEntity.currency = ccy;
        newEntity.save();
    }
};

const createLendingMarket = (
    ccy: Bytes,
    maturity: BigInt,
    event: ethereum.Event
): LendingMarket => {
    const market = new LendingMarket(buildLendingMarketId(ccy, maturity));

    market.currency = ccy;
    market.maturity = maturity;
    market.isActive = true;

    market.createdAt = event.block.timestamp;
    market.blockNumber = event.block.number;
    market.txHash = event.transaction.hash;
    market.transactions = [];
    market.save();

    return market;
};

const updateTransactions = (rolledOutMarket: LendingMarket): void => {
    const transactions = rolledOutMarket.transactions;
    if (!transactions || transactions.length == 0) {
        return;
    }

    const closestMarket = getShortestMaturityMarket(rolledOutMarket.currency);

    if (!closestMarket) {
        throw new Error('No closest market found');
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
            closestMarket.transactions = closestMarket.transactions.concat([
                transaction.id,
            ]);
        }

        closestMarket.save();
    }
};
