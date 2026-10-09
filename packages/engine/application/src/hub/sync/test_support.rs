use alavo_domain::ports::Database;
use alavo_domain::recipes::plan::NewPlanEntry;
use alavo_domain::recipes::recipe::RecipeInput;
use alavo_domain::shared::hlc::HlcClock;
use alavo_domain::spending::{NewTransaction, Transaction, UpdateTransaction};
use alavo_domain::sync::json_values::Row;
use alavo_domain::sync::merge_policy::TABLE_POLICIES;
use alavo_domain::sync::remote_event::SyncEvent;
use alavo_infrastructure::persistence::native_db::NativeDb;
use alavo_infrastructure::persistence::repositories::sync::rows::find_row;
use alavo_infrastructure::testing::{migrated_memory_db, TestEnv};
use serde_json::{json, Value};

use super::apply::{apply_remote, ApplyReport, RemoteBatch};
use super::pending::{all_own_events, mark_uploaded};
use crate::context::Ctx;
use crate::recipes::{catalog, plan, shopping};
use crate::spending::transactions;

/// One simulated phone: its own database, clock and ids.
pub struct Device {
    pub id: String,
    db: NativeDb,
    env: TestEnv,
    clock: HlcClock,
}

impl Device {
    pub fn new(id: &str) -> Device {
        Device {
            id: id.to_string(),
            db: migrated_memory_db(),
            env: TestEnv::with_prefix(id),
            clock: HlcClock::default(),
        }
    }

    pub fn ctx(&self) -> Ctx<'_> {
        Ctx::new(&self.db, &self.env, &self.clock, &self.id)
    }

    pub fn advance(&self, ms: i64) {
        self.env.advance(ms);
    }

    pub fn events(&self) -> Vec<SyncEvent> {
        all_own_events(&self.ctx()).unwrap()
    }

    pub fn row(&self, table: &str, id: &str) -> Option<Row> {
        find_row(&self.db, table, id).unwrap()
    }

    pub fn count(&self, sql: &str) -> i64 {
        self.db.query(sql, &[]).unwrap()[0].int("total").unwrap()
    }

    pub fn pending_count(&self) -> i64 {
        self.count("SELECT COUNT(*) AS total FROM hub_delta_events WHERE is_synced = 0")
    }

    pub fn forget_peers(&self) {
        self.db.execute_batch("DELETE FROM hub_sync_peers").unwrap();
    }

    /// Every synced table, row by row, for comparing two devices.
    pub fn dump(&self) -> Vec<(String, Vec<Row>)> {
        TABLE_POLICIES
            .iter()
            .map(|(table, _)| {
                let sql = format!("SELECT id FROM {table} ORDER BY id");
                let ids = self.db.query(&sql, &[]).unwrap();
                let rows = ids.iter().map(|id| self.row(table, &id.text("id").unwrap()).unwrap());
                (table.to_string(), rows.collect())
            })
            .collect()
    }
}

pub fn batch(from: &Device, events: &[SyncEvent]) -> RemoteBatch {
    RemoteBatch {
        device_id: from.id.clone(),
        events: events.iter().map(|event| serde_json::to_value(event).unwrap()).collect(),
        marker: None,
    }
}

/// What the client does for one direction: upload everything, then mark it uploaded.
pub fn send_all(from: &Device, to: &Device) -> ApplyReport {
    let events = from.events();
    let report = apply_remote(&to.ctx(), batch(from, &events)).unwrap();
    let ids: Vec<String> = events.iter().map(|event| event.event_id.clone()).collect();
    mark_uploaded(&from.ctx(), &ids).unwrap();
    report
}

/// Delivers events one at a time in the given order, with no memory of earlier deliveries, to
/// check that the order in which events arrive does not matter.
pub fn deliver_in_order(from: &Device, to: &Device, events: &[SyncEvent]) {
    for event in events {
        to.forget_peers();
        apply_remote(&to.ctx(), batch(from, std::slice::from_ref(event))).unwrap();
    }
}

pub fn exchange(a: &Device, b: &Device) {
    send_all(a, b);
    send_all(b, a);
}

pub fn expense(device: &Device, title: &str) -> Transaction {
    let input: NewTransaction = serde_json::from_value(json!({
        "title": title, "amountVnd": -50_000, "categoryId": "category-food",
        "walletId": "wallet-cash", "occurredOn": "2026-10-09", "note": "",
    }))
    .unwrap();
    transactions::record(&device.ctx(), input).unwrap()
}

pub fn edit_transaction(device: &Device, id: &str, changes: Value) {
    let mut input = changes;
    input["id"] = json!(id);
    let update: UpdateTransaction = serde_json::from_value(input).unwrap();
    transactions::update(&device.ctx(), update).unwrap();
}

pub fn alive(device: &Device, table: &str, id: &str) -> bool {
    device.row(table, id).is_some_and(|row| row["deleted_at"].is_null())
}

pub fn create_recipe(device: &Device, name: &str) -> String {
    let input: RecipeInput = serde_json::from_value(json!({
        "name": name, "servings": 4, "tags": ["Món chính"],
        "ingredients": [
            { "name": "Đùi gà", "quantity": 600.0, "unit": "g", "aisle": "meat_fish", "costVnd": 54000 },
            { "name": "Nước mắm", "quantity": 2.0, "unit": "muỗng canh", "costVnd": 3000 },
        ],
        "steps": [{ "text": "Ướp gà", "timerMin": 15 }, { "text": "Kho", "timerMin": 30 }],
    }))
    .unwrap();
    catalog::create(&device.ctx(), input).unwrap().summary.id
}

pub fn plan_dinner(device: &Device, recipe_id: &str, date: &str) -> String {
    let input: NewPlanEntry = serde_json::from_value(json!({
        "date": date, "slot": "dinner", "recipeId": recipe_id,
    }))
    .unwrap();
    plan::add_to_plan(&device.ctx(), input).unwrap().id
}

pub fn set_have(device: &Device, key: &str, have: bool) {
    shopping::set_have(&device.ctx(), key, have).unwrap();
}
