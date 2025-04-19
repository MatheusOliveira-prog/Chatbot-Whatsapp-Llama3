const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const express = require('express');
const axios = require('axios');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const app = express();
app.use(express.json());

app.get('/status', (req, res) => {
    res.send('🤖 Bot WhatsApp está online!');
});
app.listen(3000, () => console.log('🚀 Servidor Express iniciado na porta 3000'));

// Autenticação com vários arquivos
async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔌 Conexão fechada. Reconectando...', shouldReconnect);
            if (shouldReconnect) startSock();
        } else if (connection === 'open') {
            console.log('✅ Conectado com sucesso ao WhatsApp!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        console.log('📩 Mensagem recebida:', texto);

        try {
            // Envia para o servidor Flask com Ollama local
            const response = await axios.post('http://localhost:5000/responder', {
                mensagem: texto
            });

            const resposta = response.data.resposta || 'Desculpe, não consegui entender.';

            await sock.sendMessage(msg.key.remoteJid, { text: resposta });
        } catch (error) {
            console.error('Erro ao chamar o servidor Flask/Ollama:', error.message);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '⚠️ Ocorreu um erro ao gerar a resposta. Tente novamente mais tarde.'
            });
        }
    });
}

startSock();
