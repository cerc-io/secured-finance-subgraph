# Secured Finance Subgraph

## Introduction

Secured Finance is an institutional-grade financial transaction platform with automatic collateral management and mark-to-market mechanisms.

This subgraph tracks of the current state of Secured Finance Protocol smart contracts, and provides historical data about activity for Secured Finance DApp.

* Lending Markets' status data,
* Orderbook data,
* Transactions data,
* Users withdraw and deposit data
* Liquidation data

## Entities Overview

| Entity         | Description                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| LendingMarket  | This entity contains all the orderbook markets data. It stores each market's daily transaction volume amount, along with the orders and transactions.                                                                                                        |
| Transaction    | This entity contains all transactions data.                                                           |
| Order          | This entity contains all orders details. It stores key information for the user address who placed, input amount, filled amount status etc.      |
| Transfer       | This entity contains user's deposit and withdraw history.                                             |
| Liquidation    | This entity contains liquidation information.                                                         |
| User           | This entity contains user's details like address, transactions, orders, liquidations and transfer history. |

## Quick start

1. Use established node version by running `nvm use`
2. Set your personal access token issued on your Github account `export NPM_AUTH_TOKEN=<your access token>`
3. Install repository dependencies by running `npm install`
4. Execute `npm run test` to run the tests.

## Deployment

Follow the steps bellow to deploy the subgraph

1. Run `npm run generate <ENV>` to create a migration file for the subgraph
2. Run `npm run deploy:<ENV>` to deploy the subgraph

## License

This project is licensed under the MIT license, Copyright (c) 2021 Secured Finance. For more information see LICENSE.
