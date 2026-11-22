import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { LancamentosService } from '../services/lancamentos.service';
import { CadastrosService } from '../services/cadastros.service';
import {
  calcularResumo, dataInicial, estoqueBaixo, formatarMoeda, intervaloPeriodo, situacaoConta,
} from '../utils/financeiro';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <main class="tela">
      <h1>Caixa Certo</h1>
      <p>Olá, {{ nomeNegocio() }}</p>

      <section class="card" aria-label="Saldo de hoje">
        <p class="card-titulo">Saldo de hoje</p>
        @if (carregando()) {
          <p>Carregando...</p>
        } @else {
          <p class="saldo" [class.positivo]="saldo() > 0" [class.negativo]="saldo() < 0">
            {{ simbolo() }} {{ moeda(saldo()) }}
          </p>
        }
      </section>

      <a class="botao botao-verde acao" routerLink="/registrar" [queryParams]="{ tipo: 'entrada' }">
        + Registrar entrada
      </a>
      <a class="botao botao-vermelho acao" routerLink="/registrar" [queryParams]="{ tipo: 'saida' }">
        − Registrar despesa
      </a>
      <a class="botao botao-contorno acao" routerLink="/resumo">Ver resumo</a>

      <!-- Alertas: estoque baixo e contas fixas pendentes -->
      @if (estoqueBaixoQtd() > 0) {
        <a class="aviso alerta-link" routerLink="/produtos">
          ⚠ {{ estoqueBaixoQtd() }} produto(s) com estoque baixo
        </a>
      }
      @if (contasPendentes() > 0) {
        <a class="aviso alerta-link" routerLink="/contas-fixas">
          ⚠ {{ contasPendentes() }} conta(s) fixa(s) vencida(s) ou vencendo hoje
        </a>
      }

      <nav class="menu" aria-label="Cadastros">
        <a class="opcao item-menu" routerLink="/servicos">Serviços</a>
        <a class="opcao item-menu" routerLink="/produtos">Produtos e estoque</a>
        <a class="opcao item-menu" routerLink="/contas-fixas">Contas fixas</a>
      </nav>

      <button class="link sair" type="button" (click)="sair()">Sair</button>
    </main>
  `,
  styles: [`
    .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin: 16px 0 8px; }
    .card-titulo { margin: 0; color: #555; }
    .saldo { font-size: 28px; font-weight: 700; margin: 8px 0 0; }
    .positivo { color: #2E7D32; }
    .negativo { color: #C62828; }
    .acao { text-align: center; line-height: 48px; text-decoration: none; }
    .alerta-link { display: block; color: #1a1a1a; text-decoration: none; min-height: 44px; }
    .menu { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 24px; }
    .item-menu { display: flex; align-items: center; justify-content: center; text-align: center; padding: 4px 8px; text-decoration: none; color: #1a1a1a; }
    .sair { width: 100%; background: none; border: none; font-size: 16px; text-decoration: underline; cursor: pointer; }
  `],
})
export class Inicio implements OnInit {
  private supabase = inject(SupabaseService);
  private lancamentos = inject(LancamentosService);
  private cadastros = inject(CadastrosService);
  private router = inject(Router);

  nomeNegocio = signal('');
  saldo = signal(0);
  carregando = signal(true);
  estoqueBaixoQtd = signal(0);
  contasPendentes = signal(0);
  moeda = formatarMoeda;

  async ngOnInit() {
    try {
      const [perfil, deHoje] = await Promise.all([
        this.supabase.client.from('usuarios').select('nome_negocio').single(),
        this.lancamentos.listarDesde(dataInicial('hoje')),
      ]);
      this.nomeNegocio.set(perfil.data?.nome_negocio ?? '');
      this.saldo.set(calcularResumo(deHoje).resultado);
    } catch (e) {
      console.error('Erro ao carregar a tela inicial:', e);
    } finally {
      this.carregando.set(false);
    }
    this.carregarAlertas();
  }

  // Alertas não travam a tela: se falharem, a tela inicial continua funcionando
  private async carregarAlertas() {
    try {
      const mes = intervaloPeriodo('mes');
      const [produtos, contas, pagas] = await Promise.all([
        this.cadastros.listarProdutos(),
        this.cadastros.listarContas(),
        this.lancamentos.contasPagasEntre(mes.inicio, mes.fim),
      ]);
      this.estoqueBaixoQtd.set(produtos.filter(estoqueBaixo).length);
      this.contasPendentes.set(contas.filter((c) => {
        const s = situacaoConta(c, pagas.has(c.id ?? ''));
        return s === 'atrasada' || s === 'vence_hoje';
      }).length);
    } catch (e) {
      console.error('Erro ao carregar alertas:', e);
    }
  }

  // Acessibilidade: o resultado não depende só da cor (símbolo + cor)
  simbolo(): string {
    if (this.saldo() > 0) return '▲';
    if (this.saldo() < 0) return '▼';
    return '';
  }

  async sair() {
    await this.supabase.sair();
    this.router.navigate(['/login']);
  }
}