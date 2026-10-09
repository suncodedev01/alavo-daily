/// A small deterministic generator (SplitMix64). The engine never reads a clock or a random
/// source, so the same seed always gives the same sequence.
pub struct Random(u64);

impl Random {
    pub fn new(seed: u64) -> Random {
        Random(seed)
    }

    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mixed = (self.0 ^ (self.0 >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        let mixed = (mixed ^ (mixed >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        mixed ^ (mixed >> 31)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_same_seed_gives_the_same_sequence() {
        let mut first = Random::new(7);
        let mut second = Random::new(7);
        assert_eq!(first.next_u64(), second.next_u64());
        assert_eq!(first.next_u64(), second.next_u64());
    }

    #[test]
    fn different_seeds_and_steps_give_different_numbers() {
        let mut first = Random::new(1);
        let mut second = Random::new(2);
        let one = first.next_u64();
        assert_ne!(one, second.next_u64());
        assert_ne!(one, first.next_u64());
    }
}
