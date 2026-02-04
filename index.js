const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Events
} = require('discord.js');

const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

const filas = {}; // NÃO expira enquanto o bot estiver ligado

// ===== LOGIN =====
client.login(process.env.TOKEN);

// ===== SERVIDOR WEB (pra host grátis) =====
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot online'));
app.listen(PORT, () =>
  console.log(`Servidor web rodando na porta ${PORT}`)
);

// ===== READY =====
client.once(Events.ClientReady, async () => {
  console.log(`Logado como ${client.user.tag}`);

  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('sala')
      .setDescription('Criar uma sala de fila')
  );
});

// ===== INTERAÇÕES =====
client.on(Events.InteractionCreate, async interaction => {

  // ===== COMANDO /sala =====
  if (interaction.isChatInputCommand() && interaction.commandName === 'sala') {
    const modal = new ModalBuilder()
      .setCustomId('modal_sala')
      .setTitle('Criar Sala');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nome')
          .setLabel('Nome da sala')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('modo')
          .setLabel('Modo (1x1, 2x2, 3x3, 4x4)')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('plataforma')
          .setLabel('Plataforma (mobile, emulador, mobilador, mista)')
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('valor')
          .setLabel('Valor / Quantidade')
          .setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // ===== MODAL SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId === 'modal_sala') {
    const nome = interaction.fields.getTextInputValue('nome');
    const modo = interaction.fields.getTextInputValue('modo');
    const plataforma = interaction.fields.getTextInputValue('plataforma');
    const valor = interaction.fields.getTextInputValue('valor');

    const limite = { '1x1': 2, '2x2': 4, '3x3': 6, '4x4': 8 }[modo];

    if (!limite) {
      return interaction.reply({ content: 'Modo inválido.', ephemeral: true });
    }

    const idFila = Date.now().toString();

    filas[idFila] = {
      nome,
      modo,
      plataforma,
      valor,
      limite,
      jogadores: []
    };

    const embed = new EmbedBuilder()
      .setTitle(`📌 ${nome}`)
      .setDescription(
        `🎮 **Modo:** ${modo}\n` +
        `💻 **Plataforma:** ${plataforma}\n` +
        `💰 **Valor:** ${valor}\n\n` +
        `👥 **Fila:** 0 / ${limite}\n\n` +
        `📋 **Jogadores:**\nNinguém ainda`
      )
      .setColor('Green');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${idFila}`)
        .setLabel('Entrar na fila')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`sair_${idFila}`)
        .setLabel('Sair da fila')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // ===== BOTÕES =====
  if (interaction.isButton()) {
    const [acao, idFila] = interaction.customId.split('_');
    const fila = filas[idFila];
    if (!fila) return interaction.reply({ content: 'Fila não encontrada.', ephemeral: true });

    if (acao === 'entrar') {
      if (fila.jogadores.includes(interaction.user.id))
        return interaction.reply({ content: 'Você já está na fila.', ephemeral: true });

      if (fila.jogadores.length >= fila.limite)
        return interaction.reply({ content: 'Fila já está completa.', ephemeral: true });

      fila.jogadores.push(interaction.user.id);
    }

    if (acao === 'sair') {
      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
    }

    const nomes = fila.jogadores
      .map(id => `<@${id}>`)
      .join('\n') || 'Ninguém ainda';

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setDescription(
        `🎮 **Modo:** ${fila.modo}\n` +
        `💻 **Plataforma:** ${fila.plataforma}\n` +
        `💰 **Valor:** ${fila.valor}\n\n` +
        `👥 **Fila:** ${fila.jogadores.length} / ${fila.limite}\n\n` +
        `📋 **Jogadores:**\n${nomes}`
      );

    await interaction.update({ embeds: [embed] });

    if (fila.jogadores.length === fila.limite) {
      interaction.followUp(
        `🔔 **Fila completa!** Vá para a sala **${fila.plataforma}-${fila.modo}**`
      );
    }
  }
});
