import Torus, { TorusInpageProvider } from "@toruslabs/torus-embed";
import { Address, Chain, Connector, ConnectorData, WalletClient } from "@wagmi/core";
import log from "loglevel";
import { createWalletClient, custom, getAddress, SwitchChainError, UserRejectedRequestError } from "viem";

import { Options } from "./interfaces";

const IS_SERVER = typeof window === "undefined";

function normalizeChainId(chainId: string | number | bigint) {
  if (typeof chainId === "string") return Number.parseInt(chainId, chainId.trim().substring(0, 2) === "0x" ? 16 : 10);
  if (typeof chainId === "bigint") return Number(chainId);
  return chainId;
}

export class TorusConnector extends Connector {
  ready = !IS_SERVER;

  readonly id = "torus";

  readonly name = "torus";

  protected provider: TorusInpageProvider;

  private torusInstance?: Torus;

  private torusOptions: Options;

  private network: {
    host: string;
    chainId: number;
    networkName: string;
    tickerName: string;
    ticker: string;
    blockExplorer: string;
  };

  constructor({ chains, options }: { chains?: Chain[]; options: Options }) {
    super({ chains, options });
    this.torusOptions = options;
    const chainId = options.chainId ? options.chainId : 1;
    const host = options.host ? options.host : "mainnet";
    this.torusInstance = new Torus({
      buttonPosition: options.buttonPosition || "bottom-left",
    });

    // set network according to chain details provided
    const chain = this.chains.find((x) => x.id === chainId);

    if (chain) {
      this.network = {
        host,
        chainId,
        networkName: chain.name,
        tickerName: chain.nativeCurrency?.name,
        ticker: chain.nativeCurrency?.symbol,
        blockExplorer: chain.blockExplorers.default?.url,
      };
    } else {
      log.warn(`ChainId ${chainId} not found in chain list`);
      this.emit("disconnect");
    }
  }

  async connect({ chainId }: { chainId?: number } = {}): Promise<Required<ConnectorData>> {
    try {
      this.emit("message", {
        type: "connecting",
      });

      await this.getProvider();

      if (!this.torusInstance.isLoggedIn) {
        await this.torusInstance.login();
      }

      this.provider.on("accountsChanged", this.onAccountsChanged);
      this.provider.on("chainChanged", this.onChainChanged);

      const [account, connectedChainId] = await Promise.all([this.getAccount(), this.getChainId()]);
      let unsupported = this.isChainUnsupported(connectedChainId);
      let id = connectedChainId;

      if (chainId && connectedChainId !== chainId) {
        // try switching chain
        const chain = await this.switchChain(chainId);
        id = chain.id;
        unsupported = this.isChainUnsupported(id);
      }

      return {
        account,
        chain: {
          id,
          unsupported,
        },
      };
    } catch (error) {
      if (this.torusInstance.isInitialized) {
        this.torusInstance.hideTorusButton();
      }
      log.error("error while connecting", error);
      throw new UserRejectedRequestError("Something went wrong" as unknown as Error);
    }
  }

  async getWalletClient({ chainId }: { chainId?: number } = {}): Promise<WalletClient> {
    const [provider, account] = await Promise.all([this.getProvider(), this.getAccount()]);
    const chain = this.chains.find((x) => x.id === chainId);
    if (!provider) throw new Error("provider is required.");
    return createWalletClient({
      account,
      chain,
      transport: custom(provider),
    });
  }

  async getAccount(): Promise<Address> {
    const provider = await this.getProvider();
    const accounts = await provider.request<string[]>({
      method: "eth_accounts",
    });
    return getAddress(accounts[0]);
  }

  async getProvider() {
    if (this.provider) {
      return this.provider;
    }

    // initialize torus embed
    if (!this.torusInstance.isInitialized) {
      await this.torusInstance.init({
        ...this.torusOptions.TorusParams,
        network: this.network,
      });
    } else if (this.torusOptions.TorusParams?.showTorusButton !== false) {
      this.torusInstance.showTorusButton();
    }

    document.getElementById("torusIframe").style.zIndex = "999999999999999999";

    this.provider = this.torusInstance.provider;
    return this.provider;
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
    await this.getProvider();
    const chainId = await this.provider.request<string>({ method: "eth_chainId" });
    log.info("chainId", chainId);
    return normalizeChainId(chainId);
  }

  async switchChain(chainId: number) {
    try {
      const chain = this.chains.find((x) => x.id === chainId);
      if (!chain) throw new SwitchChainError(new Error("chain not found on connector."));
      if (!this.isAuthorized()) throw new Error("Please login first");
      await this.torusInstance.setProvider({
        host: chain.rpcUrls.default.http[0],
        chainId,
        networkName: chain.name,
      });
      return chain;
    } catch (error) {
      log.error("Error: Cannot change chain", error);
      throw new SwitchChainError(error);
    }
  }

  async disconnect(): Promise<void> {
    await this.torusInstance.logout();
    this.torusInstance.hideTorusButton();
    const provider = await this.getProvider();
    provider.removeListener("accountsChanged", this.onAccountsChanged);
    provider.removeListener("chainChanged", this.onChainChanged);
  }

  protected onAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) this.emit("disconnect");
    else this.emit("change", { account: getAddress(accounts[0]) });
  }

  protected isChainUnsupported(chainId: number): boolean {
    return !this.chains.some((x) => x.id === chainId);
  }

  protected onChainChanged(chainId: string | number): void {
    const id = normalizeChainId(chainId);
    const unsupported = !this.chains.some((x) => x.id === id);
    log.info("chainChanged", id, unsupported);
    this.emit("change", { chain: { id, unsupported } });
  }

  protected onDisconnect(): void {
    this.emit("disconnect");
  }
}
