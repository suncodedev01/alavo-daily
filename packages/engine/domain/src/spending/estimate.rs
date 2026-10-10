use serde::{Deserialize, Serialize};

use crate::shared::money::Money;

/// How much an item matters, so the person can see what to drop when the money is short.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Must,
    Should,
    Nice,
}

/// A number that amounts multiply by, such as guests, people, days or nights.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Factor {
    pub id: String,
    pub label: String,
    pub value: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateItem {
    pub id: String,
    pub group: String,
    pub name: String,
    pub price: Money,
    pub quantity: i64,
    pub priority: Priority,
    /// Ids of the factors this item's price is multiplied by.
    pub by: Vec<String>,
    /// What has already been paid for this item, a deposit or the whole amount.
    pub paid: Money,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpectedIncome {
    pub id: String,
    pub label: String,
    pub amount: Money,
}

/// A list of what a big expense needs, added up and set against the money on hand.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Estimate {
    pub id: String,
    pub name: String,
    pub icon: String,
    /// Extra set aside for what was not thought of, in percent of the items' total.
    pub contingency_percent: i64,
    /// The wallets whose balances count as money on hand for this estimate.
    pub wallet_ids: Vec<String>,
    pub factors: Vec<Factor>,
    pub items: Vec<EstimateItem>,
    pub income: Vec<ExpectedIncome>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateTotals {
    /// The items added up, before the contingency.
    pub base: Money,
    pub paid: Money,
    pub contingency: Money,
    pub total: Money,
    /// Still to pay: the items minus what is paid, plus the contingency.
    pub remaining: Money,
    pub available: Money,
    pub incoming: Money,
    /// Money on hand plus expected income minus what is still to pay. Negative means short.
    pub result: Money,
    /// The same without counting expected income, which people tend to guess too high.
    pub without_incoming: Money,
    /// How much of what is still to pay is covered, 0 to 100.
    pub covered_percent: i64,
}

/// What the result would be after dropping every item of the given priorities.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavingOption {
    pub dropped: Vec<Priority>,
    pub saving: Money,
    pub result: Money,
}

const PERCENT: i128 = 100;

fn clamp_to_money(value: i128) -> Money {
    Money(value.clamp(i64::MIN as i128, i64::MAX as i128) as i64)
}

fn rounded_percent(amount: Money, percent: i64) -> Money {
    clamp_to_money((i128::from(amount.vnd()) * i128::from(percent) + PERCENT / 2).div_euclid(PERCENT))
}

impl Estimate {
    fn factor_value(&self, id: &str) -> i128 {
        self.factors.iter().find(|factor| factor.id == id).map_or(1, |factor| i128::from(factor.value))
    }

    /// Price times quantity times every factor the item is multiplied by.
    pub fn amount_of(&self, item: &EstimateItem) -> Money {
        let by = item.by.iter().fold(1_i128, |product, id| product.saturating_mul(self.factor_value(id)));
        let amount = i128::from(item.price.vnd()).saturating_mul(i128::from(item.quantity)).saturating_mul(by);
        clamp_to_money(amount)
    }

    /// What was paid, never more than the item costs.
    pub fn paid_of(&self, item: &EstimateItem) -> Money {
        item.paid.min(self.amount_of(item)).max(Money(0))
    }

    pub fn unpaid_of(&self, item: &EstimateItem) -> Money {
        self.amount_of(item) - self.paid_of(item)
    }

    /// `balances` holds the balance of each wallet by id; only this estimate's wallets count.
    pub fn totals(&self, balances: &[(String, Money)]) -> EstimateTotals {
        let base: Money = self.items.iter().map(|item| self.amount_of(item)).sum();
        let paid: Money = self.items.iter().map(|item| self.paid_of(item)).sum();
        let contingency = rounded_percent(base, self.contingency_percent);
        let remaining = base - paid + contingency;
        let available: Money = balances
            .iter()
            .filter(|(id, _)| self.wallet_ids.contains(id))
            .map(|(_, balance)| *balance)
            .sum();
        let incoming: Money = self.income.iter().map(|line| line.amount).sum();
        EstimateTotals {
            base,
            paid,
            contingency,
            total: base + contingency,
            remaining,
            available,
            incoming,
            result: available + incoming - remaining,
            without_incoming: available - remaining,
            covered_percent: covered_percent(available + incoming, remaining),
        }
    }

