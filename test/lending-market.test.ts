import { BigInt } from '@graphprotocol/graph-ts';
import {
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from 'matchstick-as/assembly/index';
import { handleOrderPartiallyFilled } from '../src/mappings/fund-management';
import {
    handleItayoseExecuted,
    handleOrderCanceled,
    handleOrderExecuted,
    handleOrdersCleaned,
    handlePositionUnwound,
    handlePreOrderExecuted,
} from '../src/mappings/lending-market';
import {
    getDailyVolumeEntityId,
    getOrderEntityId,
} from '../src/utils/id-generation';
import { toBytes32 } from '../src/utils/string';
import { getOrInitUser, getProtocol } from '../src/helper/initializer';
import {
    createItayoseExecutedEvent,
    createOrderCanceledEvent,
    createOrderExecutedEvent,
    createOrderPartiallyFilledEvent,
    createOrdersCleanedEvent,
    createPositionUnwoundEvent,
    createPreOrderExecutedEvent,
} from './mocks';
import { ALICE, BOB, createLendingMarket } from './utils/createEntities';

const lend = 0;
const borrow = 1;
const ccy = toBytes32('ETH');
const maturity = BigInt.fromI32(1677628800); // 1st Mar 23
const amount = BigInt.fromI32(90);
const unitPrice = BigInt.fromI32(9000);
const timestamp = BigInt.fromI64(1677620000);

describe('Order Executed', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should create an Open Order when limit order is not filled and order is placed', () => {
        const placedOrderId = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            placedOrderId,
            amount,
            unitPrice,
            false
        );
        handleOrderExecuted(event);

        const id = getOrderEntityId(placedOrderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', unitPrice.toString());
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'Open');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Limit');
        assert.fieldEquals('Order', id, 'isCircuitBreakerTriggered', 'false');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.notInStore('Transaction', txId);

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(0));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);

        const protocol = getProtocol();
        assert.fieldEquals('Protocol', protocol.id, 'totalUsers', '1');
    });

    test('should create a Partially Filled Order and a Transaction when a limit order is partially filled and remaining order is placed', () => {
        const placedOrderId = BigInt.fromI32(1);
        const filledAmount = BigInt.fromI32(81);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(90);
        const feeInFV = BigInt.fromI32(1);
        const totalAmount = filledAmount.plus(amount);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            unitPrice,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            placedOrderId,
            amount,
            unitPrice,
            false
        );
        handleOrderExecuted(event);

        const id = getOrderEntityId(placedOrderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', unitPrice.toString());
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmount.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', totalAmount.toString());
        assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Limit');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'order', id);
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should create a Filled Order and a Transaction when a limit order is filled completely', () => {
        const placedOrderId = BigInt.fromI32(0);
        const filledAmount = BigInt.fromI32(135);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(150);
        const feeInFV = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            filledAmount,
            unitPrice,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            false
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', unitPrice.toString());
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmount.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', filledAmount.toString());
        assert.fieldEquals('Order', id, 'status', 'Filled');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Limit');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'order', id);
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should create a Filled Order and a Transaction with filled unit price when Market Order is executed completely', () => {
        const placedOrderId = BigInt.fromI32(0);
        const filledAmount = BigInt.fromI32(160);
        const filledUnitPrice = BigInt.fromI32(80);
        const filledAmountInFV = BigInt.fromI32(200);
        const feeInFV = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            filledAmount,
            BigInt.fromI32(0),
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            false
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmount.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', filledAmount.toString());
        assert.fieldEquals('Order', id, 'status', 'Filled');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Market');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            filledUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'order', id);
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should create a Order with status Killed and a Transaction with filled unit price when Market Order is executed partially and remaining amount is killed because of insufficient liquidity', () => {
        const placedOrderId = BigInt.fromI32(0);
        const filledAmount = BigInt.fromI32(160);
        const filledUnitPrice = BigInt.fromI32(80);
        const filledAmountInFV = BigInt.fromI32(200);
        const totalAmount = BigInt.fromI32(400);
        const feeInFV = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            BigInt.fromI32(0),
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            false
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmount.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', totalAmount.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Market');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            filledUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'order', id);
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should create an order with status Killed when market order is not filled bacause of insufficient liquidity', () => {
        const placedOrderId = BigInt.fromI32(0);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            false
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Market');
    });

    test('should create a Killed Order and a Transaction when market order is killed partially because of circuit breaker', () => {
        const placedOrderId = BigInt.fromI32(0);
        const filledAmount = BigInt.fromI32(81);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(90);
        const totalAmount = filledAmount.plus(amount);
        const feeInFV = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            BigInt.fromI32(0),
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            placedOrderId,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            true
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmount.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', totalAmount.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Market');
        assert.fieldEquals('Order', id, 'isCircuitBreakerTriggered', 'true');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should create a Killed Order when market order is fully killed because of circuit breaker', () => {
        const placedOrderId = BigInt.fromI32(0);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            true
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Market');
        assert.fieldEquals('Order', id, 'isCircuitBreakerTriggered', 'true');
    });

    test('should create a Killed Order and a Transaction when limit order is filled partially filled and remaining amount is not killed because of circuit breaker', () => {
        const placedOrderId = BigInt.fromI32(0);
        const filledAmount = BigInt.fromI32(81);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(90);
        const feeInFV = BigInt.fromI32(1);
        const totalAmount = filledAmount.plus(amount);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            BigInt.fromI32(8400),
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            placedOrderId,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            true
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '8400');
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmount.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', totalAmount.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Limit');
        assert.fieldEquals('Order', id, 'isCircuitBreakerTriggered', 'true');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should create an Killed Order when limit order is completely killed because of circuit breaker', () => {
        const placedOrderId = BigInt.fromI32(0);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            true
        );
        handleOrderExecuted(event);

        const id =
            getOrderEntityId(placedOrderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', placedOrderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', unitPrice.toString());
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Limit');
        assert.fieldEquals('Order', id, 'isCircuitBreakerTriggered', 'true');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.notInStore('Transaction', txId);

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(0));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });
});

