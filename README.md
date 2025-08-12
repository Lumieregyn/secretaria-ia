# Secretaria-IA

Monorepo: **app/** (React + Tailwind + Vite) e **backend/** (Express). Etapa 1 usa localStorage; backend em memória para demo.

## Como subir SEM terminal (só GitHub Web)
1. Crie um repositório novo no GitHub.
2. Clique em **Add file → Upload files**.
3. **Arraste as pastas** `app/`, `backend/`, `infra/` e `.github/` deste pacote.
4. Commit na `main`.

## Seed (demo rápida no app)
Abra o app no navegador (quando hospedado) e rode no Console do navegador:
```js
fetch('/seed.json').then(r=>r.json()).then(seed => {
  localStorage.setItem('psia_brands', JSON.stringify(seed.brands));
  localStorage.setItem('psia_reps', JSON.stringify(seed.reps));
  localStorage.setItem('psia_solics', JSON.stringify(seed.solic));
  location.reload();
});
```

## Próximos passos
- Quando quiser, subimos o backend no Railway e plugar WppConnect; depois trocamos o front de localStorage para API.
