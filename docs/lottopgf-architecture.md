# LottoPGF Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Contract Components](#contract-components)
4. [Anyrand Integration](#anyrand-integration)
5. [Lottery Lifecycle](#lottery-lifecycle)
6. [Contract Interactions](#contract-interactions)
7. [Security Features](#security-features)
8. [Deployment and Configuration](#deployment-and-configuration)

## Overview

LottoPGF (Lotto Public Goods Funding) is a decentralized lottery system built on Ethereum that leverages verifiable randomness from Anyrand to create fair, transparent lotteries for funding public goods. The system allows anyone to create and manage number-based lotteries similar to traditional lottery systems like Powerball or EuroMillions, but with the added benefits of blockchain transparency and cryptographically secure randomness.

### Key Features
- **Verifiable Randomness**: Uses Anyrand's drand-based VRF for provably fair number draws
- **Configurable Lottery Parameters**: Customizable pick length, ball range, game periods, and ticket prices
- **NFT Tickets**: Each lottery ticket is minted as an NFT with on-chain SVG rendering
- **Community Funding Model**: Splits ticket revenue between jackpot, community fees, and protocol fees
- **Upgradeable Architecture**: Uses proxy pattern for future improvements
- **Multi-Network Support**: Deployable on Ethereum L1 and L2 networks

### What LottoPGF Does

LottoPGF enables communities to:
1. **Create Fundraising Lotteries**: Deploy custom lottery contracts to fund public goods initiatives
2. **Ensure Fair Draws**: Leverage cryptographically secure randomness that cannot be manipulated
3. **Build Sustainable Funding**: Generate ongoing revenue streams for community projects
4. **Provide Transparency**: All lottery operations are transparent and verifiable on-chain
5. **Support Multiple Winners**: Handles edge cases like multiple winners and no-winner scenarios

## System Architecture

### Contract Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                   LooteryFactory                     │
│  (UUPS Upgradeable, AccessControl)                  │
│  - Deploys new Lootery instances                    │
│  - Manages master implementation                     │
│  - Configures randomizer and renderer               │
└────────────────┬────────────────────────────────────┘
                 │ Creates (Clone)
                 ▼
┌─────────────────────────────────────────────────────┐
│                      Lootery                         │
│  (ERC721, Initializable, Ownable, ReentrancyGuard)  │
│  - Main lottery contract                             │
│  - Manages games, tickets, and jackpots             │
│  - Integrates with Anyrand for randomness           │
└────────┬───────────────────────┬────────────────────┘
         │                       │
         │ Uses                  │ Renders
         ▼                       ▼
┌──────────────────┐    ┌────────────────────────┐
│  Anyrand         │    │  TicketSVGRenderer    │
│  (Randomness)    │    │  (NFT Visuals)        │
└──────────────────┘    └────────────────────────┘
         │
         │ Optional Adapter
         ▼
┌──────────────────────────────────────────────────────┐
│              LooteryETHAdapter                       │
│  - Wraps ETH to WETH for lottery participation      │
│  - Simplifies user experience                        │
└──────────────────────────────────────────────────────┘
```

### State Machine

The lottery operates through a well-defined state machine:

```
   UNINITIALISED
         │
         ▼ init()
    ┌─────────┐
    │PURCHASE │◄─────────────┐
    └────┬────┘              │
         │ draw()            │ Game ends,
         ▼                   │ new game starts
  ┌─────────────┐            │
  │DRAW_PENDING │────────────┘
  └──────┬──────┘ receiveRandomness()
         │
         │ kill() (apocalypse mode)
         ▼
    ┌──────┐
    │ DEAD │
    └──────┘
```

## Contract Components

### 1. Lootery.sol - Core Lottery Contract

The main lottery contract that handles all game logic, ticket sales, and prize distribution.

#### Key State Variables
- `pickLength`: Number of balls to pick (e.g., 5 for a 5-ball lottery)
- `maxBallValue`: Maximum value of each ball (e.g., 69 for range 1-69)
- `gamePeriod`: Duration of each lottery round in seconds
- `ticketPrice`: Cost per ticket in prize tokens
- `jackpot`: Current accumulated jackpot amount
- `unclaimedPayouts`: Prizes from previous round awaiting claims
- `currentGame`: Current game state and ID
- `randomiser`: Address of Anyrand contract for VRF

#### Core Functions

**Ticket Purchase**
```solidity
function purchase(Ticket[] calldata tickets, address beneficiary) external
```
- Players purchase tickets with specific number picks
- Mints NFT tickets to players
- Splits payment between jackpot, community fees, and protocol fees
- Validates picks are sorted and within valid range

**Number Drawing**
```solidity
function draw() external payable onlyInState(GameState.Purchase)
```
- Called by keepers when game period expires
- Requests randomness from Anyrand
- Transitions game to DrawPending state
- Requires payment for VRF gas costs

**Randomness Callback**
```solidity
function receiveRandomness(uint256 requestId, uint256 randomWord) external
```
- Called by Anyrand with verifiable random value
- Computes winning numbers using Feistel shuffle
- Finalizes current game and starts next round
- Handles jackpot rollover logic

**Prize Claiming**
```solidity
function claimWinnings(uint256 tokenId) external returns (uint256 prizeShare)
```
- Winners claim their share of the jackpot
- Validates winning tickets against drawn numbers
- Distributes prizes proportionally among winners
- Burns consolation tickets in apocalypse mode

### 2. LooteryFactory.sol - Factory & Registry

Deploys and manages Lootery instances using the clone pattern for gas efficiency.

#### Key Functions

**Lottery Creation**
```solidity
function create(
    string memory name,
    string memory symbol,
    uint8 pickLength,
    uint8 maxBallValue,
    uint256 gamePeriod,
    uint256 ticketPrice,
    uint256 communityFeeBps,
    address prizeToken,
    uint256 seedJackpotDelay,
    uint256 seedJackpotMinValue
) external returns (address)
```
- Deploys new lottery instance as minimal proxy
- Configures all lottery parameters
- Links to Anyrand randomizer
- Sets up ticket SVG renderer

#### Admin Functions
- `setLooteryMasterCopy()`: Update implementation for new deployments
- `setRandomiser()`: Change Anyrand contract address
- `setTicketSVGRenderer()`: Update NFT renderer
- `setFeeRecipient()`: Configure protocol fee recipient

### 3. LooteryETHAdapter.sol - ETH Convenience Wrapper

Simplifies lottery participation for ETH users by handling WETH conversion.

```solidity
function purchase(
    address payable looteryAddress,
    Lootery.Ticket[] calldata tickets,
    address beneficiary
) public payable
```
- Accepts ETH payments
- Wraps ETH to WETH
- Purchases tickets on user's behalf
- Enables seamless ETH-based participation

### 4. TicketSVGRenderer.sol - NFT Visualization

Generates on-chain SVG representations of lottery tickets.

```solidity
function renderTokenURI(
    string memory name,
    uint256 tokenId,
    uint8 maxPick,
    uint8[] memory pick
) external pure returns (string memory)
```
- Creates visual grid of lottery numbers
- Highlights selected numbers with circles
- Returns base64-encoded data URI
- Fully on-chain, no external dependencies

## Anyrand Integration

LottoPGF integrates with Anyrand for verifiable randomness through the following flow:

### 1. Randomness Request Phase

When `draw()` is called:
```solidity
// Calculate VRF request price
uint256 requestPrice = getRequestPrice();

// Request randomness with 30-second deadline
uint256 requestId = IAnyrand(randomiser).requestRandomness{
    value: requestPrice
}(block.timestamp + 30, callbackGasLimit);
```

The lottery:
- Calculates required payment for VRF service
- Submits request with deadline and callback gas limit
- Stores request ID and transitions to DrawPending state
- Emits `RandomnessRequested` event

### 2. Beacon Round Waiting

Anyrand waits for the corresponding drand beacon round:
- Beacon rounds occur every 30 seconds
- Round is determined by deadline timestamp
- Fulfiller monitors for round availability

### 3. Fulfillment & Callback

When the beacon round is available:
1. **Fulfiller submits BLS signature** to Anyrand
2. **Anyrand verifies signature** against beacon public key
3. **Anyrand derives randomness** from signature
4. **Anyrand calls back** to Lootery with random value

```solidity
function receiveRandomness(
    uint256 requestId,
    uint256 randomWord
) external onlyInState(GameState.DrawPending) {
    // Verify caller is randomizer
    if (msg.sender != randomiser) revert CallerNotRandomiser(msg.sender);

    // Compute winning numbers from random seed
    uint8[] memory balls = computeWinningPick(randomWord);

    // Record winning pick and setup next game
    gameData[gameId].winningPickId = Pick.id(balls);
    _setupNextGame();
}
```

### 4. Number Generation Algorithm

The winning numbers are generated using a Feistel shuffle:
```solidity
function computeWinningPick(uint256 randomSeed)
    public view returns (uint8[] memory balls) {
    balls = new uint8[](pickLength);
    for (uint256 i; i < pickLength; ++i) {
        balls[i] = uint8(
            1 + FeistelShuffleOptimised.shuffle(
                i, maxBallValue, randomSeed, 12
            )
        );
    }
    balls = balls.sort();
}
```

This ensures:
- Deterministic generation from random seed
- No duplicate numbers
- Uniform distribution across valid range
- Sorted output for easy comparison

## Lottery Lifecycle

### 1. Lottery Deployment

```
Factory.create() → Deploy Clone → Initialize Lootery
                                    ├─ Set parameters
                                    ├─ Link Anyrand
                                    └─ Start first game
```

### 2. Game Round Flow

```
PURCHASE Phase (gamePeriod duration)
├─ Players buy tickets
├─ Jackpot accumulates
├─ NFTs minted
└─ Picks recorded

    ↓ (game period expires)

DRAW Initiated
├─ Keeper calls draw()
├─ Request randomness from Anyrand
└─ State → DrawPending

    ↓ (beacon round available)

FULFILLMENT
├─ Anyrand provides random value
├─ Calculate winning numbers
├─ Determine winners
└─ Setup next game

    ↓

CLAIM Period (next game's purchase phase)
├─ Winners claim prizes
├─ Unclaimed prizes tracked
└─ May rollover to next jackpot
```

### 3. Prize Distribution Logic

**Single Winner**
- Receives entire jackpot + unclaimed prizes
- Jackpot resets to zero

**Multiple Winners**
- Prize split equally among winners
- Late claimers get proportional share of remaining unclaimed

**No Winners**
- Jackpot rolls over to next game
- Unclaimed prizes also roll over

**Apocalypse Mode (Final Game)**
- If no winners, all ticket holders share jackpot
- Tickets burned when claiming consolation prize
- Lottery permanently ends

### 4. Fee Distribution

Each ticket purchase is split:
```
Ticket Price
    ├─ Jackpot Share (varies, typically 50-90%)
    ├─ Community Fee (configurable, e.g., 5%)
    └─ Protocol Fee (fixed 5%)
```

## Contract Interactions

### Event Flow Diagram

```
User                Lootery              Anyrand            Keeper
 │                     │                     │                │
 ├──purchase()────────►│                     │                │
 │                     ├─TicketPurchased    │                │
 │◄────NFT Ticket──────┤                     │                │
 │                     │                     │                │
 │                     │◄────────draw()──────────────────────┤
 │                     ├──requestRandomness()►│               │
 │                     │◄────requestId────────┤               │
 │                     ├─ RandomnessRequested │               │
 │                     │                     │                │
 │                     │              [Wait for beacon]       │
 │                     │                     │                │
 │                     │◄─receiveRandomness()─┤               │
 │                     ├─ GameFinalised      │                │
 │                     │                     │                │
 ├──claimWinnings()───►│                     │                │
 │◄────Prize───────────┤                     │                │
 │                     ├─ WinningsClaimed    │                │
```

### Key Events

**TicketPurchased**
```solidity
event TicketPurchased(
    uint256 indexed gameId,
    address indexed whomst,
    uint256 indexed tokenId,
    uint8[] pick
)
```

**RandomnessRequested**
```solidity
event RandomnessRequested(uint208 requestId)
```

**GameFinalised**
```solidity
event GameFinalised(uint256 gameId, uint8[] winningPick)
```

**WinningsClaimed**
```solidity
event WinningsClaimed(
    uint256 indexed tokenId,
    uint256 indexed gameId,
    address whomst,
    uint256 value
)
```

## Security Features

### 1. Randomness Security
- **Verifiable Randomness**: Uses Anyrand's BLS-verified drand beacons
- **Commitment Scheme**: Requests committed before randomness revealed
- **No Manipulation**: Neither players nor operators can influence outcomes
- **Time-locked Rounds**: Randomness tied to specific future beacon rounds

### 2. Access Controls
- **Ownable**: Admin functions restricted to owner
- **Role-based**: Factory uses AccessControl for admin management
- **Randomizer-only Callback**: Only Anyrand can provide randomness
- **State Machine Guards**: Operations restricted by game state

### 3. Economic Security
- **ReentrancyGuard**: Prevents reentrancy attacks
- **SafeERC20**: Safe token transfers
- **Exact Payment Validation**: Requires exact VRF payment amounts
- **Rate Limiting**: Jackpot seeding rate-limited to prevent manipulation

### 4. Game Integrity
- **Sorted Pick Validation**: Ensures no duplicate numbers
- **Range Validation**: Balls must be within valid range
- **Claim Window**: Winners must claim within one round
- **Apocalypse Mode**: Ensures final distribution if lottery ends

### 5. Upgrade Safety
- **UUPS Pattern**: Controlled upgrades through proxy
- **Initializer Guards**: Prevents re-initialization
- **Storage Slot Isolation**: Uses specific slots to prevent collisions

## Deployment and Configuration

### 1. Factory Deployment

```javascript
// Deploy implementation contracts
const looteryImpl = await deployLooteryImplementation()
const ticketRenderer = await deployTicketSVGRenderer()

// Deploy factory with initialization
const factory = await deployLooteryFactory()
await factory.init(
    looteryImpl.address,      // Master implementation
    anyrand.address,          // Randomness provider
    ticketRenderer.address    // NFT renderer
)
```

### 2. Lottery Creation

```javascript
// Create new lottery instance
const lotteryAddress = await factory.create(
    "Community Lottery",      // Name
    "LOTTO",                 // Symbol
    5,                       // Pick 5 numbers
    69,                      // From 1-69
    7 * 24 * 60 * 60,       // 1 week games
    parseEther("10"),        // 10 token ticket price
    500,                     // 5% community fee
    weth.address,            // Prize token
    24 * 60 * 60,           // Daily jackpot seeding
    parseEther("1000")       // Min 1000 token seed
)
```

### 3. Network-Specific Configuration

**Scroll Sepolia**
```javascript
{
    anyrand: '0x86d8C50E04DDd04cdaafaC9672cf1D00b6057AF5',
    weth: '0x5300000000000000000000000000000000000004',
    callbackGasLimit: 500_000
}
```

**Base Mainnet**
```javascript
{
    anyrand: '0xF6baf607AC2971EE6A3C47981E7176134628e36C',
    weth: '0x4200000000000000000000000000000000000006',
    callbackGasLimit: 500_000
}
```

### 4. Operational Requirements

**Keeper Infrastructure**
- Monitor for expired games to trigger draws
- Ensure sufficient ETH for VRF payments
- Implement redundancy for critical operations

**VRF Payment Management**
- Maintain ETH balance in lottery for VRF requests
- Monitor gas prices for appropriate limits
- Handle refunds for excess payments

**Community Management**
- Set beneficiaries for community fee distribution
- Configure display names for transparency
- Withdraw accumulated fees periodically

## Summary

LottoPGF represents a complete decentralized lottery solution that leverages Anyrand's verifiable randomness to create fair, transparent fundraising mechanisms for public goods. The system's modular architecture, comprehensive security features, and integration with proven randomness infrastructure make it suitable for production deployment across multiple networks.

The key innovation lies in combining traditional lottery mechanics with blockchain transparency and cryptographic guarantees, ensuring that neither players nor operators can manipulate outcomes while maintaining an engaging user experience through NFT tickets and on-chain visualization.