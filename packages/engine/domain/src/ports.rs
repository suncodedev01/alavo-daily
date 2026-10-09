use std::sync::Arc;

use crate::shared::error::EngineError;

/// A SQLite value as it crosses the database port.
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Int(i64),
    Real(f64),
    Text(String),
}

impl From<i64> for Value {
    fn from(value: i64) -> Self {
        Value::Int(value)
    }
}

impl From<i32> for Value {
    fn from(value: i32) -> Self {
        Value::Int(i64::from(value))
    }
}

impl From<bool> for Value {
    fn from(value: bool) -> Self {
        Value::Int(i64::from(value))
    }
}

impl From<f64> for Value {
    fn from(value: f64) -> Self {
        Value::Real(value)
    }
}

impl From<&str> for Value {
    fn from(value: &str) -> Self {
        Value::Text(value.to_string())
    }
}

impl From<String> for Value {
    fn from(value: String) -> Self {
        Value::Text(value)
    }
}

impl<T: Into<Value>> From<Option<T>> for Value {
    fn from(value: Option<T>) -> Self {
        value.map_or(Value::Null, Into::into)
    }
}

/// One result row. Columns are read by name so queries can reorder or add columns safely.
#[derive(Debug, Clone)]
pub struct Row {
    columns: Arc<Vec<String>>,
    values: Vec<Value>,
}

impl Row {
    pub fn new(columns: Arc<Vec<String>>, values: Vec<Value>) -> Self {
        Self { columns, values }
    }

    pub fn columns(&self) -> &[String] {
        &self.columns
    }

    pub fn values(&self) -> &[Value] {
        &self.values
    }

    pub fn text(&self, name: &str) -> Result<String, EngineError> {
        match self.value(name)? {
            Value::Text(text) => Ok(text.clone()),
            other => Err(type_error(name, "text", other)),
        }
    }

    pub fn opt_text(&self, name: &str) -> Result<Option<String>, EngineError> {
        match self.value(name)? {
            Value::Null => Ok(None),
            Value::Text(text) => Ok(Some(text.clone())),
            other => Err(type_error(name, "text", other)),
        }
    }

    pub fn int(&self, name: &str) -> Result<i64, EngineError> {
        match self.value(name)? {
            Value::Int(number) => Ok(*number),
            Value::Real(number) => Ok(*number as i64),
            other => Err(type_error(name, "integer", other)),
        }
    }

    pub fn opt_int(&self, name: &str) -> Result<Option<i64>, EngineError> {
        match self.value(name)? {
            Value::Null => Ok(None),
            _ => self.int(name).map(Some),
        }
    }

    pub fn real(&self, name: &str) -> Result<f64, EngineError> {
        match self.value(name)? {
            Value::Int(number) => Ok(*number as f64),
            Value::Real(number) => Ok(*number),
            other => Err(type_error(name, "real", other)),
        }
    }

    pub fn bool(&self, name: &str) -> Result<bool, EngineError> {
        self.int(name).map(|number| number != 0)
    }

    fn value(&self, name: &str) -> Result<&Value, EngineError> {
        let index = self
            .columns
            .iter()
            .position(|column| column == name)
            .ok_or_else(|| EngineError::db(format!("column {name} missing from result")))?;
        self.values
            .get(index)
            .ok_or_else(|| EngineError::db(format!("column {name} has no value")))
    }
}

fn type_error(name: &str, expected: &str, found: &Value) -> EngineError {
    EngineError::db(format!("column {name}: expected {expected}, found {found:?}"))
}

/// The only way the engine touches SQLite. Two implementations: SQLite WASM (web) and
/// rusqlite (native). SQL strings must work on both.
pub trait Database {
    fn execute_batch(&self, sql: &str) -> Result<(), EngineError>;
    fn execute(&self, sql: &str, params: &[Value]) -> Result<u64, EngineError>;
    fn query(&self, sql: &str, params: &[Value]) -> Result<Vec<Row>, EngineError>;
}

/// What the engine needs from the platform that SQLite cannot provide.
pub trait Env {
    fn now_ms(&self) -> i64;
    fn new_id(&self) -> String;
}
