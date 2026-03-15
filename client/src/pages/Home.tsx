/**
 * TECNAPAV - Home Page (Main Wizard)
 * Design: Blueprint Technical - Dark navy, cyan accents, amber warnings
 * Layout: Split-screen wizard (left: input, right: live preview/status)
 * Typography: Space Grotesk headings, Source Sans 3 body, JetBrains Mono data
 */

import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, Settings, Play, Download, ChevronRight, 
  AlertTriangle, CheckCircle, Info, X, FileSpreadsheet,
  Layers, Activity, BarChart3, ArrowRight, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { parseFile, parseDeflectionData, parseStructureData, parseCombinedData, detectFileType, generateCombinedTemplate, generateDeflectionTemplate, generateStructureTemplate } from '@/lib/file-parser';
import { calculateSection, calculateSummary } from '@/lib/tecnapav-calc';
import type { DeflectionPoint, PavementStructure, ProjectParameters, CalculationResult, SectionResult } from '@/lib/tecnapav-calc';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'upload' | 'configure' | 'calculate' | 'done';

interface UploadedFile {
  file: File;
  type: 'deflection' | 'structure' | 'combined';
  status: 'pending' | 'parsing' | 'ready' | 'error';
  error?: string;
  rowCount?: number;
  columns?: string[];
}

// ============================================================
// HERO SECTION
// ============================================================

const HERO_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/1TdnvFP1pysHYvwMQ7gUVW/sandbox/4tpeL6Haf6jslgAavdndCu-img-1_1771881604000_na1fn_dGVjbmFwYXYtaGVybw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvMVRkbnZGUDFweXNIWXZ3TVE3Z1VWVy9zYW5kYm94LzR0cGVMNkhhZjZqc2xnQWF2ZG5kQ3UtaW1nLTFfMTc3MTg4MTYwNDAwMF9uYTFmbl9kR1ZqYm1Gd1lYWXRhR1Z5YncucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=lvvLQ8Dt~h1DkaGRXrg05JeMlB6DJy5ZYCb62maoV2vLmPUrHS-kaqvg2m5tOmZlKxL5LG5m8CcZf9q0lIKFyC0ufxnQ7MElRe3cAe7SziK3PzLOIE8teuDEGlis7CJ7Fv~cGCZjaWBUILyHvZo-hDkPr4ZJvG8X2KUJJazho-dnW66dH2wGYYEkLKd5aKS-Ny53iaK2UG4Mzd4lAbqTEUKh1fIFsPMU8~CUUHOpEhGmNW8BIikCghffdrzKXjsEhal91RoeSUUhSM3pCDo5riPFYz19q7VCCAl-xeF2TE~3tIR1zzLLELo6YsNnMTc6-fZlmJt4rTwuXqluxz4k-g__";

// ============================================================
// STEP INDICATOR
// ============================================================

const STEPS = [
  { id: 'upload', label: 'Dados', icon: Upload },
  { id: 'configure', label: 'Parâmetros', icon: Settings },
  { id: 'calculate', label: 'Cálculo', icon: Play },
  { id: 'done', label: 'Resultados', icon: BarChart3 },
];

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.id === current;
        const isComplete = idx < currentIdx;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              isActive ? 'step-active' : isComplete ? 'step-complete' : 'step-inactive'
            }`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-border mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// FILE UPLOAD ZONE
// ============================================================

function FileUploadZone({ 
  label, 
  accept, 
  onFile, 
  uploadedFile,
  onRemove
}: { 
  label: string; 
  accept: string; 
  onFile: (file: File) => void;
  uploadedFile?: UploadedFile;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  if (uploadedFile) {
    return (
      <div className={`rounded-lg p-4 flex items-center gap-3 ${
        uploadedFile.status === 'error' ? 'border border-destructive bg-destructive/5' :
        uploadedFile.status === 'ready' ? 'border border-primary/40 bg-primary/5' :
        'border border-border bg-card'
      }`}>
        <div className={`p-2 rounded ${uploadedFile.status === 'ready' ? 'bg-primary/20' : 'bg-muted'}`}>
          <FileSpreadsheet size={20} className={uploadedFile.status === 'ready' ? 'text-primary' : 'text-muted-foreground'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{uploadedFile.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {uploadedFile.status === 'parsing' ? 'Processando...' :
             uploadedFile.status === 'ready' ? `${uploadedFile.rowCount} linhas • ${uploadedFile.columns?.length} colunas` :
             uploadedFile.status === 'error' ? uploadedFile.error :
             'Aguardando'}
          </p>
        </div>
        {uploadedFile.status === 'ready' && <CheckCircle size={16} className="text-primary shrink-0" />}
        {uploadedFile.status === 'error' && <AlertTriangle size={16} className="text-destructive shrink-0" />}
        <button onClick={onRemove} className="p-1 rounded hover:bg-muted transition-colors">
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`upload-zone rounded-lg p-6 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-foreground font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Arraste ou clique para selecionar • CSV ou XLSX</p>
    </div>
  );
}

