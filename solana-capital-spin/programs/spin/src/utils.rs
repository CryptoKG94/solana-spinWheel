use crate::{account::*};
use anchor_lang::prelude::*;


pub fn dev_fee(pool: &Pool, amount: u64) -> Result<u64> {
    let fee = pool.dev_fee as u128;
    let res = (amount as u128) * fee / 100;
    Ok(res as u64)
}
