# Chat BullQ — Web

Front-end do Chat BullQ. **Next.js 16 (App Router, output standalone) + React 19 + Tailwind 4**.

## Rodando local
```bash
yarn install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:3001
yarn dev                       # http://localhost:3000
```

## Deploy (Render)
`render.yaml` cria 1 web service Docker. Defina `NEXT_PUBLIC_API_URL` com a URL pública
da API. Veja `../DEPLOY.md`.
