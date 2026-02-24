use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("The buyer provided does not match the escrow's buyer.")]
    WrongBuyer,

    #[msg("The seller provided does not match the escrow's seller.")]
    WrongSeller,

    #[msg("The escrow is not in a valid state for this action.")]
    InvalidStatus,

    #[msg("The escrow already has a buyer assigned.")]
    AlreadyHasBuyer,

    #[msg("The expiration timestamp must be in the future.")]
    InvalidExpireAt,

    #[msg("The escrow has expired and can no longer be completed.")]
    EscrowExpired,
}