describe('PreOrder Executed', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should create an Pre Open Order', () => {
        const orderId = BigInt.fromI32(1);

        const event = createPreOrderExecutedEvent(
            BOB,
            lend,
            ccy,
            maturity,
            amount,
            unitPrice,
            orderId
        );
        handlePreOrderExecuted(event);

        const id = getOrderEntityId(orderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'orderId', orderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', unitPrice.toString());
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'Open');
        assert.fieldEquals('Order', id, 'isPreOrder', 'true');
        assert.fieldEquals('Order', id, 'type', 'Limit');

        const bob = getOrInitUser(BOB, timestamp);
        assert.bigIntEquals(bob.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(bob.transactionCount, BigInt.fromI32(0));
        const orders = bob.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        assert.bigIntEquals(bob.createdAt, event.block.timestamp);
    });
});

describe('Position Unwound', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should create a Filled Order and a transaction when future value is filled completely', () => {
        const orderId = BigInt.fromI32(0);
        const futureValue = BigInt.fromI32(250);
        const filledAmount = BigInt.fromI32(225);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(250);
        const feeInFV = BigInt.fromI32(1);

        const event = createPositionUnwoundEvent(
            BOB,
            lend,
            ccy,
            maturity,
            futureValue,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            false
        );
        handlePositionUnwound(event);

        const id =
            getOrderEntityId(orderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', orderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Order',
            id,
            'inputAmount',
            filledAmountInFV.toString()
        );
        assert.fieldEquals('Order', id, 'status', 'Filled');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Unwind');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            filledUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'order', id);
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const bob = getOrInitUser(BOB, timestamp);
        assert.bigIntEquals(bob.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(bob.transactionCount, BigInt.fromI32(1));
        const orders = bob.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = bob.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(bob.createdAt, event.block.timestamp);
    });

    test('should create an Killed Order and a transaction when futureValue is not filled completely', () => {
        const orderId = BigInt.fromI32(0);
        const futureValue = BigInt.fromI32(400);
        const filledAmount = BigInt.fromI32(180);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(200);
        const feeInFV = BigInt.fromI32(1);

        const event = createPositionUnwoundEvent(
            BOB,
            lend,
            ccy,
            maturity,
            futureValue,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            feeInFV,
            true
        );
        handlePositionUnwound(event);

        const id =
            getOrderEntityId(orderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'orderId', orderId.toString());
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals(
            'Order',
            id,
            'filledAmount',
            filledAmountInFV.toString()
        );
        assert.fieldEquals('Order', id, 'inputAmount', futureValue.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Unwind');

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            filledUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'futureValue',
            filledAmountInFV.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId,
            'amount',
            filledAmount.toString()
        );
        assert.fieldEquals('Transaction', txId, 'order', id);
        assert.fieldEquals('Transaction', txId, 'executionType', 'Taker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', feeInFV.toString());

        const bob = getOrInitUser(BOB, timestamp);
        assert.bigIntEquals(bob.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(bob.transactionCount, BigInt.fromI32(1));
        const orders = bob.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = bob.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(bob.createdAt, event.block.timestamp);
    });

    test('should create a Killed Order when order is fully killed by circuit breaker', () => {
        const orderId = BigInt.fromI32(0);
        const futureValue = BigInt.fromI32(250);

        const event = createPositionUnwoundEvent(
            BOB,
            lend,
            ccy,
            maturity,
            futureValue,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            true
        );
        handlePositionUnwound(event);

        const id =
            getOrderEntityId(orderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', futureValue.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Unwind');
    });

    test('should create a Killed order when position unwound order is not filled because of in sufficient liquidity', () => {
        const orderId = BigInt.fromI32(0);
        const futureValue = BigInt.fromI32(250);

        const event = createPositionUnwoundEvent(
            BOB,
            lend,
            ccy,
            maturity,
            futureValue,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            false
        );
        handlePositionUnwound(event);

        const id =
            getOrderEntityId(orderId, ccy, maturity) +
            ':' +
            event.transaction.hash.toHexString();
        assert.fieldEquals('Order', id, 'inputUnitPrice', '0');
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', futureValue.toString());
        assert.fieldEquals('Order', id, 'status', 'Killed');
        assert.fieldEquals('Order', id, 'isPreOrder', 'false');
        assert.fieldEquals('Order', id, 'type', 'Unwind');
    });
});

