const EC = require('elliptic').ec;
const SHA256 = require('crypto-js/sha256');

// Initialize elliptic curve with 'secp256k1' (same as Bitcoin)
const ec = new EC('secp256k1');

// Wallet Class
class Wallet {
  constructor() {
    this.keyPair = ec.genKeyPair();
    this.publicKey = this.keyPair.getPublic('hex');
    this.privateKey = this.keyPair.getPrivate('hex');
  }

  getAddress() {
    return this.publicKey;
  }

  sign(data) {
    const hash = SHA256(data).toString();
    const signature = this.keyPair.sign(hash, 'base64');
    return signature.toDER('hex');
  }

  static verifySignature(publicKey, signature, data) {
    const hash = SHA256(data).toString();
    const key = ec.keyFromPublic(publicKey, 'hex');
    return key.verify(hash, signature);
  }
}

// Transaction Class
class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.signature = null; // Signature will be added later
  }

  calculateHash() {
    return SHA256(this.fromAddress + this.toAddress + this.amount).toString();
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  isValid() {
    // Mining reward transactions have no fromAddress
    if (this.fromAddress === null) return true;

    // Check if the transaction has a signature
    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }

    // Verify the signature
    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    const hashTx = this.calculateHash();
    return publicKey.verify(hashTx, this.signature);
  }
}

// Blockchain Class
class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.miningReward = 100; // Reward for mining a block
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    // Create a new block with all pending transactions
    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mineBlock(2); // Mine the block with a difficulty of 2

    // Add the block to the chain
    this.chain.push(block);

    // Reset pending transactions and reward the miner
    this.pendingTransactions = [
      new Transaction(null, miningRewardAddress, this.miningReward),
    ];
  }

  addTransaction(transaction) {
    // Verify the transaction
    if (!transaction.isValid()) {
      throw new Error('Invalid transaction');
    }

    // Add the transaction to the pending list
    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }
        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if the block's transactions are valid
      for (const trans of currentBlock.transactions) {
        if (!trans.isValid()) {
          return false;
        }
      }

      // Check if the block's hash is valid
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // Check if the block points to the correct previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

// Block Class
class Block {
  constructor(index, timestamp, transactions, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0; // For mining
  }

  calculateHash() {
    return SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce
    ).toString();
  }

  mineBlock(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log('Block mined:', this.hash);
  }
}

// Example Usage
const myCoin = new Blockchain();

// Create wallets
const wallet1 = new Wallet();
const wallet2 = new Wallet();

console.log('Wallet 1 Address:', wallet1.getAddress());
console.log('Wallet 2 Address:', wallet2.getAddress());

// Create a transaction
const tx1 = new Transaction(wallet1.getAddress(), wallet2.getAddress(), 50);
tx1.signTransaction(wallet1.keyPair); // Sign the transaction with Wallet 1's private key

// Add the transaction to the blockchain
myCoin.addTransaction(tx1);

// Mine pending transactions (reward goes to Wallet 1)
console.log('\nStarting the miner...');
myCoin.minePendingTransactions(wallet1.getAddress());

// Check balances
console.log('\nWallet 1 Balance:', myCoin.getBalanceOfAddress(wallet1.getAddress()));
console.log('Wallet 2 Balance:', myCoin.getBalanceOfAddress(wallet2.getAddress()));

// Check if the blockchain is valid
console.log('\nIs blockchain valid?', myCoin.isChainValid());