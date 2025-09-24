import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('MockWETH', (m) => ({
    mockWETH: m.contract('MockWETH', []),
}))