describe('Order Partially Filled', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should update an Open Order to Partially Filled and add a transaction', () => {
        const placedOrderId = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            placedOrderId,
            amount,
            unitPrice,
            false
        );
        handleOrderExecuted(event);

        const id = getOrderEntityId(placedOrderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'filledAmount', '0');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'Open');

        const orderPartiallyFilled = createOrderPartiallyFilledEvent(
            placedOrderId,
            ALICE,
            ccy,
            borrow,
            maturity,
            BigInt.fromI32(27),
            BigInt.fromI32(30)
        );
        handleOrderPartiallyFilled(orderPartiallyFilled);
        assert.fieldEquals('Order', id, 'filledAmount', '27');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');

        const txId =
            orderPartiallyFilled.transaction.hash.toHexString() +
            ':' +
            orderPartiallyFilled.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId, 'futureValue', '30');
        assert.fieldEquals('Transaction', txId, 'amount', '27');
        assert.fieldEquals('Transaction', txId, 'executionType', 'Maker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', '0');

        const alice = getOrInitUser(ALICE, timestamp);
        assert.bigIntEquals(alice.orderCount, BigInt.fromI32(1));
        assert.bigIntEquals(alice.transactionCount, BigInt.fromI32(1));
        const orders = alice.orders.load();
        assert.i32Equals(orders.length, 1);
        assert.stringEquals(orders[0].id, id);
        const transactions = alice.transactions.load();
        assert.i32Equals(transactions.length, 1);
        assert.stringEquals(transactions[0].id, txId);
        assert.bigIntEquals(alice.createdAt, event.block.timestamp);
    });

    test('should update an PartiallyFilled order amount and add a transaction', () => {
        const placedOrderId = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(27),
            unitPrice,
            BigInt.fromI32(30),
            BigInt.fromI32(0),
            placedOrderId,
            BigInt.fromI32(63),
            unitPrice,
            false
        );
        handleOrderExecuted(event);

        const id = getOrderEntityId(placedOrderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'filledAmount', '27');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');

        const orderPartiallyFilled = createOrderPartiallyFilledEvent(
            placedOrderId,
            ALICE,
            ccy,
            borrow,
            maturity,
            BigInt.fromI32(54),
            BigInt.fromI32(60)
        );
        handleOrderPartiallyFilled(orderPartiallyFilled);
        assert.fieldEquals('Order', id, 'filledAmount', '81');
        assert.fieldEquals('Order', id, 'inputAmount', amount.toString());
        assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');

        const txId =
            orderPartiallyFilled.transaction.hash.toHexString() +
            ':' +
            orderPartiallyFilled.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId, 'futureValue', '60');
        assert.fieldEquals('Transaction', txId, 'amount', '54');
        assert.fieldEquals('Transaction', txId, 'executionType', 'Maker');
        assert.fieldEquals('Transaction', txId, 'feeInFV', '0');

        assert.fieldEquals('User', ALICE.toHexString(), 'orderCount', '1');
        assert.fieldEquals(
            'User',
            ALICE.toHexString(),
            'transactionCount',
            '2'
        );
    });
});

