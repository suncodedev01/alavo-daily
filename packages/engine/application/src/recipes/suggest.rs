use alavo_domain::recipes::suggest::{
    suggest_entries, Candidate, PlannedSlot, SuggestRequest, SuggestedEntry,
};
use alavo_domain::shared::error::EngineError;
use alavo_infrastructure::persistence::repositories::recipes::plan::list_plan_between;
use alavo_infrastructure::persistence::repositories::recipes::records::list_recipes;

use crate::context::Ctx;

/// Proposes dishes for the empty meals of the range. Reads only: the person applies the proposal
/// with `add_to_plan`.
pub fn suggest_plan(
    ctx: &Ctx,
    request: SuggestRequest,
) -> Result<Vec<SuggestedEntry>, EngineError> {
    let (first, last) = request.context_window()?;
    let saved = list_plan_between(ctx.db, &first, &last)?;
    let existing: Vec<PlannedSlot> = saved.iter().map(PlannedSlot::of_entry).collect();
    let recipes: Vec<Candidate> =
        list_recipes(ctx.db)?.into_iter().map(Candidate::from_record).collect();
    suggest_entries(&request, &recipes, &existing)
}

#[cfg(test)]
mod tests;
