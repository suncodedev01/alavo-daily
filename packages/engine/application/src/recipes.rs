// Use cases for the recipes module: the recipe catalog, the week plan and the shopping list.
mod changes;
mod children;
mod lookup;
mod payloads;

pub mod catalog;
pub mod demo;
pub mod expense;
pub mod import;
pub mod morning_menu;
pub mod plan;
pub mod shopping;

#[cfg(test)]
mod test_support;
