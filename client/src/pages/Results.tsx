/**
 * TECNAPAV - Results Page
 * Design: Blueprint Technical - Interactive charts and data visualization
 * Shows: deflection profile, HR distribution, solution breakdown, data table
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  Area, AreaChart
} from 'recharts';
import {
  Download, ArrowLeft, AlertTriangle, CheckCircle, Info,
  Layers, Activity, BarChart3, Table, FileText, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Map
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CalculationResult, SectionResult } from '@/lib/tecnapav-calc';
import * as XLSX from 'xlsx';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  cyan: '#00B4D8',
  amber: '#F4A261',
  green: '#4CAF82',
  red: '#E05252',
  purple: '#9B72CF',
  navy: '#0D1B2A',
  border: 'rgba(255,255,255,0.1)',
};

const SOLUTION_COLORS: Record<number, string> = {
  1: COLORS.green,
  2: COLORS.cyan,
  3: COLORS.amber,
  4: COLORS.red,
};

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, unit, trend, color = 'primary' }: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'accent' | 'green' | 'red';
}) {
  const colorMap = {
    primary: 'text-primary border-t-primary',
    accent: 'text-accent border-t-accent',
    green: 'text-green-400 border-t-green-400',
    red: 'text-red-400 border-t-red-400',
  };
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`stat-card rounded-lg p-4 border-t-2 ${colorMap[color]}`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold font-mono ${colorMap[color].split(' ')[0]}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        {unit && <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>}
        {trend && <TrendIcon size={14} className={`mb-1 ml-1 ${colorMap[color].split(' ')[0]}`} />}
      </div>
    </motion.div>
  );
}

// ============================================================
// PAVEMENT LAYER DIAGRAM
// ============================================================

function PavementLayerDiagram({ section }: { section: SectionResult }) {
  const totalHeight = section.he + section.Hcg + 40; // 40cm for subgrade visualization
  const scale = 120 / totalHeight;

  const layers = [
    { label: `Reforço HR = ${section.HR.toFixed(1)}cm`, height: Math.max(section.HR, 2) * scale, color: '#1a3a5c', pattern: 'asphalt', isNew: true },
    { label: `Revestimento he = ${section.he}cm`, height: section.he * scale, color: '#2a4a6c', pattern: 'asphalt' },
    { label: `Camada Granular Hcg = ${section.Hcg}cm`, height: section.Hcg * scale, color: '#3a5a4c', pattern: 'granular' },
    { label: `Subleito (CBR ${section.CBR}%)`, height: 40 * scale, color: '#4a4a3c', pattern: 'soil' },
  ];

  return (
    <div className="flex gap-4 items-end">
      <div className="flex flex-col gap-0 border border-border/50 rounded overflow-hidden" style={{ width: 80 }}>
        {layers.map((layer, i) => (
          <div
            key={i}
            style={{
              height: layer.height,
              backgroundColor: layer.color,
              borderTop: i === 0 ? `2px solid ${COLORS.cyan}` : `1px solid rgba(255,255,255,0.1)`,
            }}
            className={`relative ${layer.isNew ? 'opacity-90' : 'opacity-70'}`}
          >
            {layer.isNew && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-cyan-400/30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,180,216,0.4) 0, rgba(0,180,216,0.4) 4px, transparent 4px, transparent 8px)' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-0 text-xs">
        {layers.map((layer, i) => (
          <div
            key={i}
            style={{ height: layer.height }}
            className="flex items-center"
          >
            <div className={`flex items-center gap-1.5 ${layer.isNew ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {layer.isNew && <span className="text-[10px] px-1 py-0.5 bg-primary/20 text-primary rounded border border-primary/30">NOVO</span>}
              <span>{layer.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN RESULTS COMPONENT
// ============================================================

type TabId = 'overview' | 'deflection' | 'reinforcement' | 'solutions' | 'table';

export default function Results() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedSection, setSelectedSection] = useState<SectionResult | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem('tecnapav_results');
    if (!stored) {
      toast.error('Nenhum resultado encontrado. Execute o cálculo primeiro.');
      setLocation('/');
      return;
    }
    try {
      const parsed = JSON.parse(stored) as CalculationResult;
      setResult(parsed);
      if (parsed.sections.length > 0) {
        setSelectedSection(parsed.sections[0]);
      }
    } catch {
      toast.error('Erro ao carregar resultados');
      setLocation('/');
    }
  }, [setLocation]);

  const exportToExcel = useCallback(() => {
    if (!result) return;
    
    const wsData = [
      ['TECNAPAV - Projeto de Restauração de Pavimentos Flexíveis'],
      ['DNER-PRO 269/94 - Método da Resiliência'],
      [''],
      ['PARÂMETROS DE PROJETO'],
      ['Número N (Np)', result.project_params.Np],
      ['Período de análise (anos)', result.project_params.analysis_period],
      ['Taxa de crescimento (%/ano)', result.project_params.growth_rate],
      [''],
      ['RESULTADOS POR SEÇÃO'],
      [
        'Estação', 'KM', 'D̄ (0,01mm)', 'σ (0,01mm)', 'Dc (0,01mm)',
        'he (cm)', 'Hcg (cm)', 'CBR (%)', 'S (%)', 'TR (%)', 'QI',
        'Tipo Solo', 'I1', 'I2', 'hef (cm)', 'D̄_max (0,01mm)', 'HR (cm)',
        'Caso', 'HCA (cm)', 'Hpm (cm)', 'Avisos'
      ],
      ...result.sections.map(s => [
        s.station_id, s.station_km, s.D_mean.toFixed(2), s.D_std.toFixed(2), s.Dc.toFixed(2),
        s.he, s.Hcg, s.CBR, s.S, s.TR, s.QI,
        s.soil_type, s.I1, s.I2, s.hef.toFixed(2), s.D_max.toFixed(2), s.HR.toFixed(2),
        s.solution_case, s.HCA?.toFixed(2) ?? '-', s.Hpm?.toFixed(2) ?? '-',
        s.warnings.join('; ')
      ]),
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, 'tecnapav_resultados.xlsx');
    toast.success('Resultados exportados para Excel');
  }, [result]);

  const exportToCSV = useCallback(() => {
    if (!result) return;
    
    const headers = [
      'estacao', 'km', 'D_medio', 'desvio_padrao', 'Dc', 'he', 'Hcg', 'CBR', 'S', 'TR', 'QI',
      'tipo_solo', 'I1', 'I2', 'hef', 'D_max', 'HR', 'caso', 'HCA', 'Hpm', 'avisos'
    ];
    
    const rows = result.sections.map(s => [
      s.station_id, s.station_km, s.D_mean.toFixed(2), s.D_std.toFixed(2), s.Dc.toFixed(2),
      s.he, s.Hcg, s.CBR, s.S, s.TR, s.QI,
      s.soil_type, s.I1, s.I2, s.hef.toFixed(2), s.D_max.toFixed(2), s.HR.toFixed(2),
      s.solution_case, s.HCA?.toFixed(2) ?? '', s.Hpm?.toFixed(2) ?? '',
      `"${s.warnings.join('; ')}"`
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tecnapav_resultados.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Resultados exportados para CSV');
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen blueprint-bg flex items-center justify-center">
        <div className="text-center">
          <Activity size={32} className="text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-muted-foreground">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  const { sections, summary, project_params } = result;

  // Chart data
  const deflectionChartData = sections.map((s, i) => ({
    name: s.station_id || `P${i + 1}`,
    km: s.station_km,
    Dc: parseFloat(s.Dc.toFixed(2)),
    D_max: parseFloat(s.D_max.toFixed(2)),
    D_mean: parseFloat(s.D_mean.toFixed(2)),
  }));

  const hrChartData = sections.map((s, i) => ({
    name: s.station_id || `P${i + 1}`,
    km: s.station_km,
    HR: parseFloat(s.HR.toFixed(2)),
    hef: parseFloat(s.hef.toFixed(2)),
  }));

  const solutionPieData = Object.entries(summary.solution_distribution).map(([key, count]) => ({
    name: key,
    value: count,
    pct: ((count / summary.total_sections) * 100).toFixed(1),
  }));

  const soilDistribution = sections.reduce((acc, s) => {
    acc[s.soil_type] = (acc[s.soil_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'deflection', label: 'Deflexões', icon: Activity },
    { id: 'reinforcement', label: 'Reforço', icon: Layers },
    { id: 'solutions', label: 'Soluções', icon: Map },
    { id: 'table', label: 'Tabela', icon: Table },
  ];

  const totalWarnings = sections.reduce((sum, s) => sum + s.warnings.length, 0);

  return (
    <div className="min-h-screen blueprint-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/')}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <span className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>TECNAPAV</span>
              <span className="text-xs text-muted-foreground">— Resultados</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalWarnings > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded">
                <AlertTriangle size={12} />
                {totalWarnings} avisos
              </div>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5 text-xs">
              <Download size={12} />
              CSV
            </Button>
            <Button size="sm" onClick={exportToExcel} className="gap-1.5 text-xs">
              <Download size={12} />
              Excel
            </Button>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="border-b border-border/40 bg-card/20">
        <div className="container py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="Seções analisadas" value={summary.total_sections} color="primary" />
            <StatCard label="Dc médio" value={summary.mean_Dc} unit="×0,01mm" color="primary" />
            <StatCard label="HR médio" value={summary.mean_HR} unit="cm" color="accent" />
            <StatCard label="HR máximo" value={summary.max_HR} unit="cm" color={summary.max_HR > 25 ? 'red' : 'accent'} />
            <StatCard label="HR mínimo" value={summary.min_HR} unit="cm" color="green" />
            <StatCard label="Np projeto" value={project_params.Np >= 1e6 ? `${(project_params.Np/1e6).toFixed(1)}M` : project_params.Np.toExponential(1)} color="primary" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40 bg-card/10">
        <div className="container">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 container py-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deflection Overview Chart */}
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Deflexão Característica vs. Admissível
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={deflectionChartData}>
                    <defs>
                      <linearGradient id="dcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#666' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Dc" name="Dc (proj.)" stroke={COLORS.cyan} fill="url(#dcGrad)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="D_max" name="D̄_max (fadiga)" stroke={COLORS.amber} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* HR Overview Chart */}
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Espessura de Reforço (HR) por Seção
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hrChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#666' }} unit="cm" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={3} stroke={COLORS.green} strokeDasharray="3 3" label={{ value: '3cm', fill: COLORS.green, fontSize: 10 }} />
                    <ReferenceLine y={12.5} stroke={COLORS.amber} strokeDasharray="3 3" label={{ value: '12,5cm', fill: COLORS.amber, fontSize: 10 }} />
                    <ReferenceLine y={25} stroke={COLORS.red} strokeDasharray="3 3" label={{ value: '25cm', fill: COLORS.red, fontSize: 10 }} />
                    <Bar dataKey="HR" name="HR (cm)" fill={COLORS.cyan} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Solution Distribution */}
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Distribuição das Soluções de Recapeamento
                </h3>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={solutionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {solutionPieData.map((entry, index) => {
                          const caseNum = parseInt(entry.name.split(' ')[1]);
                          return <Cell key={index} fill={SOLUTION_COLORS[caseNum] || COLORS.cyan} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} seções`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {solutionPieData.map((entry, i) => {
                      const caseNum = parseInt(entry.name.split(' ')[1]);
                      const caseDescs: Record<number, string> = {
                        1: 'Lama asfáltica / TS',
                        2: 'CBUQ único/integrado',
                        3: 'CBUQ + pré-misturado',
                        4: 'Verificar reconstrução',
                      };
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: SOLUTION_COLORS[caseNum] || COLORS.cyan }} />
                          <span className="text-foreground font-medium">{entry.name}</span>
                          <span className="text-muted-foreground">({entry.pct}%)</span>
                          <span className="text-muted-foreground hidden sm:inline">— {caseDescs[caseNum]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section Detail */}
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Detalhe da Seção
                </h3>
                <div className="mb-3">
                  <select
                    value={selectedSection?.station_id ?? ''}
                    onChange={(e) => {
                      const s = sections.find(s => s.station_id === e.target.value);
                      if (s) setSelectedSection(s);
                    }}
                    className="w-full text-xs bg-input border border-border rounded px-2 py-1.5 text-foreground"
                  >
                    {sections.map(s => (
                      <option key={s.station_id} value={s.station_id}>
                        {s.station_id} (km {s.station_km.toFixed(3)})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedSection && (
                  <div className="space-y-3">
                    <PavementLayerDiagram section={selectedSection} />
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div className="formula-box">
                        <span className="text-muted-foreground">Dc = </span>
                        <span className="text-primary font-bold">{selectedSection.Dc.toFixed(2)}</span>
                        <span className="text-muted-foreground"> ×0,01mm</span>
                      </div>
                      <div className="formula-box">
                        <span className="text-muted-foreground">HR = </span>
                        <span className="text-accent font-bold">{selectedSection.HR.toFixed(2)}</span>
                        <span className="text-muted-foreground"> cm</span>
                      </div>
                      <div className="formula-box">
                        <span className="text-muted-foreground">hef = </span>
                        <span className="text-primary font-bold">{selectedSection.hef.toFixed(2)}</span>
                        <span className="text-muted-foreground"> cm</span>
                      </div>
                      <div className="formula-box">
                        <span className="text-muted-foreground">Solo: </span>
                        <span className="text-primary font-bold">Tipo {selectedSection.soil_type}</span>
                      </div>
                    </div>
                    {selectedSection.warnings.length > 0 && (
                      <div className="warning-accent rounded p-2">
                        {selectedSection.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-amber-400 flex gap-1.5">
                            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Project Parameters Summary */}
            <div className="cyan-border rounded-lg p-4 bg-card/30">
              <h3 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Parâmetros de Projeto
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Número N (Np):</span>
                  <p className="font-mono text-primary font-bold">{project_params.Np.toExponential(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Período de análise:</span>
                  <p className="font-mono text-primary font-bold">{project_params.analysis_period} anos</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Taxa de crescimento:</span>
                  <p className="font-mono text-primary font-bold">{project_params.growth_rate}% a.a.</p>
                </div>
                <div>
                  <span className="text-muted-foreground">D̄_max (fadiga):</span>
                  <p className="font-mono text-accent font-bold">
                    {Math.pow(10, 3.148 - 0.188 * Math.log10(project_params.Np)).toFixed(2)} ×0,01mm
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* DEFLECTION TAB */}
        {activeTab === 'deflection' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="cyan-border rounded-lg p-4 bg-card/30">
              <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Perfil de Deflexões ao Longo do Trecho
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={deflectionChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dcGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dmeanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} label={{ value: '×0,01mm', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#888' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Dc" name="Dc (proj.)" stroke={COLORS.cyan} fill="url(#dcGrad2)" strokeWidth={2} dot={{ r: 3, fill: COLORS.cyan }} />
                  <Area type="monotone" dataKey="D_mean" name="D̄ (médio)" stroke={COLORS.purple} fill="url(#dmeanGrad)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="D_max" name="D̄_max (fadiga)" stroke={COLORS.amber} strokeWidth={2} strokeDasharray="8 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Histograma de Deflexões Características
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deflectionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Dc" name="Dc (×0,01mm)" fill={COLORS.cyan} radius={[2, 2, 0, 0]}>
                      {deflectionChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.Dc > (deflectionChartData[0]?.D_max ?? 999) ? COLORS.red : COLORS.cyan} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Dispersão: Dc vs. D̄_max
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="D_mean" name="D̄" tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'D̄ (×0,01mm)', position: 'insideBottom', fontSize: 10, fill: '#888', offset: -5 }} />
                    <YAxis dataKey="Dc" name="Dc" tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'Dc', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#888' }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter data={deflectionChartData} fill={COLORS.cyan} opacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* REINFORCEMENT TAB */}
        {activeTab === 'reinforcement' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="cyan-border rounded-lg p-4 bg-card/30">
              <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Espessura de Reforço (HR) — Perfil Longitudinal
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hrChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="cm" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={3} stroke={COLORS.green} strokeDasharray="4 4" label={{ value: 'TS (3cm)', fill: COLORS.green, fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={12.5} stroke={COLORS.amber} strokeDasharray="4 4" label={{ value: 'Caso 2 (12,5cm)', fill: COLORS.amber, fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={25} stroke={COLORS.red} strokeDasharray="4 4" label={{ value: 'Reconstrução (25cm)', fill: COLORS.red, fontSize: 10, position: 'right' }} />
                  <Bar dataKey="HR" name="HR (cm)" radius={[2, 2, 0, 0]}>
                    {hrChartData.map((entry, index) => {
                      const color = entry.HR <= 3 ? COLORS.green : entry.HR <= 12.5 ? COLORS.cyan : entry.HR <= 25 ? COLORS.amber : COLORS.red;
                      return <Cell key={index} fill={color} />;
                    })}
                  </Bar>
                  <Bar dataKey="hef" name="hef (cm)" fill={COLORS.purple} opacity={0.5} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Distribuição de HR por Faixa
                </h3>
                {(() => {
                  const bands = [
                    { label: 'HR ≤ 3cm (TS/Lama)', count: sections.filter(s => s.HR <= 3).length, color: COLORS.green },
                    { label: '3 < HR ≤ 12,5cm (CBUQ)', count: sections.filter(s => s.HR > 3 && s.HR <= 12.5).length, color: COLORS.cyan },
                    { label: '12,5 < HR ≤ 25cm (Integrado)', count: sections.filter(s => s.HR > 12.5 && s.HR <= 25).length, color: COLORS.amber },
                    { label: 'HR > 25cm (Reconstrução)', count: sections.filter(s => s.HR > 25).length, color: COLORS.red },
                  ];
                  return (
                    <div className="space-y-3">
                      {bands.map((band, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{band.label}</span>
                            <span className="font-mono" style={{ color: band.color }}>{band.count} seções ({((band.count/sections.length)*100).toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${(band.count/sections.length)*100}%`, backgroundColor: band.color }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Classificação dos Solos
                </h3>
                <div className="space-y-3">
                  {(['I', 'II', 'III'] as const).map(type => {
                    const count = soilDistribution[type] || 0;
                    const pct = sections.length > 0 ? (count / sections.length) * 100 : 0;
                    const colors = { I: COLORS.green, II: COLORS.cyan, III: COLORS.amber };
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Tipo {type} (CBR {type === 'I' ? '≥10, S≤35' : type === 'II' ? '≥6, S≤65' : '2-5 ou S>65'})</span>
                          <span className="font-mono" style={{ color: colors[type] }}>{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: colors[type] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SOLUTIONS TAB */}
        {activeTab === 'solutions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { case: 4, label: 'Caso 4: HR ≤ 3cm', desc: 'Lama asfáltica ou tratamento superficial', color: COLORS.green },
                { case: 1, label: 'Caso 1: 3 < HR ≤ 12,5cm', desc: 'Camada única CBUQ ou integrado', color: COLORS.cyan },
                { case: 2, label: 'Caso 2: 12,5 < HR ≤ 25cm', desc: 'CBUQ + pré-misturado integrado', color: COLORS.amber },
                { case: 3, label: 'Caso 3: HR > 25cm', desc: 'Verificar remoção/reconstrução', color: COLORS.red },
              ].map(item => {
                const count = summary.solution_distribution[`Caso ${item.case}`] || 0;
                const pct = sections.length > 0 ? (count / sections.length) * 100 : 0;
                return (
                  <div key={item.case} className="rounded-lg p-4 border bg-card/30" style={{ borderColor: `${item.color}40`, borderTopColor: item.color, borderTopWidth: 2 }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-3xl font-bold font-mono text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% das seções</p>
                    <p className="text-xs text-muted-foreground mt-2">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Sections with Case 2 (show HCA and Hpm) */}
            {sections.some(s => s.solution_case === 2) && (
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Caso 2 — Espessuras de Camadas Integradas (CBUQ + Pré-misturado)
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sections.filter(s => s.solution_case === 2).map(s => ({
                    name: s.station_id,
                    HCA: parseFloat((s.HCA ?? 0).toFixed(2)),
                    Hpm: parseFloat((s.Hpm ?? 0).toFixed(2)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} unit="cm" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="HCA" name="HCA - Concreto Asfáltico (cm)" fill={COLORS.cyan} stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Hpm" name="Hpm - Pré-misturado (cm)" fill={COLORS.amber} stackId="a" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Warnings summary */}
            {totalWarnings > 0 && (
              <div className="cyan-border rounded-lg p-4 bg-card/30">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <AlertTriangle size={14} className="text-amber-400" />
                  Avisos e Observações ({totalWarnings})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {sections.filter(s => s.warnings.length > 0).map(s => (
                    <div key={s.station_id} className="warning-accent rounded p-3">
                      <p className="text-xs font-medium text-foreground mb-1">{s.station_id} (km {s.station_km.toFixed(3)})</p>
                      {s.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-400 flex gap-1.5">
                          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                          {w}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TABLE TAB */}
        {activeTab === 'table' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="cyan-border rounded-lg bg-card/30 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Tabela de Resultados — {sections.length} seções
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5 text-xs">
                    <Download size={12} />
                    CSV
                  </Button>
                  <Button size="sm" onClick={exportToExcel} className="gap-1.5 text-xs">
                    <Download size={12} />
                    Excel
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">Estação</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">KM</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">D̄</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">Dc</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">he</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">Hcg</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">Solo</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">hef</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">D̄_max</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">HR</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">Caso</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">HCA</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">Hpm</th>
                      <th className="px-3 py-2 text-muted-foreground font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((s, i) => {
                      const isExpanded = expandedRows.has(s.station_id);
                      const caseColor = SOLUTION_COLORS[s.solution_case] || COLORS.cyan;
                      return (
                        <>
                          <tr
                            key={s.station_id}
                            className={`border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                            onClick={() => {
                              const next = new Set(expandedRows);
                              if (isExpanded) next.delete(s.station_id);
                              else next.add(s.station_id);
                              setExpandedRows(next);
                            }}
                          >
                            <td className="px-3 py-2 font-medium text-foreground">{s.station_id}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.station_km.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.D_mean.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right font-mono text-primary">{s.Dc.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.he}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.Hcg}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                s.soil_type === 'I' ? 'bg-green-500/20 text-green-400' :
                                s.soil_type === 'II' ? 'bg-cyan-500/20 text-cyan-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>
                                Tipo {s.soil_type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.hef.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.D_max.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: caseColor }}>{s.HR.toFixed(1)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${caseColor}20`, color: caseColor }}>
                                Caso {s.solution_case}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.HCA?.toFixed(1) ?? '—'}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.Hpm?.toFixed(1) ?? '—'}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {s.warnings.length > 0 && <AlertTriangle size={11} className="text-amber-400" />}
                                {isExpanded ? <ChevronUp size={11} className="text-muted-foreground" /> : <ChevronDown size={11} className="text-muted-foreground" />}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${s.station_id}-expanded`} className="bg-muted/20">
                              <td colSpan={14} className="px-4 py-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-2">
                                  <div><span className="text-muted-foreground">CBR: </span><span className="font-mono text-foreground">{s.CBR}%</span></div>
                                  <div><span className="text-muted-foreground">Silte S: </span><span className="font-mono text-foreground">{s.S}%</span></div>
                                  <div><span className="text-muted-foreground">Trincamento TR: </span><span className="font-mono text-foreground">{s.TR}%</span></div>
                                  <div><span className="text-muted-foreground">QI: </span><span className="font-mono text-foreground">{s.QI} cont/km</span></div>
                                  <div><span className="text-muted-foreground">I1: </span><span className="font-mono text-foreground">{s.I1}</span></div>
                                  <div><span className="text-muted-foreground">I2: </span><span className="font-mono text-foreground">{s.I2}</span></div>
                                  <div><span className="text-muted-foreground">σ: </span><span className="font-mono text-foreground">{s.D_std.toFixed(2)} ×0,01mm</span></div>
                                  {s.Mef && <div><span className="text-muted-foreground">Mef: </span><span className="font-mono text-foreground">{s.Mef.toFixed(0)} kgf/cm²</span></div>}
                                </div>
                                {s.warnings.length > 0 && (
                                  <div className="warning-accent rounded p-2 mt-2">
                                    {s.warnings.map((w, wi) => (
                                      <p key={wi} className="text-xs text-amber-400 flex gap-1.5">
                                        <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                                        {w}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2 italic">{s.solution_description}</p>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-border text-xs text-muted-foreground">
                D̄, Dc, D̄_max em ×0,01mm • he, Hcg, hef, HR, HCA, Hpm em cm • Clique em uma linha para expandir detalhes
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/20 py-3">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <span>TECNAPAV · DNER-PRO 269/94 · Método da Resiliência</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle size={11} className="text-primary" />
            {sections.length} seções calculadas
          </span>
        </div>
      </footer>
    </div>
  );
}
