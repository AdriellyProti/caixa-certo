// Regras de negócio do Caixa Certo (funções puras: fáceis de testar)

export type Tipo = 'entrada' | 'saida';
export type FormaPagamento = 'debito' | 'credito' | 'pix' | 'dinheiro';
export type Periodo = 'hoje' | 'semana' | 'mes';

export const FORMAS: FormaPagamento[] = ['debito', 'credito', 'pix', 'dinheiro'];

export const FORMA_ROTULO: Record<FormaPagamento, string> = {
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
};

export interface Lancamento {
  id?: string;
  tipo: Tipo;
  valor: number;
  data: string; // formato AAAA-MM-DD
  forma_pagamento: FormaPagamento;
  categoria: string | null;
  conta_fixa_id?: string | null;
  servico_id?: string | null;
  produto_id?: string | null;
  quantidade?: number; // unidades vendidas ou compradas (produtos)
  custo_unitario?: number | null; // custo do produto no dia da venda (preenchido pelo banco)
}

export interface Servico {
  id?: string;
  nome: string;
  preco: number;
  ativo?: boolean;
}

export interface Produto {
  id?: string;
  nome: string;
  preco_custo: number;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  ativo?: boolean;
}

export interface LucroProduto {
  produto: string;
  quantidade: number;
  vendido: number; // total recebido
  custo: number; // quanto custaram as unidades vendidas
  lucro: number;
}

export interface Resumo {
  entradas: number;
  despesas: number;
  resultado: number; // positivo = lucro, negativo = prejuízo
}

export interface ContaFixa {
  id?: string;
  descricao: string;
  valor: number;
  dia_vencimento: number;
  ativa?: boolean;
}

export type SituacaoConta = 'paga' | 'atrasada' | 'vence_hoje' | 'a_vencer';

// RF05 - soma entradas e despesas e calcula o resultado
export function calcularResumo(lancamentos: Lancamento[]): Resumo {
  let entradas = 0;
  let despesas = 0;

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      entradas += Number(l.valor);
    } else {
      despesas += Number(l.valor);
    }
  }

  return {
    entradas: arredondar(entradas),
    despesas: arredondar(despesas),
    resultado: arredondar(entradas - despesas),
  };
}

// Fechamento do caixa: quanto entrou em cada forma de pagamento
// (é o que o profissional confere com o extrato do banco e da maquininha)
export function entradasPorForma(lancamentos: Lancamento[]): Record<FormaPagamento, number> {
  const totais: Record<FormaPagamento, number> = { debito: 0, credito: 0, pix: 0, dinheiro: 0 };

  for (const l of lancamentos) {
    if (l.tipo === 'entrada') {
      totais[l.forma_pagamento] += Number(l.valor);
    }
  }

  for (const f of FORMAS) {
    totais[f] = arredondar(totais[f]);
  }
  return totais;
}

// Para onde vai o dinheiro: total de despesas por categoria, do maior para o menor
export function despesasPorCategoria(lancamentos: Lancamento[]): { categoria: string; total: number }[] {
  const totais = new Map<string, number>();

  for (const l of lancamentos) {
    if (l.tipo === 'saida') {
      const categoria = l.categoria || 'Sem categoria';
      totais.set(categoria, (totais.get(categoria) ?? 0) + Number(l.valor));
    }
  }

  return [...totais.entries()]
    .map(([categoria, total]) => ({ categoria, total: arredondar(total) }))
    .sort((a, b) => b.total - a.total);
}

// Quanto faturou com cada serviço (entradas que não são venda de produto)
export function faturamentoPorServico(lancamentos: Lancamento[]): { servico: string; total: number; quantidade: number }[] {
  const totais = new Map<string, { total: number; quantidade: number }>();

  for (const l of lancamentos) {
    if (l.tipo === 'entrada' && !l.produto_id) {
      const servico = normalizarCategoria(l.categoria) ?? 'Sem serviço informado';
      const atual = totais.get(servico) ?? { total: 0, quantidade: 0 };
      atual.total += Number(l.valor);
      atual.quantidade += 1;
      totais.set(servico, atual);
    }
  }

  return [...totais.entries()]
    .map(([servico, t]) => ({ servico, total: arredondar(t.total), quantidade: t.quantidade }))
    .sort((a, b) => b.total - a.total);
}

