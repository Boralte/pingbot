import { RtmClient, WebClient, RTM_EVENTS, CLIENT_EVENTS } from '@slack/client';
import {
  isMessage,
  isMessageToChannel,
  isFromUser,
  messageContainsText,
} from './utils';

const exec = require('child_process').exec;

const defaultOptions = {
  triggerOnWords: ['ping '],
  includesWords: ['.com', '.it', '.co.uk', '.gov', 'www.'],
  installTriggerWords: ['install'],
  installAndRunTrigger: ['install & run'],
  installIncludesWords: ['/'],
  excuseTriggerWords: ['/sick'],
  messageColor: '#ffb6c1',
  logger: console,
  rtmOptions: {},
};

const norrisbot = (botToken, options = {}) => {
  let botId;

  const opt = Object.assign({}, defaultOptions, options);
  const rtm = new RtmClient(botToken, opt.rtmOptions);
  const web = new WebClient(botToken);

  const postMessage = (channel, text) => {
    const msgOptions = {
      as_user: true,
      attachments: [
        {
          color: opt.messageColor,
          title: text,
        },
      ],
    };

    web.chat.postMessage(channel, '', msgOptions);
    opt.logger.info(`Posting message to ${channel}`, msgOptions);
  };

  rtm.on(RTM_EVENTS.MESSAGE, (event) => {
    console.log(event);
    if (
      isMessage(event) &&
      isMessageToChannel(event) &&
      !isFromUser(event, botId) &&
      messageContainsText(event, opt.triggerOnWords) &&
      messageContainsText(event, opt.includesWords)
    ) {
      let message = event.text.match(/\|(.*)>/);
      message = message ? message.pop() : null;
      if (!message) return postMessage(event.channel, 'No url found');
      console.log(message);
      exec(`ping -c 1 ${message}`, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
        const status = error ? error.message : stdout;
        postMessage(event.channel, status);
      });
    }
    if (
      isMessage(event) &&
      isMessageToChannel(event) &&
      !isFromUser(event, botId) &&
      messageContainsText(event, opt.installTriggerWords)
    ) {
      // let message = event.text.match(/\|(.*)>/);
      // message = message ? message.pop() : null;
      const message = event.text.substring(7);
      if (!message) return postMessage(event.channel, 'No dir found, enclose <dir>');
      console.log(message);
      exec(`cd ${message} && npm i`, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
        if (error) {
          postMessage(event.channel, error.message);
        } else {
          postMessage(event.channel, `installed ${stdout}`);
        }
      });
    }
    if (
      isMessage(event) &&
      isMessageToChannel(event) &&
      !isFromUser(event, botId) &&
      messageContainsText(event, opt.installAndRunTrigger)
    ) {
      // let message = event.text.match(/\|(.*)>/);
      // message = message ? message.pop() : null;
      const message = event.text.substring(13);
      if (!message) return postMessage(event.channel, 'No dir found, enclose <dir>');
      console.log(message);
      exec(`cd ~/${message} && npm i && npm start`, (error, stdout, stderr) => {
        console.log(error, stdout, stderr);
        if (error) {
          postMessage(event.channel, error.message);
        } else {
          postMessage(event.channel, `installed ${stdout}`);
          exec(`cd ~/${message} && npm start`, (err, stdo, stde) => {
            console.log(err, stdo, stde);
            if (err) {
              postMessage(event.channel, err.message);
            } else {
              postMessage(event.channel, `installed ${stdo}`);
            }
          });
        }
      });
    }
  });

  rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    botId = rtmStartData.self.id;
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
  });

  return {
    rtm,
    web,
    start() { rtm.start(); },
  };
};

export default norrisbot;
