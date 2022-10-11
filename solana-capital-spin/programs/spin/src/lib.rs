use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_program::{program::invoke, program::invoke_signed, system_instruction};
use std::mem::size_of;

pub mod account;
pub mod constants;
pub mod errors;
pub mod utils;

use account::*;
use constants::*;
use errors::*;
use utils::*;

declare_id!("HHuEhMpSBPucPagawyqGwbM9PRJESbGCw2ZmcdrWs3UY");

#[program]
pub mod spin {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
    ) -> Result<()> {
        msg!("initialize");

        let pool = &mut ctx.accounts.pool;
        pool.superadmin = ctx.accounts.super_admin.key();
        pool.dev_wallet = Pubkey::try_from(DEV_WALLET_KEY).unwrap();
        pool.dev_fee = 3; // means 3%

        let mut _state = ctx.accounts.state.load_init()?;

        Ok(())
    }

    pub fn set_pay_info(
        ctx: Context<SetPayInfo>,
        sol_price: u64,
        dust_price: u64,
        forge_price: u64,
        dev_fee: u64,
        dev_wallet: Pubkey,
        is_use_paytoken: bool,
    ) -> Result<()> {
        msg!("initialize");
        let accts = ctx.accounts;
        let pool = &mut accts.pool;

        let mut is_admin = false;
        for i in 0..accts.admin_info.count {
            if accts.admin_info.admin_list[i as usize].eq(&accts.admin.key()) {
                is_admin = true;
                break;
            }
        }

        require!(is_admin || pool.superadmin.eq(&accts.admin.key()),
            SpinError::IncorrectSuperAdminOrAdmin
        );

        if is_use_paytoken == true {
            pool.dust_mint = accts.dust_mint.key();
            pool.forge_mint = accts.forge_mint.key();
        }
        pool.sol_price = sol_price;
        pool.dust_price = dust_price;
        pool.forge_price = forge_price;

        if pool.superadmin.eq(&accts.admin.key()) {
            pool.dev_fee = dev_fee;
            pool.dev_wallet = dev_wallet;
        }

        Ok(())
    }

    pub fn add_item(
        ctx: Context<SpinWheel>,
        item_mint_list: [Pubkey; 10],
        count: u8,
        token_type: u8,
        ratio: u32,
        amount: u64,
    ) -> Result<()> {
        msg!("add_item");

        let mut state = ctx.accounts.state.load_mut()?;
        state.add_spinitem(ItemRewardMints{item_mint_list, count}, token_type, ratio, amount)?;

        Ok(())
    }

    pub fn set_item(
        ctx: Context<SpinWheel>,
        index: u8,
        item_mint_list: [Pubkey; 10],
        count: u8,
        token_type: u8,
        ratio: u32,
        amount: u64,
        item_count: u8,
    ) -> Result<()> {
        msg!("set_item");

        let mut state = ctx.accounts.state.load_mut()?;
        state.set_spinitem(index, ItemRewardMints{item_mint_list, count}, token_type, ratio, amount)?;
        state.count = item_count;

        Ok(())
    }

    pub fn spin_wheel(ctx: Context<PlayGame>, rand: u32, _round_id: u64, pay_mode: u8,) -> Result<()> {
        let accts = ctx.accounts;
        let mut pay_amount = 0;

        // pay
        if pay_mode == 0 {
            // sol
            pay_amount = accts.pool.sol_price;
            let sol_fee = dev_fee(&accts.pool, accts.pool.sol_price)?;
            let real_sol = accts.pool.sol_price.checked_sub(sol_fee).unwrap();

            invoke(
                &system_instruction::transfer(&accts.user.key(), &accts.dev_account.key(), sol_fee),
                &[
                    accts.user.to_account_info().clone(),
                    accts.dev_account.clone(),
                    accts.system_program.to_account_info().clone(),
                ],
            )?;

            invoke(
                &system_instruction::transfer(&accts.user.key(), &accts.vault.key(), real_sol),
                &[
                    accts.user.to_account_info().clone(),
                    accts.vault.clone(),
                    accts.system_program.to_account_info().clone(),
                ],
            )?;
        } else if pay_mode == 1 {
            // dust
            require!(
                accts.pool.dust_mint.eq(&accts.dust_mint.key()),
                SpinError::IncorreectDustMintKey
            );
            let cpi_ctx = CpiContext::new(
                accts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: accts.source_account.to_account_info(),
                    to: accts.dust_vault.to_account_info(),
                    authority: accts.user.to_account_info(),
                },
            );
            if accts.dust_mint.decimals > REWARD_TOKEN_DECIMAL {
                let sub_decimals = accts.dust_mint.decimals - REWARD_TOKEN_DECIMAL;
                let amount = accts.pool.dust_price * ((10 as u64).pow(sub_decimals as u32));
                anchor_spl::token::transfer(cpi_ctx, amount)?;
            } else {
                let sub_decimals = REWARD_TOKEN_DECIMAL - accts.dust_mint.decimals;
                let amount = accts.pool.dust_price / ((10 as u64).pow(sub_decimals as u32));
                anchor_spl::token::transfer(cpi_ctx, amount)?;
            }
            pay_amount = accts.pool.dust_price;
        } else  {
            // forge
            require!(
                accts.pool.forge_mint.eq(&accts.forge_mint.key()),
                SpinError::IncorreectForgeMintKey
            );
            let cpi_ctx = CpiContext::new(
                accts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: accts.source_account.to_account_info(),
                    to: accts.forge_vault.to_account_info(),
                    authority: accts.user.to_account_info(),
                },
            );

            if accts.dust_mint.decimals > REWARD_TOKEN_DECIMAL {
                let sub_decimals = accts.forge_mint.decimals - REWARD_TOKEN_DECIMAL;
                let amount = accts.pool.forge_price * ((10 as u64).pow(sub_decimals as u32));
                anchor_spl::token::transfer(cpi_ctx, amount)?;
            } else {
                let sub_decimals = REWARD_TOKEN_DECIMAL - accts.forge_mint.decimals;
                let amount = accts.pool.forge_price / ((10 as u64).pow(sub_decimals as u32));
                anchor_spl::token::transfer(cpi_ctx, amount)?;
            }
            pay_amount = accts.pool.forge_price;
        }

        if accts.user_state.is_initialized == 0 {
            accts.user_state.is_initialized = 1;
            accts.user_state.user = accts.user.key();
            accts.user_state.round_num = 1;
        } else {
            require!(
                accts.user_state.user.eq(&accts.user.key()),
                SpinError::IncorrectUserState
            );
            accts.user_state.round_num = accts.user_state.round_num + 1;
        }

        // generate random winner
        let pyth_price_info = &accts.pyth_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
        let agg_price = pyth_price.agg.price as u64;
        let rand_spin = agg_price + rand as u64;

        let mut state = accts.state.load_mut()?;
        state.get_spinresult(rand_spin as u32);

        let amount = state.amount_list[state.last_spinindex as usize];
        let reward_mints = state.reward_mint_list[state.last_spinindex as usize];
        for i in 0..reward_mints.count {
            accts.user_pendingstate.add_item(reward_mints.item_mint_list[i as usize], amount)?;
        }

        accts.user_pendingstate.user = accts.user.key();
        accts.user_pendingstate.is_claimed = 0;
        accts.user_pendingstate.round_num = accts.user_state.round_num;
        accts.user_pendingstate.is_sol = state.token_type_list[state.last_spinindex as usize] == 2;
        if accts.user_pendingstate.is_sol {
            accts.user_pendingstate.sol_amount = amount;
        }

        let mut one_rmint = Pubkey::default();
        if reward_mints.count > 0 {
            one_rmint = reward_mints.item_mint_list[0];
        }

        accts.last_users.push_front_last_user(accts.user.key(), pay_amount, amount, one_rmint, state.token_type_list[state.last_spinindex as usize]);

        Ok(())
    }

    pub fn claim(
        ctx : Context<Claim>,
        amount: u64,
        is_sol: bool,
        ) -> Result<()> {
        let user_pendingstate = &mut ctx.accounts.user_pendingstate;

        if is_sol == true {
            require!(user_pendingstate.is_sol && user_pendingstate.is_claimed == 0 && amount == user_pendingstate.sol_amount, SpinError::InvalidReward);

            let bump = ctx.bumps.get("vault").unwrap();
            invoke_signed(
                &system_instruction::transfer(&ctx.accounts.vault.key(), &ctx.accounts.owner.key(), amount),
                &[
                    ctx.accounts.vault.to_account_info().clone(),
                    ctx.accounts.owner.clone(),
                    ctx.accounts.system_program.to_account_info().clone(),
                ],
                &[&[VAULT_SEED, &[*bump]]],
            )?;
        } else {
            let reward_mint = ctx.accounts.source_reward_account.mint;
            let mut is_found = false;
            let mut found_idx = 0;

            for i in 0..user_pendingstate.count {
                if user_pendingstate.pending_mint_list[i as usize].eq(&reward_mint) && user_pendingstate.is_claimed_list[i as usize] == false {
                    is_found = true;
                    found_idx = i;
                    break;
                }
            }

            require!(is_found, SpinError::InvalidReward);

            let (_vault_authority, vault_authority_bump) =
            Pubkey::find_program_address(&[ESCROW_PDA_SEED.as_ref()], ctx.program_id);
            let authority_seeds = &[&ESCROW_PDA_SEED.as_bytes()[..], &[vault_authority_bump]];

            token::transfer(
                ctx.accounts.into_transfer_to_pda_context()
                    .with_signer(&[&authority_seeds[..]]),
            amount,
            )?;
        }

        Ok(())
    }

    pub fn withdraw_paid_tokens(
        ctx : Context<Withdraw>,
        amount: u64,
        ) -> Result<()> {

        let (_vault_authority, vault_authority_bump) =
        Pubkey::find_program_address(&[ESCROW_PDA_SEED.as_ref()], ctx.program_id);
        let authority_seeds = &[&ESCROW_PDA_SEED.as_bytes()[..], &[vault_authority_bump]];

        token::transfer(
            ctx.accounts.into_transfer_from_pda_context()
                .with_signer(&[&authority_seeds[..]]),
        amount,
        )?;

        Ok(())
    }

    pub fn withdraw_sol( ctx : Context<WithdrawSol>, amount: u64) -> Result<()> {
        let accts = ctx.accounts;

        // send fee to treasury
        let bump = ctx.bumps.get("vault").unwrap();
        invoke_signed(
            &system_instruction::transfer(&accts.vault.key(), &accts.dest_account.key(), amount),
            &[
                accts.vault.to_account_info().clone(),
                accts.dest_account.clone(),
                accts.system_program.to_account_info().clone(),
            ],
            &[&[VAULT_SEED, &[*bump]]],
        )?;

        Ok(())
    }

    pub fn close_user_pending_acc(ctx : Context<CloseUserPendingAcc>) -> Result<()> {
        ctx.accounts.user_pendingstate.is_claimed = 1;

        Ok(())
    }

    pub fn add_admin(ctx : Context<ManageAdmin>) -> Result<()> {
        ctx.accounts.admin_info.add_admin(ctx.accounts.admin.key())?;
        Ok(())
    }

    pub fn delete_admin(ctx : Context<ManageAdmin>) -> Result<()> {
        ctx.accounts.admin_info.delete_admin(ctx.accounts.admin.key())?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    pub initializer: AccountInfo<'info>,

    #[account(init, seeds=[ESCROW_PDA_SEED.as_ref()], bump, payer=initializer, space=size_of::<Pool>() + 8)]
    pub pool : Box<Account<'info, Pool>>,

    #[account(init, seeds=[LAST_USERS_SEED.as_ref()], bump, payer=initializer, space=size_of::<LatestUsers>() + 8)]
    pub last_users : Box<Account<'info, LatestUsers>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub super_admin: AccountInfo<'info>,

    #[account(zero)]
    pub state : AccountLoader<'info, SpinItemList>,

    #[account(init, seeds=[ADMIN_LIST_SEED], bump, payer=initializer, space=size_of::<AdminInfo>() + 8)]
    pub admin_info : Box<Account<'info, AdminInfo>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct SetPayInfo<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds=[ESCROW_PDA_SEED.as_ref()],
        bump,
    )]
    pub pool : Box<Account<'info, Pool>>,

    #[account(mut)]
    pub admin_info : Account<'info, AdminInfo>,

    // dust mint
    pub dust_mint: Account<'info, Mint>,

    // forge mint
    pub forge_mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct SpinWheel<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub superadmin: Signer<'info>,

    #[account(
        mut,
        seeds=[ESCROW_PDA_SEED.as_ref()],
        bump,
        constraint = pool.superadmin == superadmin.key(),
    )]
    pub pool : Box<Account<'info, Pool>>,

    #[account(mut)]
    pub state : AccountLoader<'info, SpinItemList>,
}

