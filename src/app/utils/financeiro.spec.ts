import {
  calcularResumo, categoriasMaisUsadas, converterValor, dataInicial,
  despesasPorCategoria, entradasPorForma, intervaloPeriodo, Lancamento, normalizarCategoria,
  situacaoConta, faturamentoPorServico, lucroPorProduto, estoqueBaixo,
} from './financeiro';

describe('calcularResumo', () => {
  it('calcula lucro quando as entradas são maiores que as despesas', () => {
    // Arrange (preparar)
    const lancamentos: Lancamento[] = [
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Corte' },
      { tipo: 'saida', valor: 20, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Produtos' },
    ];

    // Act (executar)
    const resumo = calcularResumo(lancamentos);

    // Assert (verificar)
    expect(resumo).toEqual({ entradas: 50, despesas: 20, resultado: 30 });
  });

  it('calcula prejuízo quando as despesas são maiores', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'entrada', valor: 30, data: '2026-11-13', forma_pagamento: 'dinheiro', categoria: null },
      { tipo: 'saida', valor: 100, data: '2026-11-13', forma_pagamento: 'debito', categoria: 'Aluguel' },
    ];

    const resumo = calcularResumo(lancamentos);

    expect(resumo.resultado).toBe(-70);
  });

  it('retorna zero quando não há lançamentos', () => {
    const resumo = calcularResumo([]);

    expect(resumo).toEqual({ entradas: 0, despesas: 0, resultado: 0 });
  });

  it('evita erro de ponto flutuante (0.1 + 0.2)', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'entrada', valor: 0.1, data: '2026-11-13', forma_pagamento: 'pix', categoria: null },
      { tipo: 'entrada', valor: 0.2, data: '2026-11-13', forma_pagamento: 'pix', categoria: null },
    ];

    const resumo = calcularResumo(lancamentos);

    expect(resumo.entradas).toBe(0.3);
  });
});

describe('dataInicial', () => {
  const quintaFeira = new Date(2026, 10, 12); // 12/11/2026 (mês começa em 0)

  it('hoje: retorna a própria data', () => {
    expect(dataInicial('hoje', quintaFeira)).toBe('2026-11-12');
  });

  it('semana: retorna a segunda-feira da semana', () => {
    expect(dataInicial('semana', quintaFeira)).toBe('2026-11-09');
  });

  it('semana: no domingo, volta para a segunda-feira anterior', () => {
    const domingo = new Date(2026, 10, 15);
    expect(dataInicial('semana', domingo)).toBe('2026-11-09');
  });

  it('mês: retorna o dia 1', () => {
    expect(dataInicial('mes', quintaFeira)).toBe('2026-11-01');
  });
});

describe('converterValor', () => {
  it('aceita número inteiro', () => {
    expect(converterValor('50')).toBe(50);
  });

  it('aceita vírgula como separador decimal', () => {
    expect(converterValor('50,00')).toBe(50);
  });

  it('aceita ponto de milhar com vírgula decimal', () => {
    expect(converterValor('1.500,50')).toBe(1500.5);
  });

  it('retorna NaN para texto inválido', () => {
    expect(converterValor('abc')).toBeNaN();
  });
});

describe('entradasPorForma', () => {
  it('soma só as entradas, separadas por forma de pagamento', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: null },
      { tipo: 'entrada', valor: 30, data: '2026-11-13', forma_pagamento: 'pix', categoria: null },
      { tipo: 'entrada', valor: 40, data: '2026-11-13', forma_pagamento: 'credito', categoria: null },
      { tipo: 'saida', valor: 99, data: '2026-11-13', forma_pagamento: 'dinheiro', categoria: 'Produtos' },
    ];

    expect(entradasPorForma(lancamentos)).toEqual({ debito: 0, credito: 40, pix: 80, dinheiro: 0 });
  });
});

describe('despesasPorCategoria', () => {
  it('agrupa as despesas e ordena da maior para a menor', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'saida', valor: 20, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Produtos' },
      { tipo: 'saida', valor: 900, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Aluguel' },
      { tipo: 'saida', valor: 15, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Produtos' },
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Corte' },
    ];

    expect(despesasPorCategoria(lancamentos)).toEqual([
      { categoria: 'Aluguel', total: 900 },
      { categoria: 'Produtos', total: 35 },
    ]);
  });
});


describe('normalizarCategoria', () => {
  it('tira espaços extras e padroniza maiúsculas', () => {
    expect(normalizarCategoria('  produtos   de LIMPEZA ')).toBe('Produtos de limpeza');
  });

  it('retorna null para texto vazio', () => {
    expect(normalizarCategoria('   ')).toBeNull();
  });
});

describe('categoriasMaisUsadas', () => {
  it('junta variações da mesma categoria e ordena pelas mais usadas', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'corte' },
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Corte ' },
      { tipo: 'entrada', valor: 30, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Barba' },
      { tipo: 'saida', valor: 20, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Produtos' },
    ];

    expect(categoriasMaisUsadas(lancamentos, 'entrada')).toEqual(['Corte', 'Barba']);
  });
});

