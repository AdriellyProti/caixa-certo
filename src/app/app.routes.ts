import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { Login } from './pages/login';
import { Cadastro } from './pages/cadastro';
import { Inicio } from './pages/inicio';
import { Registrar } from './pages/registrar';
import { Resumo } from './pages/resumo';
export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'inicio', component: Inicio, canActivate: [authGuard] },
  { path: 'registrar', component: Registrar, canActivate: [authGuard] },
  { path: 'resumo', component: Resumo, canActivate: [authGuard] },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];