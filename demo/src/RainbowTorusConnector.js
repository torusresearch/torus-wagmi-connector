import { TorusConnector } from "@toruslabs/torus-wagmi-connector";

export const rainbowTorusConnector = ({ chains }) => ({
  id: "torus",
  name: "Torus",
  iconUrl: "https://web3auth.io/images/torus-icon-blue-3.svg",
  iconBackground: "#fff",
  createConnector: () => {
    const connector = new TorusConnector({
      chains: chains,
      options: {
        chainId: "0x1",
        host: "mainnet",
      },
    });
    return {
      connector,
    };
  },
});
