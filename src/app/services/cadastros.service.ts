import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ContaFixa, Produto, Servico } from '../utils/financeiro';

// Cadastros do negócio: serviços, produtos e contas fixas
// O RLS garante que cada usuário só vê e altera os próprios dados
@Injectable({ providedIn: 'root' })
export class CadastrosService {
  private supabase = inject(SupabaseService);

  private get db() {
    return this.supabase.client;
  }

  // ---------- Serviços ----------
  async listarServicos(): Promise<Servico[]> {
    const { data, error } = await this.db
      .from('servicos').select('id, nome, preco').eq('ativo', true).order('nome');
    if (error) throw error;
    return (data ?? []) as Servico[];
  }

  async salvarServico(servico: Servico): Promise<void> {
    const { id, ...campos } = servico;
    const { error } = id
      ? await this.db.from('servicos').update(campos).eq('id', id)
      : await this.db.from('servicos').insert(campos);
    if (error) throw error;
  }

  // Desativa em vez de apagar: o histórico de lançamentos continua certo
  async removerServico(id: string): Promise<void> {
    const { error } = await this.db.from('servicos').update({ ativo: false }).eq('id', id);
    if (error) throw error;
  }

  // ---------- Produtos ----------
  async listarProdutos(): Promise<Produto[]> {
    const { data, error } = await this.db
      .from('produtos')
      .select('id, nome, preco_custo, preco_venda, estoque, estoque_minimo')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return (data ?? []) as Produto[];
  }

  async salvarProduto(produto: Produto): Promise<void> {
    const { id, ...campos } = produto;
    const { error } = id
      ? await this.db.from('produtos').update(campos).eq('id', id)
      : await this.db.from('produtos').insert(campos);
    if (error) throw error;
  }

  async removerProduto(id: string): Promise<void> {
    const { error } = await this.db.from('produtos').update({ ativo: false }).eq('id', id);
    if (error) throw error;
  }

  // ---------- Contas fixas ----------
  async listarContas(): Promise<ContaFixa[]> {
    const { data, error } = await this.db
      .from('contas_fixas')
      .select('id, descricao, valor, dia_vencimento')
      .eq('ativa', true)
      .order('dia_vencimento');
    if (error) throw error;
    return (data ?? []) as ContaFixa[];
  }

  async buscarConta(id: string): Promise<ContaFixa> {
    const { data, error } = await this.db
      .from('contas_fixas').select('id, descricao, valor, dia_vencimento').eq('id', id).single();
    if (error) throw error;
    return data as ContaFixa;
  }

  async salvarConta(conta: ContaFixa): Promise<void> {
    const { id, ...campos } = conta;
    const { error } = id
      ? await this.db.from('contas_fixas').update(campos).eq('id', id)
      : await this.db.from('contas_fixas').insert(campos);
    if (error) throw error;
  }

  async removerConta(id: string): Promise<void> {
    const { error } = await this.db.from('contas_fixas').update({ ativa: false }).eq('id', id);
    if (error) throw error;
  }
}