#[derive(Accounts)]
#[instruction(rand: u32, round_id : u64)]
pub struct PlayGame<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds=[ESCROW_PDA_SEED.as_ref()], bump)]
    pub pool : Box<Account<'info, Pool>>,

    #[account(mut)]
    pub last_users : Box<Account<'info, LatestUsers>>,

    #[account(mut)]
    pub state : AccountLoader<'info, SpinItemList>,

    #[account(
        init_if_needed,
        seeds = [USER_STATE_SEED, user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + size_of::<UserState>()
    )]
    pub user_state: Box<Account<'info, UserState>>,

    #[account(
        init,
        seeds = [&round_id.to_le_bytes(), user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + size_of::<UserPendingClaimState>()
    )]
    pub user_pendingstate: Box<Account<'info, UserPendingClaimState>>,

    // dust mint
    #[account(mut)]
    pub dust_mint: Box<Account<'info, Mint>>,

    // dust vault that holds the dust mint for distribution
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = dust_mint,
        associated_token::authority = pool
    )]
    pub dust_vault: Box<Account<'info, TokenAccount>>,

    // forge mint
    #[account(mut)]
    pub forge_mint: Box<Account<'info, Mint>>,

    // forge vault that holds the pay mint for distribution
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = forge_mint,
        associated_token::authority = pool
    )]
    pub forge_vault: Box<Account<'info, TokenAccount>>,

    // source account
    #[account(mut)]
    /// CHECK: this should be checked with address in pool
    pub source_account: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    /// CHECK: this should be checked with address in pool
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        address = pool.dev_wallet
    )]
    /// CHECK: this should be checked with sol vault address
    pub dev_account: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,

    /// CHECK: We're reading data from this chainlink feed account
    pub pyth_account: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    pub owner : AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, seeds=[ESCROW_PDA_SEED.as_ref()], bump)]
    pub pool : Box<Account<'info, Pool>>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    /// CHECK: this should be checked with address in pool
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = owner.key() == user_pendingstate.user
    )]
    pub user_pendingstate: Box<Account<'info, UserPendingClaimState>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub source_reward_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub dest_reward_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> Claim<'info> {
    fn into_transfer_to_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .source_reward_account
                .to_account_info()
                .clone(),
            to: self.dest_reward_account.to_account_info().clone(),
            authority: self.pool.to_account_info().clone(),
        };
        CpiContext::new(self.token_program.to_account_info().clone(), cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct CloseUserPendingAcc<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    owner : AccountInfo<'info>,

    #[account(
        mut,
        close = owner,
    )]
    pub user_pendingstate: Account<'info, UserPendingClaimState>,
}


#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, constraint = pool.superadmin == *authority.key)]
    pub pool : Box<Account<'info, Pool>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut,owner=spl_token::id())]
    pub source_account : AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut,owner=spl_token::id())]
    pub dest_account : AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: Program<'info, Token>,
}

impl<'info> Withdraw<'info> {
    fn into_transfer_from_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self
                .source_account
                .to_account_info()
                .clone(),
            to: self.dest_account.to_account_info().clone(),
            authority: self.pool.to_account_info().clone(),
        };
        CpiContext::new(self.token_program.to_account_info().clone(), cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    /// CHECK: this should be checked with address in pool
    pub vault: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: this should be checked with address in pool
    pub dest_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageAdmin<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(constraint = pool.superadmin == *authority.key)]
    pub pool : Box<Account<'info, Pool>>,

    #[account(mut)]
    pub admin_info : Account<'info, AdminInfo>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub admin : AccountInfo<'info>,
}
