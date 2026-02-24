use anchor_lang::prelude::*;

declare_id!("2mbuH8RZ99bkBZozkvj5AzadS6jsC1BS13m3NjSnqY9r");

mod instructions;
mod states;
mod errors;

use instructions::*;

#[program]
pub mod safetrade_capstone {
    use super::*;

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        listing_id: u64,
        amount: u64,
        confirm_duration: i64,
        dispute_duration: i64,
        bump: u8,
    ) -> Result<()> {
        ctx.accounts.init_escrow(amount, confirm_duration, dispute_duration, bump, listing_id)
    }

    pub fn fund_escrow(ctx: Context<FundEscrow>, _listing_id: u64) -> Result<()> {
        ctx.accounts.fund()
    }

    pub fn complete_escrow(
        ctx: Context<CompleteEscrow>,
        _listing_id: u64,
        vault_bump: u8,
    ) -> Result<()> {
        ctx.accounts.complete(vault_bump)
    }

    pub fn cancel_escrow(ctx: Context<CancelEscrow>, _listing_id: u64) -> Result<()> {
        ctx.accounts.cancel()
    }

    pub fn claim_after_expire(
        ctx: Context<ClaimAfterExpire>,
        _listing_id: u64,
        vault_bump: u8,
    ) -> Result<()> {
        ctx.accounts.claim(vault_bump)
    }

    pub fn raise_dispute(ctx: Context<RaiseDispute>, _listing_id: u64) -> Result<()> {
        ctx.accounts.raise()
    }

    pub fn vote_on_dispute(
        ctx: Context<VoteOnDispute>,
        _listing_id: u64,
        support_seller: bool,
        bump: u8,
    ) -> Result<()> {
        ctx.accounts.vote(support_seller, bump)
    }

    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        _listing_id: u64,
        vault_bump: u8,
    ) -> Result<()> {
        ctx.accounts.resolve(vault_bump)
    }
}
