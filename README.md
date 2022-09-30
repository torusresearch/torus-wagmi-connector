
<p align="center">
 <img src="https://web3auth.io/images/torus-icon-blue-3.svg" align="center" alt="Ledger" />
 <h2 align="center">Torus Wagmi Connector</h2>
 <p align="center"><a href="https://github.com/tmm/wagmi">Wagmi</a> Connector for Torus Wallet</p>
</p>



# About

`@toruslabs/torus-wagmi-connector` is a connector for the popular [wagmi](https://github.com/tmm/wagmi) library built on top of the [@toruslabs/torus-embed
](https://github.com/torusresearch/torus-embed).

It can be used to initialize a [wagmi client](https://wagmi.sh/docs/client) that will seemlessly manage the interaction of your DApp with Torus Wallet.

## How to use

Here is an example of a wagmi client using both the `TorusConnector` and the default `InjectedConnector` respectively.

```js
import { Web3AuthConnector } from '@web3auth/web3auth-wagmi-connector';
import { chain, configureChains, createClient } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { publicProvider } from 'wagmi/providers/public';

const { chains, provider } = configureChains(
  [chain.mainnet, chain.polygon],
  [publicProvider()]
);

const wagmiClient = createClient({
  autoConnect: true,
  connectors: [
    new TorusConnector({ 
      chains: chains,
      options: {
        chainId: "0x1",
        host: "mainnet",
      },
    }),
    new InjectedConnector({ chains }),
  ],
  provider,
});
```

# Documentation

Have a look at [the wagmi repo](https://github.com/tmm/wagmi) and [the wagmi doc](https://wagmi.sh/) to learn more on connectors and wagmi.