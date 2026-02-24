use anchor_lang::prelude::*;
use crate::errors::EscrowError;
use crate::states::{EscrowAccount, TradeStatus, VoteReceipt};

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct VoteOnDispute<'info> {
    #[account(mut)]
    pub arbitrator: Signer<'info>,

    /// CHECK: only used for PDA seeds
    pub seller: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"escrow",
            seller.key().as_ref(),
            &listing_id.to_le_bytes(),
        ],
        bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    #[account(
        init,
        payer = arbitrator,
        space = 8 + 32 + 32 + 1 + 1,
        seeds = [
            b"vote_receipt",
            escrow.key().as_ref(),
            arbitrator.key().as_ref(),
        ],
        bump,
    )]
    pub vote_receipt: Account<'info, VoteReceipt>,

    pub system_program: Program<'info, System>,
}

impl<'info> VoteOnDispute<'info> {
    pub fn vote(&mut self, support_seller: bool, bump: u8) -> Result<()> {
        let escrow = &mut self.escrow;
        let receipt = &mut self.vote_receipt;
        let now = Clock::get()?.unix_timestamp;

        require!(
            escrow.status == TradeStatus::InDispute,
            EscrowError::InvalidStatus
        );

        require!(
            now < escrow.dispute_end_time,
            EscrowError::InvalidStatus
        );

        // Initialize receipt (one vote per arbitrator)
        receipt.escrow = escrow.key();
        receipt.arbitrator = self.arbitrator.key();
        receipt.support_seller = support_seller;
        receipt.bump = bump;

        // Cast one vote
        if support_seller {
            escrow.votes_for_seller += 1;
        } else {
            escrow.votes_for_buyer += 1;
        }

        Ok(())
    }
}
