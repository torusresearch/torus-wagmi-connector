import Torus, { TorusInpageProvider } from "@toruslabs/torus-embed";
import { Chain, Connector, ConnectorData, normalizeChainId, UserRejectedRequestError } from "@wagmi/core";
import { ethers, Signer } from "ethers";
import { getAddress } from "ethers/lib/utils";
import log from "loglevel";

import { Options } from "./interfaces";

const IS_SERVER = typeof window === "undefined";

export class TorusConnector extends Connector {
  ready = !IS_SERVER;

  readonly id = "torus";

  readonly name = "torus";

  provider: TorusInpageProvider;

  torusInstance?: Torus;

  torusOptions: Options;

  network = {
    host: "mainnet",
    chainId: 1,
    networkName: "Ethereum Mainnet",
    blockExplorer: "https://etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  };

  constructor(config: { chains?: Chain[]; options: Options }) {
    super(config);
    this.torusOptions = config.options;
    const chainId = config.options.chainId ? config.options.chainId : 1;
    const host = config.options.host ? config.options.host : "mainnet";
    this.torusInstance = new Torus({
      buttonPosition: config.options.buttonPosition || "bottom-left",
    });

    // set network according to chain details provided
    const networkDetails = this.chains.filter((x) => x.id === chainId);

    if (networkDetails.length > 0) {
      this.network = {
        ...this.network,
        host,
        chainId,
        networkName: networkDetails[0].name,
        tickerName: networkDetails[0].nativeCurrency?.name,
        ticker: networkDetails[0].nativeCurrency?.symbol,
        blockExplorer: networkDetails[0]?.blockExplorers.default?.url,
      };
    }
  }

  async connect(): Promise<Required<ConnectorData>> {
    try {
      // initialize torus embed
      if (!this.torusInstance.isInitialized) {
        await this.torusInstance.init({
          ...this.torusOptions.TorusParams,
          network: this.network,
        });
      }

      document.getElementById("torusIframe").style.zIndex = "9999999999";
      await this.torusInstance.login();

      if (this.torusOptions.TorusParams?.showTorusButton) {
        this.torusInstance.showTorusButton();
      }

      const isLoggedIn = await this.isAuthorized();

      // if there is a user logged in, return the user
      if (isLoggedIn) {
        const provider = await this.getProvider();

        return {
          provider,
          chain: {
            id: 0,
            unsupported: false,
          },
          account: await this.getAccount(),
        };
      }

      // eslint-disable-next-line no-async-promise-executor
      return await new Promise(async (resolve, reject) => {
        if (this.provider.isConnected()) {
          const signer = await this.getSigner();
          const account = await signer.getAddress();
          const provider = await this.getProvider();

          if (provider.on) {
            provider.on("accountsChanged", this.onAccountsChanged);
            provider.on("chainChanged", this.onChainChanged);
            provider.on("disconnect", this.onDisconnect);
          }

          return resolve({
            account,
            chain: {
              id: 0,
              unsupported: false,
            },
            provider,
          });
        }
        log.error("error while connecting");
        // eslint-disable-next-line prefer-promise-reject-errors
        return reject("error");
      });
    } catch (error) {
      log.error("error while connecting", error);
      throw new UserRejectedRequestError("Something went wrong");
    }
  }

  async getAccount(): Promise<string> {
    const provider = new ethers.providers.Web3Provider(await this.getProvider());
    const signer = provider.getSigner();
    const account = await signer.getAddress();
    return account;
  }

  async getProvider() {
    if (this.provider) {
      return this.provider;
    }
    this.provider = this.torusInstance.provider;
    return this.provider;
  }

  async getSigner(): Promise<Signer> {
    const provider = new ethers.providers.Web3Provider(await this.getProvider());
    const signer = provider.getSigner();
    return signer;
  }

  async isAuthorized() {
    try {
      const account = await this.getAccount();
      return !!(account && this.provider);
    } catch {
      return false;
    }
  }

  async getChainId(): Promise<number> {
    try {
      if (this.network.chainId) {
        return normalizeChainId(this.network.chainId);
      }
    } catch (error) {
      log.error("error", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.torusInstance.logout();
    this.torusInstance.hideTorusButton();
    this.provider = null;
  }

  protected onAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) this.emit("disconnect");
    else this.emit("change", { account: getAddress(accounts[0]) });
  }

  protected onChainChanged(chainId: string | number): void {
    const id = normalizeChainId(chainId);
    const unsupported = this.isChainUnsupported(id);
    this.emit("change", { chain: { id, unsupported } });
  }

  protected onDisconnect(): void {
    this.emit("disconnect");
  }
}
