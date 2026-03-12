import { ArrowLeft, BookOpen, Calculator, FileSpreadsheet, Layers } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Help() {
  return (
    <div className="min-h-screen blueprint-bg text-foreground">
      {/* Cabeçalho simples */}
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
            <BookOpen size={32} className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Como o TECNAPAV Funciona?
          </h1>
          <p className="text-xl text-muted-foreground">
            Um guia simples e detalhado para entender o dimensionamento de rodovias.
          </p>
        </div>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-primary">
            <Layers /> 1. A Ideia Principal
          </h2>
          <p className="leading-relaxed">
            Imagine que uma rodovia é como um "colchão" onde passam milhares de caminhões pesados. Com o tempo, esse colchão afunda um pouquinho toda vez que um pneu passa por cima e depois volta ao normal. Esse "afundamento" é o que chamamos de <strong>Deflexão</strong>.
          </p>
          <p className="leading-relaxed">
            Se a rua afunda demais, o asfalto racha (trincas) e cria buracos. O trabalho deste programa é agir como um médico: ele olha o quão "mole" a rua está, qual é a qualidade da terra embaixo dela, e calcula <strong>exatamente quantos centímetros de asfalto novo (CBUQ) precisamos colocar por cima</strong> para que ela não quebre nos próximos anos.
          </p>
        </section>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-primary">
            <FileSpreadsheet /> 2. O que você precisa colocar no programa? (Entrada)
          </h2>
          <p className="leading-relaxed mb-4">
            Para o programa calcular o "remédio" (asfalto novo), você precisa mandar uma planilha (Excel ou CSV) com os "exames" da rodovia. Cada linha da planilha é um ponto da estrada (uma estaca). As colunas essenciais são:
          </p>
          <ul className="space-y-4 pl-4">
            <li className="bg-background p-4 rounded-lg border border-border">
              <strong className="text-accent text-lg">Deflexão (deflection):</strong> É o resultado do exame de campo (feito com uma Viga Benkelman ou FWD). Mostra o quanto o chão afundou naquele ponto.
            </li>
            <li className="bg-background p-4 rounded-lg border border-border">
              <strong className="text-accent text-lg">he (Espessura do Revestimento):</strong> Quantos centímetros de asfalto velho já existem ali.
            </li>
            <li className="bg-background p-4 rounded-lg border border-border">
              <strong className="text-accent text-lg">Hcg (Camada Granular):</strong> Quantos centímetros de brita/cascalho existem debaixo do asfalto velho.
            </li>
            <li className="bg-background p-4 rounded-lg border border-border">
              <strong className="text-accent text-lg">CBR e Silte (S):</strong> São notas dadas para a terra que fica lá no fundo (o subleito). O CBR diz se a terra é dura ou mole, e o Silte diz o tipo de poeira. O programa usa isso para saber se a base é boa ou ruim.
            </li>
          </ul>
        </section>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-primary">
            <Calculator /> 3. Como a "Mágica" da Matemática acontece?
          </h2>
          <p className="leading-relaxed">
            Depois que você aperta "Calcular", o programa pega a sua planilha e faz 5 passos matemáticos para cada pedacinho da rodovia, seguindo a regra oficial do governo (DNER-PRO 269/94):
          </p>

          <div className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-bold">Passo A: Achar o pior cenário (Dc)</h3>
              <p className="text-muted-foreground">O programa calcula a média dos afundamentos e joga uma margem de segurança para cima. Assim, projetamos o asfalto para aguentar o pior ponto do trecho, e não apenas a média.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold">Passo B: Dar uma nota pro solo (Tipos I, II ou III)</h3>
              <p className="text-muted-foreground">Olhando o CBR e o Silte, ele classifica a terra debaixo da rua. Tipo I é excelente (chão firme). Tipo III é ruim (muita argila ou lama). Solo ruim vai pedir mais asfalto.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold">Passo C: Avaliar o asfalto velho (hef)</h3>
              <p className="text-muted-foreground">O asfalto velho está lá, mas já está cansado. O programa calcula o "hef", que significa: "Desses centímetros de asfalto velho que ainda estão lá, quantos centímetros ainda têm alguma utilidade estrutural?".</p>
            </div>

            <div>
              <h3 className="text-lg font-bold">Passo D: O Tráfego Futuro (Fadiga)</h3>
              <p className="text-muted-foreground">Lembra do "Número N" que você digita na tela 2? É a previsão de quantos milhões de caminhões vão passar lá em 10 anos. O programa usa esse número para saber qual é o limite máximo que essa rua pode afundar sem quebrar de vez.</p>
            </div>

            <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary">Passo E: O Resultado Final (HR)</h3>
              <p className="text-foreground">Finalmente, o programa cruza todas as informações acima e cospe o <strong>HR (Espessura de Reforço)</strong>. É o número mágico: "Você precisa jogar exatamente 6 centímetros de asfalto novo aqui em cima".</p>
            </div>
          </div>
        </section>

        <section className="bg-card/50 border border-border rounded-xl p-8 space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-3 text-primary">
            4. Entendendo os Resultados (Soluções)
          </h2>
          <p className="leading-relaxed">
            Depois de calcular o <strong>HR</strong> (os centímetros necessários), o programa vai te dizer qual técnica os engenheiros devem usar na obra:
          </p>
          <ul className="space-y-3 mt-4">
            <li>✅ <strong>Deu 3cm ou menos?</strong> A rua está ótima. Só precisa de uma "pintura" fina (Lama Asfáltica) para fechar os poros.</li>
            <li>✅ <strong>Deu entre 3cm e 12,5cm?</strong> Coloque uma camada normal de asfalto quente (CBUQ). É a solução mais comum.</li>
            <li>⚠️ <strong>Deu entre 12,5cm e 25cm?</strong> A coisa tá feia. Vai precisar de muito material. A solução é misturar uma base de asfalto frio por baixo e CBUQ por cima para não ficar tão caro.</li>
            <li>❌ <strong>Deu mais que 25cm?</strong> O chão está podre. Não adianta jogar asfalto em cima, ele vai afundar. A recomendação é arrancar tudo e reconstruir a rua do zero.</li>
          </ul>
        </section>

      </main>
    </div>
  );
}