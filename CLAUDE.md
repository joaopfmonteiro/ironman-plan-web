# Ironman Plan — Frontend (React + Vite)

## Projeto irmão
Backend: `C:\Users\joaop\Documents\Projectos\ironman-plan` (Spring Boot, porta 8080)

## Stack
- React 19, TypeScript, Vite 8
- Tailwind CSS 4 (via `@tailwindcss/vite` — sem `tailwind.config.js`, usa `@import "tailwindcss"` no CSS)
- Zustand (state management, com persist middleware)
- React Router v7
- Axios
- Porta: **3000** (proxy `/api` → `localhost:8080`)

## Estrutura src/
```
api/
  client.ts       — Axios instance, Bearer JWT interceptor, redirect 401 → /login
  auth.ts         — login(), register()
  athlete.ts      — getMe(), updateMe()
  plans.ts        — planos, macrociclos, microciclos, sessões, resultados
  races.ts        — provas
  templates.ts    — programas pré-definidos
store/
  authStore.ts    — Zustand persist: { token, user, isAuthenticated, setAuth, logout }
types/index.ts    — Todas as interfaces TypeScript (espelha DTOs do backend)
components/
  Layout.tsx      — Sidebar fixa com nav + logout (usa <Outlet /> do react-router)
  ProtectedRoute.tsx — Redireciona para /login se !isAuthenticated
  ui/
    Button.tsx    — variant: primary|secondary|danger|ghost; loading spinner
    Input.tsx     — label + error
    Select.tsx    — options array
    Badge.tsx     — color badges
    Modal.tsx     — overlay modal
pages/
  LoginPage.tsx
  RegisterPage.tsx
  DashboardPage.tsx   — Stats, plano ativo, próximas provas
  PlansPage.tsx       — Lista de planos + criar
  PlanDetailPage.tsx  — Drill-down: macrociclos → microciclos → sessões
                        CRUD completo para todos os níveis
                        Marcar sessão completa (SessionResult)
  RacesPage.tsx       — Provas (próximas + passadas)
  TemplatesPage.tsx   — Programas pré-definidos → criar plano
```

## Roteamento (App.tsx)
```
/login, /register           — públicas
/dashboard                  — protegida
/plans                      — protegida
/plans/:id                  — protegida (detalhe do plano)
/races                      — protegida
/templates                  — protegida
/ e *                       — redirect → /dashboard
```

## Autenticação
- Token JWT guardado em `localStorage` via Zustand persist
- Interceptor Axios adiciona `Authorization: Bearer <token>` automaticamente
- 401 → remove token + redirect /login

## Pendente (fase 2)
- [ ] Calendário
- [ ] Nutrição
- [ ] Perfil do atleta (editar dados pessoais)

## Como arrancar
```bash
npm run dev
```
Requer backend a correr em localhost:8080.

## Notas Tailwind v4
Não tem `tailwind.config.js` — configuração é feita via CSS ou `@theme` no index.css.
Classes usam a sintaxe padrão v4 (sem mudanças de nomes).
