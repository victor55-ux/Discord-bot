const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// ================= CONFIG =================
const GUILD_ID = "1467192095725846612";
const DONO_NOME = "plrelikia";

// ================= FILAS (SALVAS EM ARQUIVO) =================
let filas = {};

if (fs.existsSync("./filas.json")) {
  filas = JSON.parse(fs.readFileSync("./filas.json", "utf8"));
}

function salvarFilas() {
  fs.writeFileSync("./filas.json", JSON.stringify(filas, null, 2));
}

// ================= READY =================
client.once("ready", async () => {
  console.log(`🤖 Online como ${client.user.tag}`);

  const cmd = new SlashCommandBuilder()
    .setName("sala")
    .setDescription("Criar filas");

  await client.application.commands.create(cmd, GUILD_ID);
});

// ================= /sala =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "sala") return;

  const modal = new ModalBuilder()
    .setCustomId("modal_sala")
    .setTitle("Criar Filas");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("valor")
        .setLabel("Valor da sala")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("plataforma")
        .setLabel("Plataforma (mobile, emulador...)")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(30)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("modo")
        .setLabel("Modo (1x1, 2x2, 3x3, 4x4)")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("quantidade")
        .setLabel("Quantas filas criar?")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
    )
  );

  await interaction.showModal(modal);
});

// ================= MODAL SUBMIT =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modal_sala") return;

  const valor = interaction.fields.getTextInputValue("valor");
  const plataforma = interaction.fields.getTextInputValue("plataforma").toLowerCase();
  const modo = interaction.fields.getTextInputValue("modo");
  const quantidade = parseInt(interaction.fields.getTextInputValue("quantidade"));

  const limites = {
    "1x1": 2,
    "2x2": 4,
    "3x3": 6,
    "4x4": 8
  };

  const limite = limites[modo];
  if (!limite || isNaN(quantidade)) {
    return interaction.reply({ content: "❌ Dados inválidos.", ephemeral: true });
  }

  for (let i = 1; i <= quantidade; i++) {
    const filaId = `${plataforma}-${modo}-${Date.now()}-${i}`;

    filas[filaId] = {
      membros: [],
      limite,
      plataforma,
      modo
    };

    salvarFilas();

    const embed = new EmbedBuilder()
      .setColor("#00d4ff")
      .setTitle("🎮 SALA APOSTADA")
      .addFields(
        { name: "💰 Valor", value: valor, inline: true },
        { name: "🖥 Plataforma", value: plataforma, inline: true },
        { name: "👥 Modo", value: modo, inline: true },
        { name: "⏳ Faltam", value: `${limite}`, inline: true }
      )
      .setFooter({ text: `Sistema by ${DONO_NOME}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${filaId}`)
        .setLabel("Entrar na fila")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`sair_${filaId}`)
        .setLabel("Sair da fila")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
  }

  await interaction.reply({ content: "✅ Filas criadas!", ephemeral: true });
});

// ================= BOTÕES (ILIMITADO) =================
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const [acao, filaId] = interaction.customId.split("_");
  const fila = filas[filaId];

  if (!fila) {
    return interaction.reply({
      content: "❌ Fila não encontrada (bot reiniciou antes de salvar).",
      ephemeral: true
    });
  }

  const userId = interaction.user.id;

  if (acao === "entrar") {
    if (fila.membros.includes(userId))
      return interaction.reply({ content: "⚠️ Você já está na fila.", ephemeral: true });

    if (fila.membros.length >= fila.limite)
      return interaction.reply({ content: "⛔ Fila cheia.", ephemeral: true });

    fila.membros.push(userId);
    salvarFilas();

    await interaction.reply({ content: "✅ Entrou na fila!", ephemeral: true });
  }

  if (acao === "sair") {
    if (!fila.membros.includes(userId))
      return interaction.reply({ content: "⚠️ Você não está na fila.", ephemeral: true });

    fila.membros = fila.membros.filter(id => id !== userId);
    salvarFilas();

    await interaction.reply({ content: "❌ Saiu da fila.", ephemeral: true });
  }

  const faltam = fila.limite - fila.membros.length;
  const embedAtualizado = EmbedBuilder.from(interaction.message.embeds[0]);
  embedAtualizado.data.fields[3].value = `${faltam}`;

  await interaction.message.edit({ embeds: [embedAtualizado] });

  if (fila.membros.length === fila.limite) {
    const nomeCanal = `${fila.plataforma}-${fila.modo}`;
    const canal = interaction.guild.channels.cache.find(
      c => c.name === nomeCanal && c.isTextBased()
    );

    if (canal) {
      for (const id of fila.membros) {
        await canal.permissionOverwrites.edit(id, {
          ViewChannel: true,
          SendMessages: true
        });
      }
      canal.send(`✅ **Fila completa!** Acesse **${nomeCanal}**`);
    }
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

// ===== SERVIDOR WEB =====
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot rodando 24/7!'));
app.listen(PORT, () => console.log(`Servidor web rodando na porta ${PORT}`));
