import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Resumo } from './resumo';
import { LancamentosService } from '../services/lancamentos.service';
import { Lancamento } from '../utils/financeiro';

describe('Resumo (integração: tela + service + regras de cálculo)', () => {
  it('mostra lucro, entradas, despesas e a lista do período', async () => {
    // Arrange: service falso no lugar do Supabase
    const dados: Lancamento[] = [
      { id: '1', tipo: 'entrada', valor: 50, data: '2026-11-13', forma_pagamento: 'pix', categoria: 'Corte' },
      { id: '2', tipo: 'saida', valor: 20, data: '2026-11-13', forma_pagamento: 'dinheiro', categoria: 'Produtos' },
    ];

    await TestBed.configureTestingModule({
      imports: [Resumo],
      providers: [
        provideRouter([]),
        { provide: LancamentosService, useValue: { listarDesde: async () => dados } },
      ],
    }).compileComponents();

    // Act: abre a tela e espera carregar
    const fixture = TestBed.createComponent(Resumo);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    const texto: string = fixture.nativeElement.textContent.replace(/\s+/g, ' ');

    // Assert: o que o usuário vê na tela
    expect(texto).toContain('Lucro ▲ R$ 30,00');
    expect(texto).toContain('Entradas: R$ 50,00');
    expect(texto).toContain('Despesas: R$ 20,00');
    expect(texto).toContain('13/11 · Corte');
    expect(texto).toContain('13/11 · Produtos');
  });
});