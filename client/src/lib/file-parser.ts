/**
 * File Parser Utility for TECNAPAV
 * Handles CSV and XLSX file parsing for:
 * 1. FWD/Deflection data
 * 2. Pavement structure data
 * 3. Combined data (all columns in one file)
 */

import * as XLSX from 'xlsx';
import type { DeflectionPoint, PavementStructure } from './tecnapav-calc';

export type FileType = 'deflection' | 'structure' | 'combined';

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
  columns: string[];
  rowCount: number;
}

// ============================================================
// COLUMN MAPPING (flexible header matching)
// ============================================================

const DEFLECTION_COLUMNS = {
  station_id: ['station_id', 'estacao', 'estação', 'id', 'ponto', 'station'],
  station_km: ['station_km', 'km', 'quilometro', 'quilômetro', 'dist', 'distancia', 'distância', 'pk'],
  deflection: ['deflection', 'deflexao', 'deflexão', 'd', 'def', 'defl', 'deflection_001mm', 'deflexao_001mm'],
};

const STRUCTURE_COLUMNS = {
  station_id: ['station_id', 'estacao', 'estação', 'id', 'ponto', 'station'],
  station_km: ['station_km', 'km', 'quilometro', 'quilômetro', 'dist', 'pk'],
  he: ['he', 'h_e', 'espessura_revestimento', 'espessura_betuminosa', 'thick_asphalt', 'revestimento_cm'],
  Hcg: ['hcg', 'h_cg', 'espessura_granular', 'thick_granular', 'granular_cm', 'base_subbase_cm'],
  CBR: ['cbr', 'isc', 'indice_suporte', 'california_bearing_ratio'],
  S: ['s', 'silte', 'silt', 'silt_pct', 'silte_pct', 'percentagem_silte'],
  TR: ['tr', 'trincamento', 'cracking', 'cracking_pct', 'trincamento_pct'],
  QI: ['qi', 'quociente_irregularidade', 'irregularity', 'irregularidade'],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function findColumn(headers: string[], candidates: string[]): string | null {
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  for (const candidate of candidates) {
    const idx = normalizedHeaders.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// ============================================================
// PARSE RAW DATA FROM FILE
// ============================================================

export async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');
        
        let workbook: XLSX.WorkBook;
        
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          // Parse XLSX/XLS
          workbook = XLSX.read(data, { type: 'array' });
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
        
        if (jsonData.length === 0) {
          throw new Error('File is empty');
        }
        
        // First row is headers
        const headers = (jsonData[0] as unknown[]).map(h => String(h));
        const rows = jsonData.slice(1).map(row => {
          const obj: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            obj[header] = (row as unknown[])[i];
          });
          return obj;
        }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
        
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

// ============================================================
// PARSE DEFLECTION DATA
// ============================================================

export function parseDeflectionData(
  headers: string[],
  rows: Record<string, unknown>[]
): ParseResult<DeflectionPoint> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: DeflectionPoint[] = [];
  
  // Find columns
  const idCol = findColumn(headers, DEFLECTION_COLUMNS.station_id);
  const kmCol = findColumn(headers, DEFLECTION_COLUMNS.station_km);
  const deflCol = findColumn(headers, DEFLECTION_COLUMNS.deflection);
  
  if (!deflCol) {
    errors.push('Coluna de deflexão não encontrada. Esperado: deflexao, deflection, D, defl');
  }
  
  if (errors.length > 0) return { data, errors, warnings, columns: headers, rowCount: rows.length };
  
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    
    const deflection = parseNumber(row[deflCol!]);
    if (deflection === null) {
      warnings.push(`Linha ${rowNum}: valor de deflexão inválido, ignorando`);
      return;
    }
    
    const station_id = idCol ? parseString(row[idCol]) : `P${rowNum - 1}`;
    const station_km = kmCol ? (parseNumber(row[kmCol]) ?? 0) : 0;
    
    data.push({ station_id, station_km, deflection });
  });
  
  return { data, errors, warnings, columns: headers, rowCount: rows.length };
}

