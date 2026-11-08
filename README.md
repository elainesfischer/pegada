# Pegada Ecológica em Sala

Aplicação web para aplicar o **Questionário de Pegada Ecológica** em sala de aula.

**Fluxo:** o professor cria a turma → o sistema gera um QR Code → os alunos escaneiam pelo celular (sem conta e sem instalar nada) → respondem 20 perguntas → recebem o resultado individual → o painel do professor atualiza **em tempo real**.

> Resultado apresentado como **Índice educativo de Pegada Ecológica** (0–60). Não corresponde ao cálculo científico em hectares globais (gha).

---

## 1. O que você vai precisar (tudo gratuito)

| Serviço | Para quê | Link |
|---|---|---|
| Supabase | banco de dados, login do professor, tempo real | supabase.com |
| GitHub | guardar o código | github.com |
| Vercel | publicar o site na internet | vercel.com |
| Node.js 18+ | só se for testar no seu computador | nodejs.org |

---

## 2. Configurar o Supabase

1. Entre em **supabase.com**, crie uma conta e clique em **New project**. Dê um nome (ex.: `pegada`), crie uma senha do banco (guarde-a) e escolha a região mais próxima (ex.: *South America – São Paulo*). Aguarde 1–2 minutos.
2. No menu lateral abra **SQL Editor → New query**. Abra o arquivo `supabase/schema.sql` deste projeto, copie **todo o conteúdo**, cole e clique em **Run**. Deve aparecer *Success*. Isso cria as tabelas, as regras de segurança (RLS) e o tempo real.
2b. **Atualização 2 (obrigatória nesta versão):** abra **New query**, cole o conteúdo de `supabase/migration-v2.sql` e clique em **Run**. Ela adiciona a página pública, o histórico/comparação e o tempo real do status da sessão. Pode ser executada mais de uma vez.
3. **Crie o login do professor:** menu **Authentication → Users → Add user → Create new user**. Informe e-mail e senha e **marque "Auto Confirm User"**. (O site não tem tela de cadastro público: só quem você cria consegue entrar.)
4. **Impeça cadastros por conta própria:** **Authentication → Sign In / Providers** (ou *Settings*) e desligue **Allow new users to sign up**.
5. **Copie as chaves:** **Project Settings → API**. Anote:
   - **Project URL** (`https://xxxx.supabase.co`)
   - Chave pública **anon / publishable** (nunca use a `service_role`)
6. Confirme o tempo real: **Database → Replication** (ou *Publications*) deve listar `participants` e `responses` em `supabase_realtime`. O SQL já faz isso.

---

## 3. Testar no seu computador (opcional)

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
# edite .env.local e cole a URL e a chave anon
npm run dev
```

Abra http://localhost:3000. Painel do professor: http://localhost:3000/professor.
Para testar com o celular na mesma rede, defina `NEXT_PUBLIC_SITE_URL=http://IP-DO-SEU-PC:3000`.

Testes automáticos (pontuação, tempo real, cronômetro, textos, imagem): `npm test`.

---

## 4. Publicar no Vercel

1. Crie um repositório no GitHub e envie esta pasta (no site do GitHub: **Add file → Upload files**; não envie `.env.local`).
2. Em **vercel.com** clique em **Add New → Project**, escolha o repositório e deixe o framework como **Next.js**.
3. Em **Environment Variables** adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon/publishable
   - (opcional) `NEXT_PUBLIC_SITE_URL` = endereço final, ex.: `https://pegada-turma.vercel.app`
4. Clique em **Deploy**. Em ~2 minutos o site está no ar.
5. No Supabase, em **Authentication → URL Configuration**, coloque o endereço do Vercel em **Site URL**.

---

## 5. Como usar em aula

**Professor:** acesse `/professor` → entre → digite o nome da turma → **Iniciar atividade** → **Projetar QR Code**.
**Alunos:** escaneiam o QR → (nome opcional) → 4 perguntas por etapa, 5 etapas → resultado individual.
**Painel:** participantes, concluídos e "respondendo" sobem sozinhos; gráficos atualizam sem recarregar.
**Fechar:** **ENCERRAR QUESTIONÁRIO** bloqueia novas respostas e mostra a tela final "Pegada Ecológica da Turma" e as perguntas "Para discutir com a turma".
**Projeção:** **MODO APRESENTAÇÃO** mostra só dados agregados, nunca nomes.
**Exportar:** CSV (separador `;`, abre direto no Excel em português) ou XLSX. Colunas: ID anônimo, data/hora, turma, Q1–Q20 (pontos 0–3), 5 dimensões, total, classificação. Nomes/apelidos **não** são exportados.

