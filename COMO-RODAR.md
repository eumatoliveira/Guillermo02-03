# Como Rodar o Projeto GLX SaaS

Guia completo para iniciar o servidor, resolver erros de compilação e voltar a desenvolver rapidamente.

---

## Requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Node.js | 18+ | `node -v` |
| pnpm | 10+ | `pnpm -v` |
| Git Bash (Windows) | qualquer | `git --version` |

> **Instalar pnpm** (caso não tenha): `npm install -g pnpm`

---

## Iniciar o projeto — passo a passo

### 1. Abrir o terminal na pasta do projeto

**Opção A — Git Bash:**
```bash
cd /c/Users/mathe/glx-code-review/Guillermo02-03
```

**Opção B — VS Code terminal integrado:**
```
Ctrl + ` (backtick) → já abre na pasta do workspace
```

**Opção C — PowerShell / CMD:**
```powershell
cd C:\Users\mathe\glx-code-review\Guillermo02-03
```

---

### 2. Configurar o arquivo de ambiente (apenas na primeira vez)

```bash
cp .env.example .env
```

O projeto funciona em desenvolvimento **sem banco de dados** (usa memória). O `.env` mínimo necessário:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=qualquer_string_longa_aqui
```

---

### 3. Instalar dependências

```bash
pnpm install
```

> Se der erro de permissão no Windows:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> Depois rode `pnpm install` novamente.

---

### 4. Iniciar o servidor de desenvolvimento

```bash
pnpm dev
```

Acesse no navegador: **http://localhost:3000**

> Se a porta 3000 estiver ocupada, o servidor sobe em outra (ex: 3003). Leia a mensagem no terminal.

---

### 5. Login padrão (desenvolvimento local)

| Campo | Valor |
|---|---|
| Email | `admin@example.com` |
| Senha | `change_this_admin_password` |

Ou os valores que estão no seu `.env` em `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`.

---

## Resolver erros comuns

### Erro: `Cannot find module` / `ERR_MODULE_NOT_FOUND`

Dependências corrompidas ou faltando. Reconstrua do zero:

```bash
rm -rf node_modules
pnpm install
pnpm dev
```

---

### Erro: `EADDRINUSE: address already in use :::3000`

Porta ocupada por outro processo Node.

**Git Bash / PowerShell:**
```bash
# Ver qual processo está usando a porta
npx kill-port 3000

# Ou matar todos os processos node
taskkill /F /IM node.exe
```

Depois inicie novamente:
```bash
pnpm dev
```

Ou use o script que já mata o processo e reinicia:
```bash
pnpm dev:clean
```

---

### Erro: TypeScript / `tsc` — erros de tipo ao compilar

O servidor de desenvolvimento **ignora erros de tipo** e compila normalmente via `tsx`. Erros de TypeScript só bloqueiam o `pnpm build` (produção).

Para checar tipos manualmente:
```bash
npx tsc --noEmit
```

Para ignorar temporariamente e só rodar:
```bash
pnpm dev   # tsx não bloqueia por erros TS
```

---

### Erro: `vite: command not found` ou `tsx: command not found`

```bash
pnpm install       # reinstala os binários locais
pnpm dev
```

Se persistir:
```bash
npm install -g tsx vite
pnpm dev
```

---

### Erro: `drizzle` / banco de dados / `DATABASE_URL`

O projeto usa **banco em memória** por padrão. Se aparecer erro de banco:

1. Verifique se `.env` existe:
   ```bash
   ls -la .env
   ```
2. Certifique-se que `DATABASE_URL` está vazia ou não existe no `.env` (para usar memória local):
   ```env
   DATABASE_URL=
   ```
3. Reinicie:
   ```bash
   pnpm dev
   ```

---

### Erro: `pnpm: command not found`

```bash
npm install -g pnpm@10
pnpm install
pnpm dev
```

---

### Erro: `Error: ENOENT: no such file or directory, open '.env'`

```bash
cp .env.example .env
pnpm dev
```

---

### Erro: `Cannot find package 'X' imported from ...`

Pacote específico faltando após pull/merge:

```bash
pnpm install
pnpm dev
```

Se ainda falhar:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

---

### Tela branca / app não carrega no navegador

1. Abra **F12 → Console** e veja o erro
2. Verifique o terminal — pode haver erro no servidor
3. Limpe o cache do Vite:
   ```bash
   rm -rf node_modules/.vite
   pnpm dev
   ```
4. Tente outro navegador ou aba anônima (Ctrl+Shift+N)

---

## Sequência de recuperação total (reset completo)

Use quando nada mais funciona:

```bash
# 1. Matar processos node
taskkill /F /IM node.exe

# 2. Limpar tudo
rm -rf node_modules
rm -rf node_modules/.vite

# 3. Recriar .env se necessário
cp .env.example .env

# 4. Reinstalar e iniciar
pnpm install
pnpm dev
```

---

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Inicia o servidor de desenvolvimento |
| `pnpm dev:clean` | Mata processos Node presos e inicia dev |
| `pnpm build` | Gera build de produção |
| `pnpm start` | Inicia a versão de produção (após build) |
| `pnpm test` | Roda os testes com Vitest |
| `npx tsc --noEmit` | Verifica erros de TypeScript sem compilar |

---

## Estrutura resumida do projeto

```
Guillermo02-03/
├── client/          → Frontend React + Vite
├── server/          → Backend Express + tRPC
├── shared/          → Tipos e schemas compartilhados
├── .env             → Variáveis de ambiente (não vai ao git)
├── .env.example     → Template do .env
└── package.json     → Scripts e dependências
```

---

> **Dica:** Mantenha dois terminais abertos — um rodando `pnpm dev` e outro livre para comandos.