// ============================================================
// PARSE PAVEMENT STRUCTURE DATA
// ============================================================

export function parseStructureData(
  headers: string[],
  rows: Record<string, unknown>[]
): ParseResult<PavementStructure> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: PavementStructure[] = [];
  
  // Find required columns
  const idCol = findColumn(headers, STRUCTURE_COLUMNS.station_id);
  const kmCol = findColumn(headers, STRUCTURE_COLUMNS.station_km);
  const heCol = findColumn(headers, STRUCTURE_COLUMNS.he);
  const HcgCol = findColumn(headers, STRUCTURE_COLUMNS.Hcg);
  const CBRCol = findColumn(headers, STRUCTURE_COLUMNS.CBR);
  const SCol = findColumn(headers, STRUCTURE_COLUMNS.S);
  const TRCol = findColumn(headers, STRUCTURE_COLUMNS.TR);
  const QICol = findColumn(headers, STRUCTURE_COLUMNS.QI);
  
  const missingRequired: string[] = [];
  if (!heCol) missingRequired.push('he (espessura do revestimento betuminoso, cm)');
  if (!HcgCol) missingRequired.push('Hcg (espessura da camada granular, cm)');
  if (!CBRCol) missingRequired.push('CBR (Índice de Suporte Califórnia, %)');
  
  if (missingRequired.length > 0) {
    errors.push(`Colunas obrigatórias não encontradas: ${missingRequired.join(', ')}`);
  }
  
  if (!SCol) warnings.push('Coluna de silte (S%) não encontrada. Usando S=0 (solo Tipo I se CBR≥10)');
  if (!TRCol) warnings.push('Coluna de trincamento (TR%) não encontrada. Usando TR=0');
  if (!QICol) warnings.push('Coluna de irregularidade (QI) não encontrada. Usando QI=0');
  
  if (errors.length > 0) return { data, errors, warnings, columns: headers, rowCount: rows.length };
  
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    
    const he = parseNumber(row[heCol!]);
    const Hcg = parseNumber(row[HcgCol!]);
    const CBR = parseNumber(row[CBRCol!]);
    
    if (he === null || Hcg === null || CBR === null) {
      warnings.push(`Linha ${rowNum}: valores obrigatórios inválidos, ignorando`);
      return;
    }
    
    const station_id = idCol ? parseString(row[idCol]) : `S${rowNum - 1}`;
    const station_km = kmCol ? (parseNumber(row[kmCol]) ?? 0) : 0;
    const S = SCol ? (parseNumber(row[SCol]) ?? 0) : 0;
    const TR = TRCol ? (parseNumber(row[TRCol]) ?? 0) : 0;
    const QI = QICol ? (parseNumber(row[QICol]) ?? 0) : 0;
    
    data.push({ station_id, station_km, he, Hcg, CBR, S, TR, QI });
  });
  
  return { data, errors, warnings, columns: headers, rowCount: rows.length };
}

// ============================================================
// PARSE COMBINED DATA (all in one file)
// ============================================================

export interface CombinedRow {
  deflection: DeflectionPoint;
  structure: PavementStructure;
}

