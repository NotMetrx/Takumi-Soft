//! Numerical implementation of aqueous-exploration-1.0.0. Reference constants
//! and scientific limitations: src/lib/science/chemistry/reactor.ts and catalog.ts.

const R: f64 = 8.314_462_618;
const AMBIENT: f64 = 101.325;
const K1: f64 = 4.3e-7;
const K2: f64 = 4.7e-11;
const KA: f64 = 1.8e-5;
const KSP: f64 = 8.7e-9;

#[derive(Clone, Copy)]
pub struct Inventory {
    pub volume_l: f64,
    pub calcium: f64,
    pub carbon: f64,
    pub acetate: f64,
    pub charge: f64,
    pub citric: f64,
    pub ammonia: f64,
}

fn nonnegative(values: &[f64]) -> bool {
    values.iter().all(|v| v.is_finite() && *v >= 0.0)
}

fn at(s: Inventory, ph: f64, citrate: [f64; 3]) -> [f64; 9] {
    let h = 10_f64.powf(-ph);
    let oh = 1e-14 / h;
    let denominator = h * h + K1 * h + K1 * K2;
    let alpha1 = K1 * h / denominator;
    let alpha2 = K1 * K2 / denominator;
    let product = if alpha2 > 0.0 {
        KSP * s.volume_l * s.volume_l / alpha2
    } else {
        f64::INFINITY
    };
    let mut solid = 0.0;
    if s.calcium * s.carbon > product {
        solid = 2.0 * (s.calcium * s.carbon - product)
            / (s.calcium + s.carbon + ((s.calcium - s.carbon).powi(2) + 4.0 * product).sqrt());
    }
    let mut hydroxide_solid = 0.0;
    let free_calcium = 1.3e-6 * s.volume_l / (oh * oh);
    if s.calcium - solid > free_calcium {
        let dissolved_carbon = if alpha2 > 0.0 && free_calcium > 0.0 {
            KSP * s.volume_l * s.volume_l / (free_calcium * alpha2)
        } else {
            f64::INFINITY
        };
        solid = (s.calcium - free_calcium).min((s.carbon - dissolved_carbon).max(0.0));
        hydroxide_solid = (s.calcium - free_calcium - solid).max(0.0);
    }
    let carbon = (s.carbon - solid).max(0.0);
    let acetate_ion = s.acetate * KA / (KA + h);
    let [c1, c2, c3] = citrate;
    let citrate_charge = s.citric * (c1 * h * h + 2.0 * c1 * c2 * h + 3.0 * c1 * c2 * c3)
        / (h * h * h + c1 * h * h + c1 * c2 * h + c1 * c2 * c3);
    let ammonium = s.ammonia * h / (h + 1e-14 / 1.8e-5);
    let residual =
        h * s.volume_l + s.charge + 2.0 * (s.calcium - solid - hydroxide_solid) + ammonium
            - oh * s.volume_l
            - carbon * (alpha1 + 2.0 * alpha2)
            - acetate_ion
            - citrate_charge;
    // ABI order: pH, charge residual, CaCO3 mol, Ca(OH)2 mol, H+, carbon mol, alpha1, alpha2, acetate mol.
    [
        ph,
        residual,
        solid,
        hydroxide_solid,
        h,
        carbon,
        alpha1,
        alpha2,
        acetate_ion,
    ]
}

