use anchor_lang::prelude::*;
use crate::states::{EscrowAccount, TradeStatus};
use crate::errors::EscrowError;


#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct CancelEscrow<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

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

// seller cancels the escrow before funding (status: Created)
// closes the escrow only
impl<'info> CancelEscrow<'info> {
    pub fn cancel(&mut self) -> Result<()> {
        require!(
            self.escrow.seller == self.seller.key(),
            EscrowError::WrongSeller
        );

        require!(
            self.escrow.status == TradeStatus::Created,
            EscrowError::InvalidStatus
        );

        require!(
            self.escrow.buyer == Pubkey::default(),
            EscrowError::AlreadyHasBuyer
        );

        // do not close the account, just mark as cancelled
        // so that the system retains complete order history
        self.escrow.status = TradeStatus::Cancelled;


        Ok(())
    }
}
