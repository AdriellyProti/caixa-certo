import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Lancamento } from '../utils/financeiro';

const CAMPOS =
  'id, tipo, valor, data, forma_pagamento, categoria, conta_fixa_id, servico_id, produto_id, quantidade, custo_unitario';

@Injectable({ providedIn: 'root' })
export class LancamentosService {
  private supabase = inject(SupabaseService);

  // RF03 e RF04 - registrar entrada ou despesa
  // O usuario_id é preenchido pelo banco (default auth.uid()), não pelo app
  // O estoque e o custo da venda são atualizados pelo banco (triggers)
  async registrar(lancamento: Lancamento): Promise<void> {
    const { error } = await this.supabase.client.from('lancamentos').insert(lancamento);
    if (error) throw error;
  }

  // Editar um lançamento registrado errado
  async atualizar(id: string, lancamento: Lancamento): Promise<void> {
    const { error } = await this.supabase.client
      .from('lancamentos')
      .update(lancamento)
      .eq('id', id);
    if (error) throw error;
  }

  async buscar(id: string): Promise<Lancamento> {
    const { data, error } = await this.supabase.client
      .from('lancamentos')
      .select(CAMPOS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Lancamento;
  }

  // RF05 - lançamentos a partir de uma data (o RLS filtra por usuário)
  async listarDesde(dataInicial: string): Promise<Lancamento[]> {
    return this.listarEntre(dataInicial);
  }

  // Lançamentos de um intervalo (usado para ver períodos anteriores)
  async listarEntre(inicio: string, fim?: string): Promise<Lancamento[]> {
    let consulta = this.supabase.client.from('lancamentos').select(CAMPOS).gte('data', inicio);
    if (fim) consulta = consulta.lte('data', fim);

    const { data, error } = await consulta
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Lancamento[];
  }

  // IDs das contas fixas que já têm pagamento registrado no intervalo
  async contasPagasEntre(inicio: string, fim: string): Promise<Set<string>> {
    const { data, error } = await this.supabase.client
      .from('lancamentos')
      .select('conta_fixa_id')
      .not('conta_fixa_id', 'is', null)
      .gte('data', inicio)
      .lte('data', fim);

    if (error) throw error;
    return new Set((data ?? []).map((l) => l.conta_fixa_id as string));
  }

  // Ajuste da validação 1: excluir lançamento registrado errado
  // O RLS garante que só é possível excluir os próprios lançamentos
  async excluir(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('lancamentos').delete().eq('id', id);
    if (error) throw error;
  }
}
