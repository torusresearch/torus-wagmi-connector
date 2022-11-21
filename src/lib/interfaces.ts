import type { ETHEREUM_NETWORK_TYPE, TorusCtorArgs, TorusParams } from "@toruslabs/torus-embed";

export interface Options extends TorusCtorArgs {
  host: ETHEREUM_NETWORK_TYPE | string;
  /**
   * ChainId in hex/number that you want to connect with.
   */
  chainId?: number;
  TorusParams?: Omit<TorusParams, "network">;
}
