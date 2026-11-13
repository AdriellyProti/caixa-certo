import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './services/supabase.service';

// Só deixa entrar quem está logado; os outros vão para o login
export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const usuario = await supabase.usuarioLogado();
  return usuario ? true : router.createUrlTree(['/login']);
};