use anchor_lang::prelude::*;

#[error_code]
pub enum SpinError {
    #[msg("Count Overflow To Add Item")]
    CountOverflowAddItem,

    #[msg("Index Overflow To Set Item")]
    IndexOverflowSetItem,

    #[msg("Incorrect User State")]
    IncorrectUserState,

    #[msg("Incorrect Claim Amount")]
    ClaimAmountError,

    #[msg("Incorrect SuperAdmin or Admin")]
    IncorrectSuperAdminOrAdmin,

    #[msg("Invalid Reward")]
    InvalidReward,

    #[msg("Invalid Dust Mint Key")]
    IncorreectDustMintKey,

    #[msg("Invalid Forge Mint Key")]
    IncorreectForgeMintKey,
}