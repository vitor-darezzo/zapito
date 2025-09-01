# 🤖 Zapito — Chatbot para WhatsApp com API Oficial

Zapito é um chatbot para WhatsApp baseado na API oficial da Meta, usando Node.js, Express, MongoDB e webhook validado. Foi desenvolvido para empresas que desejam automatizar o atendimento com fluxo inteligente e persistência de estado.

---

## 🚀 Funcionalidades

- Menus interativos via **templates do WhatsApp Business**
- Sessões persistentes por cliente
- Direcionamento automático para vendedores ou SAC
- Registro de interações no MongoDB
- Comando especial `dev_reset` para testes locais
- Compatível com API oficial da Meta

---

## 📦 Tecnologias

- Node.js
- Express
- MongoDB (local ou Atlas)
- PM2 (produção)
- ngrok (testes locais)
- API oficial do WhatsApp (Meta Cloud API)

---

## 📁 Estrutura básica

```
zapito/
├── routes/
├── controllers/
├── models/
├── services/
├── config/
├── .env
├── zapito-server.js
└── README.md
```

---

## ⚙️ Variáveis de ambiente (.env)

```env
WHATSAPP_TOKEN=seu_token_meta
WHATSAPP_PHONE_ID=000000000000000
APP_SECRET=seu_app_secret_meta
MONGODB_URI=mongodb://localhost:27017/zapito
PORT=3000
VERIFY_TOKEN=token_de_verificacao
RESTART_KEYS=vitoreocara2025,dev_reset
NODE_ENV=development
```

---

## 🧪 Como testar localmente

### 1. Inicie o MongoDB

```bash
mongod
# ou
sudo systemctl start mongod
```

---

### 2. Verifique se a porta 3000 está livre

```bash
netstat -aon | findstr :3000
taskkill /PID <PID> /F
```

---

### 3. Rode o ngrok para expor o servidor

```bash
ngrok http 3000
```

Copie a URL gerada (ex: `https://xyz123.ngrok.io`)

---

### 4. Configure o Webhook no Meta Developers

- Vá até o [Meta for Developers](https://developers.facebook.com/)
- Acesse seu App > WhatsApp > Configurações
- Insira o link do webhook:  
  `https://xyz123.ngrok.io/webhook`
- Use o token configurado no `.env`
- Marque os campos: `messages`, `message_status`, `contacts`

---

### 5. Execute o Zapito

```bash
npm install
npm run dev
```

Logs esperados:

```
✅ Conectado ao MongoDB
🟢 Zapito ouvindo em http://localhost:3000
```

---

### 6. Envie mensagem no número de teste

- Use o número de teste do WhatsApp fornecido pela Meta
- Envie uma mensagem (ex: “oi”)
- O Zapito responderá com o menu ou mensagens automáticas

---

## 🛠 Comandos úteis

| Ação                          | Comando                        |
|------------------------------|--------------------------------|
| Reiniciar sessão (modo dev)  | Envie: `dev_reset`             |
| Subir com PM2 (produção)     | `pm2 start zapito-server.js`   |
| Ver logs                     | `npm run dev` ou `pm2 logs`    |
| Matar porta travada          | `netstat + taskkill`           |

---

## 📊 Em breve

- Frontend com painel de interações
- Filtro por cliente, data, status
- Dashboard com métricas e KPIs
- Exportação de histórico