pub fn equilibrium(s: Inventory) -> [f64; 9] {
    if !nonnegative(&[
        s.volume_l, s.calcium, s.carbon, s.acetate, s.citric, s.ammonia,
    ]) || s.volume_l == 0.0
        || !s.charge.is_finite()
    {
        return [f64::NAN; 9];
    }
    let citrate = [10_f64.powf(-3.13), 10_f64.powf(-4.76), 10_f64.powf(-6.40)];
    let (mut low, mut high) = (-1.0, 15.0);
    for _ in 0..90 {
        let middle = (low + high) / 2.0;
        if at(s, middle, citrate)[1] > 0.0 {
            low = middle;
        } else {
            high = middle;
        }
        // A pH bracket below 1e-12 exceeds the precision used in the educational output.
        if high - low < 1e-12 {
            break;
        }
    }
    let result = at(s, (low + high) / 2.0, citrate);
    if result.iter().all(|v| v.is_finite()) {
        result
    } else {
        [f64::NAN; 9]
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn science_abi_version() -> u32 {
    1
}

#[cfg(target_arch = "wasm32")]
std::thread_local! {
    static OUTPUT: std::cell::RefCell<[f64; 9]> = const { std::cell::RefCell::new([0.0; 9]) };
}

#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub extern "C" fn solve_equilibrium(
    volume_l: f64,
    calcium: f64,
    carbon: f64,
    acetate: f64,
    charge: f64,
    citric: f64,
    ammonia: f64,
) -> usize {
    let result = equilibrium(Inventory {
        volume_l,
        calcium,
        carbon,
        acetate,
        charge,
        citric,
        ammonia,
    });
    OUTPUT.with(|output| {
        let mut output = output.borrow_mut();
        *output = result;
        output.as_ptr() as usize
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn strong_acid_hydronium(excess: f64, temperature_c: f64) -> f64 {
    if !excess.is_finite() || !temperature_c.is_finite() || temperature_c <= -273.15 {
        return f64::NAN;
    }
    let kw = if temperature_c == 25.0 {
        1e-14
    } else {
        1e-14 * ((55800.0 / 8.314) * (1.0 / 298.15 - 1.0 / (temperature_c + 273.15))).exp()
    };
    let root = (excess * excess + 4.0 * kw).sqrt();
    if excess >= 0.0 {
        (excess + root) / 2.0
    } else {
        2.0 * kw / (root - excess)
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn neutralization_temperature(volume_ml: f64, acid_mol: f64, base_mol: f64) -> f64 {
    if !nonnegative(&[volume_ml, acid_mol, base_mol]) || volume_ml == 0.0 {
        return f64::NAN;
    }
    25.0 + acid_mol.min(base_mol) * 57300.0 / (volume_ml * 4.184)
}

#[unsafe(no_mangle)]
pub extern "C" fn gas_pressure(
    volume_ml: f64,
    air_mol: f64,
    co2_mol: f64,
    temperature_c: f64,
) -> f64 {
    if !nonnegative(&[volume_ml, air_mol, co2_mol])
        || volume_ml >= 250.0
        || !temperature_c.is_finite()
        || temperature_c <= -273.15
    {
        return f64::NAN;
    }
    (air_mol + co2_mol) * R * (temperature_c + 273.15) / ((250.0 - volume_ml) / 1000.0)
}

#[unsafe(no_mangle)]
pub extern "C" fn trapped_air(volume_ml: f64, temperature_c: f64) -> f64 {
    if !nonnegative(&[volume_ml])
        || volume_ml >= 250.0
        || !temperature_c.is_finite()
        || temperature_c <= -273.15
    {
        return f64::NAN;
    }
    AMBIENT * ((250.0 - volume_ml) / 1000.0) / (R * (temperature_c + 273.15))
}

#[unsafe(no_mangle)]
pub extern "C" fn gas_volume(co2_mol: f64) -> f64 {
    if !nonnegative(&[co2_mol]) {
        return f64::NAN;
    }
    co2_mol * R * 298.15 / AMBIENT * 1000.0
}

#[unsafe(no_mangle)]
pub extern "C" fn released_co2(
    carbon: f64,
    charge: f64,
    calcium: f64,
    acetate: f64,
    citric: f64,
) -> f64 {
    if !nonnegative(&[carbon, calcium, acetate, citric]) || !charge.is_finite() {
        return f64::NAN;
    }
    carbon.min((carbon - (charge + 2.0 * calcium - acetate - 3.0 * citric)).max(0.0))
}

#[unsafe(no_mangle)]
pub extern "C" fn copper_precipitate(copper: f64, hydroxide: f64) -> f64 {
    if !nonnegative(&[copper, hydroxide]) {
        return f64::NAN;
    }
    copper.min(hydroxide / 2.0) * 97.56
}

#[cfg(test)]
mod tests {
    use super::*;
    fn water() -> Inventory {
        Inventory {
            volume_l: 0.1,
            calcium: 0.0,
            carbon: 0.0,
            acetate: 0.0,
            charge: 0.0,
            citric: 0.0,
            ammonia: 0.0,
        }
    }
    #[test]
    fn charge_balance_and_buffer() {
        assert!((equilibrium(water())[0] - 7.0).abs() < 1e-10);
        let buffer = equilibrium(Inventory {
            acetate: 0.005,
            charge: 0.0025,
            ..water()
        });
        assert!((buffer[0] + KA.log10()).abs() < 0.002);
        assert!(buffer[1].abs() < 1e-10);
    }
    #[test]
    fn precipitation_conserves_calcium_and_carbon() {
        let result = equilibrium(Inventory {
            calcium: 0.0025,
            carbon: 0.0025,
            ..water()
        });
        assert!(result[2] > 0.002);
        assert!(result[2] + result[3] <= 0.0025);
        assert!((result[2] + result[5] - 0.0025).abs() < 1e-12);
    }
    #[test]
    fn stable_base_root_and_gas_balance() {
        assert!((strong_acid_hydronium(-0.01, 25.0) - 1e-12).abs() < 1e-20);
        let air = trapped_air(100.0, 25.0);
        assert!((gas_pressure(100.0, air, 0.0, 25.0) - AMBIENT).abs() < 1e-10);
        assert!(gas_pressure(100.0, air, 0.001, 25.0) > AMBIENT);
        assert!((released_co2(0.005, 0.0025, 0.0, 0.0, 0.0) - 0.0025).abs() < 1e-12);
    }
    #[test]
    fn rejects_invalid_numerical_inputs() {
        assert!(
            equilibrium(Inventory {
                volume_l: 0.0,
                ..water()
            })[0]
                .is_nan()
        );
        assert!(
            equilibrium(Inventory {
                carbon: f64::NAN,
                ..water()
            })[0]
                .is_nan()
        );
        assert!(strong_acid_hydronium(0.0, f64::INFINITY).is_nan());
        assert!(gas_pressure(250.0, 0.1, 0.0, 25.0).is_nan());
        assert!(copper_precipitate(-1.0, 1.0).is_nan());
    }
}
