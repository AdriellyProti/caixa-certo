import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosService } from '../services/cadastros.service';
import { converterValor, estoqueBaixo, formatarMoeda, Produto, valorParaTexto } from '../utils/financeiro';

@Component({
  selector: 'app-produtos',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <a class="link voltar" routerLink="/inicio">← Voltar</a>
      <h1>Produtos e estoque</h1>
      <p class="ajuda">A venda tira do estoque e a compra soma no estoque automaticamente.</p>

      @if (baixos() > 0) {
        <p class="aviso" role="status">⚠ {{ baixos() }} produto(s) com estoque no mínimo ou abaixo.</p>
      }

      <ul class="lista">
        @for (p of produtos(); track p.id) {
          <li>
            <div>
              <strong>{{ p.nome }}</strong>
              <span class="detalhe">Custo {{ moeda(p.preco_custo) }} · Venda {{ moeda(p.preco_venda) }} · Lucro {{ moeda(p.preco_venda - p.preco_custo) }}</span>
              <span class="etiqueta" [class.alerta]="baixo(p)" [class.ok]="!baixo(p)">
                {{ baixo(p) ? '⚠ Estoque baixo: ' : 'Estoque: ' }}{{ p.estoque }} (mín. {{ p.estoque_minimo }})
              </span>
            </div>
            <div class="acoes-item">
              <a class="acao-texto" routerLink="/registrar" [queryParams]="{ tipo: 'saida', produto: p.id }">Registrar compra</a>
              <button type="button" class="acao-texto" (click)="editar(p)">Editar</button>
              <button type="button" class="acao-texto perigo" (click)="remover(p)">Remover</button>
            </div>
          </li>
        } @empty {
          <p>Nenhum produto cadastrado.</p>
        }
      </ul>

      <form class="card" (ngSubmit)="salvar()">
        <p class="card-titulo">{{ editandoId ? 'Editar produto' : 'Novo produto' }}</p>

        <label for="nome">Nome</label>
        <input id="nome" name="nome" placeholder="Ex.: Pomada" [(ngModel)]="nome" />

        <div class="duas-colunas">
          <div>
            <label for="custo">Custo (R$)</label>
            <input id="custo" name="custo" inputmode="decimal" placeholder="0,00" [(ngModel)]="custo" />
          </div>
          <div>
            <label for="venda">Venda (R$)</label>
            <input id="venda" name="venda" inputmode="decimal" placeholder="0,00" [(ngModel)]="venda" />
          </div>
          <div>
            <label for="estoque">Estoque atual</label>
            <input id="estoque" name="estoque" inputmode="numeric" [(ngModel)]="estoque" />
          </div>
          <div>
            <label for="minimo">Estoque mínimo</label>
            <input id="minimo" name="minimo" inputmode="numeric" [(ngModel)]="minimo" />
          </div>
        </div>

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }

        <button type="submit" class="botao botao-verde" [disabled]="salvando()">
          {{ salvando() ? 'Salvando...' : 'Salvar produto' }}
        </button>
        @if (editandoId) {
          <button type="button" class="link acao-texto" (click)="limpar()">Cancelar edição</button>
        }
      </form>
    </main>
  `,
})
export class Produtos implements OnInit {
  private cadastros = inject(CadastrosService);

  moeda = formatarMoeda;
  baixo = estoqueBaixo;

  produtos = signal<Produto[]>([]);
  baixos = signal(0);
  erro = signal('');
  salvando = signal(false);

  editandoId: string | null = null;
  nome = '';
  custo = '';
  venda = '';
  estoque = '0';
  minimo = '0';

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    try {
      const lista = await this.cadastros.listarProdutos();
      this.produtos.set(lista);
      this.baixos.set(lista.filter(estoqueBaixo).length);
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    }
  }

  editar(p: Produto) {
    this.editandoId = p.id ?? null;
    this.nome = p.nome;
    this.custo = valorParaTexto(p.preco_custo);
    this.venda = valorParaTexto(p.preco_venda);
    this.estoque = String(p.estoque);
    this.minimo = String(p.estoque_minimo);
    this.erro.set('');
  }

  limpar() {
    this.editandoId = null;
    this.nome = '';
    this.custo = '';
    this.venda = '';
    this.estoque = '0';
    this.minimo = '0';
    this.erro.set('');
  }

  async salvar() {
    this.erro.set('');
    const custo = this.custo.trim() ? converterValor(this.custo) : 0;
    const venda = converterValor(this.venda);
    const estoque = Number(this.estoque);
    const minimo = Number(this.minimo);

    if (!this.nome.trim()) return this.erro.set('Informe o nome do produto.');
    if (Number.isNaN(custo) || custo < 0) return this.erro.set('Informe um custo válido.');
    if (!venda || venda <= 0) return this.erro.set('Informe o preço de venda.');
    if (!Number.isInteger(estoque)) return this.erro.set('O estoque deve ser um número inteiro.');
    if (!Number.isInteger(minimo) || minimo < 0) return this.erro.set('O estoque mínimo deve ser um número inteiro.');

    this.salvando.set(true);
    try {
      await this.cadastros.salvarProduto({
        id: this.editandoId ?? undefined,
        nome: this.nome.trim(),
        preco_custo: custo,
        preco_venda: venda,
        estoque,
        estoque_minimo: minimo,
      });
      this.limpar();
      await this.carregar();
    } catch (e) {
      console.error('Erro ao salvar produto:', e);
      this.erro.set('Não foi possível salvar. Tente de novo.');
    } finally {
      this.salvando.set(false);
    }
  }

  async remover(p: Produto) {
    if (!p.id || !confirm(`Remover o produto "${p.nome}"? As vendas antigas continuam no resumo.`)) return;
    try {
      await this.cadastros.removerProduto(p.id);
      await this.carregar();
    } catch (e) {
      console.error('Erro ao remover produto:', e);
      alert('Não foi possível remover. Tente de novo.');
    }
  }
}
