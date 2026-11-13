import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { Login } from './pages/login';
import { Cadastro } from './pages/cadastro';
import { Inicio } from './pages/inicio';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'inicio', component: Inicio, canActivate: [authGuard] }, // protegida
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' }, // endereço inexistente vai para o início
];