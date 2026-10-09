use crate::spending::{Category, CategoryKind};

use super::fold::fold_text;

const MIN_NAME_LENGTH: usize = 3;

/// Shop and bill keywords of a bank statement, by built-in category. The first category with a
/// matching whole word wins, so specific shops come before the generic ones ("grabfood" is food
/// while "grab" alone is a ride).
const KEYWORDS: [(&str, &[&str]); 8] = [
    (
        "category-food",
        &[
            "an uong",
            "com",
            "pho",
            "bun",
            "banh",
            "ca phe",
            "cafe",
            "coffee",
            "tra sua",
            "highlands",
            "starbucks",
            "phuc long",
            "kfc",
            "lotteria",
            "jollibee",
            "pizza",
            "nha hang",
            "quan an",
            "grabfood",
            "shopeefood",
            "baemin",
            "bach hoa xanh",
            "winmart",
            "coopmart",
            "co opmart",
            "lotte mart",
            "big c",
            "circle k",
            "familymart",
            "sieu thi",
        ],
    ),
    (
        "category-transport",
        &[
            "grab",
            "gojek",
            "be",
            "xanh sm",
            "taxi",
            "vinasun",
            "mai linh",
            "xang",
            "petrolimex",
            "gui xe",
            "ve xe",
            "ve may bay",
            "vietjet",
            "bamboo airways",
            "vietnam airlines",
            "etc",
            "phi cau duong",
        ],
    ),
    (
        "category-shopping",
        &[
            "shopee",
            "lazada",
            "tiki",
            "sendo",
            "tgdd",
            "the gioi di dong",
            "dien may xanh",
            "fpt shop",
            "uniqlo",
            "zara",
            "mua sam",
        ],
    ),
    (
        "category-fun",
        &[
            "netflix",
            "spotify",
            "youtube",
            "cgv",
            "lotte cinema",
            "galaxy cinema",
            "rap phim",
            "steam",
            "karaoke",
            "du lich",
            "khach san",
            "agoda",
            "booking",
        ],
    ),
    (
        "category-health",
        &[
            "benh vien",
            "phong kham",
            "nha thuoc",
            "long chau",
            "pharmacity",
            "thuoc",
            "kham",
            "gym",
            "yoga",
        ],
    ),
    (
        "category-bills",
        &[
            "dien",
            "evn",
            "nuoc",
            "internet",
            "fpt telecom",
            "viettel",
            "vnpt",
            "mobifone",
            "vinaphone",
            "cuoc",
            "dien thoai",
            "truyen hinh",
            "bao hiem",
            "the tin dung",
        ],
    ),
    ("category-home", &["tien nha", "thue nha", "chung cu", "phi quan ly", "noi that"]),
    (
        "category-income",
        &[
            "luong",
            "salary",
            "payroll",
            "thuong",
            "bonus",
            "hoan tien",
            "refund",
            "cashback",
            "lai suat",
            "interest",
        ],
    ),
];

/// The category a statement line most likely belongs to: first by a category name written in
/// the description, then by the shop keywords, and otherwise the first category of its kind.
pub fn suggest_category(
    title: &str,
    kind: CategoryKind,
    categories: &[Category],
) -> Option<String> {
    let candidates: Vec<&Category> = categories.iter().filter(|item| item.kind == kind).collect();
    let words = format!(" {} ", fold_text(title));
    by_category_name(&words, &candidates)
        .or_else(|| by_keyword(&words, &candidates))
        .or_else(|| candidates.first().map(|item| item.id.clone()))
}

fn by_category_name(words: &str, candidates: &[&Category]) -> Option<String> {
    candidates
        .iter()
        .find(|item| {
            let name = fold_text(&item.name);
            name.chars().count() >= MIN_NAME_LENGTH && words.contains(&format!(" {name} "))
        })
        .map(|item| item.id.clone())
}

