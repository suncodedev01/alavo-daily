// SQL repositories for the recipes module, one file per table. Every read skips soft-deleted
// rows (`deleted_at IS NULL`).
pub mod ingredients;
pub mod photos;
pub mod plan;
pub mod records;
pub mod shopping;
pub mod steps;