Outras ações: reabrir respostas, duplicar turma (cópia vazia com novo código), zerar resultados, excluir turma.

---

## 5b. Modo aula (projetor)

**Abrir:** na tela da turma, clique em **MODO AULA**. A tela ocupa o monitor inteiro (se o navegador pedir, permita tela cheia; **F** liga/desliga). Nada de menus administrativos aparece: só as telas da aula, uma barra fina no topo e os controles no rodapé.

**Telas** (avance com os botões, **→ / Page Down / Espaço**; volte com **← / Page Up**):
1. **QR Code** – título, QR grande, código da turma, link curto, **COPIAR LINK** e o contador *Alunos conectados* (sobe sozinho, com animação discreta).
2. **Progresso** – Participantes, Concluíram, Respondendo e barra de progresso (sem nomes).
3. **Resultado geral** – média da turma /60, classificação média e cards de maior e menor pressão ambiental.
4. **Dimensões** – barras horizontais, alternando entre escala 0–12 e 0–100%.
5. **Distribuição** – alunos por faixa.
6. **Radar** · 7. **Discussão** – frases automáticas e 3 perguntas que mudam conforme os resultados.
8. **Resultado final** – aparece depois de encerrar.

**Ampliar o QR Code:** botão **AMPLIAR QR CODE** (ou tecla **Q** e depois o botão). Mostra só o QR, o nome da atividade, o código e “Aponte a câmera do celular para o QR Code”. **Voltar ao painel** ou **Esc** retornam.

**Atalhos:** **F** tela cheia · **Q** QR · **P** progresso · **R** revelar · **1** geral · **2** dimensões · **3** distribuição · **4** radar · **5** discussão · **?** ajuda · **Esc** sair. (Dentro da tela cheia do navegador, o primeiro Esc sai da tela cheia; o segundo sai do modo aula.)

**Cronômetro (opcional):** botão **Cronômetro** no topo (ou o cartão no painel). Escolha *Sem limite*, 2, 3, 5, 10 minutos ou *Personalizado* e clique em **Iniciar cronômetro**. A barra mostra “Tempo restante: 04:32”. Com 1 minuto aparece um aviso discreto; com 30 s o relógio ganha destaque; nos últimos 10 s surge uma contagem regressiva grande. **Sons são opcionais e vêm desligados.** Quando o tempo acaba, aparece a pergunta: **Encerrar automaticamente** ou **Permitir continuar respondendo**. Nada é encerrado sem a sua escolha.

**Resultados ocultos e revelação:** enquanto a atividade está aberta, as telas de resultado ficam **ocultas** e mostram só Participantes, Concluíram, Respondendo e o tempo restante. Para revelar, clique em **REVELAR RESULTADOS** (ou **R**): contagem **3 · 2 · 1** e depois a média, gráficos, maior/menor impacto e distribuição. **MOSTRAR RESULTADOS** revela sem a contagem. **Ocultar resultados** (rodapé) esconde de novo.

**Celebrar participação:** botão no rodapé; solta confetes uma única vez. Nunca dispara sozinho.

**Encerrar a atividade:** **ENCERRAR ATIVIDADE** (rodapé do Modo aula ou painel) → confirmação “Tem certeza de que deseja encerrar esta atividade?”. Novas respostas são bloqueadas e abre o **RESULTADO FINAL DA TURMA** (participantes, média, maior e menor impacto, classificação predominante). Dá para **Reabrir respostas** depois.

**Gerar a imagem do resultado:** **GERAR IMAGEM DO RESULTADO** (tela final ou painel). Gera um PNG **1080×1080** com nome da turma, data, participantes, média, gráfico das dimensões e maior/menor impacto (nunca nomes). Uma prévia abre; use **Baixar PNG** (ou **Compartilhar** no celular/tablet).

**Página pública (opcional):** depois de encerrar, ative **Página pública de resultados**. O sistema mostra um QR/link (`/r/CÓDIGO`) com **apenas dados coletivos**. Você pode desativar quando quiser.

**Histórico e comparação:** a lista de turmas em `/professor` mostra data, participantes, média, maior e menor impacto de cada atividade (com busca). **COMPARAR TURMAS** abre uma área separada para comparar de 2 a 6 turmas (média geral e cinco dimensões).

### Desempenho (100 alunos ao mesmo tempo)
- O painel usa **uma única conexão em tempo real** por tela, removida ao sair. As mudanças chegam em pacotes e são aplicadas **de forma incremental** (sem buscar tudo de novo); há uma sincronização completa só ao reconectar e a cada 30 s.
- Cada aluno gera ~3 eventos (entrar, concluir, resposta). Cem alunos = ~300 eventos, dentro do limite do plano gratuito do Supabase (confira “Realtime” em *Project Settings → Billing/Usage* se sua instituição usar muitas turmas ao mesmo tempo).
- Se a rede do aluno falhar no envio, o celular tenta de novo sozinho (sem duplicar resposta).

