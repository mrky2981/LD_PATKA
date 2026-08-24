import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth-guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth').then((m) => m.AuthPage),
    title: 'LD Patka',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell').then((m) => m.ShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'map' },
      {
        path: 'map',
        loadComponent: () => import('./pages/map').then((m) => m.MapPage),
        title: 'LD Patka',
      },
      {
        path: 'stands',
        loadComponent: () => import('./pages/stands').then((m) => m.StandsPage),
        title: 'LD Patka',
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history').then((m) => m.HistoryPage),
        title: 'LD Patka',
      },
      {
        path: 'sightings',
        loadComponent: () => import('./pages/sightings').then((m) => m.SightingsPage),
        title: 'LD Patka',
      },
      {
        path: 'club',
        loadComponent: () => import('./pages/club').then((m) => m.ClubPage),
        title: 'LD Patka',
      },
    ],
  },
  { path: '**', redirectTo: 'map' },
];
