import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-inicio',
  template: `
    <main class="tela">
      <h1>Caixa Certo</h1>
      <p>Olá, {{ nomeNegocio() }}</p>
      <button class="botao botao-contorno" type="button" (click)="sair()">Sair</button>
    </main>
  `,
})
export class Inicio implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  nomeNegocio = signal('');

  async ngOnInit() {
    // O RLS garante que só volta o perfil de quem está logado
    const { data } = await this.supabase.client
      .from('usuarios')
      .select('nome_negocio')
      .single();
    this.nomeNegocio.set(data?.nome_negocio ?? '');
  }

  async sair() {
    await this.supabase.sair();
    this.router.navigate(['/login']);
  }
}