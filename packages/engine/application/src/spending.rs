// Use cases for the spending module. Other modules call spending only through `contract`;
// the rest is public so the presentation layer can route commands to it.
pub mod bills;
pub mod budget;
pub mod budget_alert;
pub mod categories;
pub mod contract;
pub mod demo;
mod demo_data;
pub mod estimate_rows;
#[cfg(test)]
mod estimate_rows_tests;
pub mod estimates;
pub mod goals;
pub mod import;
pub mod payment_methods;
pub mod recurring;
pub mod reports;
#[cfg(test)]
mod test_support;
pub mod transactions;
pub mod wallets;
mod writes;