describe('Order Canceled', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should mark open orders as cancelled order', () => {
        const placedOrderId = BigInt.fromI32(1);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            placedOrderId,
            amount,
            unitPrice,
            false
        );
        handleOrderExecuted(event);

        const id = getOrderEntityId(placedOrderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'status', 'Open');

        const canceledEvent = createOrderCanceledEvent(
            placedOrderId,
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice
        );
        handleOrderCanceled(canceledEvent);

        assert.fieldEquals('Order', id, 'status', 'Cancelled');

        assert.fieldEquals('User', ALICE.toHexString(), 'orderCount', '1');
        assert.fieldEquals(
            'User',
            ALICE.toHexString(),
            'transactionCount',
            '0'
        );
    });

    test('should mark partially filled order as cancelled order', () => {
        const placedOrderId = BigInt.fromI32(1);
        const filledAmount = BigInt.fromI32(81);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(90);
        const totalAmount = filledAmount.plus(amount);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            unitPrice,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            BigInt.fromI32(0),
            placedOrderId,
            amount,
            unitPrice,
            false
        );
        handleOrderExecuted(event);

        const id = getOrderEntityId(placedOrderId, ccy, maturity);
        assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');

        const canceledEvent = createOrderCanceledEvent(
            placedOrderId,
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice
        );
        handleOrderCanceled(canceledEvent);

        assert.fieldEquals('Order', id, 'status', 'Cancelled');

        assert.fieldEquals('User', ALICE.toHexString(), 'orderCount', '1');
        assert.fieldEquals(
            'User',
            ALICE.toHexString(),
            'transactionCount',
            '1'
        );
    });

    test('should not give error if order does not exist', () => {
        const placedOrderId = BigInt.fromI32(1);

        const canceledEvent = createOrderCanceledEvent(
            placedOrderId,
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice
        );
        handleOrderCanceled(canceledEvent);
    });
});

