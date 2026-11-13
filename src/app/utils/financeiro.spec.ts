import { calcularResumo, converterValor, dataInicial, Lancamento } from './financeiro';

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