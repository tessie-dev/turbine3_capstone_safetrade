use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use crate::states::{EscrowAccount, TradeStatus};
use crate::errors::EscrowError;

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct FundEscrow<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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

    /// CHECK: vault PDA, system-owned
    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// Buyer funds escrow: buyer -> vault (PDA)
// Sets expire_at to now + confirm window (e.g. 7 days).
impl<'info> FundEscrow<'info> {
    pub fn fund(&mut self) -> Result<()> {
        let escrow = &mut self.escrow;
        let now = Clock::get()?.unix_timestamp;

        require!(
            escrow.status == TradeStatus::Created,
            EscrowError::InvalidStatus
        );

        if escrow.buyer == Pubkey::default() {
            escrow.buyer = self.buyer.key();
        } else {
            require!(escrow.buyer == self.buyer.key(), EscrowError::WrongBuyer);
        }

        let buyer = &self.buyer;

        // buyer -> escrow
        let transfer_accounts = Transfer {
            from: buyer.to_account_info(),
            to: self.vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            self.system_program.to_account_info(), 
            transfer_accounts
        );

        system_program::transfer(cpi_ctx, escrow.amount)?;

        escrow.expire_at = now + escrow.confirm_duration;

        // update escrow status
        escrow.status = crate::states::TradeStatus::Funded;

        Ok(())
    }
}