describe('Orders Cleaned', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should mark all the open orders as filled and add transactions', () => {
        const placedOrderId1 = BigInt.fromI32(1);

        const event1 = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            placedOrderId1,
            amount,
            unitPrice,
            false
        );
        handleOrderExecuted(event1);
        const id1 = getOrderEntityId(placedOrderId1, ccy, maturity);
        assert.fieldEquals('Order', id1, 'status', 'Open');

        const placedOrderId2 = BigInt.fromI32(2);
        const amount2 = BigInt.fromI32(120);
        const unitPrice2 = BigInt.fromI32(8000);

        const event2 = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount2,
            unitPrice2,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            placedOrderId2,
            amount2,
            unitPrice2,
            false
        );
        handleOrderExecuted(event2);
        const id2 = getOrderEntityId(placedOrderId2, ccy, maturity);
        assert.fieldEquals('Order', id2, 'status', 'Open');

        const ordersCleanedEvent = createOrdersCleanedEvent(
            [placedOrderId1, placedOrderId2],
            ALICE,
            borrow,
            ccy,
            maturity,
            BigInt.fromI32(210),
            BigInt.fromI32(250)
        );
        handleOrdersCleaned(ordersCleanedEvent);

        assert.fieldEquals('Order', id1, 'status', 'Filled');
        assert.fieldEquals('Order', id2, 'status', 'Filled');

        const txId1 =
            ordersCleanedEvent.transaction.hash.toHexString() +
            '-0:' +
            ordersCleanedEvent.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId1,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId1, 'futureValue', '100');
        assert.fieldEquals('Transaction', txId1, 'amount', amount.toString());
        assert.fieldEquals('Transaction', txId1, 'feeInFV', '0');
        assert.fieldEquals('Transaction', txId1, 'executionType', 'Maker');

        const txId2 =
            ordersCleanedEvent.transaction.hash.toHexString() +
            '-1:' +
            ordersCleanedEvent.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId2,
            'executionPrice',
            unitPrice2.toString()
        );
        assert.fieldEquals('Transaction', txId2, 'futureValue', '150');
        assert.fieldEquals('Transaction', txId2, 'amount', amount2.toString());
        assert.fieldEquals('Transaction', txId2, 'executionType', 'Maker');
    });

    test('should mark all the open orders as filled and add transactions', () => {
        const placedOrderId1 = BigInt.fromI32(1);

        const event1 = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice,
            BigInt.fromI32(36),
            BigInt.fromI32(90),
            BigInt.fromI32(45),
            BigInt.fromI32(0),
            placedOrderId1,
            BigInt.fromI32(54),
            unitPrice,
            false
        );
        handleOrderExecuted(event1);
        const id1 = getOrderEntityId(placedOrderId1, ccy, maturity);
        assert.fieldEquals('Order', id1, 'status', 'PartiallyFilled');

        const placedOrderId2 = BigInt.fromI32(2);
        const amount2 = BigInt.fromI32(120);
        const unitPrice2 = BigInt.fromI32(8000);

        const event2 = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount2,
            unitPrice2,
            BigInt.fromI32(80),
            BigInt.fromI32(80),
            BigInt.fromI32(100),
            BigInt.fromI32(0),
            placedOrderId2,
            BigInt.fromI32(40),
            unitPrice2,
            false
        );
        handleOrderExecuted(event2);
        const id2 = getOrderEntityId(placedOrderId2, ccy, maturity);
        assert.fieldEquals('Order', id2, 'status', 'PartiallyFilled');

        const ordersCleanedEvent = createOrdersCleanedEvent(
            [placedOrderId1, placedOrderId2],
            ALICE,
            borrow,
            ccy,
            maturity,
            BigInt.fromI32(210),
            BigInt.fromI32(250)
        );
        handleOrdersCleaned(ordersCleanedEvent);

        assert.fieldEquals('Order', id1, 'status', 'Filled');
        assert.fieldEquals('Order', id2, 'status', 'Filled');

        const txId1 =
            ordersCleanedEvent.transaction.hash.toHexString() +
            '-0:' +
            ordersCleanedEvent.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId1,
            'executionPrice',
            unitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId1, 'amount', '54');
        assert.fieldEquals('Transaction', txId1, 'executionType', 'Maker');

        const txId2 =
            ordersCleanedEvent.transaction.hash.toHexString() +
            '-1:' +
            ordersCleanedEvent.logIndex.toString();
        assert.fieldEquals(
            'Transaction',
            txId2,
            'executionPrice',
            unitPrice2.toString()
        );
        assert.fieldEquals('Transaction', txId2, 'futureValue', '50');
        assert.fieldEquals('Transaction', txId2, 'amount', '40');
        assert.fieldEquals('Transaction', txId2, 'feeInFV', '0');
        assert.fieldEquals('Transaction', txId2, 'executionType', 'Maker');

        assert.fieldEquals('User', ALICE.toHexString(), 'orderCount', '2');
        assert.fieldEquals(
            'User',
            ALICE.toHexString(),
            'transactionCount',
            '4'
        );
    });
});

