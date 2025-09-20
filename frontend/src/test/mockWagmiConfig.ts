import { createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { mock } from 'wagmi/connectors';

export const mockWagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    mock({
      accounts: ['0x1234567890123456789012345678901234567890' as `0x${string}`],
    }),
  ],
  transports: {},
});