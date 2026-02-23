use anchor_lang::prelude::*;

declare_id!("2mbuH8RZ99bkBZozkvj5AzadS6jsC1BS13m3NjSnqY9r");

#[program]
pub mod safetrade_capstone {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
