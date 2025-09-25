#!/bin/bash

if [ -z "$1" ]; then
    echo "❌ Usage: ./test-lottery.sh <lottery-address>"
    echo "   Example: ./test-lottery.sh 0x123..."
    exit 1
fi

TEST_LOTTERY_ADDRESS=$1 yarn hardhat --config hardhat.config.scrollSepolia.ts --network scrollSepolia run scripts/testLottery.ts