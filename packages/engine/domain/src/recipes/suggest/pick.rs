use crate::recipes::suggest::random::Random;
use crate::recipes::suggest::{Candidate, Placed, Spot, REPEAT_GAP_DAYS};

const FAVORITE_WEIGHT: u64 = 3;
const PLAIN_WEIGHT: u64 = 1;

pub(super) struct Fill<'a> {
    pub recipes: &'a [Candidate],
    pub placed: Vec<Placed>,
    pub open: Vec<Spot>,
    pub avoid: &'a [String],
    pub seed: u64,
}

pub(super) struct Pick<'a> {
    pub spot: Spot,
    pub recipe: &'a Candidate,
}

/// Fills every open spot that no placed meal already holds, in date order.
pub(super) fn fill(input: Fill<'_>) -> Vec<Pick<'_>> {
    let mut chooser = Chooser::new(input.recipes, input.placed, input.avoid);
    let mut random = Random::new(input.seed);
    let mut open = input.open;
    open.sort();
    open.retain(|spot| !chooser.is_taken(*spot));
    let mut picks = Vec::with_capacity(open.len());
    for spot in open {
        let Some(recipe) = chooser.choose(spot, &mut random) else { break };
        chooser.place(spot, recipe);
        picks.push(Pick { spot, recipe });
    }
    picks
}

struct Chooser<'a> {
    all: &'a [Candidate],
    allowed: Vec<&'a Candidate>,
    placed: Vec<Placed>,
}

impl<'a> Chooser<'a> {
    fn new(all: &'a [Candidate], placed: Vec<Placed>, avoid: &[String]) -> Self {
        let preferred: Vec<&Candidate> =
            all.iter().filter(|recipe| !avoid.contains(&recipe.id)).collect();
        let allowed = if preferred.is_empty() { all.iter().collect() } else { preferred };
        Chooser { all, allowed, placed }
    }

    fn is_taken(&self, spot: Spot) -> bool {
        self.placed.iter().any(|placed| placed.spot == spot)
    }

    fn place(&mut self, spot: Spot, recipe: &Candidate) {
        self.placed.push(Placed { spot, recipe_id: recipe.id.clone() });
    }

    fn choose(&self, spot: Spot, random: &mut Random) -> Option<&'a Candidate> {
        let spaced: Vec<&Candidate> = self
            .allowed
            .iter()
            .copied()
            .filter(|recipe| self.is_spaced(&recipe.id, spot.day))
            .collect();
        let pool = if spaced.is_empty() { self.least_recently_used(spot.day) } else { spaced };
        weighted_pick(&self.varied(pool, spot), random)
    }

    fn gap_to_nearest_use(&self, recipe_id: &str, day: i64) -> Option<i64> {
        let uses = self.placed.iter().filter(|placed| placed.recipe_id == recipe_id);
        uses.map(|placed| (placed.spot.day - day).abs()).min()
    }

    fn is_spaced(&self, recipe_id: &str, day: i64) -> bool {
        self.gap_to_nearest_use(recipe_id, day).is_none_or(|gap| gap >= REPEAT_GAP_DAYS)
    }

    /// With fewer recipes than meals a repeat is unavoidable, so repeat the dish that has been
    /// away the longest. A dish never used counts as infinitely far away.
    fn least_recently_used(&self, day: i64) -> Vec<&'a Candidate> {
        let gap = |recipe: &Candidate| self.gap_to_nearest_use(&recipe.id, day).unwrap_or(i64::MAX);
        let widest = self.allowed.iter().map(|recipe| gap(recipe)).max().unwrap_or(0);
        self.allowed.iter().copied().filter(|recipe| gap(recipe) == widest).collect()
    }

    /// Drops the dishes that are alike the one planned for the same meal the day before or
    /// after, unless nothing else is left.
    fn varied(&self, pool: Vec<&'a Candidate>, spot: Spot) -> Vec<&'a Candidate> {
        let neighbours = self.neighbour_tags(spot);
        let different: Vec<&Candidate> = pool
            .iter()
            .copied()
            .filter(|recipe| !recipe.primary_tag().is_some_and(|tag| neighbours.contains(&tag)))
            .collect();
        if different.is_empty() { pool } else { different }
    }

    fn neighbour_tags(&self, spot: Spot) -> Vec<&str> {
        let next_to = |placed: &&Placed| {
            placed.spot.slot == spot.slot && (placed.spot.day - spot.day).abs() == 1
        };
        let recipe_of = |placed: &Placed| self.all.iter().find(|own| own.id == placed.recipe_id);
        let neighbours = self.placed.iter().filter(next_to).filter_map(recipe_of);
        neighbours.filter_map(|recipe| recipe.primary_tag()).collect()
    }
}

fn weighted_pick<'a>(pool: &[&'a Candidate], random: &mut Random) -> Option<&'a Candidate> {
    let total: u64 = pool.iter().map(|recipe| weight_of(recipe)).sum();
    if total == 0 {
        return None;
    }
    let mut ticket = random.next_u64() % total;
    for &recipe in pool {
        let weight = weight_of(recipe);
        if ticket < weight {
            return Some(recipe);
        }
        ticket -= weight;
    }
    None
}

fn weight_of(recipe: &Candidate) -> u64 {
    if recipe.favorite { FAVORITE_WEIGHT } else { PLAIN_WEIGHT }
}
