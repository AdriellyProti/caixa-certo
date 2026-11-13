import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LancamentosService } from '../services/lancamentos.service';
import {
  calcularResumo, dataInicial, FormaPagamento, formatarMoeda, Lancamento, Periodo,
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

        @if (lista().length === 0) {
          <p>Nenhum lançamento neste período.</p>
        }

        <ul class="lista">
          @for (l of lista(); track l.id) {
            <li>
              <div>
                <strong>{{ dataCurta(l.data) }} · {{ l.categoria || (l.tipo === 'entrada' ? 'Entrada' : 'Despesa') }}</strong>
                <span class="forma">{{ formaRotulo[l.forma_pagamento] }}</span>
              </div>
              <span class="valor" [class.positivo]="l.tipo === 'entrada'" [class.negativo]="l.tipo === 'saida'">
                {{ l.tipo === 'entrada' ? '+' : '−' }} {{ moeda(l.valor) }}
              </span>
            </li>
          }
        </ul>
      }
    </main>
  `,
  styles: [`
    .voltar { text-align: left; margin-top: 0; }
    .periodos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
    .opcao { min-height: 48px; font-size: 16px; border: 2px solid #999; border-radius: 8px; background: #fff; cursor: pointer; }
    .selecionada { border-color: #2E7D32; background: #E8F5E9; color: #1B5E20; font-weight: 600; }
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; }
    .card-titulo { margin: 0; color: #555; }
    .resultado { font-size: 26px; font-weight: 700; margin: 8px 0; }
    .linha { margin: 4px 0; }
    .positivo { color: #2E7D32; }
    .negativo { color: #C62828; }
    .lista { list-style: none; padding: 0; margin: 16px 0 0; }
    .lista li { display: flex; justify-content: space-between; align-items: center; min-height: 56px; border-bottom: 1px solid #eee; gap: 8px; }
    .forma { display: block; font-size: 14px; color: #555; }
    .valor { font-weight: 700; white-space: nowrap; }
  `],
})
export class Resumo implements OnInit {
  private service = inject(LancamentosService);

  periodos: { valor: Periodo; rotulo: string }[] = [
    { valor: 'hoje', rotulo: 'Hoje' },
    { valor: 'semana', rotulo: 'Semana' },
    { valor: 'mes', rotulo: 'Mês' },
  ];

  formaRotulo: Record<FormaPagamento, string> = {
    debito: 'Débito', credito: 'Crédito', pix: 'PIX', dinheiro: 'Dinheiro',
  };

  periodo = signal<Periodo>('semana');
  lista = signal<Lancamento[]>([]);
  carregando = signal(true);
  moeda = formatarMoeda;

  // computed: recalcula sozinho quando a lista muda
  resumo = computed(() => calcularResumo(this.lista()));

  titulo = computed(() =>
    ({ hoje: 'de hoje', semana: 'da semana', mes: 'do mês' })[this.periodo()],
  );

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
    this.carregar();
  }

  async carregar() {
    this.carregando.set(true);
    try {
      this.lista.set(await this.service.listarDesde(dataInicial(this.periodo())));
    } catch (e) {
      console.error('Erro ao carregar o resumo:', e);
    } finally {
      this.carregando.set(false);
    }
  }

  // "2026-11-08" vira "08/11"
  dataCurta(iso: string): string {
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  }
}