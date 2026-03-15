/**
 * TECNAPAV Pavement Restoration Design Calculation Engine
 * Based on DNER-PRO 269/94 - Método da Resiliência
 * 
 * All formulas and constants are taken directly from the regulation document.
 */

// ============================================================
// TYPES
// ============================================================

export interface DeflectionPoint {
  station_id: string;
  station_km: number;
  deflection: number; // in 0.01mm units
}

export interface PavementStructure {
  station_id: string;
  station_km?: number;
  he: number;   // existing bituminous layer thickness (cm)
  Hcg: number;  // granular layer thickness (cm)
  CBR: number;  // California Bearing Ratio (%)
  S: number;    // silt percentage (%)
  TR: number;   // cracking percentage (%)
  QI: number;   // irregularity index (count/km)
}

export interface TrafficData {
  Np: number;   // cumulative equivalent standard axle loads (N number)
  analysis_period: number; // years
  growth_rate: number;     // % per year
}

export interface TrafficSegment {
  start_km: number;
  end_km: number;
  Np: number;
}

export interface ProjectParameters {
  analysis_period: number;  // years
  growth_rate: number;      // % per year
  Np: number;               // N number default
  segments?: TrafficSegment[]; // NOVO: Múltiplos segmentos
  max_HR?: number;          // economic restriction
}

export type SoilType = 'I' | 'II' | 'III';

export interface SectionResult {
  station_id: string;
  station_km: number;
  // Input parameters
  D_mean: number;           // mean deflection (0.01mm)
  D_std: number;            // standard deviation (0.01mm)
  Dc: number;               // characteristic design deflection (0.01mm)
  he: number;               // existing bituminous thickness (cm)
  Hcg: number;              // granular layer thickness (cm)
  CBR: number;
  S: number;
  TR: number;
  QI: number;
  // Calculated parameters
  soil_type: SoilType;
  I1: number;
  I2: number;
  hef: number;              // effective thickness (cm)
  D_max: number;            // maximum admissible deflection from fatigue (0.01mm)
  HR: number;               // reinforcement thickness (cm)
  // Solution
  solution_case: number;    // 1, 2, 3, or 4
  solution_description: string;
  HCA?: number;             // asphalt concrete thickness (cm) - Case 2
  Hpm?: number;             // pre-mix thickness (cm) - Case 2
  // Optional recycling
  Mef?: number;             // effective resilience modulus (kgf/cm²)
  // Fatigue life
  Nt?: number;              // fatigue life (N)
  fatigue_life_years?: number;
  // Warnings
  warnings: string[];
}

export interface CalculationResult {
  project_params: ProjectParameters;
  sections: SectionResult[];
  summary: {
    total_sections: number;
    mean_Dc: number;
    mean_HR: number;
    max_HR: number;
    min_HR: number;
    solution_distribution: Record<string, number>;
  };
}

// ============================================================
// SOIL CLASSIFICATION (Table 1 - DNER-PRO 269/94)
// ============================================================

/**
 * Classify soil type based on CBR% and Silt% (Table 1)
 */
export function classifySoil(CBR: number, S: number): SoilType {
  if (CBR >= 10) {
    if (S <= 35) return 'I';
    if (S <= 65) return 'II';
    return 'III';
  } else if (CBR >= 6) {
    if (S <= 65) return 'II';
    return 'III';
  } else {
    // CBR 2-5
    return 'III';
  }
}

// ============================================================
// CONSTANTS I1, I2 (Section 9.3.4)
// ============================================================

/**
 * Get I1 and I2 constants based on soil type and granular layer thickness
 */
export function getI1I2(soilType: SoilType, Hcg: number): { I1: number; I2: number } {
  if (Hcg > 45) {
    // Case 2: Hcg > 45cm → I1=0, I2=1 for all soil types
    return { I1: 0, I2: 1 };
  }
  // Case 1: Hcg ≤ 45cm
  switch (soilType) {
    case 'I':  return { I1: 0, I2: 0 };
    case 'II': return { I1: 1, I2: 0 };
    case 'III': return { I1: 0, I2: 1 };
  }
}

// ============================================================
// SECTION 9.3.1 - Characteristic Design Deflection
// ============================================================

/**
 * Calculate characteristic design deflection
 * Dc = D̄ + σ
 */
