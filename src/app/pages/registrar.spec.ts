import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Registrar } from './registrar';
import { LancamentosService } from '../services/lancamentos.service';
import { CadastrosService } from '../services/cadastros.service';
import { Lancamento, Produto } from '../utils/financeiro';

describe('Registrar (integração: tela + regras de produto e serviço)', () => {
  const pomada: Produto = { id: 'p1', nome: 'Pomada', preco_custo: 5, preco_venda: 10, estoque: 8, estoque_minimo: 3 };
  let salvos: Lancamento[];

  async function abrirTela() {
    salvos = [];
    await TestBed.configureTestingModule({
      imports: [Registrar],
      providers: [
        provideRouter([]),
        {
          provide: LancamentosService,
          useValue: { listarDesde: async () => [], registrar: async (l: Lancamento) => { salvos.push(l); } },
        },
        {
          provide: CadastrosService,
          useValue: {
            listarServicos: async () => [{ id: 's1', nome: 'Corte', preco: 50 }],
            listarProdutos: async () => [pomada],
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(Router).navigate = async () => true;
    const fixture = TestBed.createComponent(Registrar);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return fixture;
  }

  it('venda de produto: valor = preço de venda x quantidade, com produto e quantidade salvos', async () => {
    const fixture = await abrirTela();
    const tela = fixture.componentInstance;

    tela.ehProduto.set(true);
    tela.escolherProduto(pomada);
    tela.quantidade = '3';
    tela.preencherValorDoProduto();

    expect(tela.valorTexto).toBe('30,00');

    await tela.salvar();

    expect(salvos[0]).toMatchObject({
      tipo: 'entrada', valor: 30, produto_id: 'p1', quantidade: 3, categoria: 'Pomada',
    });
  });

  it('serviço cadastrado preenche o valor e é salvo com o serviço', async () => {
    const fixture = await abrirTela();
    const tela = fixture.componentInstance;

    tela.escolherServico({ id: 's1', nome: 'Corte', preco: 50 });
    tela.forma.set('credito');
    await tela.salvar();

    expect(salvos[0]).toMatchObject({ valor: 50, forma_pagamento: 'credito', categoria: 'Corte', servico_id: 's1' });
  });
});