export function parseCombinedData(
  headers: string[],
  rows: Record<string, unknown>[]
): ParseResult<CombinedRow> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: CombinedRow[] = [];
  
  // Find all columns
  const idCol = findColumn(headers, DEFLECTION_COLUMNS.station_id);
  const kmCol = findColumn(headers, DEFLECTION_COLUMNS.station_km);
  const deflCol = findColumn(headers, DEFLECTION_COLUMNS.deflection);
  const heCol = findColumn(headers, STRUCTURE_COLUMNS.he);
  const HcgCol = findColumn(headers, STRUCTURE_COLUMNS.Hcg);
  const CBRCol = findColumn(headers, STRUCTURE_COLUMNS.CBR);
  const SCol = findColumn(headers, STRUCTURE_COLUMNS.S);
  const TRCol = findColumn(headers, STRUCTURE_COLUMNS.TR);
  const QICol = findColumn(headers, STRUCTURE_COLUMNS.QI);
  
  const missing: string[] = [];
  if (!deflCol) missing.push('deflexao/deflection');
  if (!heCol) missing.push('he');
  if (!HcgCol) missing.push('hcg');
  if (!CBRCol) missing.push('cbr');
  
  if (missing.length > 0) {
    errors.push(`Colunas obrigatórias não encontradas: ${missing.join(', ')}`);
    return { data, errors, warnings, columns: headers, rowCount: rows.length };
  }
  
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    
    const deflection = parseNumber(row[deflCol!]);
    const he = parseNumber(row[heCol!]);
    const Hcg = parseNumber(row[HcgCol!]);
    const CBR = parseNumber(row[CBRCol!]);
    
    if (deflection === null || he === null || Hcg === null || CBR === null) {
      warnings.push(`Linha ${rowNum}: valores obrigatórios inválidos, ignorando`);
      return;
    }
    
    const station_id = idCol ? parseString(row[idCol]) : `P${rowNum - 1}`;
    const station_km = kmCol ? (parseNumber(row[kmCol]) ?? 0) : 0;
    const S = SCol ? (parseNumber(row[SCol]) ?? 0) : 0;
    const TR = TRCol ? (parseNumber(row[TRCol]) ?? 0) : 0;
    const QI = QICol ? (parseNumber(row[QICol]) ?? 0) : 0;
    
    data.push({
      deflection: { station_id, station_km, deflection },
      structure: { station_id, station_km, he, Hcg, CBR, S, TR, QI },
    });
  });
  
  return { data, errors, warnings, columns: headers, rowCount: rows.length };
}

// ============================================================
// AUTO-DETECT FILE TYPE
// ============================================================

export function detectFileType(headers: string[]): FileType {
  const normalized = headers.map(h => normalizeHeader(h));
  
  const hasDeflection = DEFLECTION_COLUMNS.deflection.some(c => normalized.includes(c));
  const hasStructure = STRUCTURE_COLUMNS.he.some(c => normalized.includes(c)) ||
                       STRUCTURE_COLUMNS.CBR.some(c => normalized.includes(c));
  
  if (hasDeflection && hasStructure) return 'combined';
  if (hasDeflection) return 'deflection';
  return 'structure';
}

// ============================================================
// GENERATE SAMPLE CSV TEMPLATES
// ============================================================

export function generateDeflectionTemplate(): string {
  return `station_id,station_km,deflection
P001,0.000,85.5
P002,0.020,92.3
P003,0.040,78.1
P004,0.060,105.7
P005,0.080,88.4
P006,0.100,95.2
P007,0.120,82.6
P008,0.140,110.3
P009,0.160,76.8
P010,0.180,93.1`;
}

export function generateStructureTemplate(): string {
  return `station_id,station_km,he,Hcg,CBR,S,TR,QI
S001,0.000,10,30,8,25,15,3.2
S002,0.200,10,30,8,25,18,3.5
S003,0.400,12,35,10,20,10,2.8`;
}

export function generateCombinedTemplate(): string {
  return `station_id,station_km,deflection,he,Hcg,CBR,S,TR,QI
P001,0.000,85.5,10,30,8,25,15,3.2
P002,0.020,92.3,10,30,8,25,15,3.2
P003,0.040,78.1,10,30,8,25,15,3.2
P004,0.060,105.7,10,30,8,25,18,3.5
P005,0.080,88.4,10,30,8,25,18,3.5
P006,0.100,95.2,10,30,8,25,18,3.5
P007,0.120,82.6,12,35,10,20,10,2.8
P008,0.140,110.3,12,35,10,20,10,2.8
P009,0.160,76.8,12,35,10,20,10,2.8
P010,0.180,93.1,12,35,10,20,10,2.8`;
}
