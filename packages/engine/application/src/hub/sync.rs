//! Multi-device sync: reading this device's change log, applying another device's changes, the
//! conflicts that need a person, and importing an exported file. None of it touches the network.
pub mod apply;
pub mod conflicts;
pub mod import;
pub mod pending;
mod row_apply;

#[cfg(test)]
mod test_support;
#[cfg(test)]
mod tests;
