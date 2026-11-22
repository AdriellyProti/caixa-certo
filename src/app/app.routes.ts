import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { Login } from './pages/login';
import { Cadastro } from './pages/cadastro';
import { Inicio } from './pages/inicio';

// Telas menos usadas são carregadas só quando abertas (lazy loading):
// o app abre mais rápido no celular
export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'inicio', component: Inicio, canActivate: [authGuard] },
  { path: 'registrar', loadComponent: () => import('./pages/registrar').then((m) => m.Registrar), canActivate: [authGuard] },
  { path: 'resumo', loadComponent: () => import('./pages/resumo').then((m) => m.Resumo), canActivate: [authGuard] },
  { path: 'servicos', loadComponent: () => import('./pages/servicos').then((m) => m.Servicos), canActivate: [authGuard] },
  { path: 'produtos', loadComponent: () => import('./pages/produtos').then((m) => m.Produtos), canActivate: [authGuard] },
  { path: 'contas-fixas', loadComponent: () => import('./pages/contas-fixas').then((m) => m.ContasFixas), canActivate: [authGuard] },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];
