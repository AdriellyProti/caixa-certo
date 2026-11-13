import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { LancamentosService } from '../services/lancamentos.service';
import { calcularResumo, dataInicial, formatarMoeda } from '../utils/financeiro';

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
    .sair { width: 100%; background: none; border: none; font-size: 16px; text-decoration: underline; cursor: pointer; }
  `],
})
export class Inicio implements OnInit {
  private supabase = inject(SupabaseService);
  private lancamentos = inject(LancamentosService);
  private router = inject(Router);

  nomeNegocio = signal('');
  saldo = signal(0);
  carregando = signal(true);
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