    /// "Is it enough if I drop the nice-to-haves?" Only the unpaid part of an item can be saved,
    /// and the contingency shrinks with it.
    pub fn saving_options(&self, totals: &EstimateTotals) -> Vec<SavingOption> {
        [vec![Priority::Nice], vec![Priority::Nice, Priority::Should]]
            .into_iter()
            .map(|dropped| {
                let unpaid: Money = self
                    .items
                    .iter()
                    .filter(|item| dropped.contains(&item.priority))
                    .map(|item| self.unpaid_of(item))
                    .sum();
                let saving = unpaid + rounded_percent(unpaid, self.contingency_percent);
                SavingOption { dropped, saving, result: totals.result + saving }
            })
            .collect()
    }
}

fn covered_percent(money: Money, remaining: Money) -> i64 {
    if remaining.vnd() <= 0 {
        return 100;
    }
    let percent = i128::from(money.vnd().max(0)) * PERCENT / i128::from(remaining.vnd());
    percent.clamp(0, PERCENT) as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(name: &str, price: i64, priority: Priority) -> EstimateItem {
        EstimateItem {
            id: name.into(),
            group: "Nhóm".into(),
            name: name.into(),
            price: Money(price),
            quantity: 1,
            priority,
            by: Vec::new(),
            paid: Money(0),
        }
    }

    fn estimate(items: Vec<EstimateItem>) -> Estimate {
        Estimate {
            id: "e1".into(),
            name: "Đám cưới".into(),
            icon: "gift".into(),
            contingency_percent: 10,
            wallet_ids: vec!["w1".into(), "w2".into()],
            factors: vec![Factor { id: "guests".into(), label: "khách".into(), value: 200 }],
            items,
            income: Vec::new(),
        }
    }

    fn balances() -> Vec<(String, Money)> {
        vec![("w1".into(), Money(60_000_000)), ("w2".into(), Money(10_000_000)), ("other".into(), Money(999))]
    }

    #[test]
    fn an_amount_is_price_times_quantity_times_every_factor() {
        let by_guests = EstimateItem { by: vec!["guests".into()], ..item("Tiệc", 450_000, Priority::Must) };
        let plan = estimate(vec![by_guests.clone()]);
        assert_eq!(plan.amount_of(&by_guests), Money(90_000_000));
        let two_factors = EstimateItem {
            by: vec!["guests".into(), "days".into()],
            quantity: 2,
            ..item("Ăn", 1_000, Priority::Must)
        };
        let plan = Estimate {
            factors: vec![
                Factor { id: "guests".into(), label: "khách".into(), value: 4 },
                Factor { id: "days".into(), label: "ngày".into(), value: 3 },
            ],
            ..plan
        };
        assert_eq!(plan.amount_of(&two_factors), Money(24_000));
    }

    #[test]
    fn a_factor_that_does_not_exist_counts_as_one() {
        let orphan = EstimateItem { by: vec!["gone".into()], ..item("Quà", 500, Priority::Nice) };
        assert_eq!(estimate(vec![]).amount_of(&orphan), Money(500));
    }

    #[test]
    fn changing_a_factor_changes_every_item_that_uses_it() {
        let by_guests = EstimateItem { by: vec!["guests".into()], ..item("Tiệc", 100, Priority::Must) };
        let mut plan = estimate(vec![by_guests.clone(), item("Nhẫn", 5_000, Priority::Must)]);
        assert_eq!(plan.totals(&[]).base, Money(25_000));
        plan.factors[0].value = 300;
        assert_eq!(plan.totals(&[]).base, Money(35_000));
    }

    #[test]
    fn what_was_paid_is_never_counted_again_and_never_exceeds_the_item() {
        let deposit = EstimateItem { paid: Money(30_000), ..item("Ảnh", 100_000, Priority::Should) };
        let overpaid = EstimateItem { paid: Money(900), ..item("Nhẫn", 500, Priority::Must) };
        let plan = estimate(vec![deposit.clone(), overpaid.clone()]);
        assert_eq!(plan.paid_of(&deposit), Money(30_000));
        assert_eq!(plan.paid_of(&overpaid), Money(500));
        let totals = plan.totals(&balances());
        assert_eq!(totals.paid, Money(30_500));
        assert_eq!(totals.remaining, Money(100_500 - 30_500) + totals.contingency);
    }

    #[test]
    fn the_contingency_is_a_rounded_percent_of_all_items_not_only_the_unpaid_ones() {
        let paid = EstimateItem { paid: Money(1_000), ..item("A", 1_000, Priority::Must) };
        let plan = Estimate { contingency_percent: 15, ..estimate(vec![paid, item("B", 333, Priority::Must)]) };
        let totals = plan.totals(&[]);
        assert_eq!(totals.contingency, Money(200));
        assert_eq!(totals.total, Money(1_333 + 200));
        assert_eq!(totals.remaining, Money(333 + 200));
    }

    #[test]
    fn only_the_wallets_chosen_for_the_estimate_count_as_money_on_hand() {
        let plan = estimate(vec![item("Tiệc", 50_000_000, Priority::Must)]);
        let totals = plan.totals(&balances());
        assert_eq!(totals.available, Money(70_000_000));
    }

    #[test]
    fn enough_money_leaves_a_surplus_and_a_full_cover() {
        let plan = estimate(vec![item("Tiệc", 50_000_000, Priority::Must)]);
        let totals = plan.totals(&balances());
        assert_eq!(totals.remaining, Money(55_000_000));
        assert_eq!(totals.result, Money(15_000_000));
        assert_eq!(totals.covered_percent, 100);
    }

    #[test]
    fn too_little_money_is_a_shortfall_and_a_partial_cover() {
        let plan = estimate(vec![item("Tiệc", 100_000_000, Priority::Must)]);
        let totals = plan.totals(&balances());
        assert_eq!(totals.result, Money(70_000_000 - 110_000_000));
        assert_eq!(totals.covered_percent, 63);
    }

    #[test]
    fn expected_income_is_counted_but_the_result_without_it_is_shown_too() {
        let mut plan = estimate(vec![item("Tiệc", 100_000_000, Priority::Must)]);
        plan.income = vec![ExpectedIncome { id: "i1".into(), label: "Tiền mừng".into(), amount: Money(50_000_000) }];
        let totals = plan.totals(&balances());
        assert_eq!(totals.result, Money(70_000_000 + 50_000_000 - 110_000_000));
        assert_eq!(totals.without_incoming, Money(70_000_000 - 110_000_000));
    }

    #[test]
    fn nothing_left_to_pay_counts_as_fully_covered() {
        let paid = EstimateItem { paid: Money(500), ..item("Nhẫn", 500, Priority::Must) };
        let plan = Estimate { contingency_percent: 0, ..estimate(vec![paid]) };
        let totals = plan.totals(&[]);
        assert_eq!((totals.remaining, totals.covered_percent), (Money(0), 100));
    }

    #[test]
    fn dropping_items_saves_only_their_unpaid_part_plus_their_share_of_the_contingency() {
        let deposit_on_nice = EstimateItem { paid: Money(4_000), ..item("Quay phim", 10_000, Priority::Nice) };
        let plan = estimate(vec![
            item("Tiệc", 100_000_000, Priority::Must),
            deposit_on_nice,
            item("Cổng hoa", 15_000, Priority::Should),
        ]);
        let totals = plan.totals(&balances());
        let options = plan.saving_options(&totals);
        assert_eq!(options[0].dropped, vec![Priority::Nice]);
        assert_eq!(options[0].saving, Money(6_000 + 600));
        assert_eq!(options[1].dropped, vec![Priority::Nice, Priority::Should]);
        assert_eq!(options[1].saving, Money(21_000 + 2_100));
        assert_eq!(options[1].result, totals.result + Money(23_100));
    }
}
