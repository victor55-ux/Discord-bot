const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

// ==================== CONFIGURAÇÕES ====================
const DONO_ID = '1468242843205238901'; // seu ID
const SOCIO_ROLE = 'sócio'; // nome do cargo sócio
const GUILD_ID = '1467192095725846612'; // sua guilda

// ==================== CLIENT ====================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// ==================== JSON DAS FILAS ====================
const FILAS_FILE = './filas.json';
let filas = {};

function salvarFilas() {
    fs.writeFileSync(FILAS_FILE, JSON.stringify(filas, null, 2));
}

function carregarFilas() {
    if (fs.existsSync(FILAS_FILE)) {
        filas = JSON.parse(fs.readFileSync(FILAS_FILE));
    }
}
carregarFilas();

// ==================== COMANDO /SALA ====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'sala') {
        // Criar embed inicial
        const embed = new EmbedBuilder()
            .setTitle('Painel de Fila')
            .setDescription('Preencha as 4 caixas e use os botões abaixo para entrar ou sair da fila')
            .setColor('Blue');

        // Botões de entrar/sair
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('entrar_fila')
                    .setLabel('Entrar na fila')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('sair_fila')
                    .setLabel('Sair da fila')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// ==================== BOTÕES ====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;
    const member = interaction.member;

    // Apenas dono ou sócio podem entrar
    const podeEntrar = userId === DONO_ID || member.roles.cache.some(r => r.name === SOCIO_ROLE);

    if (!podeEntrar) {
        return interaction.reply({ content: 'Apenas o dono ou sócio pode entrar na fila para testes.', ephemeral: true });
    }

    const customId = interaction.customId;

    if (!filas[customId]) filas[customId] = [];

    if (customId === 'entrar_fila') {
        if (!filas[customId].includes(userId)) {
            filas[customId].push(userId);
            salvarFilas();
            await interaction.reply({ content: 'Você entrou na fila ✅', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Você já está na fila.', ephemeral: true });
        }
    }

    if (customId === 'sair_fila') {
        if (filas[customId].includes(userId)) {
            filas[customId] = filas[customId].filter(id => id !== userId);
            salvarFilas();
            await interaction.reply({ content: 'Você saiu da fila ❌', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Você não está na fila.', ephemeral: true });
        }
    }

    // Exemplo de fila completa: aqui você define o limite da fila
    const LIMITE_FILA = 2; // coloque o limite real que quiser
    if (filas[customId].length >= LIMITE_FILA) {
        // Exibir qual sala acessar
        const sala = 'mobile-1x1'; // aqui você pode calcular baseado nas opções de plataforma/modo
        const guild = client.guilds.cache.get(GUILD_ID);
        const canal = guild.channels.cache.find(c => c.name === sala);
        if (canal) {
            canal.send(`Fila completa! Acesse a sala: ${canal}`);
        }
    }
});

// ==================== LOGIN ====================
client.login(process.env.TOKEN);

client.on('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

// ==================== EXPRESS PARA RENDER ====================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot rodando 24/7!'));
app.listen(PORT, () => console.log(`Servidor web rodando na porta ${PORT}`));
