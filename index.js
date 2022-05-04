const { Client, Intents, MessageEmbed } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { token } = require('./token.json');
const { prefix } = require('./config.json');
const client = new Client({intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]});
class Music {
    isPlaying = false;
    connection = null;
    queue = [];
    player = createAudioPlayer();
    //join
    join(msg) {
        //如果信息发送者在语音频道中
        if (msg.member.voice.channel !== null) {
            //加入语音频道
            this.connection = joinVoiceChannel({
                channelId: msg.member.voice.channel.id,
                guildId: msg.member.voice.channel.guild.id,
                adapterCreator: msg.member.voice.channel.guild.voiceAdapterCreator,
            });
            this.connection.subscribe(this.player);
        } else {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('Please join a channel first')
                        .setDescription('.help for commands')
                ]});
        }
    }
    //play
    async play(msg) {
        //语音频道ID
        const guildID = msg.guild.id;
        //YouTube网址
        const musicURL = msg.content.replace(`${prefix}p`, '').trim();
        //尝试获取Youtube网址信息
        try {
            //获取Youtube视频信息
            const res = await ytdl.getInfo(musicURL);
            const info = res.videoDetails;
            //将歌曲加入队列
            this.queue.push({
                name: info.title,
                url: musicURL,
                stream: ytdl(musicURL, { filter: 'audioonly' })
            });
            //如果目前有音乐播放则加入队列，反之立即播放
            if (this.isPlaying) {
                msg.channel.send({embeds: [
                        new MessageEmbed()
                            .setColor('#3498DB')
                            .setTitle('Track queued:')
                            .setDescription(info.title)
                            .setURL(musicURL)
                            .setTimestamp()
                    ]});
            } else {
                this.isPlaying = true;
                this.playMusic(msg, guildID, this.queue[0]);
            }
        } catch(e) {
            console.log(e);
        }
    }
    playMusic(msg, guildID, musicInfo) {
        //开始播放提示
        msg.channel.send({embeds: [
                new MessageEmbed()
                    .setColor('#3498DB')
                    .setTitle('Now playing:')
                    .setDescription(musicInfo.name)
                    .setURL(musicInfo.url)
                    .setTimestamp()
            ]});
        //播放音乐
        this.player.play(createAudioResource(musicInfo.stream));
        //从队列中移除正在播放的音乐
        this.queue.shift();
        //播放结束时的事件
        this.player.on(AudioPlayerStatus.Idle, () => {
            //如果队列中仍有歌曲
            if (this.queue.length > 0) {
                this.playMusic(msg, guildID, this.queue[0]);
            } else {
                if (this.isPlaying === true) {
                    this.isPlaying = false;
                    msg.channel.send({embeds: [
                            new MessageEmbed()
                                .setColor('#3498DB')
                                .setTitle('End of queue')
                                .setDescription('.help for commands')
                                .setTimestamp()
                        ]});
                    //离开频道
                    this.connection.destroy();
                }
            }
        });
    }
    //resume
    resume(msg) {
        if (this.player) {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#3498DB')
                        .setTitle('Resume playing')
                        .setTimestamp()
                ]});
            //恢复播放
            this.player.unpause();
        }
    }
    //pause
    pause(msg) {
        if (this.player) {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('Pause playing')
                        .setTimestamp()
                ]});
            //暂停播放
            this.player.pause();
        }
    }
    //skip
    skip(msg) {
        if (this.player) {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#2ECC71')
                        .setTitle('Skip current track')
                        .setTimestamp()
                ]});
            //跳过当前曲目
            this.player.stop(true);
        }
    }
    //queue
    nowQueue(msg) {
        //如果queue中有曲目输出曲目队列
        if (this.queue && this.queue.length > 0) {
            //处理字符串，将Object转化为String
            const queueString = this.queue.map((item, index) => `\n[${index+1}] ${item.name}`).join();
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#2ECC71')
                        .setTitle('Current queue:')
                        .setDescription(queueString)
                        .setTimestamp()
                ]});
        } else {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('There\'s no track in queue')
                        .setDescription('.help for commands')
                ]});
        }
    }
    //leave
     leave(msg) {
        if (this.connection != null && this.connection.state.status !== "destroyed") {
            //摧毁connection并离开频道
            this.connection.destroy();
            //清空列表
            this.queue = [];
            //将isPlaying设置为false
            this.isPlaying = false;
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('ヾ(￣▽￣)Bye~Bye~')
                ]});
        } else {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('I\'m not in any channel')
                        .setDescription('.help for commands')
                ]});
        }
    }
}

