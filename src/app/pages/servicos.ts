import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosService } from '../services/cadastros.service';
import { converterValor, formatarMoeda, Servico, valorParaTexto } from '../utils/financeiro';

@Component({
  selector: 'app-servicos',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <a class="link voltar" routerLink="/inicio">← Voltar</a>
      <h1>Serviços</h1>
      <p class="ajuda">Os serviços aparecem como atalho ao registrar uma entrada, já com o preço.</p>

      <ul class="lista">
        @for (s of servicos(); track s.id) {
          <li>
            <div>
              <strong>{{ s.nome }}</strong>
              <span class="detalhe">{{ moeda(s.preco) }}</span>
            </div>
            <div class="acoes-item">
              <button type="button" class="acao-texto" (click)="editar(s)">Editar</button>
              <button type="button" class="acao-texto perigo" (click)="remover(s)">Remover</button>
            </div>
          </li>
        } @empty {
          <p>Nenhum serviço cadastrado.</p>
        }
      </ul>

      <form class="card" (ngSubmit)="salvar()">
        <p class="card-titulo">{{ editandoId ? 'Editar serviço' : 'Novo serviço' }}</p>

        <label for="nome">Nome</label>
        <input id="nome" name="nome" placeholder="Ex.: Corte" [(ngModel)]="nome" />

        <label for="preco">Preço (R$)</label>
        <input id="preco" name="preco" inputmode="decimal" placeholder="0,00" [(ngModel)]="preco" />

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }

        <button type="submit" class="botao botao-verde" [disabled]="salvando()">
          {{ salvando() ? 'Salvando...' : 'Salvar serviço' }}
        </button>
        @if (editandoId) {
          <button type="button" class="link acao-texto" (click)="limpar()">Cancelar edição</button>
        }
      </form>
    </main>
  `,
})
export class Servicos implements OnInit {
  private cadastros = inject(CadastrosService);

  moeda = formatarMoeda;
  servicos = signal<Servico[]>([]);
  erro = signal('');
  salvando = signal(false);

  editandoId: string | null = null;
  nome = '';
  preco = '';

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    try {
      this.servicos.set(await this.cadastros.listarServicos());
    } catch (e) {
      console.error('Erro ao carregar serviços:', e);
    }
  }

  editar(s: Servico) {
    this.editandoId = s.id ?? null;
    this.nome = s.nome;
    this.preco = valorParaTexto(s.preco);
    this.erro.set('');
  }

  limpar() {
    this.editandoId = null;
    this.nome = '';
    this.preco = '';
    this.erro.set('');
  }

  async salvar() {
    this.erro.set('');
    const preco = converterValor(this.preco);
    if (!this.nome.trim()) return this.erro.set('Informe o nome do serviço.');
    if (!preco || preco <= 0) return this.erro.set('Informe um preço maior que zero.');

    this.salvando.set(true);
    try {
      await this.cadastros.salvarServico({ id: this.editandoId ?? undefined, nome: this.nome.trim(), preco });
      this.limpar();
      await this.carregar();
    } catch (e) {
      console.error('Erro ao salvar serviço:', e);
      this.erro.set('Não foi possível salvar. Tente de novo.');
    } finally {
      this.salvando.set(false);
    }
  }

  async remover(s: Servico) {
    if (!s.id || !confirm(`Remover o serviço "${s.nome}"? As entradas antigas continuam no resumo.`)) return;
    try {
      await this.cadastros.removerServico(s.id);
      await this.carregar();
    } catch (e) {
      console.error('Erro ao remover serviço:', e);
      alert('Não foi possível remover. Tente de novo.');
    }
  }
}
