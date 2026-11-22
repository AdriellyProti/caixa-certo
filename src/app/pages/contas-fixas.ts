import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosService } from '../services/cadastros.service';
import { LancamentosService } from '../services/lancamentos.service';
import {
  ContaFixa, converterValor, formatarMoeda, intervaloPeriodo, SituacaoConta, situacaoConta, valorParaTexto,
} from '../utils/financeiro';

const ROTULO_SITUACAO: Record<SituacaoConta, string> = {
  paga: '✓ Paga este mês',
  atrasada: '⚠ Atrasada',
  vence_hoje: '⚠ Vence hoje',
  a_vencer: 'A vencer',
};

@Component({
  selector: 'app-contas-fixas',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <a class="link voltar" routerLink="/inicio">← Voltar</a>
      <h1>Contas fixas</h1>
      <p class="ajuda">Aluguel, luz, internet... Ao registrar o pagamento, a conta vira uma despesa.</p>

      <ul class="lista">
        @for (item of contas(); track item.conta.id) {
          <li>
            <div>
              <strong>{{ item.conta.descricao }}</strong>
              <span class="detalhe">{{ moeda(item.conta.valor) }} · vence dia {{ item.conta.dia_vencimento }}</span>
              <span class="etiqueta" [class.ok]="item.situacao === 'paga'"
                [class.alerta]="item.situacao === 'atrasada'" [class.atencao]="item.situacao === 'vence_hoje'">
                {{ rotulo[item.situacao] }}
              </span>
            </div>
            <div class="acoes-item">
              @if (item.situacao !== 'paga') {
                <a class="acao-texto" routerLink="/registrar" [queryParams]="{ conta: item.conta.id }">Registrar pagamento</a>
              }
              <button type="button" class="acao-texto" (click)="editar(item.conta)">Editar</button>
              <button type="button" class="acao-texto perigo" (click)="remover(item.conta)">Remover</button>
            </div>
          </li>
        } @empty {
          <p>Nenhuma conta fixa cadastrada.</p>
        }
      </ul>

      <form class="card" (ngSubmit)="salvar()">
        <p class="card-titulo">{{ editandoId ? 'Editar conta' : 'Nova conta fixa' }}</p>

        <label for="descricao">Descrição</label>
        <input id="descricao" name="descricao" placeholder="Ex.: Aluguel" [(ngModel)]="descricao" />

        <div class="duas-colunas">
          <div>
            <label for="valor">Valor (R$)</label>
            <input id="valor" name="valor" inputmode="decimal" placeholder="0,00" [(ngModel)]="valor" />
          </div>
          <div>
            <label for="dia">Dia do vencimento</label>
            <input id="dia" name="dia" inputmode="numeric" placeholder="1 a 31" [(ngModel)]="dia" />
          </div>
        </div>

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }

        <button type="submit" class="botao botao-verde" [disabled]="salvando()">
          {{ salvando() ? 'Salvando...' : 'Salvar conta' }}
        </button>
        @if (editandoId) {
          <button type="button" class="link acao-texto" (click)="limpar()">Cancelar edição</button>
        }
      </form>
    </main>
  `,
})
export class ContasFixas implements OnInit {
  private cadastros = inject(CadastrosService);
  private lancamentos = inject(LancamentosService);

  moeda = formatarMoeda;
  rotulo = ROTULO_SITUACAO;

  contas = signal<{ conta: ContaFixa; situacao: SituacaoConta }[]>([]);
  erro = signal('');
  salvando = signal(false);

  editandoId: string | null = null;
  descricao = '';
  valor = '';
  dia = '';

  ngOnInit() {
    this.carregar();
  }

  async carregar() {
    try {
      const mes = intervaloPeriodo('mes');
      const [contas, pagas] = await Promise.all([
        this.cadastros.listarContas(),
        this.lancamentos.contasPagasEntre(mes.inicio, mes.fim),
      ]);
      this.contas.set(contas.map((conta) => ({
        conta,
        situacao: situacaoConta(conta, pagas.has(conta.id ?? '')),
      })));
    } catch (e) {
      console.error('Erro ao carregar contas fixas:', e);
    }
  }

  editar(c: ContaFixa) {
    this.editandoId = c.id ?? null;
    this.descricao = c.descricao;
    this.valor = valorParaTexto(c.valor);
    this.dia = String(c.dia_vencimento);
    this.erro.set('');
  }

  limpar() {
    this.editandoId = null;
    this.descricao = '';
    this.valor = '';
    this.dia = '';
    this.erro.set('');
  }

  async salvar() {
    this.erro.set('');
    const valor = converterValor(this.valor);
    const dia = Number(this.dia);
    if (!this.descricao.trim()) return this.erro.set('Informe a descrição da conta.');
    if (!valor || valor <= 0) return this.erro.set('Informe um valor maior que zero.');
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return this.erro.set('O dia do vencimento deve ser de 1 a 31.');

    this.salvando.set(true);
    try {
      await this.cadastros.salvarConta({
        id: this.editandoId ?? undefined,
        descricao: this.descricao.trim(),
        valor,
        dia_vencimento: dia,
      });
      this.limpar();
      await this.carregar();
    } catch (e) {
      console.error('Erro ao salvar conta fixa:', e);
      this.erro.set('Não foi possível salvar. Tente de novo.');
    } finally {
      this.salvando.set(false);
    }
  }

  async remover(c: ContaFixa) {
    if (!c.id || !confirm(`Remover a conta "${c.descricao}"? Os pagamentos já registrados continuam no resumo.`)) return;
    try {
      await this.cadastros.removerConta(c.id);
      await this.carregar();
    } catch (e) {
      console.error('Erro ao remover conta fixa:', e);
      alert('Não foi possível remover. Tente de novo.');
    }
  }
}
