import * as anchor from '@project-serum/anchor';
import { PublicKey } from "@solana/web3.js";
import { DUST_VAULT_SEED, FORGE_VAULT_SEED, PROGRAM_ID } from "./constants";

export const getPoolKey = async () => {
    const [poolKey] = await asyncGetPda(
        [Buffer.from("sw_game_vault_auth")],
        PROGRAM_ID
    );
    return poolKey;
};

export const getLastUsersKey = async () => {
    const [poolKey] = await asyncGetPda(
        [Buffer.from("LAST_USERS_SEED")],
        PROGRAM_ID
    );
    return poolKey;
};

export const getDustVault = async (dustMint: PublicKey) => {
    const [poolKey] = await asyncGetPda(
        [
            Buffer.from(DUST_VAULT_SEED),
            dustMint.toBuffer()
        ],
        PROGRAM_ID
    );
    return poolKey;
};

export const getForgeVault = async (forgeMint: PublicKey) => {
    const [vaultKey] = await asyncGetPda(
        [
            Buffer.from(FORGE_VAULT_SEED),
            forgeMint.toBuffer()
        ],
        PROGRAM_ID
    );
    return vaultKey;
};

export const getUserStateKey = async (userKey: PublicKey) => {
    const USER_STATE_SEED = "USER_STATE_SEED";

    const [userStateKey] = await asyncGetPda(
        [Buffer.from(USER_STATE_SEED), userKey.toBuffer()],
        PROGRAM_ID
    );
    return userStateKey;
};

export const getUserPendingKey = async (userKey: PublicKey, round_id: number) => {
    let id = new anchor.BN(round_id);

    const [userStateKey] = await asyncGetPda(
        [id.toArrayLike(Buffer, "le", 8), userKey.toBuffer()],
        PROGRAM_ID
    );
    return userStateKey;
};

export const getSettingInfoKey = async () => {
    const ADMIN_SETTING_SEED = "ADMIN_SETTING_SEED";

    const [adminSettingKey] = await asyncGetPda(
        [Buffer.from(ADMIN_SETTING_SEED)],
        PROGRAM_ID
    );
    return adminSettingKey;
};

export const getAdminInfoKey = async () => {
    const ADMIN_LIST_SEED = "ADMIN_LIST_SEED";

    const [adminListKey] = await asyncGetPda(
        [Buffer.from(ADMIN_LIST_SEED)],
        PROGRAM_ID
    );
    return adminListKey;
};

export const getVaultKey = async () => {
    const VAULT_KEY_SEED = "SOL_VAULT";

    const [vaultKey] = await asyncGetPda(
        [Buffer.from(VAULT_KEY_SEED)],
        PROGRAM_ID
    );
    return vaultKey;
};

const asyncGetPda = async (
    seeds: any,
    programId: any
) => {
    const [pubKey, bump] = await PublicKey.findProgramAddress(seeds, programId);
    return [pubKey, bump];
};