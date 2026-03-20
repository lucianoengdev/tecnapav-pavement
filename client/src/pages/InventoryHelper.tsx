import { useState, useRef } from 'react';
import { ArrowLeft, Calculator, Download, FileSpreadsheet, AlertTriangle, Activity } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function InventoryHelper() {
  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const trInputRef = useRef<HTMLInputElement>(null);
  const fwdInputRef = useRef<HTMLInputElement>(null);

  // Função auxiliar universal para converter valores (trata vírgula e ponto)
  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(',', '.'); // Troca vírgula por ponto
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // ==========================================
  // LÓGICA: CALCULADORA DE TR (Inventário)
  // ==========================================
  const [laneWidth, setLaneWidth] = useState<number>(3.6);
  const [trFile, setTrFile] = useState<File | null>(null);
  const [isTrProcessing, setIsTrProcessing] = useState(false);
  const [trResults, setTrResults] = useState<{ km: number; tr: number }[]>([]);

  const COL_KM = 0; // A
  const COLS_F2 = [8, 9, 31, 32]; // I, J, AF, AG
  const COLS_F3 = [10, 11, 33, 34]; // K, L, AH, AI
  const COLS_PAN = [17, 40]; // R, AO
  const COLS_REM = [21, 44]; // V, AS

  const processTrFile = async () => {
    if (!trFile) return toast.error('Selecione um arquivo de inventário primeiro.');
    if (laneWidth <= 0) return toast.error('A largura da faixa deve ser maior que zero.');

    setIsTrProcessing(true);
    try {
      const data = await trFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const calculated: { km: number; tr: number }[] = [];
      const S = 20 * laneWidth; 

      for (let i = 5; i < rows.length; i++) { // Linha 6 em diante
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawKm = row[COL_KM];
        if (rawKm === undefined || rawKm === null || rawKm === '') continue;
        
        const km = parseNumber(rawKm);
        let TRI = 0;
        
        COLS_F2.forEach(col => TRI += parseNumber(row[col]));
        COLS_F3.forEach(col => TRI += parseNumber(row[col]));
        COLS_PAN.forEach(col => TRI += parseNumber(row[col]));
        COLS_REM.forEach(col => TRI += parseNumber(row[col]));

        let TR = (TRI * 100) / S;
        if (TR > 100) TR = 100;

        calculated.push({ km, tr: Number(TR.toFixed(2)) });
      }

      setTrResults(calculated);
      toast.success(`TR: ${calculated.length} estacas processadas!`);
    } catch (error) {
      toast.error('Erro ao ler a planilha de Inventário.');
    } finally {
      setIsTrProcessing(false);
    }
  };

  const downloadTrCSV = () => {
    let csvContent = "station_id,station_km,TR\n";
    trResults.forEach(row => {
      const stationId = `Estaca_${row.km.toFixed(3).replace('.', '_')}`;
      csvContent += `${stationId},${row.km},${row.tr}\n`;
    });
    triggerDownload(csvContent, "inventario_TR_calculado.csv");
  };

  // ==========================================
  // LÓGICA: EXTRATOR DE FWD
  // ==========================================
  const [fwdFile, setFwdFile] = useState<File | null>(null);
  const [isFwdProcessing, setIsFwdProcessing] = useState(false);
  const [fwdResults, setFwdResults] = useState<{ km: number; d0: number }[]>([]);

  const COL_FWD_KM = 0; // A
  const COL_FWD_D0 = 3; // D

  const processFwdFile = async () => {
    if (!fwdFile) return toast.error('Selecione um arquivo de FWD primeiro.');

    setIsFwdProcessing(true);
    try {
      const data = await fwdFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Somente primeira aba
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const extracted: { km: number; d0: number }[] = [];

      for (let i = 8; i < rows.length; i++) { // Linha 9 em diante (índice 8)
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawKm = row[COL_FWD_KM];
        const rawD0 = row[COL_FWD_D0];
        
        if (rawKm === undefined || rawKm === null || rawKm === '') continue;
        if (rawD0 === undefined || rawD0 === null || rawD0 === '') continue;

        const km = parseNumber(rawKm);
        const d0 = parseNumber(rawD0);

        extracted.push({ km, d0 });
      }

      setFwdResults(extracted);
      toast.success(`FWD: ${extracted.length} deflexões extraídas!`);
    } catch (error) {
      toast.error('Erro ao ler a planilha de FWD.');
    } finally {
      setIsFwdProcessing(false);
    }
  };

  const downloadFwdCSV = () => {
    let csvContent = "station_id,station_km,deflection\n";
    fwdResults.forEach(row => {
      // Formata KM com 2 casas decimais conforme solicitado
      const kmFormatted = row.km.toFixed(2);
      const stationId = `Estaca_${kmFormatted.replace('.', '_')}`;
      csvContent += `${stationId},${kmFormatted},${row.d0}\n`;
    });
    triggerDownload(csvContent, "deflexoes_fwd_estruturado.csv");
  };

  // Helper para baixar arquivos
  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // RENDERIZAÇÃO (INTERFACE LADO A LADO)
  // ==========================================
  return (
    <div className="min-h-screen blueprint-bg text-foreground">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center h-14">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft size={16} />
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-6xl py-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-accent/20 border border-accent/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileSpreadsheet size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Pré-processamento de Dados
          </h1>
          <p className="text-muted-foreground">
            Estruture suas planilhas brutas de campo para o formato exato exigido pelo TECNAPAV.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* ========================================== */}
          {/* COLUNA ESQUERDA: INVENTÁRIO (TR)           */}
          {/* ========================================== */}
          <div className="bg-card/50 border border-border rounded-xl p-6 flex flex-col h-full">
            <div className="mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <Calculator size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Calculadora de TR</h2>
                <p className="text-xs text-muted-foreground">Extrai trincas, panelas e remendos (a partir da linha 6)</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <Label className="text-sm">Largura da Faixa (m)</Label>
                <Input 
                  type="number" step="0.1" 
                  value={laneWidth} 
                  onChange={(e) => setLaneWidth(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => trInputRef.current?.click()}
              >
                <input 
                  ref={trInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden"
                  onChange={(e) => e.target.files && setTrFile(e.target.files[0])}
                />
                <FileSpreadsheet size={24} className="mx-auto mb-2 text-muted-foreground" />
                {trFile ? (
                  <p className="text-primary text-sm font-medium truncate px-2">{trFile.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Clique para enviar Inventário</p>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border flex flex-col gap-3">
              <Button onClick={processTrFile} disabled={!trFile || isTrProcessing} className="w-full gap-2">
                <Calculator size={16} /> {isTrProcessing ? 'Processando...' : 'Calcular TR (%)'}
              </Button>
              {trResults.length > 0 && (
                <Button onClick={downloadTrCSV} variant="outline" className="w-full gap-2 border-primary text-primary">
                  <Download size={16} /> Exportar CSV (TR)
                </Button>
              )}
            </div>
          </div>


          {/* ========================================== */}
          {/* COLUNA DIREITA: FWD                        */}
          {/* ========================================== */}
          <div className="bg-card/50 border border-border rounded-xl p-6 flex flex-col h-full">
            <div className="mb-6 flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg text-accent">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-accent">Extrator de FWD</h2>
                <p className="text-xs text-muted-foreground">Extrai KM (Col A) e D0 (Col D) (a partir da linha 9)</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-muted/30 p-4 rounded-lg border border-border text-sm text-muted-foreground">
                <p className="mb-2"><strong className="text-foreground">Como funciona:</strong></p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li>Lê apenas a 1ª aba da planilha.</li>
                  <li>Ignora o cabeçalho (pula as 8 primeiras linhas).</li>
                  <li>Formata o KM para 2 casas decimais.</li>
                  <li>Garante a formatação correta do CSV de saída.</li>
                </ul>
              </div>

              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors mt-auto"
                onClick={() => fwdInputRef.current?.click()}
              >
                <input 
                  ref={fwdInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden"
                  onChange={(e) => e.target.files && setFwdFile(e.target.files[0])}
                />
                <FileSpreadsheet size={24} className="mx-auto mb-2 text-muted-foreground" />
                {fwdFile ? (
                  <p className="text-accent text-sm font-medium truncate px-2">{fwdFile.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Clique para enviar FWD</p>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border flex flex-col gap-3">
              <Button onClick={processFwdFile} disabled={!fwdFile || isFwdProcessing} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Activity size={16} /> {isFwdProcessing ? 'Processando...' : 'Extrair Deflexões'}
              </Button>
              {fwdResults.length > 0 && (
                <Button onClick={downloadFwdCSV} variant="outline" className="w-full gap-2 border-accent text-accent">
                  <Download size={16} /> Exportar CSV (FWD)
                </Button>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}