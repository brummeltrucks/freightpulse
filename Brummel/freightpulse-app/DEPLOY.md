# 🚀 Brummel FreightPulse — Deploy na Web (Grátis)

## Estrutura do projeto
```
freightpulse-app/
├── server.js          ← Backend Node.js (faz as chamadas de API)
├── package.json       ← Dependências
├── render.yaml        ← Config do Render.com
├── .gitignore
└── public/
    ├── index.html     ← Dashboard (frontend)
    └── brummel-logo.png
```

---

## PASSO 1 — Criar conta no GitHub (se não tiver)
1. Acesse https://github.com e crie uma conta gratuita

## PASSO 2 — Subir o projeto no GitHub
1. Clique em **"New repository"**
2. Nome: `brummel-freightpulse`
3. Deixe **Private** ou Public (sua escolha)
4. Clique **Create repository**
5. Faça upload de TODOS os arquivos desta pasta
   - Ou use Git na linha de comando:
     ```bash
     cd freightpulse-app
     git init
     git add .
     git commit -m "Initial deploy"
     git remote add origin https://github.com/SEU_USUARIO/brummel-freightpulse.git
     git push -u origin main
     ```

## PASSO 3 — Deploy no Render.com (grátis)
1. Acesse https://render.com e crie uma conta (login com GitHub)
2. Clique **"New +"** → **"Web Service"**
3. Conecte o repositório `brummel-freightpulse`
4. Configure:
   - **Name:** brummel-freightpulse
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Em **Environment Variables**, adicione:
   - `GEMINI_KEY` = sua chave Gemini
   - `EIA_KEY` = DEMO_KEY
6. Clique **"Create Web Service"**
7. Aguarde ~2 minutos — o Render vai buildar e publicar

## PASSO 4 — Acessar o sistema
- Render vai gerar uma URL tipo: `https://brummel-freightpulse.onrender.com`
- Acesse pelo browser — está online! ✅

---

## ⚠ Notas importantes
- **Plano gratuito do Render:** o serviço "dorme" após 15 min sem acesso
  - Para manter sempre online: upgrade para o plano Starter ($7/mês)
  - Ou use o Render com um "ping" automático (UptimeRobot.com - grátis)
- **Gemini API:** gratuita com limite de 15 req/min (mais que suficiente para atualizações de 5 em 5 min)
- **EIA API:** totalmente gratuita, dados oficiais do governo americano

## Atualizar o sistema depois
```bash
git add .
git commit -m "Update"
git push
```
O Render faz o redeploy automaticamente.