// ============================================================
// MAIN HOME COMPONENT
// ============================================================

export default function Home() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<WizardStep>('upload');
  
  // File state
  const [deflectionFile, setDeflectionFile] = useState<UploadedFile | undefined>();
  const [structureFile, setStructureFile] = useState<UploadedFile | undefined>();
  const [combinedFile, setCombinedFile] = useState<UploadedFile | undefined>();
  const [uploadMode, setUploadMode] = useState<'separate' | 'combined'>('combined');
  
  // Parsed data
  const [deflectionData, setDeflectionData] = useState<DeflectionPoint[]>([]);
  const [structureData, setStructureData] = useState<PavementStructure[]>([]);
  
  // Project parameters
  const [params, setParams] = useState<ProjectParameters>({
    analysis_period: 10,
    growth_rate: 3,
    Np: 5e6,
    max_HR: undefined,
  });

  // Segmentos State (NOVO)
  const [useSegments, setUseSegments] = useState(false);
  const [segmentCount, setSegmentCount] = useState(1);
  const [segments, setSegments] = useState<{start_km: number, end_km: number, Np: number}[]>([
    { start_km: 0, end_km: 10, Np: 5e6 }
  ]);

  const handleSegmentCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setSegmentCount(validCount);
    setSegments(prev => {
      const newSegs = [...prev];
      while (newSegs.length < validCount) {
        // Preenche o próximo KM Inicial com o Final do anterior automaticamente
        const lastEnd = newSegs.length > 0 ? newSegs[newSegs.length - 1].end_km : 0;
        newSegs.push({ start_km: lastEnd, end_km: lastEnd + 10, Np: 5e6 });
      }
      return newSegs.slice(0, validCount);
    });
  };

  const updateSegment = (index: number, field: 'start_km'|'end_km'|'Np', value: number) => {
    setSegments(prev => {
      const newSegs = [...prev];
      newSegs[index] = { ...newSegs[index], [field]: value };
      return newSegs;
    });
  };
  
  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);

  // ============================================================
  // FILE HANDLING
  // ============================================================

  const handleCombinedFile = async (file: File) => {
    const uploading: UploadedFile = { file, type: 'combined', status: 'parsing' };
    setCombinedFile(uploading);
    
    try {
      const { headers, rows } = await parseFile(file);
      const result = parseCombinedData(headers, rows);
      
      if (result.errors.length > 0) {
        setCombinedFile({ ...uploading, status: 'error', error: result.errors[0] });
        toast.error(result.errors[0]);
        return;
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
      
      // Extract deflection and structure data
      const deflections = result.data.map(r => r.deflection);
      const structures = result.data.map(r => r.structure);
      
      setDeflectionData(deflections);
      setStructureData(structures);
      setCombinedFile({ 
        ...uploading, 
        status: 'ready', 
        rowCount: result.rowCount,
        columns: result.columns,
        type: 'combined'
      });
      
      toast.success(`${result.data.length} pontos carregados com sucesso`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setCombinedFile({ ...uploading, status: 'error', error: msg });
      toast.error(msg);
    }
  };

  const handleDeflectionFile = async (file: File) => {
    const uploading: UploadedFile = { file, type: 'deflection', status: 'parsing' };
    setDeflectionFile(uploading);
    
    try {
      const { headers, rows } = await parseFile(file);
      const result = parseDeflectionData(headers, rows);
      
      if (result.errors.length > 0) {
        setDeflectionFile({ ...uploading, status: 'error', error: result.errors[0] });
        toast.error(result.errors[0]);
        return;
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
      
      setDeflectionData(result.data);
      setDeflectionFile({ 
        ...uploading, 
        status: 'ready', 
        rowCount: result.rowCount,
        columns: result.columns
      });
      
      toast.success(`${result.data.length} deflexões carregadas`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setDeflectionFile({ ...uploading, status: 'error', error: msg });
      toast.error(msg);
    }
  };

  const handleStructureFile = async (file: File) => {
    const uploading: UploadedFile = { file, type: 'structure', status: 'parsing' };
    setStructureFile(uploading);
    
    try {
      const { headers, rows } = await parseFile(file);
      const result = parseStructureData(headers, rows);
      
      if (result.errors.length > 0) {
        setStructureFile({ ...uploading, status: 'error', error: result.errors[0] });
        toast.error(result.errors[0]);
        return;
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => toast.warning(w));
      }
      
      setStructureData(result.data);
      setStructureFile({ 
        ...uploading, 
        status: 'ready', 
        rowCount: result.rowCount,
        columns: result.columns
      });
      
      toast.success(`${result.data.length} seções estruturais carregadas`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      setStructureFile({ ...uploading, status: 'error', error: msg });
      toast.error(msg);
    }
  };

  // ============================================================
  // CALCULATION
  // ============================================================

  const canProceedToConfig = () => {
    if (uploadMode === 'combined') return combinedFile?.status === 'ready';
    return deflectionFile?.status === 'ready' && structureFile?.status === 'ready';
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setCalcProgress(0);
    
    try {
      // Group deflections by station for sections that have multiple measurements
      // For combined mode: each row is one point with its own structure data
      // We calculate per-section using individual deflection + structure
      
      const calculationParams: ProjectParameters = {
        ...params,
        segments: useSegments ? segments : undefined
      };

      const sections: SectionResult[] = [];
      
      if (uploadMode === 'combined') {
        // Each row has its own deflection and structure
        const total = deflectionData.length;
        for (let i = 0; i < total; i++) {
          const defl = deflectionData[i];
          const struct = structureData[i];
          
          const result = calculateSection([defl.deflection], struct, calculationParams);
          result.station_km = defl.station_km;
          sections.push(result);
          
          setCalcProgress(Math.round(((i + 1) / total) * 100));
          // Small delay for animation
          if (i % 10 === 0) await new Promise(r => setTimeout(r, 20));
        }
      } else {
        // Separate files: match by station_id or use index
        const total = structureData.length;
        for (let i = 0; i < total; i++) {
          const struct = structureData[i];
          
          // Find all deflections for this station
          const stationDeflections = deflectionData.filter(d => d.station_id === struct.station_id);
          const deflValues = stationDeflections.length > 0 
            ? stationDeflections.map(d => d.deflection)
            : deflectionData.slice(i, i + 1).map(d => d.deflection);
          
          if (deflValues.length === 0) continue;
          
          const result = calculateSection(deflValues, struct, params);
          sections.push(result);
          
          setCalcProgress(Math.round(((i + 1) / total) * 100));
          if (i % 5 === 0) await new Promise(r => setTimeout(r, 20));
        }
      }
      
      const summary = calculateSummary(sections, calculationParams);
      const calcResult: CalculationResult = {
        project_params: calculationParams,
        sections,
        summary,
      };
      
      // Store in sessionStorage for Results page
      sessionStorage.setItem('tecnapav_results', JSON.stringify(calcResult));
      
      setCalcProgress(100);
      await new Promise(r => setTimeout(r, 500));
      
      setStep('done');
      toast.success(`Cálculo concluído: ${sections.length} seções processadas`);
      
      setTimeout(() => setLocation('/results'), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no cálculo';
      toast.error(msg);
    } finally {
      setIsCalculating(false);
    }
  };

  // ============================================================
  // DOWNLOAD TEMPLATES
  // ============================================================

  const downloadTemplate = (type: 'combined' | 'deflection' | 'structure') => {
    let content = '';
    let filename = '';
    
    if (type === 'combined') {
      content = generateCombinedTemplate();
      filename = 'tecnapav_template_completo.csv';
    } else if (type === 'deflection') {
      content = generateDeflectionTemplate();
      filename = 'tecnapav_template_deflexoes.csv';
    } else {
      content = generateStructureTemplate();
      filename = 'tecnapav_template_estrutura.csv';
    }
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Template ${filename} baixado`);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen blueprint-bg flex flex-col"> 
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Layers size={16} className="text-primary" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>TECNAPAV</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">DNER-PRO 269/94</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <StepIndicator current={step} />
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-muted-foreground hover:text-primary"
              onClick={() => setLocation('/help')}
            >
              <HelpCircle size={16} />
              <span className="hidden sm:inline">Como Funciona</span>
            </Button>
          </div>

        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left Panel - Input */}
        <div className="flex-1 flex flex-col">
          {/* Hero Banner */}
          {step === 'upload' && (
            <div className="relative h-48 overflow-hidden">
              <img 
                src={HERO_IMG} 
                alt="Pavement cross-section blueprint"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Projeto de Restauração de Pavimentos
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Método da Resiliência — TECNAPAV · DNER-PRO 269/94
                    </p>
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">Deflexão FWD</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">Número N</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">Camadas</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 container py-6">
            <AnimatePresence mode="wait">
              {/* STEP 1: UPLOAD */}
              {step === 'upload' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="max-w-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        1. Importar Dados
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Carregue os dados de campo em formato CSV ou XLSX
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUploadMode('combined')}
                        className={`text-xs px-3 py-1.5 rounded border transition-all ${
                          uploadMode === 'combined' 
                            ? 'bg-primary/20 border-primary/50 text-primary' 
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        Arquivo Único
                      </button>
                      <button
                        onClick={() => setUploadMode('separate')}
                        className={`text-xs px-3 py-1.5 rounded border transition-all ${
                          uploadMode === 'separate' 
                            ? 'bg-primary/20 border-primary/50 text-primary' 
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        Arquivos Separados
                      </button>
                    </div>
                  </div>

                  {/* Column reference */}
                  <div className="formula-box mb-6">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Colunas esperadas:</p>
                    {uploadMode === 'combined' ? (
                      <p className="text-primary text-xs">station_id, station_km, <span className="text-accent">deflection</span>, <span className="text-accent">he</span>, <span className="text-accent">Hcg</span>, <span className="text-accent">CBR</span>, S, TR, QI</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs"><span className="text-primary">Deflexões:</span> station_id, station_km, <span className="text-accent">deflection</span></p>
                        <p className="text-xs"><span className="text-primary">Estrutura:</span> station_id, station_km, <span className="text-accent">he</span>, <span className="text-accent">Hcg</span>, <span className="text-accent">CBR</span>, S, TR, QI</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">deflection em 0,01mm • he, Hcg em cm • CBR, S, TR em %</p>
                  </div>

                  {/* Upload zones */}
                  {uploadMode === 'combined' ? (
                    <FileUploadZone
                      label="Arquivo completo (deflexões + estrutura)"
                      accept=".csv,.xlsx,.xls"
                      onFile={handleCombinedFile}
                      uploadedFile={combinedFile}
                      onRemove={() => { setCombinedFile(undefined); setDeflectionData([]); setStructureData([]); }}
                    />
                  ) : (
                    <div className="space-y-4">
                      <FileUploadZone
                        label="Dados de deflexão (FWD / Viga Benkelman)"
                        accept=".csv,.xlsx,.xls"
                        onFile={handleDeflectionFile}
                        uploadedFile={deflectionFile}
                        onRemove={() => { setDeflectionFile(undefined); setDeflectionData([]); }}
                      />
                      <FileUploadZone
                        label="Dados de estrutura do pavimento"
                        accept=".csv,.xlsx,.xls"
                        onFile={handleStructureFile}
                        uploadedFile={structureFile}
                        onRemove={() => { setStructureFile(undefined); setStructureData([]); }}
                      />
                    </div>
                  )}

                  {/* Template downloads */}
                  <div className="mt-6 p-4 rounded-lg border border-border bg-card/50">
                    <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Info size={12} />
                      Baixar templates de exemplo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadTemplate('combined')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border hover:border-primary/40 hover:text-primary transition-all text-muted-foreground"
                      >
                        <Download size={12} />
                        Template Completo
                      </button>
                      <button
                        onClick={() => downloadTemplate('deflection')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border hover:border-primary/40 hover:text-primary transition-all text-muted-foreground"
                      >
                        <Download size={12} />
                        Template Deflexões
                      </button>
                      <button
                        onClick={() => downloadTemplate('structure')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border hover:border-primary/40 hover:text-primary transition-all text-muted-foreground"
                      >
                        <Download size={12} />
                        Template Estrutura
                      </button>
                      
                      {/* NOVO BOTÃO: Como Preencher */}
                      <button
                        onClick={() => setLocation('/templates-guide')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 hover:text-primary transition-all text-primary font-bold ml-auto"
                      >
                        <HelpCircle size={12} />
                        Como preencher?
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => setStep('configure')}
                      disabled={!canProceedToConfig()}
                      className="gap-2"
                    >
                      Configurar Parâmetros
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CONFIGURE */}
              {step === 'configure' && (
                <motion.div
                  key="configure"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="max-w-2xl"
                >
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      2. Parâmetros de Projeto
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Configure os parâmetros de tráfego e análise conforme DNER-PRO 269/94 §9.1.2
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* N Number - Segmentado ou Único */}
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-medium text-foreground">
                          Número N (Np) — Solicitações
                        </Label>
                        <div className="flex bg-muted rounded p-1">
                          <button
                            onClick={() => setUseSegments(false)}
                            className={`text-xs px-3 py-1 rounded transition-all ${!useSegments ? 'bg-background shadow font-medium text-primary' : 'text-muted-foreground'}`}
                          >
                            N Único
                          </button>
                          <button
                            onClick={() => setUseSegments(true)}
                            className={`text-xs px-3 py-1 rounded transition-all ${useSegments ? 'bg-background shadow font-medium text-primary' : 'text-muted-foreground'}`}
                          >
                            Segmentado
                          </button>
                        </div>
                      </div>

                      {!useSegments ? (
                        <>
                          <div className="formula-box mb-3">
                            <span className="text-muted-foreground text-xs">Critério de fadiga: </span>
                            <span className="text-primary">log D̄ = 3,148 − 0,188 · log(Np)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              value={params.Np}
                              onChange={(e) => setParams(p => ({ ...p, Np: parseFloat(e.target.value) || 1e6 }))}
                              className="font-mono text-sm"
                            />
                            <span className="text-xs text-muted-foreground">Eixos Padrão</span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4 mt-2">
                          <div className="flex items-center gap-3 border-b border-border pb-4">
                            <Label className="text-xs text-muted-foreground">Quantos segmentos rodoviários?</Label>
                            <Input 
                              type="number" min={1} max={20}
                              value={segmentCount} 
                              onChange={(e) => handleSegmentCountChange(parseInt(e.target.value) || 1)}
                              className="w-20 h-8 text-sm"
                            />
                          </div>

                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {segments.map((seg, idx) => (
                              <div key={idx} className="flex gap-2 items-end bg-background p-3 rounded border border-border">
                                <div className="flex-1">
                                  <Label className="text-[10px] text-muted-foreground uppercase">KM Inicial</Label>
                                  <Input type="number" step="0.1" value={seg.start_km} onChange={(e) => updateSegment(idx, 'start_km', parseFloat(e.target.value) || 0)} className="h-8 font-mono text-xs" />
                                </div>
                                <div className="flex-1">
                                  <Label className="text-[10px] text-muted-foreground uppercase">KM Final</Label>
                                  <Input type="number" step="0.1" value={seg.end_km} onChange={(e) => updateSegment(idx, 'end_km', parseFloat(e.target.value) || 0)} className="h-8 font-mono text-xs" />
                                </div>
                                <div className="flex-[2]">
                                  <Label className="text-[10px] text-muted-foreground uppercase">Número N</Label>
                                  <Input type="number" value={seg.Np} onChange={(e) => updateSegment(idx, 'Np', parseFloat(e.target.value) || 0)} className="h-8 font-mono text-xs" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Analysis Period */}
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Label className="text-sm font-medium text-foreground mb-1 block">
                        Período de Análise: <span className="text-primary font-mono">{params.analysis_period} anos</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mb-3">Intervalo de tempo correspondente ao Np de projeto</p>
                      <Slider
                        value={[params.analysis_period]}
                        onValueChange={([v]) => setParams(p => ({ ...p, analysis_period: v }))}
                        min={5}
                        max={30}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>5 anos</span>
                        <span>30 anos</span>
                      </div>
                    </div>

                    {/* Growth Rate */}
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Label className="text-sm font-medium text-foreground mb-1 block">
                        Taxa de Crescimento do Tráfego: <span className="text-primary font-mono">{params.growth_rate}% a.a.</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mb-3">Taxa anual de crescimento do tráfego comercial</p>
                      <Slider
                        value={[params.growth_rate]}
                        onValueChange={([v]) => setParams(p => ({ ...p, growth_rate: v }))}
                        min={0}
                        max={10}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>10%</span>
                      </div>
                    </div>

                    {/* Economic Restriction (optional) */}
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Label className="text-sm font-medium text-foreground mb-1 block">
                        Restrição Econômica (opcional)
                      </Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Espessura máxima de reforço admissível por restrições orçamentárias (§9.1.2.e)
                      </p>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          placeholder="Sem restrição"
                          value={params.max_HR ?? ''}
                          onChange={(e) => setParams(p => ({ ...p, max_HR: e.target.value ? parseFloat(e.target.value) : undefined }))}
                          className="font-mono text-sm"
                          min={0}
                          max={50}
                        />
                        <span className="text-xs text-muted-foreground">cm</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={() => setStep('upload')}>
                      Voltar
                    </Button>
                    <Button onClick={() => setStep('calculate')} className="gap-2">
                      Iniciar Cálculo
                      <Play size={14} />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: CALCULATE */}
              {step === 'calculate' && (
                <motion.div
                  key="calculate"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="max-w-2xl"
                >
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      3. Cálculo do Dimensionamento
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Aplicando o Método da Resiliência — TECNAPAV
                    </p>
                  </div>

                  {/* Summary of inputs */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="stat-card p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">Pontos de medição</p>
                      <p className="text-2xl font-bold text-foreground font-mono">{deflectionData.length}</p>
                    </div>
                    <div className="stat-card p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">Número N (Np)</p>
                      <p className="text-2xl font-bold text-primary font-mono">
                        {params.Np >= 1e6 ? `${(params.Np/1e6).toFixed(1)}M` : params.Np.toExponential(1)}
                      </p>
                    </div>
                    <div className="stat-card p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">Período de análise</p>
                      <p className="text-2xl font-bold text-foreground font-mono">{params.analysis_period} <span className="text-sm">anos</span></p>
                    </div>
                    <div className="stat-card p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">Deflexão máx. admissível</p>
                      <p className="text-2xl font-bold text-accent font-mono">
                        {Math.pow(10, 3.148 - 0.188 * Math.log10(params.Np)).toFixed(1)}
                        <span className="text-sm"> ×0,01mm</span>
                      </p>
                    </div>
                  </div>

                  {/* Calculation steps */}
                  <div className="formula-box mb-6 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Sequência de cálculo (§9.3):</p>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-primary">1.</span> Dc = D̄ + σ <span className="text-muted-foreground">(deflexão característica)</span></p>
                      <p><span className="text-primary">2.</span> Classificação do solo (Tabela 1) → I₁, I₂</p>
                      <p><span className="text-primary">3.</span> hef = −5,737 + 807,961/Dc + 0,972·I₁ + 4,101·I₂</p>
                      <p><span className="text-primary">4.</span> D̄_max = 10^(3,148 − 0,188·log Np) <span className="text-muted-foreground">(fadiga)</span></p>
                      <p><span className="text-primary">5.</span> HR = −19,015 + 238,14/√D̄_max − 1,357·hef + 1,016·I₁ + 3,893·I₂</p>
                      <p><span className="text-primary">6.</span> Solução de recapeamento (Casos 1–4)</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {isCalculating && (
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Processando seções...</span>
                        <span className="font-mono">{calcProgress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${calcProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep('configure')} disabled={isCalculating}>
                      Voltar
                    </Button>
                    <Button 
                      onClick={handleCalculate} 
                      disabled={isCalculating}
                      className="gap-2"
                    >
                      {isCalculating ? (
                        <>
                          <Activity size={14} className="animate-pulse" />
                          Calculando...
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          Executar Cálculo
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: DONE */}
              {step === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Cálculo Concluído
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Redirecionando para os resultados...
                  </p>
                  <Button onClick={() => setLocation('/results')} className="gap-2">
                    Ver Resultados
                    <BarChart3 size={14} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel - Info/Preview (desktop only) */}
        <div className="hidden lg:flex w-80 border-l border-border flex-col bg-card/30">
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Referência Técnica
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Method summary */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Método da Resiliência</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O TECNAPAV define procedimentos para restauração de pavimentos flexíveis com base na deflexão recuperável e no número N de solicitações equivalentes.
              </p>
            </div>
            
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-foreground mb-2">Parâmetros Chave</p>
              <div className="space-y-2">
                {[
                  { label: 'Dc', desc: 'Deflexão característica (D̄ + σ)' },
                  { label: 'hef', desc: 'Espessura efetiva do revestimento' },
                  { label: 'HR', desc: 'Espessura de reforço em CA' },
                  { label: 'Np', desc: 'N° equiv. de eixos padrão' },
                ].map(p => (
                  <div key={p.label} className="flex gap-2">
                    <span className="text-xs font-mono text-primary w-8 shrink-0">{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-foreground mb-2">Classificação do Solo</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-1">CBR%</th>
                    <th className="text-center pb-1">S≤35</th>
                    <th className="text-center pb-1">S 35-65</th>
                    <th className="text-center pb-1">S{'>'} 65</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr><td>≥10</td><td className="text-center text-primary">I</td><td className="text-center text-primary">II</td><td className="text-center text-primary">III</td></tr>
                  <tr><td>6-9</td><td className="text-center text-primary">II</td><td className="text-center text-primary">II</td><td className="text-center text-primary">III</td></tr>
                  <tr><td>2-5</td><td className="text-center text-primary">III</td><td className="text-center text-primary">III</td><td className="text-center text-primary">III</td></tr>
                </tbody>
              </table>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-foreground mb-2">Soluções de Recapeamento</p>
              <div className="space-y-2">
                {[
                  { case: 'Caso 1', range: 'HR ≤ 3cm', desc: 'Lama asfáltica ou TS', color: 'text-primary' },
                  { case: 'Caso 2', range: '3 < HR ≤ 12,5cm', desc: 'CBUQ único ou integrado', color: 'text-primary' },
                  { case: 'Caso 3', range: '12,5 < HR ≤ 25cm', desc: 'CBUQ + pré-misturado', color: 'text-accent' },
                  { case: 'Caso 4', range: 'HR > 25cm', desc: 'Verificar reconstrução', color: 'text-destructive' },
                ].map(s => (
                  <div key={s.case} className="text-xs">
                    <span className={`font-medium ${s.color}`}>{s.case}</span>
                    <span className="text-muted-foreground"> ({s.range}): {s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