describe('Itayose Executed', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should update the market details when itayose is executed', () => {
        const openingUnitPrice = BigInt.fromI32(8050);
        const lastLendUnitPrice = BigInt.fromI32(8100);
        const lastBorrowUnitPrice = BigInt.fromI32(8000);
        const offsetAmount = BigInt.fromI32(80890);
        const itayoseExecutedEvent = createItayoseExecutedEvent(
            ccy,
            maturity,
            openingUnitPrice,
            lastLendUnitPrice,
            lastBorrowUnitPrice,
            offsetAmount
        );
        handleItayoseExecuted(itayoseExecutedEvent);
        const id = ccy.toHexString() + '-' + maturity.toString();

        assert.fieldEquals('LendingMarket', id, 'currency', ccy.toHexString());
        assert.fieldEquals(
            'LendingMarket',
            id,
            'maturity',
            maturity.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'openingUnitPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'lastLendUnitPrice',
            lastLendUnitPrice.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'lastBorrowUnitPrice',
            lastBorrowUnitPrice.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'offsetAmount',
            offsetAmount.toString()
        );
    });

    test('should create the transactions with opening unit price only which were filled during itayose', () => {
        const orderId1 = BigInt.fromI32(1);
        const unitPrice1 = BigInt.fromI32(8200);
        const event1 = createPreOrderExecutedEvent(
            BOB,
            lend,
            ccy,
            maturity,
            amount,
            unitPrice1,
            orderId1
        );
        handlePreOrderExecuted(event1);

        const orderId2 = BigInt.fromI32(2);
        const unitPrice2 = BigInt.fromI32(8100);
        const event2 = createPreOrderExecutedEvent(
            BOB,
            lend,
            ccy,
            maturity,
            amount,
            unitPrice2,
            orderId2
        );
        handlePreOrderExecuted(event2);

        const orderId3 = BigInt.fromI32(3);
        const unitPrice3 = BigInt.fromI32(8000);
        const event3 = createPreOrderExecutedEvent(
            BOB,
            lend,
            ccy,
            maturity,
            amount,
            unitPrice3,
            orderId3
        );
        handlePreOrderExecuted(event3);

        const orderId4 = BigInt.fromI32(4);
        const unitPrice4 = BigInt.fromI32(7900);
        const event4 = createPreOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice4,
            orderId4
        );
        handlePreOrderExecuted(event4);

        const orderId5 = BigInt.fromI32(5);
        const unitPrice5 = BigInt.fromI32(8000);
        const event5 = createPreOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice5,
            orderId5
        );
        handlePreOrderExecuted(event5);

        const orderId6 = BigInt.fromI32(6);
        const unitPrice6 = BigInt.fromI32(8020);
        const event6 = createPreOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice6,
            orderId6
        );
        handlePreOrderExecuted(event6);

        const orderId7 = BigInt.fromI32(7);
        const unitPrice7 = BigInt.fromI32(7800);
        const event7 = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice7,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            orderId7,
            amount,
            unitPrice7,
            false
        );
        handleOrderExecuted(event7);

        const openingUnitPrice = BigInt.fromI32(8050);
        const lastLendUnitPrice = BigInt.fromI32(8100);
        const lastBorrowUnitPrice = BigInt.fromI32(8000);
        const offsetAmount = BigInt.fromI32(300);
        const itayoseExecutedEvent = createItayoseExecutedEvent(
            ccy,
            maturity,
            openingUnitPrice,
            lastLendUnitPrice,
            lastBorrowUnitPrice,
            offsetAmount
        );
        handleItayoseExecuted(itayoseExecutedEvent);

        const cleanEvent1 = createOrdersCleanedEvent(
            [orderId1, orderId2, orderId3],
            BOB,
            lend,
            ccy,
            maturity,
            BigInt.fromI32(270),
            BigInt.fromI32(334)
        );
        handleOrdersCleaned(cleanEvent1);

        const txId1 = cleanEvent1.transaction.hash.toHexString();
        const txId10 = txId1 + '-0:1';
        const txId11 = txId1 + '-1:1';
        const txId12 = txId1 + '-2:1';

        assert.fieldEquals(
            'Transaction',
            txId10,
            'executionPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId10, 'futureValue', '111');
        assert.fieldEquals(
            'Transaction',
            txId11,
            'executionPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId11, 'futureValue', '111');
        assert.fieldEquals(
            'Transaction',
            txId12,
            'executionPrice',
            unitPrice3.toString()
        );
        assert.fieldEquals('Transaction', txId12, 'futureValue', '112');

        const cleanEvent2 = createOrdersCleanedEvent(
            [orderId4, orderId5, orderId6, orderId7],
            ALICE,
            borrow,
            ccy,
            maturity,
            BigInt.fromI32(360),
            BigInt.fromI32(449)
        );
        handleOrdersCleaned(cleanEvent2);

        const txId2 = cleanEvent2.transaction.hash.toHexString();
        const txId20 = txId2 + '-0:1';
        const txId21 = txId2 + '-1:1';
        const txId22 = txId2 + '-2:1';
        const txId23 = txId2 + '-3:1';

        assert.fieldEquals(
            'Transaction',
            txId20,
            'executionPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId20, 'futureValue', '111');
        assert.fieldEquals(
            'Transaction',
            txId21,
            'executionPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals('Transaction', txId21, 'futureValue', '111');
        assert.fieldEquals(
            'Transaction',
            txId22,
            'executionPrice',
            unitPrice6.toString()
        );
        assert.fieldEquals('Transaction', txId22, 'futureValue', '112');
        assert.fieldEquals(
            'Transaction',
            txId23,
            'executionPrice',
            unitPrice7.toString()
        );
        assert.fieldEquals('Transaction', txId23, 'futureValue', '115');

        assert.fieldEquals('User', ALICE.toHexString(), 'orderCount', '4');
        assert.fieldEquals(
            'User',
            ALICE.toHexString(),
            'transactionCount',
            '4'
        );

        assert.fieldEquals('User', BOB.toHexString(), 'orderCount', '3');
        assert.fieldEquals('User', BOB.toHexString(), 'transactionCount', '3');
    });
});