const music = new Music();
//机器人接收到信息之后的事件
client.on('message', async (msg) => {
    //.join
    if (msg.content === `${prefix}join`) {
        // 加入语音频道
        music.join(msg);
    }
    //如果信息中包含.p
    if (msg.content.indexOf(`${prefix}p`) > -1) {
        //信息发送者是否在語音頻道中
        if (msg.member.voice.channel) {
            //播放音樂
            await music.join(msg);
            await music.play(msg);
        } else {
            //如果信息发送者不在语音频道
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('Please join a channel first')
                        .setDescription('.help for commands')
                ]});
        }
    }
    //.resume
    if (msg.content === `${prefix}resume`) {
        //恢复播放
        music.resume(msg);
    }
    //.pause
    if (msg.content === `${prefix}pause`) {
        // 暂停播放
        music.pause(msg);
    }
    //.skip / .next
    if (msg.content === `${prefix}skip` || msg.content === `${prefix}next`) {
        //跳过当前曲目
        music.skip(msg);
    }
    //.queue
    if (msg.content === `${prefix}queue`) {
        //查看队列
        music.nowQueue(msg);
    }
    //.leave
    if (msg.content === `${prefix}leave` || msg.content === `${prefix}die`) {
        //机器人离开语音频道
        music.leave(msg);
    }
    //.help
    if (msg.content === `${prefix}help`) {
        //输出指令列表
        msg.channel.send({embeds: [
                new MessageEmbed()
                    .setColor('#3498DB')
                    .setTitle('Commands:')
                    .setDescription(
                        '.join - join voice channel\n' +
                        '.p - start playing music :D\n' +
                        '.resume - resume music playing\n' +
                        '.pause - pause music playing\n' +
                        '.skip - skip current track\n' +
                        '.queue - view queue\n' +
                        '.leave - make bot leave voice channel'
                    )
            ]});
    }
});
//加入事件
client.on('voiceStateUpdate', async (oldState, newState) => {
    if(oldState.member.user.bot)return;
    if(newState.channel) {
        if(`${newState.member.user.id}` === `657015362231074864`) {//ROYKMS
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('你召唤了鲤鱼王\n鲤鱼王应该怎么办')
                        .setImage('https://static.pokemonpets.com/images/monsters-images-300-300/129-Magikarp.webp')
                ]});
            this.connection = joinVoiceChannel({
                channelId: newState.channel.id,
                guildId: newState.channel.guild.id,
                adapterCreator: newState.channel.guild.voiceAdapterCreator,
            });
            client.channels.cache.get('855120529539596350').send('.p https://www.youtube.com/watch?v=ycNtbNFXAso&t=8s');
        } else if (`${newState.member.user.id}` === `907089545907011655`) {//YouK1
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('鲨鱼辣椒开启了超级模式')
                        .setImage('http://5b0988e595225.cdn.sohucs.com/images/20180916/cc9b7145843243e19c6e6748ca8ce6bc.jpeg')
                ]});
        } else if (`${newState.member.user.id}` === `905549335490621470`) {//Kurumi
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('你召唤了快龙\n快龙应该怎么办')
                        .setImage('https://static.pokemonpets.com/images/monsters-images-300-300/149-Dragonite.webp')
                ]});
            this.connection = joinVoiceChannel({
                channelId: newState.channel.id,
                guildId: newState.channel.guild.id,
                adapterCreator: newState.channel.guild.voiceAdapterCreator,
            });
            client.channels.cache.get('855120529539596350').send('.p https://www.youtube.com/watch?v=wLL8UVe9x8A');
        } else if (`${newState.member.user.id}` === `704124797994532955`) {//RanuneSoda
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('你召唤了百变怪\n我TM是百变怪变得百变小樱')
                        .setImage('https://imgur.com/kYkbsAO.png')
                ]});
        } else if (`${newState.member.user.id}` === `630882298988068885`) {//王鹤
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('你召唤了可达鸭\n可达鸭应该怎么办')
                        .setImage('https://imgur.com/Qqqqoy0.png')
                ]});
        } else if (`${newState.member.user.id}` === `316210904628985856`) {//Vic
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('你召唤了栗山未来\n今天多久能叠满杀人戒呢?')
                        .setImage('https://imgur.com/o1jWtKf.png')
                ]});
        } else if (`${newState.member.user.id}` === `754046350928248995`) {//EricChen
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('你召唤了咕咕鸽\n今天要鸽多久呢?')
                        .setImage('https://static.pokemonpets.com/images/monsters-images-300-300/520-Tranquill.webp')
                ]});
        }
    }else if (oldState.channel) {
        if(`${newState.member.user.tag}` === `ROYKMS#4068`) {
            client.channels.cache.get('855120529539596350').send({embeds: [
                    new MessageEmbed()
                        .setColor('#F1C40F')
                        .setDescription('鲤鱼王进入濒死状态，\n请使用活力碎片使宝可梦重获生机，\n并回复一半HP')
                        .setImage('https://static1.thegamerimages.com/wordpress/wp-content/uploads/2021/03/pjimage-2021-03-01T164259.341.jpg?q=50&fit=contain&w=943&h=496&dpr=1.5')
                ]});
        }
    }
});
//上线时在console输出
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
client.login(token);