## 6. Arquitetura

```
Aluno (celular)                 Professor (navegador)
   │  /p/CÓDIGO                      │  /professor/*  (login obrigatório)
   ▼                                 ▼
 Next.js (Vercel) ───────────── Supabase
   │  só chama 3 funções SQL        ├─ Auth: login do professor
   │  (RPC) públicas               ├─ Postgres: teachers, sessions, participants, responses
   │                                └─ Realtime: avisa o painel a cada nova resposta
```

- `src/app/p/[code]` – questionário e resultado do aluno
- `src/app/professor` – login, lista de turmas e painel da sessão
- `src/lib/questions.ts` – perguntas · `scoring.ts` – pontuação · `stats.ts` – estatísticas · `insights.ts` – textos/perguntas de discussão · `live.ts` – tempo real incremental · `timer.ts` – cronômetro · `resultImage.ts` – PNG · `export.ts` – CSV/XLSX
- `src/components/ClassMode.tsx` – Modo aula · `src/hooks/useSessionLive.ts` – tempo real · `useClassTimer.ts` – cronômetro
- `src/app/professor/comparar` – comparação · `src/app/r/[code]` – página pública
- `src/middleware.ts` – bloqueia `/professor/*` sem login
- `supabase/schema.sql` – tabelas, RLS e funções

### Segurança
- Alunos (anônimos) **não têm acesso direto a nenhuma tabela**. Só podem executar: `get_public_session` (nome/status da turma), `start_participant` e `submit_response`.
- `submit_response` valida 20 respostas entre 0 e 3 e **calcula a pontuação no servidor**; o aluno não consegue enviar uma pontuação falsa.
- Envio duplicado: cada participante tem uma única resposta (`unique`); reenviar devolve o resultado já salvo.
- Sessão encerrada rejeita novos participantes **e** envios pendentes.
- RLS: o professor só lê/altera as próprias turmas e respostas. O Realtime respeita o RLS.
- Sem dados pessoais: apenas um apelido opcional, visível só ao professor.

### Limites conhecidos
- Quem tem o código/QR pode abrir várias respostas (não há identificação de alunos, por design anônimo). Para turmas grandes, encerre a sessão ao terminar.
- Se o aluno fechar o navegador, a resposta pendente fica como "respondendo".
- Planos gratuitos do Supabase pausam projetos sem uso por semanas: abra o painel antes da aula.

---

## 7. Roteiro de teste (cenário completo)

1. Entre em `/professor`, crie "Turma Teste" → o QR e o código aparecem.
2. Abra o link/QR em outra aba (ou celular) → responda as 20 perguntas → veja o resultado (confira pontos, classificação e 5 dimensões).
3. No painel: participantes e concluídos passam a 1; médias e gráficos aparecem **sem recarregar**.
4. Responda com um segundo aluno (aba anônima) → painel vai a 2 e as médias mudam.
5. Clique **ENCERRAR QUESTIONÁRIO** → tela final aparece.
6. Abra o link em uma nova aba anônima → mostra "Questionário encerrado".
7. **EXPORTAR CSV/XLSX** → confira as 2 linhas.
8. Teste **Reabrir**, **Duplicar**, **Zerar** e **Excluir**.

Roteiro adicional (Modo aula): abra o Modo aula → confira o QR → entre com ~10 abas/aparelhos e veja o contador subir → inicie um cronômetro de 2 min e confira os avisos → com resultados ocultos, veja só os contadores → **R** (3-2-1) → navegue com as setas e as teclas 1–5 → **ENCERRAR ATIVIDADE** → confirme que um novo aluno vê “Questionário encerrado” → gere a imagem PNG.

## 8. Problemas comuns

| Sintoma | Solução |
|---|---|
| Painel não atualiza ao vivo (aparece "reconectando") | Confira o passo 6 da seção 2. O painel ainda atualiza a cada 10 s. |
| "E-mail ou senha incorretos" | Usuário criado sem *Auto Confirm* ou senha errada: refaça em Authentication → Users. |
| "Atividade não encontrada" | Código digitado errado, ou a turma foi excluída. |
| Erro de função não encontrada | O `schema.sql` não foi executado até o fim: rode de novo (é seguro repetir). |
| Erro ao ativar página pública / histórico sem médias | Rode `supabase/migration-v2.sql` (atualização 2). |
| QR aponta para `localhost` | Defina `NEXT_PUBLIC_SITE_URL` com o endereço do Vercel e faça redeploy. |
