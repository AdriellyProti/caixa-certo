import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LancamentosService } from '../services/lancamentos.service';
import {
  calcularResumo, dataCurta, despesasPorCategoria, entradasPorForma, FORMA_ROTULO, FORMAS,
  faturamentoPorServico, formatarMoeda, intervaloPeriodo, Lancamento, lucroPorProduto, Periodo,
} from '../utils/financeiro';

@Component({
  selector: 'app-resumo',
  imports: [RouterLink],
  template: `
    <main class="tela">
      <a class="link voltar" routerLink="/inicio">← Voltar</a>
      <h1>Resumo do período</h1>

      <div class="periodos" role="group" aria-label="Período">
        @for (p of periodos; track p.valor) {
          <button type="button" class="opcao" [class.selecionada]="periodo() === p.valor"
            [attr.aria-pressed]="periodo() === p.valor" (click)="mudarPeriodo(p.valor)">
            {{ periodo() === p.valor ? '✓ ' : '' }}{{ p.rotulo }}
          </button>
        }
      </div>

      <!-- Navegar para períodos anteriores -->
      <div class="navegacao">
        <button type="button" class="opcao seta" (click)="navegar(-1)" aria-label="Período anterior">‹</button>
        <span class="intervalo" aria-live="polite">{{ intervalo().rotulo }}</span>
        <button type="button" class="opcao seta" (click)="navegar(1)" [disabled]="deslocamento() === 0"
          aria-label="Próximo período">›</button>
      </div>

      @if (carregando()) {
        <p>Carregando...</p>
      } @else {
        <section class="card">
          <p class="card-titulo">Resultado {{ titulo() }}</p>
          <p class="resultado" [class.positivo]="resumo().resultado > 0" [class.negativo]="resumo().resultado < 0">
            {{ situacao() }} {{ moeda(resumo().resultado) }}
          </p>
          <p class="linha">Entradas: {{ moeda(resumo().entradas) }}</p>
          <p class="linha">Despesas: {{ moeda(resumo().despesas) }}</p>
        </section>

        @if (resumo().entradas > 0) {
          <section class="card" aria-label="Entradas por forma de pagamento">
            <p class="card-titulo">Fechamento do caixa</p>
            @for (f of formas; track f) {
              <p class="linha"><span>{{ formaRotulo[f] }}</span><span>{{ moeda(porForma()[f]) }}</span></p>
            }
          </section>
        }

        @if (servicos().length) {
          <section class="card" aria-label="Faturamento por serviço">
            <p class="card-titulo">Serviços</p>
            @for (s of servicos(); track s.servico) {
              <p class="linha"><span>{{ s.servico }} ({{ s.quantidade }}x)</span><span>{{ moeda(s.total) }}</span></p>
            }
          </section>
        }

        @if (produtos().length) {
          <section class="card" aria-label="Lucro por produto">
            <p class="card-titulo">Lucro por produto</p>
            @for (p of produtos(); track p.produto) {
              <div class="produto">
                <p class="linha">
                  <strong>{{ p.produto }} ({{ p.quantidade }} un.)</strong>
                  <strong [class.positivo]="p.lucro > 0" [class.negativo]="p.lucro < 0">
                    {{ p.lucro >= 0 ? '+' : '−' }} {{ moeda(abs(p.lucro)) }}
                  </strong>
                </p>
                <span class="detalhe">Vendido {{ moeda(p.vendido) }} · Custo {{ moeda(p.custo) }}</span>
              </div>
            }
          </section>
        }

        @if (categorias().length) {
          <section class="card" aria-label="Despesas por categoria">
            <p class="card-titulo">Para onde foi o dinheiro</p>
            @for (c of categorias(); track c.categoria) {
              <p class="linha"><span>{{ c.categoria }}</span><span>{{ moeda(c.total) }}</span></p>
            }
          </section>
        }

        @if (lista().length === 0) {
          <p>Nenhum lançamento neste período.</p>
        } @else {
          <h2>Lançamentos</h2>
        }

        <ul class="lista">
          @for (l of lista(); track l.id) {
            <li>
              <div>
                <strong>{{ dataCurta(l.data) }} · {{ descricao(l) }}</strong>
                <span class="detalhe">{{ formaRotulo[l.forma_pagamento] }}</span>
              </div>
              <div class="acoes-item">
                <span class="valor" [class.positivo]="l.tipo === 'entrada'" [class.negativo]="l.tipo === 'saida'">
                  {{ l.tipo === 'entrada' ? '+' : '−' }} {{ moeda(l.valor) }}
                </span>
                <span>
                  <a class="acao-texto" routerLink="/registrar" [queryParams]="{ id: l.id }"
                    [attr.aria-label]="'Editar lançamento de ' + dataCurta(l.data) + ' no valor de ' + moeda(l.valor)">Editar</a>
                  <button type="button" class="acao-texto perigo" (click)="excluir(l)"
                    [attr.aria-label]="'Excluir lançamento de ' + dataCurta(l.data) + ' no valor de ' + moeda(l.valor)">
                    Excluir
                  </button>
                </span>
              </div>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [`
    .periodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0 8px; }
    .periodos .selecionada { border-color: #2E7D32; background: #E8F5E9; color: #1B5E20; }
    .navegacao { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .seta { width: 48px; font-size: 22px; }
    .seta:disabled { opacity: 0.35; cursor: default; }
    .intervalo { font-weight: 600; text-transform: capitalize; }
    .resultado { font-size: 26px; font-weight: 700; margin: 8px 0; }
    .produto { padding: 4px 0 8px; border-bottom: 1px solid #eee; }
    .valor { font-weight: 700; white-space: nowrap; }
    h2 { font-size: 18px; margin: 24px 0 0; }
    a.acao-texto { display: inline-flex; align-items: center; }
  `],
})
export class Resumo implements OnInit {
  private service = inject(LancamentosService);

  periodos: { valor: Periodo; rotulo: string }[] = [
    { valor: 'hoje', rotulo: 'Dia' },
    { valor: 'semana', rotulo: 'Semana' },
    { valor: 'mes', rotulo: 'Mês' },
  ];

  formas = FORMAS;
  formaRotulo = FORMA_ROTULO;
  moeda = formatarMoeda;
  dataCurta = dataCurta;
  abs = Math.abs;

  periodo = signal<Periodo>('semana');
  deslocamento = signal(0); // 0 = atual, -1 = anterior...
  lista = signal<Lancamento[]>([]);
  carregando = signal(true);

  // computed: recalcula sozinho quando a lista muda
  intervalo = computed(() => intervaloPeriodo(this.periodo(), this.deslocamento()));
  resumo = computed(() => calcularResumo(this.lista()));
  porForma = computed(() => entradasPorForma(this.lista()));
  servicos = computed(() => faturamentoPorServico(this.lista()));
  produtos = computed(() => lucroPorProduto(this.lista()));
  categorias = computed(() => despesasPorCategoria(this.lista()));

  titulo = computed(() => {
    if (this.deslocamento() !== 0) return 'do período';
    return ({ hoje: 'de hoje', semana: 'da semana', mes: 'do mês' })[this.periodo()];
  });

  // Acessibilidade: texto + símbolo + cor
  situacao = computed(() => {
    const r = this.resumo().resultado;
    if (r > 0) return 'Lucro ▲';
    if (r < 0) return 'Prejuízo ▼';
    return 'Sem lucro';
  });

  ngOnInit() {
    this.carregar();
  }

  mudarPeriodo(p: Periodo) {
    this.periodo.set(p);
    this.deslocamento.set(0);
    this.carregar();
  }

  navegar(passo: number) {
    this.deslocamento.update((d) => Math.min(0, d + passo));
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      const { inicio, fim } = this.intervalo();
      this.lista.set(await this.service.listarEntre(inicio, fim));
    } catch (e) {
      console.error('Erro ao carregar o resumo:', e);
    } finally {
      this.carregando.set(false);
    }
  }

  descricao(l: Lancamento): string {
    const nome = l.categoria || (l.tipo === 'entrada' ? 'Entrada' : 'Despesa');
    return l.produto_id && (l.quantidade ?? 1) > 1 ? `${nome} (${l.quantidade} un.)` : nome;
  }

  // Ajuste da validação 1: pede confirmação para evitar exclusão sem querer
  async excluir(l: Lancamento) {
    if (!l.id) return;
    const aviso = l.produto_id ? ' O estoque do produto será ajustado.' : '';
    if (!confirm(`Excluir este lançamento de ${this.moeda(l.valor)}?${aviso}`)) return;

    try {
      await this.service.excluir(l.id);
      // Tira da lista; o resumo (computed) recalcula sozinho
      this.lista.update((atual) => atual.filter((item) => item.id !== l.id));
    } catch (e) {
      console.error('Erro ao excluir lançamento:', e);
      alert('Não foi possível excluir. Tente de novo.');
    }
  }
}
