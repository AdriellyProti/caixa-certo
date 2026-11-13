import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <h1>Caixa Certo</h1>
      <p>Entre para controlar o caixa do seu negócio.</p>

      <form (ngSubmit)="entrar()">
        <label for="email">E-mail</label>
        <input id="email" type="email" name="email" [(ngModel)]="email" autocomplete="email" />

        <label for="senha">Senha</label>
        <input id="senha" type="password" name="senha" [(ngModel)]="senha" autocomplete="current-password" />

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }

        <button class="botao botao-verde" type="submit" [disabled]="carregando()">
          {{ carregando() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>

      <a class="link" routerLink="/cadastro">Não tem conta? Cadastre-se</a>
    </main>
  `,
})
export class Login {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  email = '';
  senha = '';
  erro = signal('');
  carregando = signal(false);

  async entrar() {
    this.erro.set('');

    // Validação no cliente (RNF02)
    if (!this.email || !this.senha) {
      this.erro.set('Preencha e-mail e senha.');
      return;
    }

    this.carregando.set(true);
    const { error } = await this.supabase.entrar(this.email, this.senha);
    this.carregando.set(false);

    if (error) {
      // Mensagem genérica: não revela se o erro foi no e-mail ou na senha
      this.erro.set('E-mail ou senha incorretos.');
      return;
    }

    this.router.navigate(['/inicio']);
  }
}