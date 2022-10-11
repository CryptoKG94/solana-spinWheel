import { PublicKey } from "@solana/web3.js";

/** GLOBAL CONSTANT */
export const PROGRAM_ID = new PublicKey("HHuEhMpSBPucPagawyqGwbM9PRJESbGCw2ZmcdrWs3UY");

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const PYTH_ACCOUNT = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

// devnet
export const USDC_TOKEN_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

// mainnet
// export const USDC_TOKEN_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");


export const DUST_VAULT_SEED = "DUST_VAULT_SEED";
export const FORGE_VAULT_SEED = "FORGE_VAULT_SEED";


export const REWARD_TOKEN_DECIMAL = 9;
export const PERCENTAGE_DECIMALS = 3;

export const REWARD_TYPE_NFT = 1;
export const REWARD_TYPE_TOKEN = 0;
export const REWARD_TYPE_SOL = 2;