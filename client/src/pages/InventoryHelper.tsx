import { useState, useRef } from 'react';
import { ArrowLeft, Calculator, Download, FileSpreadsheet, Upload, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function InventoryHelper() {
  const [laneWidth, setLaneWidth] = useState<number>(3.6); // Largura padrão comum
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ km: number; tr: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Índices das colunas (0-indexado): A=0, B=1...
  const COL_KM = 0; // A
  const COLS_F2 = [8, 9, 31, 32]; // I, J, AF, AG
  const COLS_F3 = [10, 11, 33, 34]; // K, L, AH, AI
  const COLS_PAN = [17, 40]; // R, AO
  const COLS_REM = [21, 44]; // V, AS

  // Função auxiliar para converter valores (trata vírgula e ponto)
  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(',', '.'); // Troca vírgula por ponto
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const processFile = async () => {
    if (!file) {
      toast.error('Por favor, selecione um arquivo primeiro.');
      return;
    }
    if (laneWidth <= 0) {
      toast.error('A largura da faixa deve ser maior que zero.');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Converte a aba para uma matriz de linhas x colunas (header: 1)
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const calculatedResults: { km: number; tr: number }[] = [];
      const S = 20 * laneWidth; // Área de avaliação (S) = 20m x Largura da Faixa

      // Começa da linha 6 (índice 5 no array)
      for (let i = 5; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        // Tenta ler o KM (Coluna A)
        const rawKm = row[COL_KM];
        if (rawKm === undefined || rawKm === null || rawKm === '') continue; // Pula linhas vazias
        
        const km = parseNumber(rawKm);

        // Soma as áreas de defeitos lendo as colunas mapeadas
        let TRI = 0;
        
        // Trincas FC-2
        COLS_F2.forEach(col => TRI += parseNumber(row[col]));
        // Trincas FC-3
        COLS_F3.forEach(col => TRI += parseNumber(row[col]));
        // Panelas
        COLS_PAN.forEach(col => TRI += parseNumber(row[col]));
        // Remendos
        COLS_REM.forEach(col => TRI += parseNumber(row[col]));

        // Cálculo do TR (%) = (TRI * 100) / S
        let TR = (TRI * 100) / S;
        
        // Garante que não passe de 100% caso haja sobreposição de áreas
        if (TR > 100) TR = 100;

        calculatedResults.push({ km, tr: Number(TR.toFixed(2)) });
      }

      setResults(calculatedResults);
      toast.success(`${calculatedResults.length} estacas processadas com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao ler a planilha. Verifique se o formato está correto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCSV = () => {
    if (results.length === 0) return;
    
    // Cria o cabeçalho padrão para o software principal
    let csvContent = "station_id,station_km,TR\n";
    
    results.forEach(row => {
      // Cria um ID de estaca genérico baseado no km
      const stationId = `Estaca_${row.km.toFixed(3).replace('.', '_')}`;
      csvContent += `${stationId},${row.km},${row.tr}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "inventario_TR_calculado.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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

      <main className="container max-w-3xl py-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-accent/20 border border-accent/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Calculator size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Calculadora de TR (Inventário de Superfície)
          </h1>
          <p className="text-muted-foreground">
            Converta sua planilha bruta de inventário de campo para o percentual de Trincamento (TR) exigido pela norma DNER-PRO 269/94.
          </p>
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-8 space-y-8">
          
          <div className="space-y-4">
            <Label className="text-lg text-primary">1. Largura da Faixa de Rolamento (metros)</Label>
            <p className="text-sm text-muted-foreground">
              Como cada estaca avaliada tem 20m de extensão, a área total (S) será 20m multiplicada pela largura que você informar abaixo.
            </p>
            <Input 
              type="number" 
              step="0.1" 
              value={laneWidth} 
              onChange={(e) => setLaneWidth(parseFloat(e.target.value) || 0)}
              className="w-32 font-mono"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg text-primary">2. Enviar Planilha de Inventário (.xlsx ou .csv)</Label>
            <p className="text-sm text-muted-foreground">
              O sistema irá ignorar as 5 primeiras linhas e buscar o KM na coluna A e as áreas de defeitos (F2, F3, Panelas e Remendos) nas colunas exatas da sua máscara (I, J, R, V, etc).
            </p>
            
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <input 
                ref={inputRef}
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
              <FileSpreadsheet size={32} className="mx-auto mb-4 text-muted-foreground" />
              {file ? (
                <p className="text-primary font-medium">Arquivo selecionado: {file.name}</p>
              ) : (
                <p className="text-muted-foreground">Clique para procurar a planilha no seu computador</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <Button 
              onClick={processFile} 
              disabled={!file || isProcessing}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Calculator size={16} />
              {isProcessing ? 'Processando...' : 'Calcular TR'}
            </Button>

            {results.length > 0 && (
              <Button onClick={downloadCSV} className="gap-2" variant="outline">
                <Download size={16} />
                Baixar CSV com Resultados
              </Button>
            )}
          </div>

          {results.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mt-4 flex items-start gap-3">
              <AlertTriangle className="text-primary shrink-0" size={20} />
              <p className="text-sm text-foreground">
                Pronto! {results.length} linhas processadas. Clique em "Baixar CSV" e copie a coluna TR gerada para a sua planilha principal do TECNAPAV.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}