use anchor_lang::prelude::*;
use crate::errors::EscrowError;
use crate::states::{EscrowAccount, TradeStatus};

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct RaiseDispute<'info> {
    #[account(mut)]
    pub initiator: Signer<'info>,

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
}

impl<'info> RaiseDispute<'info> {
    pub fn raise(&mut self) -> Result<()> {
        let escrow = &mut self.escrow;
        let now = Clock::get()?.unix_timestamp;

        require!(
            escrow.status == TradeStatus::Funded,
            EscrowError::InvalidStatus
        );

        // Only buyer or seller can raise dispute
        require!(
            self.initiator.key() == escrow.buyer || self.initiator.key() == escrow.seller,
            EscrowError::InvalidStatus
        );

        // Set dispute fields
        escrow.dispute_initiator = self.initiator.key();
        escrow.dispute_end_time = now + escrow.dispute_duration;
        escrow.votes_for_buyer = 0;
        escrow.votes_for_seller = 0;
        escrow.status = TradeStatus::InDispute;

        Ok(())
    }
}
