use alavo_application::Ctx;
use alavo_domain::shared::error::EngineError;

use crate::{hub, recipes, spending};

/// Routes `"<module>.<command>"` to the module that owns it.
pub fn handle(ctx: &Ctx, command: &str, payload: &str) -> Result<String, EngineError> {
    let module = command.split('.').next().unwrap_or_default();
    let handled = match module {
        "hub" | "sync" => hub::handle(ctx, command, payload),
        "spending" => spending::handle(ctx, command, payload),
        "recipes" => recipes::handle(ctx, command, payload),
        _ => None,
    };
    handled.unwrap_or_else(|| Err(EngineError::unknown_command(command)))
}
