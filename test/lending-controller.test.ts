import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
    afterEach,
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from 'matchstick-as/assembly/index';
import {
    handleCreateLendingMarket,
    handleRotateLendingMarkets,
} from '../src/lending-controller';

import { buildLendingMarketId, toBytes32 } from '../src/utils/string';
import {
    createCreateLendingMarketEvent,
    createRotateLendingMarketsEvent,
    toArrayString,
} from './mocks/lending-controller';
import { ALICE, BOB, createTransaction } from './utils/createEntities';

const lendingMarketAddress = Address.zero();
const futureValueVault = Address.zero();
const maturity = BigInt.fromI32(365);
const index = BigInt.fromI32(0);

afterEach(() => {
    clearStore();
});

const fil = 'FIL';
const filBytes = toBytes32(fil);
const ethBytes = toBytes32('ETH');

const addressList = [
    Address.fromString('0x0000000000000000000000000000000000000000'), // Dec 22
    Address.fromString('0x0000000000000000000000000000000000000001'), // Mar 23
    Address.fromString('0x0000000000000000000000000000000000000010'), // Jun 23
    Address.fromString('0x0000000000000000000000000000000000000100'), // Sep 23
];

const maturityList = [
    BigInt.fromI32(1669852800),
    BigInt.fromI32(1677628800),
    BigInt.fromI32(1685577600),
    BigInt.fromI32(1693526400),
];

const newMaturity = BigInt.fromI32(1701388800);
const newAddress = Address.fromString(
    '0x0000000000000000000000000000000000001000'
);

const LENDING_MARKET_ENTITY_NAME = 'LendingMarket';
const AVAILABLE_LENDING_MARKET_ENTITY_NAME = 'LendingMarketList';

const TOTAL_NUMBER_PREPOPULATED_MARKET = 8;
const assertLendingMarketCreated = (): void => {
    assert.entityCount(
        LENDING_MARKET_ENTITY_NAME,
        TOTAL_NUMBER_PREPOPULATED_MARKET + 1
    );
    assert.entityCount(AVAILABLE_LENDING_MARKET_ENTITY_NAME, 2);
};

describe('With no lending markets existing', () => {
    test('Creating a new lending market should create the entity', () => {
        const event = createCreateLendingMarketEvent(
            ethBytes,
            lendingMarketAddress,
            futureValueVault,
            index,
            maturity
        );
        handleCreateLendingMarket(event);

        const id = buildLendingMarketId(ethBytes, maturity);
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'currency',
            ethBytes.toHexString()
        );
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'maturity',
            maturity.toString()
        );
        assert.fieldEquals(LENDING_MARKET_ENTITY_NAME, id, 'isActive', 'true');
    });

    test('Creating a new lending market should create the LendingMarketList entity and add this lending market to it', () => {
        const event = createCreateLendingMarketEvent(
            ethBytes,
            lendingMarketAddress,
            futureValueVault,
            index,
            maturity
        );
        handleCreateLendingMarket(event);

        assert.entityCount(AVAILABLE_LENDING_MARKET_ENTITY_NAME, 1);
        assert.fieldEquals(
            AVAILABLE_LENDING_MARKET_ENTITY_NAME,
            ethBytes.toHexString(),
            'currency',
            ethBytes.toHexString()
        );

        assert.fieldEquals(
            AVAILABLE_LENDING_MARKET_ENTITY_NAME,
            ethBytes.toHexString(),
            'markets',
            toArrayString([buildLendingMarketId(ethBytes, maturity)])
        );
    });
});

describe('With lending markets already existing', () => {
    beforeEach(() => {
        for (let i = 0; i < addressList.length; i++) {
            const address = addressList[i];
            const maturity = maturityList[i];
            handleCreateLendingMarket(
                createCreateLendingMarketEvent(
                    filBytes,
                    address,
                    address,
                    BigInt.fromI32(i),
                    maturity
                )
            );
            handleCreateLendingMarket(
                createCreateLendingMarketEvent(
                    ethBytes,
                    address,
                    address,
                    BigInt.fromI32(i),
                    maturity
                )
            );
        }
    });

    test('Creating a new lending market should add it to the list of available markets', () => {
        const event = createCreateLendingMarketEvent(
            filBytes,
            newAddress,
            newAddress,
            BigInt.fromI32(0),
            newMaturity
        );

        handleCreateLendingMarket(event);

        assertLendingMarketCreated();

        assert.fieldEquals(
            AVAILABLE_LENDING_MARKET_ENTITY_NAME,
            filBytes.toHexString(),
            'markets',
            toArrayString(
                maturityList
                    .map<string>(maturity =>
                        buildLendingMarketId(filBytes, maturity)
                    )
                    .concat([buildLendingMarketId(filBytes, newMaturity)])
            )
        );
    });

    test('Rotate lending market should create a new Lending Market', () => {
        const event = createRotateLendingMarketsEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleRotateLendingMarkets(event);

        assertLendingMarketCreated();

        const id = buildLendingMarketId(filBytes, newMaturity);
        assert.fieldEquals(LENDING_MARKET_ENTITY_NAME, id, 'isActive', 'true');
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'currency',
            filBytes.toHexString()
        );
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'maturity',
            newMaturity.toString()
        );
    });

    test('Rolling out a lending market with no transaction should only update the available markets', () => {
        const event = createRotateLendingMarketsEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleRotateLendingMarkets(event);

        assertLendingMarketCreated();

        assert.fieldEquals(
            AVAILABLE_LENDING_MARKET_ENTITY_NAME,
            filBytes.toHexString(),
            'markets',
            toArrayString([
                buildLendingMarketId(filBytes, maturityList[0]),
                buildLendingMarketId(filBytes, maturityList[1]),
                buildLendingMarketId(filBytes, maturityList[2]),
                buildLendingMarketId(filBytes, maturityList[3]),
                buildLendingMarketId(filBytes, newMaturity),
            ])
        );
    });

    test('Rolling out a lending market with existing transactions should update those transactions', () => {
        const event = createRotateLendingMarketsEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        const hashList = [
            Address.fromString('0x0000000000000000000000000000000000000000'),
            Address.fromString('0x0000000000000000000000000000000000000001'),
            Address.fromString('0x0000000000000000000000000000000000000002'),
            Address.fromString('0x0000000000000000000000000000000000000003'),
        ];

        createTransaction(
            ALICE,
            0,
            filBytes,
            maturityList[0],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[0]
        );
        createTransaction(
            BOB,
            0,
            filBytes,
            maturityList[0],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[1]
        );
        createTransaction(
            ALICE,
            0,
            toBytes32('ETH'),
            maturityList[0],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[2]
        );
        createTransaction(
            BOB,
            0,
            filBytes,
            maturityList[1],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[3]
        );
        assert.entityCount('Transaction', 4);

        handleRotateLendingMarkets(event);

        assertLendingMarketCreated();

        // Maturity of only the FIL transactions with maturity Dec 22 should be updated
        assert.fieldEquals(
            'Transaction',
            hashList[0].toHexString(),
            'maturity',
            maturityList[1].toString()
        );

        assert.fieldEquals(
            'Transaction',
            hashList[1].toHexString(),
            'maturity',
            maturityList[1].toString()
        );

        assert.fieldEquals(
            'Transaction',
            hashList[2].toHexString(),
            'maturity',
            maturityList[0].toString()
        );

        assert.fieldEquals(
            'Transaction',
            hashList[3].toHexString(),
            'maturity',
            maturityList[1].toString()
        );
    });
});
