pub mod device;
pub mod export;
pub mod notifications;
pub mod rules;
pub mod settings;
pub mod sync;
pub mod sync_status;

use alavo_domain::shared::error::EngineError;

use crate::context::Ctx;
use crate::{recipes, spending};

/// Loads sample data into every module. Used by the "load sample data" button.
pub fn load_demo_data(ctx: &Ctx) -> Result<(), EngineError> {
    ctx.transaction(|| {
        spending::demo::load(ctx)?;
        recipes::demo::load(ctx)
    })
}
