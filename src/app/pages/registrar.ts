import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LancamentosService } from '../services/lancamentos.service';
import { CadastrosService } from '../services/cadastros.service';
import {
  categoriasMaisUsadas, converterValor, dataInicial, FORMA_ROTULO, FORMAS,
  FormaPagamento, formatarMoeda, Lancamento, normalizarCategoria, paraISO, Produto, Servico,
  Tipo, valorParaTexto,
} from '../utils/financeiro';

@Component({
  selector: 'app-registrar',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <a class="link voltar" [routerLink]="voltarPara">← Voltar</a>
      <h1>{{ editandoId ? 'Editar lançamento' : 'Novo lançamento' }}</h1>

      <div class="grupo" role="group" aria-label="Tipo de lançamento">
        <button type="button" class="opcao" [class.ativa-entrada]="tipo() === 'entrada'"
          [attr.aria-pressed]="tipo() === 'entrada'" (click)="mudarTipo('entrada')">
          {{ tipo() === 'entrada' ? '✓ ' : '' }}Entrada
        </button>
        <button type="button" class="opcao" [class.ativa-saida]="tipo() === 'saida'"
          [attr.aria-pressed]="tipo() === 'saida'" (click)="mudarTipo('saida')">
          {{ tipo() === 'saida' ? '✓ ' : '' }}Despesa
        </button>
      </div>

      <!-- Serviço/outro ou produto -->
      @if (!contaFixaId) {
        <div class="grupo" role="group" aria-label="O que foi">
          <button type="button" class="opcao" [class.selecionada]="!ehProduto()"
            [attr.aria-pressed]="!ehProduto()" (click)="ehProduto.set(false)">
            {{ !ehProduto() ? '✓ ' : '' }}{{ tipo() === 'entrada' ? 'Serviço' : 'Despesa comum' }}
          </button>
          <button type="button" class="opcao" [class.selecionada]="ehProduto()"
            [attr.aria-pressed]="ehProduto()" (click)="ehProduto.set(true)">
            {{ ehProduto() ? '✓ ' : '' }}{{ tipo() === 'entrada' ? 'Venda de produto' : 'Compra de produto' }}
          </button>
        </div>
      }

      <form (ngSubmit)="salvar()">
        @if (ehProduto()) {
          <p class="rotulo">Produto</p>
          @if (produtos().length === 0) {
            <p class="ajuda">Nenhum produto cadastrado. <a routerLink="/produtos">Cadastrar produtos</a></p>
          }
          <div class="chips" role="group" aria-label="Produto">
            @for (p of produtos(); track p.id) {
              <button type="button" class="chip" [class.selecionada]="produtoId() === p.id"
                [attr.aria-pressed]="produtoId() === p.id" (click)="escolherProduto(p)">
                {{ produtoId() === p.id ? '✓ ' : '' }}{{ p.nome }} ({{ p.estoque }})
              </button>
            }
          </div>
          @if (produtoSelecionado(); as p) {
            <p class="ajuda">
              Estoque: {{ p.estoque }} · Custo {{ moeda(p.preco_custo) }} · Venda {{ moeda(p.preco_venda) }}
            </p>
            @if (tipo() === 'entrada' && p.estoque < quantidadeNumero()) {
              <p class="aviso" role="status">Estoque insuficiente: o app vai registrar mesmo assim e o estoque ficará negativo.</p>
            }
          }

          <label for="quantidade">Quantidade</label>
          <input id="quantidade" name="quantidade" inputmode="numeric" [(ngModel)]="quantidade"
            (ngModelChange)="preencherValorDoProduto()" />
        }

        <label for="valor">{{ tipo() === 'saida' && ehProduto() ? 'Valor total pago (R$)' : 'Valor (R$)' }}</label>
        <input id="valor" name="valor" inputmode="decimal" placeholder="0,00" [(ngModel)]="valorTexto" />

        <p class="rotulo">Forma de pagamento</p>
        <div class="grupo sem-margem" role="group" aria-label="Forma de pagamento">
          @for (f of formas; track f) {
            <button type="button" class="opcao" [class.selecionada]="forma() === f"
              [attr.aria-pressed]="forma() === f" (click)="forma.set(f)">
              {{ forma() === f ? '✓ ' : '' }}{{ formaRotulo[f] }}
            </button>
          }
        </div>

        <label for="data">Data</label>
        <input id="data" type="date" name="data" [(ngModel)]="data" />

        @if (!ehProduto()) {
          <label for="categoria">{{ tipo() === 'entrada' ? 'Serviço' : 'Categoria' }}</label>
          <input id="categoria" name="categoria" [(ngModel)]="categoria"
            [placeholder]="tipo() === 'entrada' ? 'Ex.: Corte' : 'Ex.: Produtos'" />

          @if (tipo() === 'entrada' && servicos().length) {
            <div class="chips" role="group" aria-label="Serviços cadastrados">
              @for (s of servicos(); track s.id) {
                <button type="button" class="chip" [class.selecionada]="mesmaCategoria(s.nome)"
                  (click)="escolherServico(s)">
                  {{ s.nome }} · {{ moeda(s.preco) }}
                </button>
              }
            </div>
          }
          @if (sugestoes().length) {
            <div class="chips" role="group" aria-label="Sugestões">
              @for (c of sugestoes(); track c) {
                <button type="button" class="chip" [class.selecionada]="mesmaCategoria(c)" (click)="categoria = c">
                  {{ c }}
                </button>
              }
            </div>
          }
        }

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }

        <button type="submit" class="botao" [disabled]="salvando()"
          [class.botao-verde]="tipo() === 'entrada'" [class.botao-vermelho]="tipo() === 'saida'">
          {{ salvando() ? 'Salvando...' : 'Salvar' }}
        </button>
      </form>
    </main>
  `,
  styles: [`
    .ativa-entrada { border-color: #2E7D32; background: #E8F5E9; color: #1B5E20; font-weight: 600; }
    .ativa-saida { border-color: #C62828; background: #FFEBEE; color: #B71C1C; font-weight: 600; }
  `],
})
export class Registrar implements OnInit {
  private service = inject(LancamentosService);
  private cadastros = inject(CadastrosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  formas = FORMAS;
  formaRotulo = FORMA_ROTULO;
  moeda = formatarMoeda;

  tipo = signal<Tipo>('entrada');
  forma = signal<FormaPagamento>('pix');
  ehProduto = signal(false);
  produtoId = signal<string | null>(null);
  valorTexto = '';
  quantidade = '1';
  data = paraISO(new Date());
  categoria = '';
  erro = signal('');
  salvando = signal(false);

  editandoId: string | null = null;
  contaFixaId: string | null = null;
  voltarPara = '/inicio';

  servicos = signal<Servico[]>([]);
  produtos = signal<Produto[]>([]);
  private recentes = signal<Lancamento[]>([]);

  produtoSelecionado = computed(() => this.produtos().find((p) => p.id === this.produtoId()) ?? null);

  // Categorias mais usadas, sem repetir os serviços cadastrados
  sugestoes = computed(() => {
    const nomesServicos = new Set(this.servicos().map((s) => normalizarCategoria(s.nome)));
    return categoriasMaisUsadas(this.recentes().filter((l) => !l.produto_id), this.tipo())
      .filter((c) => !nomesServicos.has(c));
  });

  async ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('tipo') === 'saida') this.tipo.set('saida');

    try {
      const [servicos, produtos, recentes] = await Promise.all([
        this.cadastros.listarServicos(),
        this.cadastros.listarProdutos(),
        this.service.listarDesde(this.noventaDiasAtras()),
      ]);
      this.servicos.set(servicos);
      this.produtos.set(produtos);
      this.recentes.set(recentes);
    } catch (e) {
      console.error('Erro ao carregar cadastros:', e);
    }

    // Editar um lançamento existente (vem do Resumo)
    const id = params.get('id');
    if (id) {
      this.voltarPara = '/resumo';
      await this.carregarParaEdicao(id);
    }

    // Pagar uma conta fixa (vem da tela Contas fixas)
    const contaId = params.get('conta');
    if (contaId) {
      this.voltarPara = '/contas-fixas';
      await this.carregarConta(contaId);
    }

    // Compra de um produto (vem da tela Produtos)
    const produtoId = params.get('produto');
    if (produtoId) {
      this.voltarPara = '/produtos';
      const produto = this.produtos().find((p) => p.id === produtoId);
      if (produto) {
        this.ehProduto.set(true);
        this.escolherProduto(produto);
      }
    }
  }

  mudarTipo(tipo: Tipo) {
    this.tipo.set(tipo);
    this.preencherValorDoProduto();
  }

  escolherServico(s: Servico) {
    this.categoria = s.nome;
    this.valorTexto = valorParaTexto(s.preco);
  }

  escolherProduto(p: Produto) {
    this.produtoId.set(p.id ?? null);
    this.preencherValorDoProduto();
  }

  // Venda: preço de venda x quantidade | Compra: preço de custo x quantidade
  preencherValorDoProduto() {
    const p = this.produtoSelecionado();
    if (!this.ehProduto() || !p) return;
    const preco = this.tipo() === 'entrada' ? p.preco_venda : p.preco_custo;
    const total = Number(preco) * this.quantidadeNumero();
    if (total > 0) {
      this.valorTexto = valorParaTexto(total);
    }
  }

  quantidadeNumero(): number {
    const n = Number(this.quantidade);
    return Number.isInteger(n) && n > 0 ? n : 0;
  }

  mesmaCategoria(nome: string): boolean {
    return normalizarCategoria(this.categoria) === normalizarCategoria(nome);
  }

  async salvar() {
    this.erro.set('');
    const valor = converterValor(this.valorTexto);
    const produto = this.produtoSelecionado();

    // Validação no cliente (RNF02); o banco valida de novo com o check
    if (!valor || valor <= 0) {
      this.erro.set('Informe um valor maior que zero.');
      return;
    }
    if (!this.data) {
      this.erro.set('Informe a data.');
      return;
    }
    if (this.ehProduto() && !produto) {
      this.erro.set('Escolha o produto.');
      return;
    }
    if (this.ehProduto() && this.quantidadeNumero() === 0) {
      this.erro.set('Informe a quantidade (número inteiro maior que zero).');
      return;
    }
    if (!this.ehProduto() && this.tipo() === 'saida' && !normalizarCategoria(this.categoria)) {
      this.erro.set('Informe a categoria da despesa.');
      return;
    }

    const lancamento = this.montarLancamento(valor, produto);

    this.salvando.set(true);
    try {
      if (this.editandoId) {
        await this.service.atualizar(this.editandoId, lancamento);
      } else {
        await this.service.registrar(lancamento);
      }
      this.router.navigate([this.voltarPara]);
    } catch (e) {
      console.error('Erro ao salvar lançamento:', e);
      this.erro.set('Não foi possível salvar. Tente de novo.');
    } finally {
      this.salvando.set(false);
    }
  }

  private montarLancamento(valor: number, produto: Produto | null): Lancamento {
    const base: Lancamento = {
      tipo: this.tipo(),
      valor,
      data: this.data,
      forma_pagamento: this.forma(),
      categoria: null,
      conta_fixa_id: this.contaFixaId,
      servico_id: null,
      produto_id: null,
      quantidade: 1,
    };

    if (this.ehProduto() && produto) {
      return {
        ...base,
        produto_id: produto.id ?? null,
        quantidade: this.quantidadeNumero(),
        categoria: this.tipo() === 'entrada' ? produto.nome : 'Compra de produtos',
      };
    }

    const categoria = normalizarCategoria(this.categoria);
    const servico = this.tipo() === 'entrada'
      ? this.servicos().find((s) => normalizarCategoria(s.nome) === categoria)
      : undefined;
    return { ...base, categoria, servico_id: servico?.id ?? null };
  }

  private async carregarParaEdicao(id: string) {
    try {
      const l = await this.service.buscar(id);
      this.editandoId = id;
      this.tipo.set(l.tipo);
      this.forma.set(l.forma_pagamento);
      this.valorTexto = valorParaTexto(l.valor);
      this.data = l.data;
      this.contaFixaId = l.conta_fixa_id ?? null;
      if (l.produto_id) {
        this.ehProduto.set(true);
        this.produtoId.set(l.produto_id);
        this.quantidade = String(l.quantidade ?? 1);
      } else {
        this.categoria = l.categoria ?? '';
      }
    } catch (e) {
      console.error('Erro ao carregar lançamento:', e);
      this.erro.set('Não foi possível carregar este lançamento.');
    }
  }

  private async carregarConta(id: string) {
    try {
      const conta = await this.cadastros.buscarConta(id);
      this.contaFixaId = id;
      this.tipo.set('saida');
      this.categoria = normalizarCategoria(conta.descricao) ?? '';
      this.valorTexto = valorParaTexto(conta.valor);
    } catch (e) {
      console.error('Erro ao carregar conta fixa:', e);
    }
  }

  private noventaDiasAtras(): string {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return dataInicial('hoje', d);
  }
}
