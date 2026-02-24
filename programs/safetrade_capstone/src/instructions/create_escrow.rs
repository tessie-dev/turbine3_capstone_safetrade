use anchor_lang::prelude::*;
use crate::states::EscrowAccount;

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 32 + 8 + 8 + 8 + 1 + 8,
        seeds = [
            b"escrow", 
            seller.key().as_ref(),
            &listing_id.to_le_bytes(),
        ],
        bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    /// CHECK: This is a PDA system-owned vault (no data) used only to hold SOL.
    #[account(
        init,
        payer = seller,
        space = 0,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        owner = system_program::ID
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}


// create the trade but with the empty buyer field
impl<'info> CreateEscrow<'info> {
    pub fn init_escrow(
        &mut self,
        amount: u64,
        confirm_duration: i64,
        dispute_duration: i64,
        bump: u8,
        listing_id: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        self.escrow.set_inner(EscrowAccount {
            seller: self.seller.key(),
            buyer: Pubkey::default(),
            amount,
            status: crate::states::TradeStatus::Created,
            created_at: now,
            expire_at: 0,
            confirm_duration,
            dispute_duration,
            dispute_initiator: Pubkey::default(),
            dispute_end_time: 0,
            votes_for_buyer: 0,
            votes_for_seller: 0,
            bump,
            listing_id,
        });

        Ok(())
    }
}