// Lucro de cada produto vendido: (valor da venda) - (custo do dia x quantidade)
// Ex.: pomada comprada a R$ 5 e vendida a R$ 10, 12 unidades -> lucro de R$ 60
export function lucroPorProduto(lancamentos: Lancamento[]): LucroProduto[] {
  const totais = new Map<string, LucroProduto>();

  for (const l of lancamentos) {
    if (l.tipo !== 'entrada' || !l.produto_id) continue;

    const quantidade = Number(l.quantidade ?? 1);
    const atual = totais.get(l.produto_id) ?? {
      produto: l.categoria || 'Produto', quantidade: 0, vendido: 0, custo: 0, lucro: 0,
    };
    atual.quantidade += quantidade;
    atual.vendido += Number(l.valor);
    atual.custo += Number(l.custo_unitario ?? 0) * quantidade;
    totais.set(l.produto_id, atual);
  }

  return [...totais.values()]
    .map((t) => ({
      ...t,
      vendido: arredondar(t.vendido),
      custo: arredondar(t.custo),
      lucro: arredondar(t.vendido - t.custo),
    }))
    .sort((a, b) => b.lucro - a.lucro);
}

// Alerta de estoque: chegou no mínimo (ou abaixo)
export function estoqueBaixo(produto: Produto): boolean {
  return produto.estoque <= produto.estoque_minimo;
}

// Padroniza a categoria: "  produtos  de   limpeza" -> "Produtos de limpeza"
// Evita que "produtos", "Produtos" e "Produtos " virem categorias diferentes
export function normalizarCategoria(texto: string | null | undefined): string | null {
  const limpo = (texto ?? '').trim().replace(/\s+/g, ' ');
  if (!limpo) return null;
  return limpo.charAt(0).toLocaleUpperCase('pt-BR') + limpo.slice(1).toLocaleLowerCase('pt-BR');
}

// Categorias mais usadas de um tipo (para mostrar como sugestão)
export function categoriasMaisUsadas(lancamentos: Lancamento[], tipo: Tipo, limite = 6): string[] {
  const contagem = new Map<string, number>();

  for (const l of lancamentos) {
    const categoria = normalizarCategoria(l.categoria);
    if (l.tipo === tipo && categoria) {
      contagem.set(categoria, (contagem.get(categoria) ?? 0) + 1);
    }
  }

  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, limite)
    .map(([categoria]) => categoria);
}

// Data inicial do período: hoje, segunda-feira da semana ou dia 1 do mês
export function dataInicial(periodo: Periodo, hoje: Date = new Date()): string {
  return intervaloPeriodo(periodo, 0, hoje).inicio;
}

// Intervalo de datas de um período.
// deslocamento: 0 = atual, -1 = anterior (ontem, semana passada, mês passado), -2 ...
export function intervaloPeriodo(
  periodo: Periodo,
  deslocamento = 0,
  hoje: Date = new Date(),
): { inicio: string; fim: string; rotulo: string } {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  if (periodo === 'hoje') {
    base.setDate(base.getDate() + deslocamento);
    const dia = paraISO(base);
    return { inicio: dia, fim: dia, rotulo: dataCurta(dia) };
  }

  if (periodo === 'semana') {
    const voltar = base.getDay() === 0 ? 6 : base.getDay() - 1; // 0 = domingo
    base.setDate(base.getDate() - voltar + deslocamento * 7);
    const fim = new Date(base);
    fim.setDate(fim.getDate() + 6);
    const inicio = paraISO(base);
    const final = paraISO(fim);
    return { inicio, fim: final, rotulo: `${dataCurta(inicio)} a ${dataCurta(final)}` };
  }

  // mês
  const primeiro = new Date(base.getFullYear(), base.getMonth() + deslocamento, 1);
  const ultimo = new Date(primeiro.getFullYear(), primeiro.getMonth() + 1, 0);
  const nomeMes = primeiro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { inicio: paraISO(primeiro), fim: paraISO(ultimo), rotulo: nomeMes };
}

// Situação de uma conta fixa no mês atual
// pagaNoMes: se já existe uma despesa ligada a esta conta neste mês
export function situacaoConta(conta: ContaFixa, pagaNoMes: boolean, hoje: Date = new Date()): SituacaoConta {
  if (pagaNoMes) return 'paga';

  // Conta com vencimento dia 31 vence no último dia em meses mais curtos
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const vencimento = Math.min(conta.dia_vencimento, ultimoDia);

  if (hoje.getDate() > vencimento) return 'atrasada';
  if (hoje.getDate() === vencimento) return 'vence_hoje';
  return 'a_vencer';
}

// Converte uma data para AAAA-MM-DD (horário local, sem erro de fuso)
export function paraISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// "2026-11-08" vira "08/11"
export function dataCurta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Evita erro de casas decimais (ex.: 0.1 + 0.2 = 0.30000000000000004)
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// Converte o que o usuário digitou ("50", "50,00", "1.500,00") em número
export function converterValor(texto: string): number {
  const limpo = texto.replace('R$', '').replace(/\s/g, '');
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : NaN;
}

// Mostra um número no formato digitado pelo usuário: 1500.5 -> "1500,50"
export function valorParaTexto(valor: number): string {
  return Number(valor).toFixed(2).replace('.', ',');
}
