import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
    afterEach,
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from 'matchstick-as/assembly/index';
import { getProtocol, PROTOCOL_ID } from '../src/helper/initializer';
import {
    handleLendingMarketCreated,
    handleLendingMarketsRotated,
} from '../src/lending-controller';

import { buildLendingMarketId, toBytes32 } from '../src/utils/string';
import {
    createLendingMarketCreatedEvent,
    createLendingMarketsRotatedEvent,
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
const PROTOCOL = 'Protocol';

const TOTAL_NUMBER_PREPOPULATED_MARKET = 8;
const assertLendingMarketCreated = (): void => {
    assert.entityCount(
        LENDING_MARKET_ENTITY_NAME,
        TOTAL_NUMBER_PREPOPULATED_MARKET + 1
    );
};

describe('With no lending markets existing', () => {
    test('Creating a new lending market should create the entity', () => {
        const event = createLendingMarketCreatedEvent(
            ethBytes,
            lendingMarketAddress,
            futureValueVault,
            index,
            maturity
        );
        handleLendingMarketCreated(event);

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

    test('Creating a new lending market should add it to the protocol', () => {
        const event = createLendingMarketCreatedEvent(
            ethBytes,
            lendingMarketAddress,
            futureValueVault,
            index,
            maturity
        );
        handleLendingMarketCreated(event);

        assert.entityCount(PROTOCOL, 1);
        assert.fieldEquals(
            PROTOCOL,
            PROTOCOL_ID,
            'lendingMarkets',
            toArrayString([buildLendingMarketId(ethBytes, maturity)])
        );
    });
});

describe('With lending markets already existing', () => {
    beforeEach(() => {
        for (let i = 0; i < addressList.length; i++) {
            const address = addressList[i];
            const maturity = maturityList[i];
            handleLendingMarketCreated(
                createLendingMarketCreatedEvent(
                    filBytes,
                    address,
                    address,
                    BigInt.fromI32(i),
                    maturity
                )
            );
            handleLendingMarketCreated(
                createLendingMarketCreatedEvent(
                    ethBytes,
                    address,
                    address,
                    BigInt.fromI32(i),
                    maturity
                )
            );
        }
    });

    test('Rotate lending market should create the new Lending Market', () => {
        const event = createLendingMarketsRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

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

    test('Rotate lending market should add the new maturity market to the protocol', () => {
        const event = createLendingMarketsRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

        const protocol = getProtocol();
        const lendingMarkets = protocol.lendingMarkets;
        assert.i32Equals(lendingMarkets.length, 9);
    });

    test('Rolling out a lending market with existing transactions should update those transactions', () => {
        const event = createLendingMarketsRotatedEvent(
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

        handleLendingMarketsRotated(event);

        // Maturity of only the FIL transactions with maturity Dec 22 should be updated
        // Transaction 0 is updated (FIL, Dec 22)
        assert.fieldEquals(
            'Transaction',
            hashList[0].toHexString(),
            'maturity',
            maturityList[1].toString()
        );

        // Transaction 1 is updated (FIL, Dec 22)
        assert.fieldEquals(
            'Transaction',
            hashList[1].toHexString(),
            'maturity',
            maturityList[1].toString()
        );

        // Transaction 2 is not updated (ETH, Dec 22)
        assert.fieldEquals(
            'Transaction',
            hashList[2].toHexString(),
            'maturity',
            maturityList[0].toString()
        );

        // Transaction 3 is not updated (FIL, Mar 23)
        assert.fieldEquals(
            'Transaction',
            hashList[3].toHexString(),
            'maturity',
            maturityList[1].toString()
        );
    });
});
