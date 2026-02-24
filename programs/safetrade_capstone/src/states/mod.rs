use anchor_lang::prelude::*;

#[account]
// #[derive(InitSpace)]
pub struct EscrowAccount {
    pub seller: Pubkey,  // 32
    pub buyer: Pubkey,  // 32
    pub amount: u64,    // 8
    pub status: TradeStatus,  // 1
    pub created_at: i64,  // 8
    pub expire_at: i64,  // 8
    pub confirm_duration: i64, // 8
    pub dispute_duration: i64, // 8
    pub dispute_initiator: Pubkey, // 32
    pub dispute_end_time: i64, // 8
    pub votes_for_buyer: u64, // 8
    pub votes_for_seller: u64, // 8
    pub bump: u8,  // 1
    pub listing_id: u64, // 8

}

#[account]
pub struct VoteReceipt {
    pub escrow: Pubkey,       // 32: the escrow being voted on
    pub arbitrator: Pubkey,   // 32: the arbitrator who voted
    pub support_seller: bool, // 1: true = voted for seller, false = voted for buyer
    pub bump: u8,             // 1: PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TradeStatus {
    Created,
    Funded,
    InDispute,
    Completed,
    Cancelled,  // Order cancelled before funding (never paid)
    Refunded,   // Funds returned to buyer (after payment)
}


