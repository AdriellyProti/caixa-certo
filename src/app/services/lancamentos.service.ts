import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Lancamento } from '../utils/financeiro';

@Injectable({ providedIn: 'root' })
export class LancamentosService {
  private supabase = inject(SupabaseService);

  // RF03 e RF04 - registrar entrada ou despesa
  // O usuario_id é preenchido pelo banco (default auth.uid()), não pelo app
  async registrar(lancamento: Lancamento): Promise<void> {
    const { error } = await this.supabase.client
      .from('lancamentos')
      .insert(lancamento);

    if (error) throw error;
  }

  // RF05 - lançamentos a partir de uma data (o RLS filtra por usuário)
  async listarDesde(dataInicial: string): Promise<Lancamento[]> {
    const { data, error } = await this.supabase.client
      .from('lancamentos')
      .select('id, tipo, valor, data, forma_pagamento, categoria')
      .gte('data', dataInicial)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Lancamento[];
  }
}