describe('Daily Volume', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('taker transaction should update the daily volume', () => {
        const placedOrderId = BigInt.fromI32(1);
        const filledAmount = BigInt.fromI32(81);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(90);
        const totalAmount = filledAmount.plus(amount);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            unitPrice,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            BigInt.fromI32(0),
            placedOrderId,
            amount,
            unitPrice,
            false,
            BigInt.fromI32(1675878200)
        );
        handleOrderExecuted(event);

        const id = getDailyVolumeEntityId(ccy, maturity, '2023-02-08');
        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            filledAmount.toString()
        );

        const placedOrderId2 = BigInt.fromI32(2);
        const filledAmount2 = BigInt.fromI32(45);
        const filledAmountInFV2 = BigInt.fromI32(50);
        const totalAmount2 = filledAmount2.plus(amount);
        const event2 = createOrderExecutedEvent(
            BOB,
            borrow,
            ccy,
            maturity,
            totalAmount2,
            unitPrice,
            filledAmount2,
            filledUnitPrice,
            filledAmountInFV2,
            BigInt.fromI32(0),
            placedOrderId2,
            amount,
            unitPrice,
            false,
            BigInt.fromI32(1675878200)
        );
        handleOrderExecuted(event2);
        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            filledAmount.plus(filledAmount2).toString()
        );
    });

    test('position unwound should update the daily volume', () => {
        const orderId = BigInt.fromI32(0);
        const futureValue = BigInt.fromI32(250);
        const filledAmount = BigInt.fromI32(225);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(250);

        const event = createPositionUnwoundEvent(
            BOB,
            lend,
            ccy,
            maturity,
            futureValue,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            BigInt.fromI32(0),
            false,
            BigInt.fromI32(1675878200)
        );
        handlePositionUnwound(event);

        const id = getDailyVolumeEntityId(ccy, maturity, '2023-02-08');
        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            filledAmount.toString()
        );
    });

    test('partially filled order transaction should not update the daily volume', () => {
        const placedOrderId = BigInt.fromI32(1);
        const filledAmount = BigInt.fromI32(81);
        const filledUnitPrice = unitPrice;
        const filledAmountInFV = BigInt.fromI32(90);
        const totalAmount = filledAmount.plus(amount);

        const event = createOrderExecutedEvent(
            ALICE,
            borrow,
            ccy,
            maturity,
            totalAmount,
            unitPrice,
            filledAmount,
            filledUnitPrice,
            filledAmountInFV,
            BigInt.fromI32(0),
            placedOrderId,
            amount,
            unitPrice,
            false,
            BigInt.fromI32(1675878200)
        );
        handleOrderExecuted(event);

        const id = getDailyVolumeEntityId(ccy, maturity, '2023-02-08');
        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            filledAmount.toString()
        );

        const orderPartiallyFilled = createOrderPartiallyFilledEvent(
            placedOrderId,
            ALICE,
            ccy,
            borrow,
            maturity,
            BigInt.fromI32(27),
            BigInt.fromI32(30),
            BigInt.fromI32(1675878200)
        );
        handleOrderPartiallyFilled(orderPartiallyFilled);
        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            filledAmount.toString()
        );
    });

    test('itayose executed event should update the daily volume with totalOffsetAmount', () => {
        const openingUnitPrice = BigInt.fromI32(8050);
        const lastLendUnitPrice = BigInt.fromI32(8100);
        const lastBorrowUnitPrice = BigInt.fromI32(8000);
        const offsetAmount = BigInt.fromI32(300);
        const itayoseExecutedEvent = createItayoseExecutedEvent(
            ccy,
            maturity,
            openingUnitPrice,
            lastLendUnitPrice,
            lastBorrowUnitPrice,
            offsetAmount,
            BigInt.fromI32(1675878200)
        );
        handleItayoseExecuted(itayoseExecutedEvent);

        const dailyVolumeId = getDailyVolumeEntityId(
            ccy,
            maturity,
            '2023-02-08'
        );

        assert.fieldEquals(
            'DailyVolume',
            dailyVolumeId,
            'volume',
            offsetAmount.toString()
        );
    });
});
