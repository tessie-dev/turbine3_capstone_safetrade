use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use crate::states::{EscrowAccount, TradeStatus};
use crate::errors::EscrowError;

// Buyer confirms receipt: escrow (PDA) releases funds to the seller.
// escrow -> seller

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct CompleteEscrow<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub seller: SystemAccount<'info>,

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

// Buyer confirms receipt: escrow (PDA) releases funds to the seller.
// escrow -> seller
impl<'info> CompleteEscrow<'info> {
    pub fn complete(&mut self, vault_bump: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(
            self.escrow.buyer == self.buyer.key(),
            EscrowError::WrongBuyer
        );

        require!(
            self.escrow.seller == self.seller.key(),
            EscrowError::WrongSeller
        );

        require!(
            self.escrow.status == TradeStatus::Funded,
            EscrowError::InvalidStatus
        );

        require!(
            now < self.escrow.expire_at,
            EscrowError::EscrowExpired
        );

        let seller = &self.seller;
        let escrow = &mut self.escrow;

        // vault-> seller
        let transfer_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: seller.to_account_info(),
        };

        // PDA signer seeds
        let escrow_key = escrow.key();
        let seeds = &[
            b"vault".as_ref(),
            escrow_key.as_ref(),
            &[vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(), 
            transfer_accounts,
            signer_seeds,
        );

        system_program::transfer(cpi_ctx, escrow.amount)?;

        // update escrow status
        escrow.status = crate::states::TradeStatus::Completed;

        Ok(())
    }
}
