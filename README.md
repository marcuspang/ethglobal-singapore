# Dark Pools on Mina

A dark pool is useful for the following reasons:

1. separate from public trading pool, mitigate price impact with large volume
2. private trades, avoid being front-runned, MEV
3. less slippage

In my proto-kit app, I have achieved the following:

- private trade matching (using custom sequencer)
- delayed trade execution (based on block heights)
- expiration of orders (based on block heights)
- public LP operations
- public trade submission
- public token registry for pools (unique based on token pair)

## Other Approaches

1. Submit ZKPs to `submitOrder` function, which will then update the order book commitment, and the protocol will perform the trade matching separately.
   - This approach required some sort of off-chain storage of orders, which could be considered an improvement over the current implementation where order book is public
   - However, this runs into the same problem where 2 incoming orders using the same commitment will be incompatible, since the proof generated does not account for the other other's submission
   - My attempt to use a ZKP is in https://github.com/marcuspang/ethglobal-singapore/pull/1
2. Move the matching logic to a protocol lifecycle hook
   - This has essentially the same security properties as my implementation, but may be more convenient / ergonomic, since I am currently monkey-patching the `getTxs` function in `dark-pool-mempool.ts`

## Features

- [x] Create a dark pool for 2 tokens
- [x] Whitelist users for a dark pool
  - [x] With specific address
  - [ ] With zk proof
- [ ] Execute trades with private values
  - [x] Optionally, make the trade public
- [x] Anyone can add liquidity to dark pools
  - [x] UI
- [x] Anyone can remove liquidity from dark pools
  - [ ] UI
- [ ] Provide hooks for before and after trades (expose some address field for IHook function)
  - [x] custom timestamp for calling match order

## Architecture

```mermaid
graph TD
    subgraph L2_Rollup[L2 Rollup - Dark Pool]
        RN[Relayer Network]
        LP[Dark Pools]
    end

    subgraph Client[Client Side]
        UW[User Wallet]
        CZKP[Client ZKP]
    end

    RN -- manage --> LP
    RN -- matchOrders --> LP
    LP --> RN

    UW -- createPool, whitelistUser, addLiquidity, removeLiquidity --- RN
    UW -- submitTrade ---> CZKP
    CZKP ---> RN
```

## Quick start

The monorepo contains 1 package and 1 app:

- `packages/chain` contains everything related to your app-chain
- `apps/web` contains a demo UI that connects to your locally hosted app-chain sequencer

**Prerequisites:**

- Node.js `v18` (we recommend using NVM)
- pnpm `v9.8`
- nvm

For running with persistance / deploying on a server

- docker `>= 24.0`
- docker-compose `>= 2.22.0`

## Setup

```zsh
# ensures you have the right node.js version
nvm use
pnpm install
```

## Running

### Environments

The starter-kit offers different environments to run you appchain.
You can use those environments to configure the mode of operation for your appchain depending on which stage of development you are in.

The starter kit comes with a set of pre-configured environments:

- `inmemory`: Runs everything in-memory without persisting the data. Useful for early stages of runtime development.
- `development`: Runs the sequencer locally and persists all state in databases running in docker.
- `sovereign`: Runs your appchain fully in docker (except the UI) for testnet deployments without settlement.

Every command you execute should follow this pattern:

`pnpm env:<environment> <command>`

This makes sure that everything is set correctly and our tooling knows which environment you want to use.

### Running in-memory

```zsh
# starts both UI and sequencer locally
pnpm env:inmemory dev

# starts UI only
pnpm env:inmemory dev --filter web
# starts sequencer only
pnpm env:inmemory dev --filter chain
```

> Be aware, the dev command will automatically restart your application when your sources change.
> If you don't want that, you can alternatively use `pnpm run build` and `pnpm run start`

Navigate to `localhost:3000` to see the example UI, or to `localhost:8080/graphql` to see the GQL interface of the locally running sequencer.

### Running tests

```zsh
# run and watch tests for the `chain` package
pnpm run test --filter=chain -- --watchAll
```

### Running with persistence

```zsh
# start databases
pnpm env:development docker:up -d
# generate prisma client
pnpm env:development prisma:generate
# migrate database schema
pnpm env:development prisma:migrate

# build & start sequencer, make sure to prisma:generate & migrate before
pnpm build --filter=chain
pnpm env:development start --filter=chain

# Watch sequencer for local filesystem changes
# Be aware: Flags like --prune won't work with 'dev'
pnpm env:development dev --filter=chain

# Start the UI
pnpm env:development dev --filter web
```

### Deploying to a server

When deploying to a server, you should push your code along with your forked starter-kit to some repository,
then clone it on your remote server and execute it.

```zsh
# start every component with docker
pnpm env:sovereign docker:up -d
```

UI will be accessible at `https://localhost` and GQL inspector will be available at `https://localhost/graphql`

#### Configuration

Go to `docker/proxy/Caddyfile` and replace the `*` matcher with your domain.

```
yourdomain.com {
    ...
}
```

> HTTPS is handled automatically by Caddy, you can (learn more about automatic https here.)[https://caddyserver.com/docs/automatic-https]

In most cases, you will need to change the `NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL` property in the `.env` file to the domain your graphql endpoint is running in.
By default, the graphql endpoint is running on the same domain as your UI with the `/graphql` suffix.

#### Running sovereign chain locally

The caddy reverse-proxy automatically uses https for all connections, use this guide to remove certificate errors when accessing localhost sites

<https://caddyserver.com/docs/running#local-https-with-docker>

## CLI Options

- `logLevel`: Overrides the loglevel used. Also configurable via the `PROTOKIT_LOG_LEVEL` environment variable.
- `pruneOnStartup`: If set, prunes the database before startup, so that your chain is starting from a clean, genesis state. Alias for environment variable `PROTOKIT_PRUNE_ON_STARTUP`

In order to pass in those CLI option, add it at the end of your command like this

`pnpm env:inmemory dev --filter chain -- --logLevel DEBUG --pruneOnStartup`

### Building the framework from source

1. Make sure the framework is located under ../framework from the starter-kit's location
2. Adapt your starter-kit's package.json to use the file:// references to framework
3. Go into the framework folder, and build a docker image containing the sources with `docker build -f ./packages/deployment/docker/development-base/Dockerfile -t protokit-base .`

4. Comment out the first line of docker/base/Dockerfile to use protokit-base

## Acknowledgements

- Starter kit: https://github.com/proto-kit/starter-kit
- Constant LP implementation by kaupangdx: https://github.com/kaupangdx/kaupangdx-new
- MINA team: super responsive when I needed help with proto-kit
