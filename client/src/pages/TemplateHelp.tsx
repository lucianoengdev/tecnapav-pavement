import { ArrowLeft, TableProperties, FileSpreadsheet, SplitSquareHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function TemplateHelp() {
  return (
    <div className="min-h-screen blueprint-bg text-foreground">
      {/* Cabeçalho */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center h-14">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft size={16} />
              Voltar para o Início
            </Button>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="container max-w-4xl py-10 space-y-12">
        
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 border border-primary/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TableProperties size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Como Preencher as Planilhas?
          </h1>
          <p className="text-xl text-muted-foreground">
            Guia passo a passo para alimentar o sistema sem erros.
          </p>
        </div>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-6">
          <p className="leading-relaxed text-lg">
            O programa aceita arquivos no formato <strong>.CSV</strong> (separado por vírgulas) ou <strong>.XLSX</strong> (Excel). 
            Cada linha da sua planilha representa um ponto da rodovia (geralmente uma estaca a cada 20 metros).
          </p>
          <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
            <p className="text-destructive font-medium">⚠️ Regra de Ouro:</p>
            <p className="text-foreground mt-1">
              Os nomes das colunas na primeira linha (o cabeçalho) devem estar <strong>exatamente</strong> com os nomes em inglês listados abaixo, respeitando letras maiúsculas e minúsculas. Se o nome estiver diferente, o programa não vai reconhecer a coluna.
            </p>
          </div>
        </section>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-primary">
            <FileSpreadsheet /> 1. Template Completo (Arquivo Único)
          </h2>
          <p className="text-muted-foreground">
            Use este modelo se você quiser colocar todos os dados (tanto o exame de deflexão quanto os dados do solo) em uma única tabela.
          </p>
          
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b border-border pb-2">Colunas Necessárias:</h3>
            <ul className="space-y-4">
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">station_id</strong>
                <span className="sm:col-span-3">Nome ou número do ponto/estaca. <em>Ex: "Estaca 01", "Ponto A".</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">station_km</strong>
                <span className="sm:col-span-3">A quilometragem na rodovia (apenas o número). <em>Ex: 10.5</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">deflection</strong>
                <span className="sm:col-span-3">A medida do afundamento do asfalto. <strong>Atenção à unidade:</strong> deve ser em centésimos de milímetro (0,01mm). <em>Ex: se afundou 1mm, digite 100.</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">he</strong>
                <span className="sm:col-span-3">Espessura do asfalto velho existente, em centímetros (cm). <em>Ex: 5</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">Hcg</strong>
                <span className="sm:col-span-3">Espessura da camada de pedra/brita (base granular) que fica sob o asfalto, em centímetros (cm). <em>Ex: 15</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">CBR</strong>
                <span className="sm:col-span-3">Índice de Suporte Califórnia do solo lá no fundo (subleito). Medido em porcentagem. <em>Ex: digite 12 para 12%.</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-border/50 pb-4">
                <strong className="text-accent">S</strong>
                <span className="sm:col-span-3">Porcentagem de silte (areia fina/poeira) no solo (%). <em>Ex: digite 30.</em></span>
              </li>
              <li className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <strong className="text-accent">TR</strong>
                <span className="sm:col-span-3">Porcentagem de trincas na superfície do asfalto atual. Se estiver perfeito é 0. <em>Ex: digite 25 para 25%.</em></span>
              </li>
            </ul>
          </div>
        </section>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-primary">
            <SplitSquareHorizontal /> 2. Arquivos Separados (Deflexões e Estrutura)
          </h2>
          <p className="text-muted-foreground">
            Em obras muito grandes, é comum uma equipe medir o afundamento (deflexão) e outra equipe escavar o chão para ver as camadas (estrutura). Para isso, você pode enviar duas planilhas separadas e o programa junta tudo sozinho usando o <strong>station_id</strong> como chave.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Template Deflexões */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4 text-primary">A) Template Deflexões</h3>
              <p className="text-sm text-muted-foreground mb-4">A planilha com os resultados do ensaio FWD ou Viga Benkelman. Precisa ter apenas 3 colunas:</p>
              <ul className="space-y-3 text-sm">
                <li><strong className="text-accent">station_id:</strong> Nome da estaca (deve ser igual ao da outra planilha).</li>
                <li><strong className="text-accent">station_km:</strong> O km da rodovia.</li>
                <li><strong className="text-accent">deflection:</strong> O afundamento (em 0,01mm).</li>
              </ul>
            </div>

            {/* Template Estrutura */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4 text-primary">B) Template Estrutura</h3>
              <p className="text-sm text-muted-foreground mb-4">A planilha com as sondagens e furos feitos no asfalto. Colunas necessárias:</p>
              <ul className="space-y-3 text-sm">
                <li><strong className="text-accent">station_id:</strong> Nome da estaca (para cruzar com a deflexão).</li>
                <li><strong className="text-accent">station_km:</strong> O km da rodovia.</li>
                <li><strong className="text-accent">he:</strong> Asfalto velho (cm).</li>
                <li><strong className="text-accent">Hcg:</strong> Base de brita (cm).</li>
                <li><strong className="text-accent">CBR:</strong> Resistência do solo (%).</li>
                <li><strong className="text-accent">S:</strong> Silte do solo (%).</li>
                <li><strong className="text-accent">TR:</strong> Trincas no local (%).</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}