describe('intervaloPeriodo', () => {
  const quintaFeira = new Date(2026, 10, 12);

  it('dia anterior', () => {
    expect(intervaloPeriodo('hoje', -1, quintaFeira)).toEqual({ inicio: '2026-11-11', fim: '2026-11-11', rotulo: '11/11' });
  });

  it('semana atual vai de segunda a domingo', () => {
    expect(intervaloPeriodo('semana', 0, quintaFeira)).toEqual({ inicio: '2026-11-09', fim: '2026-11-15', rotulo: '09/11 a 15/11' });
  });

  it('mês anterior', () => {
    const r = intervaloPeriodo('mes', -1, quintaFeira);
    expect(r.inicio).toBe('2026-10-01');
    expect(r.fim).toBe('2026-10-31');
    expect(r.rotulo).toContain('outubro');
  });

  it('mês anterior a partir de janeiro volta para dezembro do ano passado', () => {
    const r = intervaloPeriodo('mes', -1, new Date(2027, 0, 20));
    expect(r.inicio).toBe('2026-12-01');
    expect(r.fim).toBe('2026-12-31');
  });
});

describe('situacaoConta', () => {
  const conta = { descricao: 'Aluguel', valor: 900, dia_vencimento: 10 };

  it('paga quando já foi registrada no mês', () => {
    expect(situacaoConta(conta, true, new Date(2026, 10, 20))).toBe('paga');
  });

  it('atrasada depois do vencimento', () => {
    expect(situacaoConta(conta, false, new Date(2026, 10, 11))).toBe('atrasada');
  });

  it('vence hoje no dia do vencimento', () => {
    expect(situacaoConta(conta, false, new Date(2026, 10, 10))).toBe('vence_hoje');
  });

  it('a vencer antes do vencimento', () => {
    expect(situacaoConta(conta, false, new Date(2026, 10, 5))).toBe('a_vencer');
  });

  it('vencimento dia 31 em fevereiro vale para o último dia do mês', () => {
    const conta31 = { ...conta, dia_vencimento: 31 };
    expect(situacaoConta(conta31, false, new Date(2027, 1, 28))).toBe('vence_hoje');
  });
});

describe('faturamentoPorServico', () => {
  it('soma as entradas de cada serviço e ignora vendas de produto', () => {
    const lancamentos: Lancamento[] = [
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Corte' },
      { tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'corte' },
      { tipo: 'entrada', valor: 30, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Barba' },
      { tipo: 'entrada', valor: 10, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Pomada', produto_id: 'p1' },
    ];

    expect(faturamentoPorServico(lancamentos)).toEqual([
      { servico: 'Corte', total: 100, quantidade: 2 },
      { servico: 'Barba', total: 30, quantidade: 1 },
    ]);
  });
});

describe('lucroPorProduto', () => {
  it('calcula o lucro usando o custo do dia de cada venda', () => {
    const lancamentos: Lancamento[] = [
      // 2 pomadas a R$ 10, custo R$ 5 cada
      { tipo: 'entrada', valor: 20, quantidade: 2, custo_unitario: 5, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Pomada', produto_id: 'p1' },
      // 1 pomada depois que o custo subiu para R$ 6
      { tipo: 'entrada', valor: 10, quantidade: 1, custo_unitario: 6, data: '2026-11-20', forma_pagamento: 'pix', categoria: 'Pomada', produto_id: 'p1' },
      // 3 cervejas a R$ 8, custo R$ 3,50
      { tipo: 'entrada', valor: 24, quantidade: 3, custo_unitario: 3.5, data: '2026-11-13', forma_pagamento: 'dinheiro', categoria: 'Cerveja', produto_id: 'p2' },
      // compra de estoque não entra no lucro por produto
      { tipo: 'saida', valor: 50, quantidade: 10, data: '2026-11-10', forma_pagamento: 'pix', categoria: 'Compra de produtos', produto_id: 'p1' },
    ];

    expect(lucroPorProduto(lancamentos)).toEqual([
      { produto: 'Cerveja', quantidade: 3, vendido: 24, custo: 10.5, lucro: 13.5 },
      { produto: 'Pomada', quantidade: 3, vendido: 30, custo: 16, lucro: 14 },
    ].sort((a, b) => b.lucro - a.lucro));
  });
});

describe('estoqueBaixo', () => {
  const pomada = { nome: 'Pomada', preco_custo: 5, preco_venda: 10, estoque: 3, estoque_minimo: 3 };

  it('alerta quando o estoque chega no mínimo', () => {
    expect(estoqueBaixo(pomada)).toBe(true);
  });

  it('não alerta quando está acima do mínimo', () => {
    expect(estoqueBaixo({ ...pomada, estoque: 4 })).toBe(false);
  });
});