export function calcDc(deflections: number[]): { D_mean: number; D_std: number; Dc: number } {
  const n = deflections.length;
  if (n === 0) throw new Error('No deflection data provided');
  
  const D_mean = deflections.reduce((a, b) => a + b, 0) / n;
  const variance = deflections.reduce((sum, d) => sum + Math.pow(d - D_mean, 2), 0) / n;
  const D_std = Math.sqrt(variance);
  const Dc = D_mean + D_std;
  
  return { D_mean, D_std, Dc };
}

// ============================================================
// SECTION 9.3.4 - Effective Thickness (hef)
// ============================================================

/**
 * Calculate effective thickness
 * hef = -5.737 + (807.961/Dc) + 0.972·I1 + 4.101·I2
 * 
 * With constraints:
 * - If hef < 0 → hef = 0
 * - If hef > he → hef = he
 */
export function calcHef(Dc: number, I1: number, I2: number, he: number): number {
  let hef = -5.737 + (807.961 / Dc) + 0.972 * I1 + 4.101 * I2;
  
  // Apply constraints (Case 3)
  if (hef < 0) hef = 0;
  if (hef > he) hef = he;
  
  return hef;
}

// ============================================================
// SECTION 9.3.5 - Fatigue Criterion
// ============================================================

/**
 * Calculate maximum admissible deflection from fatigue criterion
 * log D̄ = 3.148 - 0.188·log(Np)
 * → D̄_max = 10^(3.148 - 0.188·log10(Np))
 */
export function calcDmax(Np: number): number {
  if (Np <= 0) throw new Error('Np must be positive');
  return Math.pow(10, 3.148 - 0.188 * Math.log10(Np));
}

// ============================================================
// SECTION 9.3.6 - Reinforcement Thickness (HR)
// ============================================================

/**
 * Calculate reinforcement thickness in bituminous concrete
 * HR = -19.015 + (238.14/√D̄_max) - 1.357·hef + 1.016·I1 + 3.893·I2
 */
export function calcHR(D_max: number, hef: number, I1: number, I2: number): number {
  const HR = -19.015 + (238.14 / Math.sqrt(D_max)) - 1.357 * hef + 1.016 * I1 + 3.893 * I2;
  return HR;
}

// ============================================================
// SECTION 9.3.7 - Overlay Solution Cases
// ============================================================

export interface OverlaySolution {
  case: number;
  description: string;
  HCA?: number;   // asphalt concrete thickness (cm)
  Hpm?: number;   // pre-mix thickness (cm)
  HR_final: number;
}

/**
 * Determine overlay solution based on HR value
 */
export function determineOverlaySolution(HR: number, TR: number): OverlaySolution {
  if (HR <= 3) {
    return {
      case: 4,
      description: 'Lama asfáltica ou tratamento superficial (HR ≤ 3cm)',
      HR_final: HR,
    };
  } else if (HR <= 12.5) {
    return {
      case: 1,
      description: 'Camada única de CBUQ (binder + capa) ou camadas integradas CBUQ + pré-misturado (3cm < HR ≤ 12,5cm)',
      HR_final: HR,
    };
  } else if (HR <= 25) {
    const Hpm = 0.60 * HR;
    const HCA = HR - Hpm;
    return {
      case: 2,
      description: 'Camadas integradas CBUQ + pré-misturado (12,5cm < HR ≤ 25cm)',
      HCA,
      Hpm,
      HR_final: HR,
    };
  } else {
    return {
      case: 3,
      description: 'HR > 25cm: verificar necessidade de remoção/reconstrução do pavimento',
      HR_final: HR,
    };
  }
}

// ============================================================
// SECTION 9.3.7 - Fatigue Life (when economic restrictions apply)
// ============================================================

/**
 * Calculate fatigue life Nt
 * log Nt = (3.148 - log D̄) / 0.188
 */
export function calcNt(D_mean: number): number {
  return Math.pow(10, (3.148 - Math.log10(D_mean)) / 0.188);
}

// ============================================================
// SECTION 9.5.1 - Effective Resilience Modulus
// ============================================================

/**
 * Calculate effective resilience modulus of existing pavement
 * log(Mef) = 11.19 - 2.753·log(Dc) - 1.714·log(he) - 0.0053·I1 + 0.2766·I2
 * Mef ≥ 1000 kgf/cm²
 */
export function calcMef(Dc: number, he: number, I1: number, I2: number): number {
  const logMef = 11.19 - 2.753 * Math.log10(Dc) - 1.714 * Math.log10(he) - 0.0053 * I1 + 0.2766 * I2;
  const Mef = Math.pow(10, logMef);
  return Math.max(Mef, 1000);
}

// ============================================================
// CRACKING CALCULATION (Section 7.2)
// ============================================================

