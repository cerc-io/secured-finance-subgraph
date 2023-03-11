# Secured Finance Subgraph

## Introduction

Secured Finance is an institutional-grade financial transaction platform with automatic collateral management and mark-to-market mechanisms.

This subgraph tracks of the current state of Secured Finance Protocol smart contracts, and provides historical data about activity for Secured Finance DApp.

* Lending contracts state and history with active and closed positions,
* Order-book market data for Secured Finance terminal,
* Secured Finance users collateral state
* Historical data from Secured Finance aggregated by days, hours, minutes, etc.

## Quick start

1. Use established node version by running `nvm use`
2. Set your personal access token issued on your Github account `export NPM_AUTH_TOKEN=<your access token>`
3. Install repository dependencies by running `npm install`
4. Execute `npm run test` to run the tests.


## Deployment
Follow the steps bellow to deploy the subgraph

1. Run `npm run generate:<ENV>` to create a migration file for the subgraph
2. Run `npm run deploy:<ENV>` to deploy the subgraph

## License

This project is licensed under the MIT license, Copyright (c) 2021 Secured Finance. For more information see LICENSE.
