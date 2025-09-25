#!/bin/bash
TEST_LOTTERY_ADDRESS=$1 yarn hardhat --config hardhat.config.scrollSepolia.ts --network scrollSepolia run scripts/testAnyrandCall.ts