fn by_keyword(words: &str, candidates: &[&Category]) -> Option<String> {
    KEYWORDS
        .iter()
        .filter(|(id, _)| candidates.iter().any(|item| item.id == *id))
        .find(|(_, keywords)| keywords.iter().any(|word| words.contains(&format!(" {word} "))))
        .map(|(id, _)| id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn category(id: &str, name: &str, kind: CategoryKind) -> Category {
        Category {
            id: id.into(),
            name: name.into(),
            icon: "tag".into(),
            kind,
            budget_vnd: None,
            is_fixed: false,
            position: 0,
        }
    }

    fn defaults() -> Vec<Category> {
        use CategoryKind::{Expense, Income};
        vec![
            category("category-food", "Ăn uống", Expense),
            category("category-transport", "Đi lại", Expense),
            category("category-shopping", "Mua sắm", Expense),
            category("category-bills", "Hoá đơn", Expense),
            category("category-home", "Nhà ở", Expense),
            category("category-income", "Thu nhập", Income),
        ]
    }

    fn suggest(title: &str, kind: CategoryKind) -> Option<String> {
        suggest_category(title, kind, &defaults())
    }

    #[test]
    fn shop_keywords_pick_the_matching_built_in_category() {
        let expense = CategoryKind::Expense;
        assert_eq!(suggest("HIGHLANDS COFFEE 0123", expense).as_deref(), Some("category-food"));
        assert_eq!(
            suggest("Thanh toan EVN HCMC tien dien T9", expense).as_deref(),
            Some("category-bills")
        );
        assert_eq!(suggest("SHOPEE*ORDER 8812", expense).as_deref(), Some("category-shopping"));
        assert_eq!(
            suggest("Chuyển tiền thuê nhà tháng 10", expense).as_deref(),
            Some("category-home")
        );
    }

    #[test]
    fn a_food_delivery_is_food_while_a_plain_ride_is_transport() {
        let expense = CategoryKind::Expense;
        assert_eq!(suggest("GRABFOOD 12345", expense).as_deref(), Some("category-food"));
        assert_eq!(suggest("GRAB*TRIP HCM", expense).as_deref(), Some("category-transport"));
    }

    #[test]
    fn a_keyword_only_counts_as_a_whole_word() {
        let expense = CategoryKind::Expense;
        assert_eq!(suggest("Abe tuition", expense).as_deref(), Some("category-food"));
        assert_eq!(suggest("Phone number 123", expense).as_deref(), Some("category-food"));
    }

    #[test]
    fn a_category_name_in_the_description_wins_over_keywords() {
        let mut categories = defaults();
        categories.push(category("custom-pet", "Thú cưng", CategoryKind::Expense));
        let found =
            suggest_category("Mua hạt cho Thú cưng ở Shopee", CategoryKind::Expense, &categories);
        assert_eq!(found.as_deref(), Some("custom-pet"));
    }

    #[test]
    fn money_in_is_only_matched_with_income_categories() {
        let income = CategoryKind::Income;
        assert_eq!(
            suggest("CONG TY ABC TRA LUONG T10", income).as_deref(),
            Some("category-income")
        );
        assert_eq!(suggest("Nhận chuyển khoản từ Lan", income).as_deref(), Some("category-income"));
    }

    #[test]
    fn an_unknown_description_gets_the_first_category_of_its_kind() {
        assert_eq!(suggest("CK 998877", CategoryKind::Expense).as_deref(), Some("category-food"));
    }

    #[test]
    fn a_keyword_for_a_missing_category_is_skipped() {
        let only_home = vec![category("category-home", "Nhà ở", CategoryKind::Expense)];
        let found = suggest_category("HIGHLANDS COFFEE", CategoryKind::Expense, &only_home);
        assert_eq!(found.as_deref(), Some("category-home"));
    }

    #[test]
    fn no_category_of_the_kind_gives_no_suggestion() {
        let only_expense = vec![category("category-food", "Ăn uống", CategoryKind::Expense)];
        assert_eq!(suggest_category("Lương", CategoryKind::Income, &only_expense), None);
    }
}
