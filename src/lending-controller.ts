import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import {
    CreateLendingMarket,
    RotateLendingMarkets,
} from '../generated/LendingMarketController/LendingMarketController';
import {
    LendingMarket,
    LendingMarketList,
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
        rollOutMarket(rollingOutMarket);
        updateTransactions(rollingOutMarket);
    } else {
        throw new Error('No market found');
    }
}

const getMarketList = (ccy: Bytes): LendingMarket[] => {
    const availableMarkets = LendingMarketList.load(ccy);
    if (availableMarkets) {
        const markets = availableMarkets.markets;
        if (markets) {
            const marketList: LendingMarket[] = [];
            for (let i = 0; i < markets.length; i++) {
                const market = LendingMarket.load(markets[i]);
                if (market) {
                    marketList.push(market);
                }
            }
            return marketList;
        }
    }
    return [];
};

const getShortestMaturityActiveMarket = (ccy: Bytes): LendingMarket | null => {
    const marketList = getMarketList(ccy);
    let market: LendingMarket | null = null;
    if (marketList && marketList.length > 0) {
        for (let i = 0; i < marketList.length; i++) {
            if (!marketList[i].isActive) {
                continue;
            }

            if (market == null) {
                market = marketList[i];
            }

            if (marketList[i].maturity.lt(market.maturity)) {
                market = marketList[i];
            }
        }
    }
    return market;
};

const rollOutMarket = (market: LendingMarket): void => {
    market.isActive = false;
    market.save();
};

const rollInMarket = (ccy: Bytes, market: LendingMarket): void => {
    const entity = LendingMarketList.load(ccy);
    if (entity) {
        // Array.push is not working with entities
        entity.markets = entity.markets.concat([market.id]);
        entity.save();
    } else {
        const newEntity = new LendingMarketList(ccy);
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

    const closestMarket = getShortestMaturityActiveMarket(
        rolledOutMarket.currency
    );

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
