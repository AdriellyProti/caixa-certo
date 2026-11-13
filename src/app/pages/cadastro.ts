import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-cadastro',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="tela">
      <h1>Criar conta</h1>
      <p>Comece a organizar o caixa do seu negócio.</p>

      <form (ngSubmit)="cadastrar()">
        <label for="nome">Seu nome</label>
        <input id="nome" name="nome" [(ngModel)]="nome" autocomplete="name" />

        <label for="negocio">Nome do negócio</label>
        <input id="negocio" name="negocio" [(ngModel)]="nomeNegocio" />

        <label for="email">E-mail</label>
        <input id="email" type="email" name="email" [(ngModel)]="email" autocomplete="email" />

        <label for="senha">Senha (mínimo 8 caracteres)</label>
        <input id="senha" type="password" name="senha" [(ngModel)]="senha" autocomplete="new-password" />

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }
        @if (aviso()) {
          <p role="status">{{ aviso() }}</p>
        }

        <button class="botao botao-verde" type="submit" [disabled]="carregando()">
          {{ carregando() ? 'Criando conta...' : 'Criar conta' }}
        </button>
      </form>

      <a class="link" routerLink="/login">Já tem conta? Entrar</a>
    </main>
  `,
})
export class Cadastro {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  nome = '';
  nomeNegocio = '';
  email = '';
  senha = '';
  erro = signal('');
  aviso = signal('');
  carregando = signal(false);

  async cadastrar() {
    this.erro.set('');
    this.aviso.set('');

    // Validação no cliente (RNF02)
    if (!this.nome || !this.nomeNegocio || !this.email || !this.senha) {
      this.erro.set('Preencha todos os campos.');
      return;
    }
    if (this.senha.length < 8) {
      this.erro.set('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    this.carregando.set(true);
    const { data, error } = await this.supabase.cadastrar(
      this.nome, this.nomeNegocio, this.email, this.senha,
    );
    this.carregando.set(false);

    if (error) {
              console.error('Erro no cadastro:', error.message);
      this.erro.set('Não foi possível criar a conta. Verifique os dados e tente de novo.');
      return;
      
    }

    // Se o Supabase pedir confirmação por e-mail, ainda não há sessão
    if (!data.session) {
      this.aviso.set('Conta criada! Confirme o cadastro pelo link enviado ao seu e-mail.');
      return;
    }

    this.router.navigate(['/inicio']);
  }
}