/**
 * TR = (TRI / S) × 100
 */
export function calcTR(TRI: number, S_area: number): number {
  return (TRI / S_area) * 100;
}

// ============================================================
// SILT PERCENTAGE (Section 7.5)
// ============================================================

/**
 * S = 100 - (P1/P2) × 100
 */
export function calcSilt(P1: number, P2: number): number {
  return 100 - (P1 / P2) * 100;
}

// ============================================================
// MAIN CALCULATION FUNCTION
// ============================================================

/**
 * Calculate pavement restoration design for a single section
 */
export function calculateSection(
  deflections: number[],
  structure: PavementStructure,
  params: ProjectParameters
): SectionResult {
  const warnings: string[] = [];
  
  // Step 1: Characteristic design deflection
  const { D_mean, D_std, Dc } = calcDc(deflections);
  
  // Step 2: Soil classification
  const soil_type = classifySoil(structure.CBR, structure.S);
  const { I1, I2 } = getI1I2(soil_type, structure.Hcg);
  
  // Step 3: Effective thickness
  const hef = calcHef(Dc, I1, I2, structure.he);
  
  // Step 4: Maximum admissible deflection (fatigue criterion)
  let section_Np = params.Np;
  if (params.segments && params.segments.length > 0) {
    const matchingSegment = params.segments.find(s => 
      structure.station_km !== undefined &&
      structure.station_km >= s.start_km && 
      structure.station_km <= s.end_km
    );
    if (matchingSegment) {
      section_Np = matchingSegment.Np;
    }
  }
  const D_max = calcDmax(section_Np);
  
  // Step 5: Reinforcement thickness
  const HR_raw = calcHR(D_max, hef, I1, I2);
  const HR = Math.max(0, HR_raw); // HR cannot be negative
  
  // Step 6: Overlay solution
  const solution = determineOverlaySolution(HR, structure.TR);
  
  // Step 7: Warnings
  if (structure.TR > 50) {
    warnings.push('TR > 50%: considerar solução em camadas integradas de CBUQ e pré-misturado para minimizar reflexão de trincas');
  }
  if (Dc > 140) {
    warnings.push('Deflexão característica > 1,40mm: verificar necessidade de remoção e reconstrução (solo Tipo I ou II)');
  }
  if (HR > 25) {
    warnings.push('HR > 25cm: as camadas integradas não devem ser constituídas exclusivamente de misturas betuminosas. Verificar necessidade de remoção/reconstrução.');
  }
  if (params.max_HR && HR > params.max_HR) {
    warnings.push(`Restrição econômica: HR calculado (${HR.toFixed(1)}cm) excede o máximo permitido (${params.max_HR}cm). Calcular vida de fadiga correspondente.`);
  }
  
  // Step 8: Fatigue life
  const Nt = calcNt(D_mean);
  
  // Step 9: Effective resilience modulus (for reference)
  let Mef: number | undefined;
  if (structure.he > 0) {
    try {
      Mef = calcMef(Dc, structure.he, I1, I2);
    } catch {
      // Skip if calculation fails
    }
  }
  
  return {
    station_id: structure.station_id,
    station_km: structure.station_km ?? 0,
    D_mean,
    D_std,
    Dc,
    he: structure.he,
    Hcg: structure.Hcg,
    CBR: structure.CBR,
    S: structure.S,
    TR: structure.TR,
    QI: structure.QI,
    soil_type,
    I1,
    I2,
    hef,
    D_max,
    HR,
    solution_case: solution.case,
    solution_description: solution.description,
    HCA: solution.HCA,
    Hpm: solution.Hpm,
    Mef,
    Nt,
    warnings,
  };
}

/**
 * Calculate summary statistics for all sections
 */
export function calculateSummary(sections: SectionResult[], params: ProjectParameters) {
  const HRs = sections.map(s => s.HR);
  const Dcs = sections.map(s => s.Dc);
  
  const solutionDist: Record<string, number> = {};
  sections.forEach(s => {
    const key = `Caso ${s.solution_case}`;
    solutionDist[key] = (solutionDist[key] || 0) + 1;
  });
  
  return {
    total_sections: sections.length,
    mean_Dc: Dcs.reduce((a, b) => a + b, 0) / Dcs.length,
    mean_HR: HRs.reduce((a, b) => a + b, 0) / HRs.length,
    max_HR: Math.max(...HRs),
    min_HR: Math.min(...HRs),
    solution_distribution: solutionDist,
  };
}
