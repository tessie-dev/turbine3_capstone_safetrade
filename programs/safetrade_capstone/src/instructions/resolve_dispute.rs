use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use crate::errors::EscrowError;
use crate::states::{EscrowAccount, TradeStatus};

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(mut)]
    pub seller: SystemAccount<'info>,

    #[account(mut)]
    /// CHECK: buyer address from escrow
    pub buyer: UncheckedAccount<'info>,

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

impl<'info> ResolveDispute<'info> {
    pub fn resolve(&mut self, vault_bump: u8) -> Result<()> {
        let escrow = &mut self.escrow;
        let now = Clock::get()?.unix_timestamp;

        require!(
            escrow.status == TradeStatus::InDispute,
            EscrowError::InvalidStatus
        );

        require!(
            now >= escrow.dispute_end_time,
            EscrowError::InvalidStatus
        );

        require!(
            escrow.seller == self.seller.key(),
            EscrowError::WrongSeller
        );

        require!(
            escrow.buyer == self.buyer.key(),
            EscrowError::WrongBuyer
        );

        // Determine winner: seller wins if votes_for_seller > votes_for_buyer
        // Otherwise buyer wins 
        let seller_wins = escrow.votes_for_seller > escrow.votes_for_buyer;

        let recipient = if seller_wins {
            self.seller.to_account_info()
        } else {
            self.buyer.to_account_info()
        };

        // Transfer from vault to winner
        let transfer_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: recipient,
        };

        let escrow_key = escrow.key();
        let seeds = &[b"vault".as_ref(), escrow_key.as_ref(), &[vault_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );

        system_program::transfer(cpi_ctx, escrow.amount)?;

        // Update status
        escrow.status = if seller_wins {
            TradeStatus::Completed
        } else {
            TradeStatus::Refunded
        };

        Ok(())
    }
}
