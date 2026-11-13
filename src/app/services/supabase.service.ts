import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  // Conexão única com o Supabase, usada pelo app inteiro
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );

  // RF01 - Cadastro: a senha vai para o Supabase Auth (bcrypt), nunca para a tabela
  cadastrar(nome: string, nomeNegocio: string, email: string, senha: string) {
    return this.client.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, nome_negocio: nomeNegocio } },
    });
  }

  // RF02 - Login
  entrar(email: string, senha: string) {
    return this.client.auth.signInWithPassword({ email, password: senha });
  }

  sair() {
    return this.client.auth.signOut();
  }

  // Retorna o usuário logado, ou null se ninguém estiver logado
  async usuarioLogado() {
    const { data } = await this.client.auth.getSession();
    return data.session?.user ?? null;
  }
}