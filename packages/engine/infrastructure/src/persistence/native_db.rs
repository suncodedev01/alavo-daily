use std::path::Path;
use std::sync::Arc;

use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::shared::error::EngineError;
use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{params_from_iter, Connection};

pub struct NativeDb {
    connection: Connection,
}

impl NativeDb {
    pub fn open(path: &Path) -> Result<Self, EngineError> {
        let connection = Connection::open(path).map_err(db_error)?;
        Self::prepared(connection)
    }

    pub fn in_memory() -> Result<Self, EngineError> {
        Self::prepared(Connection::open_in_memory().map_err(db_error)?)
    }

    fn prepared(connection: Connection) -> Result<Self, EngineError> {
        connection
            .execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")
            .map_err(db_error)?;
        Ok(Self { connection })
    }
}

impl Database for NativeDb {
    fn execute_batch(&self, sql: &str) -> Result<(), EngineError> {
        self.connection.execute_batch(sql).map_err(db_error)
    }

    fn execute(&self, sql: &str, params: &[Value]) -> Result<u64, EngineError> {
        let bound = params_from_iter(params.iter().map(to_sql));
        let changed = self.connection.execute(sql, bound).map_err(db_error)?;
        Ok(changed as u64)
    }

    fn query(&self, sql: &str, params: &[Value]) -> Result<Vec<Row>, EngineError> {
        let mut statement = self.connection.prepare(sql).map_err(db_error)?;
        let columns: Arc<Vec<String>> =
            Arc::new(statement.column_names().iter().map(|name| name.to_string()).collect());
        let width = columns.len();
        let bound = params_from_iter(params.iter().map(to_sql));
        let rows = statement
            .query_map(bound, |row| {
                let mut values = Vec::with_capacity(width);
                for index in 0..width {
                    values.push(from_ref(row.get_ref(index)?));
                }
                Ok(Row::new(Arc::clone(&columns), values))
            })
            .map_err(db_error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(db_error)
    }
}

fn to_sql(value: &Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Int(number) => SqlValue::Integer(*number),
        Value::Real(number) => SqlValue::Real(*number),
        Value::Text(text) => SqlValue::Text(text.clone()),
    }
}

fn from_ref(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Integer(number) => Value::Int(number),
        ValueRef::Real(number) => Value::Real(number),
        ValueRef::Text(bytes) => Value::Text(String::from_utf8_lossy(bytes).into_owned()),
        ValueRef::Null | ValueRef::Blob(_) => Value::Null,
    }
}

fn db_error(error: rusqlite::Error) -> EngineError {
    EngineError::db(error.to_string())
}
