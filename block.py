import hashlib
import time
import json
from typing import List, Dict

class Block:
    def __init__(self, index: int, previous_hash: str, timestamp: float, data: Dict, hash: str):
        self.index = index
        self.previous_hash = previous_hash
        self.timestamp = timestamp
        self.data = data
        self.hash = hash

    @staticmethod
    def calculate_hash(index: int, previous_hash: str, timestamp: float, data: Dict) -> str:
        block_string = f"{index}{previous_hash}{timestamp}{json.dumps(data)}"
        return hashlib.sha256(block_string.encode()).hexdigest()

class Blockchain:
    def __init__(self):
        self.chain: List[Block] = [self.create_genesis_block()]

    @staticmethod
    def create_genesis_block() -> Block:
        return Block(0, "0", time.time(), {}, Block.calculate_hash(0, "0", time.time(), {}))

    def add_block(self, data: Dict) -> Block:
        latest_block = self.chain[-1]
        new_block = Block(
            index=latest_block.index + 1,
            previous_hash=latest_block.hash,
            timestamp=time.time(),
            data=data,
            hash=Block.calculate_hash(latest_block.index + 1, latest_block.hash, time.time(), data)
        )
        self.chain.append(new_block)
        return new_block