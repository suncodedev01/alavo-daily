use alavo_domain::shared::date::Date;
use alavo_domain::shared::error::{EngineError, ErrorCode};
use alavo_domain::spending::recurring::{due_dates, monthly_day, occurrence_id};
use alavo_domain::spending::Transaction;
use alavo_infrastructure::persistence::repositories::spending::recurring::{
    list_recurring_templates, occurrence_ids,
};
use serde::{Deserialize, Serialize};

use crate::context::Ctx;
use crate::spending::transactions::{insert_checked, Alerts};

#[derive(Debug, Clone, Deserialize)]
pub struct GenerateRecurring {
    pub today: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Generated {
    pub created: usize,
}

/// Creates the monthly occurrences of every recurring transaction that are due by `today` and not
/// there yet. Safe to call as often as wanted: an occurrence has a fixed id, so one that exists
/// (even deleted) is never created again.
pub fn generate(ctx: &Ctx, input: GenerateRecurring) -> Result<Generated, EngineError> {
    let today = Date::parse(&input.today)?;
    ctx.transaction(|| {
        let mut created = 0;
        for template in list_recurring_templates(ctx.db)? {
            created += generate_for(ctx, &template, today)?;
        }
        Ok(Generated { created })
    })
}

fn generate_for(ctx: &Ctx, template: &Transaction, today: Date) -> Result<usize, EngineError> {
    let Some(day) = template.recurring_rule.as_deref().and_then(monthly_day) else {
        return Ok(0);
    };
    let known = occurrence_ids(ctx.db, &template.id)?;
    let first = Date::parse(&template.occurred_on)?;
    let mut created = 0;
    for date in due_dates(first, day, today) {
        if known.contains(&occurrence_id(&template.id, date)) {
            continue;
        }
        let copy = template.occurrence(date, ctx.now_ms());
        match insert_checked(ctx, copy, alerts_for(date, today)) {
            Ok(_) => created += 1,
            // A template whose category or wallet is gone is skipped, not fatal.
            Err(error) if error.code == ErrorCode::Validation => return Ok(created),
            Err(error) => return Err(error),
        }
    }
    Ok(created)
}

// Filling in a past month must not warn about that month's budget again.
fn alerts_for(date: Date, today: Date) -> Alerts {
    if date.month_text() == today.month_text() {
        Alerts::Raise
    } else {
        Alerts::Skip
    }
}

#[cfg(test)]
mod tests;
