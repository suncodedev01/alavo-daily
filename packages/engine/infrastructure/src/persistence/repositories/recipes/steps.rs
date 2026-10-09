use alavo_domain::ports::{Database, Row, Value};
use alavo_domain::recipes::recipe::Step;
use alavo_domain::shared::error::EngineError;

pub fn insert_step(
    db: &dyn Database,
    recipe_id: &str,
    step: &Step,
    updated_at: i64,
) -> Result<(), EngineError> {
    let sql = r#"
        INSERT INTO recipes_steps (id, recipe_id, text, timer_min, position, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
    "#;
    db.execute(
        sql,
        &[
            Value::from(step.id.as_str()),
            Value::from(recipe_id),
            Value::from(step.text.as_str()),
            Value::from(step.timer_min),
            Value::from(step.position.as_str()),
            Value::from(updated_at),
        ],
    )
    .map(|_| ())
}

pub fn list_steps(db: &dyn Database, recipe_id: &str) -> Result<Vec<Step>, EngineError> {
    let sql = r#"
        SELECT id, text, timer_min, position
        FROM recipes_steps
        WHERE recipe_id = ? AND deleted_at IS NULL
        ORDER BY position, id
    "#;
    db.query(sql, &[Value::from(recipe_id)])?.iter().map(step_from_row).collect()
}

pub fn soft_delete_step(db: &dyn Database, id: &str, hlc: i64) -> Result<(), EngineError> {
    let sql = "UPDATE recipes_steps SET deleted_at = ?, updated_at = ? WHERE id = ?";
    db.execute(sql, &[Value::from(hlc), Value::from(hlc), Value::from(id)]).map(|_| ())
}

fn step_from_row(row: &Row) -> Result<Step, EngineError> {
    Ok(Step {
        id: row.text("id")?,
        text: row.text("text")?,
        timer_min: row.int("timer_min")?,
        position: row.text("position")?,
    })
}

#[cfg(all(test, feature = "native"))]
mod tests {
    use super::*;
    use crate::testing::migrated_memory_db;

    fn step(id: &str, position: &str, timer_min: i64) -> Step {
        Step { id: id.into(), text: format!("Bước {id}"), timer_min, position: position.into() }
    }

    #[test]
    fn steps_round_trip_with_their_timer() {
        let db = migrated_memory_db();
        insert_step(&db, "r1", &step("a", "0001", 30), 7).unwrap();
        assert_eq!(list_steps(&db, "r1").unwrap(), [step("a", "0001", 30)]);
    }

    #[test]
    fn steps_are_listed_by_position_for_their_own_recipe_only() {
        let db = migrated_memory_db();
        insert_step(&db, "r1", &step("b", "0002", 0), 7).unwrap();
        insert_step(&db, "r1", &step("a", "0001", 0), 7).unwrap();
        insert_step(&db, "r2", &step("c", "0001", 0), 7).unwrap();
        let ids: Vec<_> = list_steps(&db, "r1").unwrap().into_iter().map(|s| s.id).collect();
        assert_eq!(ids, ["a", "b"]);
    }

    #[test]
    fn a_soft_deleted_step_is_not_listed() {
        let db = migrated_memory_db();
        insert_step(&db, "r1", &step("a", "0001", 0), 7).unwrap();
        soft_delete_step(&db, "a", 9).unwrap();
        assert!(list_steps(&db, "r1").unwrap().is_empty());
    }
}
