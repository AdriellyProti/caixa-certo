import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LancamentosService } from '../services/lancamentos.service';
import { converterValor, FormaPagamento, paraISO, Tipo } from '../utils/financeiro';

@Component({
  selector: 'app-registrar',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <a class="link voltar" routerLink="/inicio">← Voltar</a>
      <h1>Novo lançamento</h1>

      <div class="grupo" role="group" aria-label="Tipo de lançamento">
        <button type="button" class="opcao" [class.ativa-entrada]="tipo() === 'entrada'"
          [attr.aria-pressed]="tipo() === 'entrada'" (click)="tipo.set('entrada')">
          {{ tipo() === 'entrada' ? '✓ ' : '' }}Entrada
        </button>
        <button type="button" class="opcao" [class.ativa-saida]="tipo() === 'saida'"
          [attr.aria-pressed]="tipo() === 'saida'" (click)="tipo.set('saida')">
          {{ tipo() === 'saida' ? '✓ ' : '' }}Despesa
        </button>
      </div>

      <form (ngSubmit)="salvar()">
        <label for="valor">Valor (R$)</label>
        <input id="valor" name="valor" inputmode="decimal" placeholder="0,00" [(ngModel)]="valorTexto" />

        <p class="rotulo">Forma de pagamento</p>
        <div class="grupo sem-margem" role="group" aria-label="Forma de pagamento">
          @for (f of formas; track f.valor) {
            <button type="button" class="opcao" [class.selecionada]="forma() === f.valor"
              [attr.aria-pressed]="forma() === f.valor" (click)="forma.set(f.valor)">
              {{ forma() === f.valor ? '✓ ' : '' }}{{ f.rotulo }}
            </button>
          }
        </div>

        <label for="data">Data</label>
        <input id="data" type="date" name="data" [(ngModel)]="data" />

        <label for="categoria">{{ tipo() === 'entrada' ? 'Serviço (opcional)' : 'Categoria' }}</label>
        <input id="categoria" name="categoria" [(ngModel)]="categoria"
          [placeholder]="tipo() === 'entrada' ? 'Ex.: Corte' : 'Ex.: Produtos'" />

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
    .voltar { text-align: left; margin-top: 0; }
    .rotulo { font-weight: 600; margin: 16px 0 6px; }
    .grupo { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
    .sem-margem { margin-top: 0; }
    .opcao { min-height: 48px; font-size: 16px; border: 2px solid #999; border-radius: 8px; background: #fff; cursor: pointer; }
    .ativa-entrada { border-color: #2E7D32; background: #E8F5E9; color: #1B5E20; font-weight: 600; }
    .ativa-saida { border-color: #C62828; background: #FFEBEE; color: #B71C1C; font-weight: 600; }
    .selecionada { border-color: #1a1a1a; background: #f0f0f0; font-weight: 600; }
  `],
})
export class Registrar implements OnInit {
  private service = inject(LancamentosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  formas: { valor: FormaPagamento; rotulo: string }[] = [
    { valor: 'debito', rotulo: 'Débito' },
    { valor: 'credito', rotulo: 'Crédito' },
    { valor: 'pix', rotulo: 'PIX' },
    { valor: 'dinheiro', rotulo: 'Dinheiro' },
  ];

  tipo = signal<Tipo>('entrada');
  forma = signal<FormaPagamento>('pix');
  valorTexto = '';
  data = paraISO(new Date());
  categoria = '';
  erro = signal('');
  salvando = signal(false);

  ngOnInit() {
    // A Tela Inicial abre esta tela já como entrada ou despesa
    if (this.route.snapshot.queryParamMap.get('tipo') === 'saida') {
      this.tipo.set('saida');
    }
  }

  async salvar() {
    this.erro.set('');
    const valor = converterValor(this.valorTexto);

    // Validação no cliente (RNF02); o banco valida de novo com o check
    if (!valor || valor <= 0) {
      this.erro.set('Informe um valor maior que zero.');
      return;
    }
    if (!this.data) {
      this.erro.set('Informe a data.');
      return;
    }
    if (this.tipo() === 'saida' && !this.categoria.trim()) {
      this.erro.set('Informe a categoria da despesa.');
      return;
    }

    this.salvando.set(true);
    try {
      await this.service.registrar({
        tipo: this.tipo(),
        valor,
        data: this.data,
        forma_pagamento: this.forma(),
        categoria: this.categoria.trim() || null,
      });
      this.router.navigate(['/inicio']);
    } catch (e) {
      console.error('Erro ao salvar lançamento:', e);
      this.erro.set('Não foi possível salvar. Tente de novo.');
    } finally {
      this.salvando.set(false);
    }
  }
}