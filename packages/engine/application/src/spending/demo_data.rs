use alavo_domain::spending::WalletKind;

pub const BUDGETS: [(&str, i64); 6] = [
    ("category-food", 2_600_000),
    ("category-transport", 800_000),
    ("category-shopping", 1_500_000),
    ("category-fun", 400_000),
    ("category-health", 800_000),
    ("category-bills", 1_200_000),
];

pub struct DemoWallet {
    pub key: &'static str,
    pub name: &'static str,
    pub kind: WalletKind,
    pub balance_vnd: i64,
}

pub const WALLETS: [DemoWallet; 3] = [
    DemoWallet { key: "tcb", name: "Techcombank", kind: WalletKind::Bank, balance_vnd: 38_420_000 },
    DemoWallet { key: "momo", name: "Ví MoMo", kind: WalletKind::Ewallet, balance_vnd: 1_250_000 },
    DemoWallet { key: "cash", name: "Tiền mặt", kind: WalletKind::Cash, balance_vnd: 820_000 },
];

pub struct DemoTransaction {
    pub day: u32,
    pub title: &'static str,
    pub category_id: &'static str,
    pub wallet_key: &'static str,
    pub amount_vnd: i64,
    pub monthly: bool,
}

const fn tx(
    day: u32,
    title: &'static str,
    category_id: &'static str,
    wallet_key: &'static str,
    amount_vnd: i64,
) -> DemoTransaction {
    DemoTransaction { day, title, category_id, wallet_key, amount_vnd, monthly: false }
}

const fn monthly(transaction: DemoTransaction) -> DemoTransaction {
    DemoTransaction { monthly: true, ..transaction }
}

const FOOD: &str = "category-food";
const TRANSPORT: &str = "category-transport";
const SHOPPING: &str = "category-shopping";
const FUN: &str = "category-fun";
const HEALTH: &str = "category-health";
const BILLS: &str = "category-bills";
const HOME: &str = "category-home";
const INCOME: &str = "category-income";

pub const TRANSACTIONS: [DemoTransaction; 23] = [
    tx(9, "Highlands Coffee", FOOD, "momo", -65_000),
    tx(9, "Grab đi làm", TRANSPORT, "momo", -48_000),
    tx(8, "Co.opmart Nguyễn Đình Chiểu", FOOD, "tcb", -412_000),
    monthly(tx(8, "Netflix", FUN, "tcb", -260_000)),
    tx(7, "Freelance — thiết kế logo", INCOME, "tcb", 4_500_000),
    tx(7, "Cơm tấm Cô Ba", FOOD, "cash", -55_000),
    tx(7, "Xăng Petrolimex", TRANSPORT, "cash", -120_000),
    tx(6, "Shopee — tai nghe", SHOPPING, "tcb", -890_000),
    tx(6, "Phở Thìn", FOOD, "cash", -70_000),
    tx(6, "Trà sữa Gong Cha", FOOD, "momo", -52_000),
    tx(5, "Lương tháng 10", INCOME, "tcb", 28_000_000),
    monthly(tx(5, "Tiền thuê nhà", HOME, "tcb", -7_500_000)),
    monthly(tx(5, "Điện EVN", BILLS, "tcb", -640_000)),
    tx(4, "Nhà hàng — sinh nhật Mai", FOOD, "tcb", -1_150_000),
    monthly(tx(4, "California Fitness", HEALTH, "tcb", -450_000)),
    tx(3, "GrabFood", FOOD, "momo", -138_000),
    tx(3, "Be đi Quận 7", TRANSPORT, "momo", -62_000),
    tx(2, "Bách Hoá Xanh", FOOD, "cash", -336_000),
    tx(2, "Nhà thuốc Long Châu", HEALTH, "cash", -215_000),
    monthly(tx(2, "Spotify Premium", FUN, "tcb", -59_000)),
    monthly(tx(1, "Internet FPT", BILLS, "tcb", -230_000)),
    tx(1, "Highlands Coffee", FOOD, "momo", -59_000),
    tx(1, "Cơm trưa văn phòng", FOOD, "cash", -60_000),
];

pub struct DemoGoal {
    pub name: &'static str,
    pub icon: &'static str,
    pub saved_vnd: i64,
    pub target_vnd: i64,
    pub due_in_days: Option<i64>,
}

pub const GOALS: [DemoGoal; 3] = [
    DemoGoal {
        name: "Quỹ khẩn cấp",
        icon: "piggy-bank",
        saved_vnd: 38_500_000,
        target_vnd: 60_000_000,
        due_in_days: None,
    },
    DemoGoal {
        name: "Du lịch Đà Lạt",
        icon: "calendar-blank",
        saved_vnd: 9_200_000,
        target_vnd: 15_000_000,
        due_in_days: Some(70),
    },
    DemoGoal {
        name: "MacBook Air",
        icon: "target",
        saved_vnd: 8_000_000,
        target_vnd: 32_000_000,
        due_in_days: Some(180),
    },
];

pub struct DemoBill {
    pub title: &'static str,
    pub icon: &'static str,
    pub amount_vnd: i64,
    pub day_of_month: i64,
}

pub const BILLS_DUE: [DemoBill; 3] = [
    DemoBill {
        title: "Thẻ tín dụng Techcombank",
        icon: "wallet",
        amount_vnd: 2_340_000,
        day_of_month: 12,
    },
    DemoBill { title: "Internet FPT", icon: "lightning", amount_vnd: 230_000, day_of_month: 15 },
    DemoBill { title: "Netflix", icon: "film-strip", amount_vnd: 260_000, day_of_month: 18 },
];

pub fn transactions_total(wallet_key: &str) -> i64 {
    TRANSACTIONS
        .iter()
        .filter(|transaction| transaction.wallet_key == wallet_key)
        .map(|transaction| transaction.amount_vnd)
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn there_are_23_transactions_spread_over_days_1_to_9() {
        assert_eq!(TRANSACTIONS.len(), 23);
        assert!(TRANSACTIONS.iter().all(|transaction| (1..=9).contains(&transaction.day)));
    }

    #[test]
    fn transactions_are_listed_newest_day_first() {
        let days: Vec<u32> = TRANSACTIONS.iter().map(|transaction| transaction.day).collect();
        assert!(days.windows(2).all(|pair| pair[0] >= pair[1]));
    }

    #[test]
    fn the_sample_month_spends_12_871_000_and_earns_32_500_000() {
        let spent: i64 = TRANSACTIONS.iter().map(|t| t.amount_vnd).filter(|a| *a < 0).sum();
        let earned: i64 = TRANSACTIONS.iter().map(|t| t.amount_vnd).filter(|a| *a > 0).sum();
        assert_eq!(earned, 32_500_000);
        assert_eq!(-spent, 12_871_000);
    }

    #[test]
    fn every_sample_transaction_names_a_known_wallet() {
        for transaction in &TRANSACTIONS {
            assert!(WALLETS.iter().any(|wallet| wallet.key == transaction.wallet_key));
        }
    }
}
