//! Sample recipes and the sample week, ported from `mockup/assets/food-data.js`. Costs are in
//! thousand đồng, as in the mockup, and multiplied by `COST_UNIT_VND` when they are loaded.

use alavo_domain::recipes::kinds::{Aisle, RecipeLevel};

pub const COST_UNIT_VND: i64 = 1_000;

pub type SampleIngredient = (&'static str, f64, &'static str, Aisle, i64);
pub type SampleStep = (&'static str, i64);

pub struct SampleRecipe {
    pub key: &'static str,
    pub name: &'static str,
    pub tags: &'static [&'static str],
    pub prep_min: i64,
    pub cook_min: i64,
    pub servings: i64,
    pub level: RecipeLevel,
    pub favorite: bool,
    pub kcal: i64,
    pub icon: &'static str,
    pub ingredients: &'static [SampleIngredient],
    pub steps: &'static [SampleStep],
}

/// Recipe keys planned for breakfast, lunch and dinner of one day.
pub type SampleDay = [&'static [&'static str]; 3];

const MEAT: Aisle = Aisle::MeatFish;
const VEG: Aisle = Aisle::Vegetables;
const SPICE: Aisle = Aisle::Spices;
const OTHER: Aisle = Aisle::Other;

/// Monday to Sunday.
pub const SAMPLE_WEEK: [SampleDay; 7] = [
    [&[], &["com-tam"], &["canh-chua"]],
    [&[], &["bun-cha"], &["dau-hu"]],
    [&[], &[], &["ga-kho"]],
    [&[], &["com-tam"], &["canh-chua", "rau-muong"]],
    [&[], &["bun-cha"], &["ga-kho", "rau-muong"]],
    [&[], &["pho-bo"], &["banh-xeo"]],
    [&[], &["bun-cha"], &["canh-chua"]],
];

