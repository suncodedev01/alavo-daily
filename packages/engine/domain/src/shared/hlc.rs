use std::sync::Mutex;

/// 2026-01-01T00:00:00Z. Counting from a recent epoch keeps a clock value below 2^53, so it
/// survives a round trip through a JavaScript number without losing precision.
pub const HLC_EPOCH_MS: i64 = 1_767_225_600_000;
const COUNTER_BITS: u32 = 12;
const COUNTER_MASK: i64 = (1 << COUNTER_BITS) - 1;

/// Hybrid logical clock: wall-clock milliseconds in the high bits, an event counter in the low
/// 12 bits. Values only grow on one device and grow past anything it has seen from another.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default)]
pub struct Hlc(pub i64);

impl Hlc {
    pub fn from_parts(physical_ms: i64, counter: i64) -> Self {
        let since_epoch = (physical_ms - HLC_EPOCH_MS).max(0);
        Hlc((since_epoch << COUNTER_BITS) | (counter & COUNTER_MASK))
    }

    pub fn value(self) -> i64 {
        self.0
    }

    pub fn physical_ms(self) -> i64 {
        (self.0 >> COUNTER_BITS) + HLC_EPOCH_MS
    }

    pub fn counter(self) -> i64 {
        self.0 & COUNTER_MASK
    }
}

#[derive(Debug, Default)]
pub struct HlcClock {
    last: Mutex<i64>,
}

impl HlcClock {
    pub fn new(last: Hlc) -> Self {
        Self { last: Mutex::new(last.0) }
    }

    pub fn tick(&self, now_ms: i64) -> Hlc {
        let mut last = self.lock();
        let wall = Hlc::from_parts(now_ms, 0).0;
        *last = if wall > *last { wall } else { *last + 1 };
        Hlc(*last)
    }

    pub fn observe(&self, remote: Hlc) {
        let mut last = self.lock();
        *last = (*last).max(remote.0);
    }

    pub fn last(&self) -> Hlc {
        Hlc(*self.lock())
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, i64> {
        self.last.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tick_is_strictly_increasing_within_one_millisecond() {
        let clock = HlcClock::default();
        let a = clock.tick(HLC_EPOCH_MS + 1000);
        let b = clock.tick(HLC_EPOCH_MS + 1000);
        assert!(b > a);
    }

    #[test]
    fn tick_follows_wall_clock_when_it_moves_forward() {
        let clock = HlcClock::default();
        clock.tick(HLC_EPOCH_MS + 1000);
        let later = clock.tick(HLC_EPOCH_MS + 5000);
        assert_eq!(later.physical_ms(), HLC_EPOCH_MS + 5000);
    }

    #[test]
    fn observe_pushes_clock_past_a_remote_value() {
        let clock = HlcClock::default();
        let remote = Hlc::from_parts(HLC_EPOCH_MS + 9_000, 7);
        clock.observe(remote);
        assert!(clock.tick(HLC_EPOCH_MS + 1000) > remote);
    }

    #[test]
    fn value_fits_in_a_javascript_safe_integer() {
        let far_future = Hlc::from_parts(HLC_EPOCH_MS + (1 << 40), COUNTER_MASK);
        assert!(far_future.value() < (1_i64 << 53));
    }
}
