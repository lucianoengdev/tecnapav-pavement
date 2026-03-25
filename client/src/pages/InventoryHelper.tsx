import { useState, useRef } from 'react';
import { ArrowLeft, Calculator, Download, FileSpreadsheet, Activity, Layers } from 'lucide-react';
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

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(',', '.');
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

      for (let i = 5; i < rows.length; i++) {
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
      csvContent += `${stationId},${row.km.toFixed(3)},${row.tr}\n`;
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
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const extracted: { km: number; d0: number }[] = [];

      for (let i = 8; i < rows.length; i++) {
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
      const kmFormatted = row.km.toFixed(3);
      const stationId = `Estaca_${kmFormatted.replace('.', '_')}`;
      csvContent += `${stationId},${kmFormatted},${row.d0}\n`;
    });
    triggerDownload(csvContent, "deflexoes_fwd_estruturado.csv");
  };

  // ==========================================
  // LÓGICA: MESCLAR E EXPORTAR AMBOS (COM MALHA)
  // ==========================================
  const downloadCombinedCSV = () => {
    if (trResults.length === 0 && fwdResults.length === 0) return;

    // 1. Descobrir o KM mínimo e máximo absolutos da obra
    let minKm = Infinity;
    let maxKm = -Infinity;

    trResults.forEach(r => {
      if (r.km < minKm) minKm = r.km;
      if (r.km > maxKm) maxKm = r.km;
    });
    fwdResults.forEach(r => {
      if (r.km < minKm) minKm = r.km;
      if (r.km > maxKm) maxKm = r.km;
    });

    if (minKm === Infinity || maxKm === -Infinity) return;

    // 2. Converter para números inteiros (multiplicando por 1000) 
    // para evitar que o Javascript se perca nas casas decimais (ex: 0.020 vira 20)
    // O Math.floor vai garantir que o início caia exatamente num múltiplo de 20
    const startInt = Math.floor(Math.round(minKm * 1000) / 20) * 20;
    const endInt = Math.floor(Math.round(maxKm * 1000) / 20) * 20;

    // 3. Criar os "Baldes" (A malha contínua de 20 em 20 metros)
    const buckets = new Map<number, { fwd: number[], tr: number[] }>();
    for (let k = startInt; k <= endInt; k += 20) {
      buckets.set(k, { fwd: [], tr: [] });
    }

    // 4. Distribuir os valores de Deflexão puxando para a estaca de trás
    fwdResults.forEach(r => {
      const intKm = Math.round(r.km * 1000);
      const gridInt = Math.floor(intKm / 20) * 20;
      if (buckets.has(gridInt)) {
        buckets.get(gridInt)!.fwd.push(r.d0);
      }
    });

    // 5. Distribuir os valores de TR puxando para a estaca de trás
    trResults.forEach(r => {
      const intKm = Math.round(r.km * 1000);
      const gridInt = Math.floor(intKm / 20) * 20;
      if (buckets.has(gridInt)) {
        buckets.get(gridInt)!.tr.push(r.tr);
      }
    });

    // 6. Gerar o arquivo CSV final
    let csvContent = "station_id,station_km,deflection,TR\n";

    for (let k = startInt; k <= endInt; k += 20) {
      const bucket = buckets.get(k)!;
      const kmFormatted = (k / 1000).toFixed(3);
      const stationId = `Estaca_${kmFormatted.replace('.', '_')}`;

      // Regra FWD: Média
      let deflectionStr = "";
      if (bucket.fwd.length > 0) {
        const sum = bucket.fwd.reduce((a, b) => a + b, 0);
        const avg = sum / bucket.fwd.length;
        // Se der número quebrado longo, limita pra não sujar a planilha, senão usa o valor original
        deflectionStr = avg % 1 === 0 ? avg.toString() : avg.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      }

      // Regra TR: Máximo
      let trStr = "";
      if (bucket.tr.length > 0) {
        const maxTr = Math.max(...bucket.tr);
        trStr = maxTr % 1 === 0 ? maxTr.toString() : maxTr.toFixed(2);
      }

      // Imprime a linha garantindo as vírgulas em branco quando não há dados
      csvContent += `${stationId},${kmFormatted},${deflectionStr},${trStr}\n`;
    }

    triggerDownload(csvContent, "dados_mesclados_fwd_tr_padronizado.csv");
    toast.success("Planilha contínua (20 em 20m) exportada com sucesso!");
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
  // RENDERIZAÇÃO
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
          
          {/* COLUNA ESQUERDA: INVENTÁRIO (TR) */}
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
                  <Download size={16} /> Exportar CSV Individual (TR)
                </Button>
              )}
            </div>
          </div>


          {/* COLUNA DIREITA: FWD */}
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
                  <li>Exporta Deflexão e KM formatado.</li>
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
                  <Download size={16} /> Exportar CSV Individual (FWD)
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* BANNER INFERIOR: MESCLAR ARQUIVOS          */}
        {/* ========================================== */}
        {trResults.length > 0 && fwdResults.length > 0 && (
          <div className="mt-8 bg-primary/10 border border-primary/40 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-full text-primary shrink-0">
                <Layers size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">
                  Mesclar e Padronizar Malha (20x20m)
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  As estacas fracionadas serão retroagidas para o múltiplo de 20 anterior. Deflexões repetidas terão cálculo de <strong>média</strong>, e Trincamentos repetidos considerarão o valor <strong>máximo</strong>. Linhas sem dados ficarão em branco para manter a continuidade.
                </p>
              </div>
            </div>
            
            <Button 
              onClick={downloadCombinedCSV} 
              className="gap-2 whitespace-nowrap h-12 px-6 bg-primary hover:bg-primary/90" 
              size="lg"
            >
              <Download size={18} /> 
              Exportar CSV Padronizado
            </Button>
          </div>
        )}

      </main>
    </div>
  );
}