pub const SAMPLE_RECIPES: &[SampleRecipe] = &[
    SampleRecipe {
        key: "ga-kho",
        name: "Gà kho gừng",
        tags: &["Món chính"],
        prep_min: 15,
        cook_min: 40,
        servings: 4,
        level: RecipeLevel::Easy,
        favorite: true,
        kcal: 420,
        icon: "cooking-pot",
        ingredients: &[
            ("Đùi gà", 600.0, "g", MEAT, 54),
            ("Gừng", 50.0, "g", VEG, 4),
            ("Hành tím", 3.0, "củ", VEG, 6),
            ("Nước mắm", 2.0, "muỗng canh", SPICE, 3),
            ("Đường", 1.0, "muỗng canh", SPICE, 1),
            ("Tiêu xay", 0.5, "muỗng cà phê", SPICE, 1),
        ],
        steps: &[
            ("Rửa gà, chặt miếng vừa ăn. Ướp với nước mắm, đường và hành tím băm.", 15),
            ("Phi thơm hành và gừng thái sợi, cho gà vào xào săn mặt.", 5),
            ("Thêm nước lọc xâm xấp, hạ lửa nhỏ.", 0),
            ("Kho liu riu, trở đều tay cho đến khi nước sệt lại.", 30),
            ("Nêm lại cho vừa miệng, rắc tiêu và tắt bếp.", 0),
        ],
    },
    SampleRecipe {
        key: "pho-bo",
        name: "Phở bò",
        tags: &["Món chính"],
        prep_min: 40,
        cook_min: 150,
        servings: 4,
        level: RecipeLevel::Hard,
        favorite: true,
        kcal: 480,
        icon: "cooking-pot",
        ingredients: &[
            ("Xương bò", 1000.0, "g", MEAT, 85),
            ("Thịt bò thái mỏng", 300.0, "g", MEAT, 110),
            ("Bánh phở", 500.0, "g", OTHER, 20),
            ("Hành tây", 2.0, "củ", VEG, 8),
            ("Gừng", 80.0, "g", VEG, 6),
            ("Quế, hồi, thảo quả", 1.0, "bộ", SPICE, 25),
            ("Hành lá", 4.0, "cây", VEG, 5),
            ("Giá đỗ", 200.0, "g", VEG, 8),
        ],
        steps: &[
            ("Chần xương qua nước sôi, rửa sạch bọt.", 10),
            ("Nướng hành tây và gừng đến khi thơm, cạo bỏ lớp cháy.", 10),
            ("Cho xương, hành, gừng và gia vị vào nồi, hầm lửa nhỏ.", 120),
            ("Nêm nếm nước dùng cho vừa ăn.", 0),
            ("Trụng bánh phở, xếp thịt bò sống lên trên rồi chan nước dùng sôi.", 0),
        ],
    },
    SampleRecipe {
        key: "bun-cha",
        name: "Bún chả",
        tags: &["Món chính"],
        prep_min: 30,
        cook_min: 20,
        servings: 4,
        level: RecipeLevel::Medium,
        favorite: false,
        kcal: 510,
        icon: "fork-knife",
        ingredients: &[
            ("Thịt ba chỉ", 400.0, "g", MEAT, 72),
            ("Thịt nạc vai xay", 200.0, "g", MEAT, 36),
            ("Bún tươi", 600.0, "g", OTHER, 18),
            ("Rau sống", 1.0, "mớ", VEG, 10),
            ("Cà rốt", 1.0, "củ", VEG, 4),
            ("Tỏi", 4.0, "tép", VEG, 2),
            ("Nước mắm", 4.0, "muỗng canh", SPICE, 5),
            ("Đường", 3.0, "muỗng canh", SPICE, 2),
        ],
        steps: &[
            ("Ướp thịt ba chỉ và thịt xay với tỏi, nước mắm, đường trong 30 phút.", 30),
            ("Viên thịt xay thành miếng dẹt, kẹp cùng thịt ba chỉ vào vỉ nướng.", 0),
            ("Nướng than hoặc nồi chiên không dầu, lật đều hai mặt.", 15),
            ("Pha nước chấm chua ngọt, thả cà rốt thái lát.", 0),
            ("Xếp bún, rau sống, chả nướng ra đĩa và chan nước chấm.", 0),
        ],
    },
    SampleRecipe {
        key: "canh-chua",
        name: "Canh chua cá lóc",
        tags: &["Canh"],
        prep_min: 20,
        cook_min: 20,
        servings: 4,
        level: RecipeLevel::Easy,
        favorite: false,
        kcal: 240,
        icon: "cooking-pot",
        ingredients: &[
            ("Cá lóc", 500.0, "g", MEAT, 75),
            ("Cà chua", 3.0, "quả", VEG, 12),
            ("Dứa", 0.25, "quả", VEG, 8),
            ("Đậu bắp", 5.0, "trái", VEG, 6),
            ("Giá đỗ", 100.0, "g", VEG, 4),
            ("Me chua", 30.0, "g", SPICE, 3),
            ("Ngò om", 1.0, "nhúm", VEG, 3),
        ],
        steps: &[
            ("Làm sạch cá, cắt khúc, ướp chút muối.", 10),
            ("Nấu nước me, cho cà chua và dứa vào đun sôi.", 5),
            ("Thả cá vào, đun lửa vừa đến khi cá chín.", 8),
            ("Cho đậu bắp, giá đỗ, nêm vừa ăn rồi rắc ngò om.", 0),
        ],
    },
    SampleRecipe {
        key: "rau-muong",
        name: "Rau muống xào tỏi",
        tags: &["Rau", "Nhanh"],
        prep_min: 5,
        cook_min: 5,
        servings: 2,
        level: RecipeLevel::Easy,
        favorite: false,
        kcal: 110,
        icon: "fork-knife",
        ingredients: &[
            ("Rau muống", 1.0, "bó", VEG, 10),
            ("Tỏi", 5.0, "tép", VEG, 2),
            ("Dầu ăn", 1.0, "muỗng canh", SPICE, 1),
            ("Hạt nêm", 1.0, "muỗng cà phê", SPICE, 1),
        ],
        steps: &[
            ("Nhặt và rửa rau, để ráo nước.", 0),
            ("Phi thơm tỏi với dầu nóng.", 0),
            ("Cho rau vào xào lửa lớn, nêm hạt nêm rồi tắt bếp ngay.", 3),
        ],
    },
    SampleRecipe {
        key: "com-tam",
        name: "Cơm tấm sườn",
        tags: &["Món chính"],
        prep_min: 20,
        cook_min: 25,
        servings: 2,
        level: RecipeLevel::Medium,
        favorite: true,
        kcal: 640,
        icon: "fork-knife",
        ingredients: &[
            ("Sườn cốt lết", 400.0, "g", MEAT, 68),
            ("Gạo tấm", 300.0, "g", OTHER, 12),
            ("Trứng", 2.0, "quả", OTHER, 7),
            ("Dưa leo", 1.0, "quả", VEG, 4),
            ("Cà chua", 1.0, "quả", VEG, 4),
            ("Mỡ hành", 2.0, "muỗng canh", SPICE, 3),
        ],
        steps: &[
            ("Ướp sườn với sả, tỏi, nước mắm và mật ong.", 20),
            ("Nấu cơm tấm với lượng nước vừa phải.", 20),
            ("Nướng sườn đến khi xém cạnh.", 12),
            ("Chiên trứng, thái dưa leo và cà chua.", 0),
            ("Xếp cơm, sườn, trứng, rưới mỡ hành và nước mắm pha.", 0),
        ],
    },
    SampleRecipe {
        key: "banh-xeo",
        name: "Bánh xèo",
        tags: &["Món chính"],
        prep_min: 30,
        cook_min: 25,
        servings: 4,
        level: RecipeLevel::Medium,
        favorite: false,
        kcal: 460,
        icon: "fork-knife",
        ingredients: &[
            ("Bột bánh xèo", 300.0, "g", OTHER, 18),
            ("Tôm", 300.0, "g", MEAT, 75),
            ("Thịt ba chỉ", 200.0, "g", MEAT, 36),
            ("Giá đỗ", 200.0, "g", VEG, 8),
            ("Hành lá", 3.0, "cây", VEG, 3),
            ("Nước cốt dừa", 200.0, "ml", SPICE, 15),
            ("Rau sống", 1.0, "mớ", VEG, 10),
        ],
        steps: &[
            ("Pha bột với nước cốt dừa, nghệ và hành lá, để nghỉ.", 30),
            ("Xào tôm và thịt ba chỉ sơ cho chín.", 5),
            ("Tráng bột trên chảo nóng, cho nhân và giá đỗ lên một nửa bánh.", 0),
            ("Đậy nắp 3 phút cho vỏ giòn rồi gập đôi.", 3),
        ],
    },
    SampleRecipe {
        key: "dau-hu",
        name: "Đậu hũ sốt cà",
        tags: &["Món chính", "Nhanh"],
        prep_min: 10,
        cook_min: 15,
        servings: 2,
        level: RecipeLevel::Easy,
        favorite: false,
        kcal: 260,
        icon: "cooking-pot",
        ingredients: &[
            ("Đậu hũ", 4.0, "miếng", OTHER, 16),
            ("Cà chua", 3.0, "quả", VEG, 12),
            ("Hành lá", 2.0, "cây", VEG, 2),
            ("Nước mắm", 1.0, "muỗng canh", SPICE, 1),
        ],
        steps: &[
            ("Cắt đậu hũ thành miếng, chiên vàng hai mặt.", 8),
            ("Xào cà chua đến khi mềm và ra nước sệt.", 5),
            ("Cho đậu hũ vào, nêm nước mắm, rắc hành lá.", 0),
        ],
    },
];
