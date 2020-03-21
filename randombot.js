// Bootup needed tools
const fs = require("fs");
const Discord = require("discord.js");
// const http = require("http");
const express = require("express");
const app = express();
app.get("/", (request, response) => {
  response.json("../public/client.js");
});

// const path = require("path");
let serverPrefix = JSON.parse(fs.readFileSync("./.data/prefixes.json", "utf8"));
// const log = require("./util/log.js");
// Load Needed Variables
const { token, prefix, bannedIDs } = require("./config.json");
// Colections
const level = require("./util/level.js");
const client = new Discord.Client();
client.commands = new Discord.Collection();
const cooldowns = new Discord.Collection();

// Command Files Search
const commandFiles = fs
  .readdirSync("./commands")
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Ready Event
client.once("ready", async () => {
  console.log("Bot Starting!");
  console.log(
    `Logged in as ${client.user.tag}, with the ID of ${client.user.id}!`
  );
  console.log(
    `Bot Status: ${client.users.size} Users, ${client.channels.size} Channels in ${client.guilds.size} Servers.`
  );
  client.user.setActivity(`${prefix}help | ${client.guilds.size} servers!`);
  client.user.setStatus(`idle`);
});

// Guild Checking
client.on("guildCreate", guild => {
  console.log(
    `New Server joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`
  );
 // log.joinGuild(guild);
  client.user.setActivity(`${prefix}help | ${client.guilds.size} servers!`);
});

client.on("guildDelete", guild => {
  console.log(`Removed By This Server: ${guild.name} (id: ${guild.id})`);
 // log.leaveGuild(guild);
  client.user.setActivity(`${prefix}help | ${client.guilds.size} servers!`);
});

client.on("guildMemberAdd", async member => {
  const channel = member.guild.channels.find(
    ch => ch.name === "welcome",
    "member-log",
    "welcome-goodbye"
  );
  if (!channel) return;
  //channel.send(`Welcome to the server, ${member}!`, attachment);
  channel.send(`Welcome ${member}! :tada:`);
});

client.on("guildMemberRemove", async member => {
  const channel = member.guild.channels.find(
    ch => ch.name === "welcome",
    "member-log",
    "welcome-goodbye",
    "goodbye"
  );
  if (!channel) return;
  //channel.send(`Welcome to the server, ${member}!`, attachment);
  channel.send(`${member} Just Left :slight_frown:`);
});

// Command Handler
client.on("message", async message => {
    if(message.author.bot) return
  serverPrefix = JSON.parse(fs.readFileSync("./.data/prefixes.json", "utf8"));
  if (message.guild) {
  if (!serverPrefix[message.guild.id]) {
    serverPrefix[message.guild.id] = {
      prefixes: prefix
    };
  }
  var usePrefix = serverPrefix[message.guild.id].prefixes;
  } else var usePrefix = prefix;
  // usePrefix = prefix
  if (!message.content.startsWith(usePrefix)) return level(message);
  const args = message.content.slice(prefix.length).split(/ +/);
  const commandName = args.shift().toLowerCase();
  const argstring = args.slice(0).join(" ");
  const command =
    client.commands.get(commandName) ||
    client.commands.find(
      cmd => cmd.aliases && cmd.aliases.includes(commandName)
    );
  if (!command) return;
  const messageAuthor = `${message.author.tag} with the ID of ${message.author.id}`;
  console.log(
    ` ${message.author.tag} with the ID of ${message.author.id} used the command ${prefix}${commandName} ${argstring} `
  );
  //  log.logCommand(message, argstring, commandName, messageAuthor)
  if (command.guildOnly && message.channel.type !== "text") {
    message.react("❌");
    const guildCommand = new Discord.RichEmbed()
      .setColor("RED")
      .setTitle("Error")
      .setDescription(`Guild-Only Command`)
      .addField(
        `This Command Is Only Avaible To Servers!`,
        `Command: ${usePrefix}${commandName}`
      )
      .setTimestamp()
      .setFooter("Beep Boop Bop! Im a bot using discord.js!");
    message.reply(guildCommand);
    return;
  }
  if (command.args && !args.length) {
    if (command.usage) {
      message.react("❌");
      const commandHelp = new Discord.RichEmbed()
        .setColor("RANDOM")
        .setTitle("Help")
        .setDescription(`${usePrefix}${commandName} Help `)
        .addField(`Command Name `, commandName)
        .addField(
          "Command Usage",
          `${usePrefix}${commandName} ${command.usage}`
        )
        .setTimestamp()
        .setFooter("Beep Boop Bop! Im a bot using discord.js!");
      message.reply(commandHelp);
      return;
    }
  }
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }
  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;
  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      message.react("❌");
      const commandCooldown = new Discord.RichEmbed()
        .setColor("RED")
        .setTitle("Slowdown!")
        .setDescription(
          `Wow Wow Wow Buddy! You Need To Wait Before Using This Command Again!`
        )
        .addField(`Command:`, `${usePrefix}${commandName}`)
        .addField("Time Left:", `${Math.ceil(timeLeft.toFixed(1))} seconds`)
        .setTimestamp()
        .setFooter("Beep Boop Bop! Im a bot using discord.js!");
      message.reply(commandCooldown);
      return;
    }
  }
  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  if (message.author.id == bannedIDs) {
    message.reply("You are banned from the Bot!");
    return;
  } else
    try {
      command.execute(message, args, argstring, commandName);
    } catch (error) {
      console.error(error);
    //        log.logError(message, commandName, error)
      message.react("❌");
      const commandCrash = new Discord.RichEmbed()
        .setColor("RED")
        .setTitle("Error")
        .setDescription(`Skrrrt Crash!`)
        .addField(
          `Aw Man! The Command Has Crashed! To Protect The Bot The Command Has Been Stopped`,
          `Command: ${usePrefix}${commandName}`
        )
        .addField("Error Log:", error, true)
        .setTimestamp()
        .setFooter("Beep Boop Bop! Im a bot using discord.js!");
      message.reply(commandCrash);
      return;
    }
});

// Error Checking & Logon
client.on("error", error => {
  console.error("The websocket connection encountered an error:", error);
}),
  process.on("unhandledRejection", error => {
    console.error("Unhandled promise rejection:", error);
  });
client.on("error", console.error);
client.login(process.env.TOKEN);
// Express Modules

app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});