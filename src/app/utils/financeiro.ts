// Regras de negócio do Caixa Certo (funções puras: fáceis de testar)

export type Tipo = 'entrada' | 'saida';
export type FormaPagamento = 'debito' | 'credito' | 'pix' | 'dinheiro';
export type Periodo = 'hoje' | 'semana' | 'mes';

export interface Lancamento {
  id?: string;
  tipo: Tipo;
  valor: number;
  data: string; // formato AAAA-MM-DD
  forma_pagamento: FormaPagamento;
  categoria: string | null;
}

export interface Resumo {
  entradas: number;
  despesas: number;
  resultado: number; // positivo = lucro, negativo = prejuízo
}

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

// Data inicial do período: hoje, segunda-feira da semana ou dia 1 do mês
export function dataInicial(periodo: Periodo, hoje: Date = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  if (periodo === 'semana') {
    const diaDaSemana = d.getDay(); // 0 = domingo
    const voltar = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
    d.setDate(d.getDate() - voltar);
  }
  if (periodo === 'mes') {
    d.setDate(1);
  }

  return paraISO(d);
}

// Converte uma data para AAAA-MM-DD (horário local, sem erro de fuso)
export function paraISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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