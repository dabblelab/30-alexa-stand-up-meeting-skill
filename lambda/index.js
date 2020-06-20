/*
  ISC License (ISC)
  Copyright (c) 2020 Dabble Lab - http://dabblelab.com

  Permission to use, copy, modify, and/or distribute this software for any purpose with or
  without fee is hereby granted, provided that the above copyright notice and this permission
  notice appear in all copies.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
  SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL
  THE AUTHOR BE LIABLE FOR ANY SPECIAL,DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
  WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
  NEGLIGENCE OR OTHERTORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
  OF THIS SOFTWARE.
*/

/*
  ABOUT:
  This is an example skill that lets users schedule an appointment with the skill owner.
  Users can choose a date and time to book an appointment that is then emailed to the skill owner.
  The skill also supports checking a Google calendar for free/busy times.

  SETUP:
  See the included README.md file

  RESOURCES:
  For a video tutorial and support visit https://dabblelab.com/templates
*/

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const handlebars = require('handlebars');
const luxon = require('luxon');
const sgMail = require('@sendgrid/mail');

const usersData = require('./team.json');

/* CONSTANTS */
// set constants in the .env file. see README.md for details

/* LANGUAGE STRINGS */
const languageStrings = {
  //  'de': require('./languages/de.js'),
  //  'de-DE': require('./languages/de-DE.js'),
  en: require('./languages/en.js'),
  //  'en-AU': require('./languages/en-AU.js'),
  //  'en-CA': require('./languages/en-CA.js'),
  //  'en-GB': require('./languages/en-GB.js'),
  //  'en-IN': require('./languages/en-IN.js'),
  'en-US': require('./languages/en-US.js'),
  //  'es' : require('./languages/es.js'),
  //  'es-ES': require('./languages/es-ES.js'),
  //  'es-MX': require('./languages/es-MX.js'),
  //  'es-US': require('./languages/es-US.js'),
  //  'fr' : require('./languages/fr.js'),
  //  'fr-CA': require('./languages/fr-CA.js'),
  //  'fr-FR': require('./languages/fr-FR.js'),
  //  'it' : require('./languages/it.js'),
  //  'it-IT': require('./languages/it-IT.js'),
  //  'ja' : require('./languages/ja.js'),
  //  'ja-JP': require('./languages/ja-JP.js'),
  //  'pt' : require('./languages/pt.js'),
  //  'pt-BR': require('./languages/pt-BR.js'),
};

/* HANDLERS */
const InvalidConfigHandler = {
  canHandle(handlerInput) {
    const attributes = handlerInput.attributesManager.getRequestAttributes();

    const invalidConfig = attributes.invalidConfig || false;

    return invalidConfig;
  },
  handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();

    const speakOutput = requestAttributes.t('ENV_NOT_CONFIGURED');

    return responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();

    const skillName = requestAttributes.t('SKILL_NAME');
    const speakOutput = requestAttributes.t('GREETING', skillName);
    const repromptOutput = requestAttributes.t('GREETING_REPROMPT');

    return responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const GetCodeIntentHandler = {
  canHandle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetCodeIntent'
      && !sessionAttributes.validated;
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    let speechText;

    const meetingCode = +currentIntent.slots.MeetingCode.value;
    let codeExists;

    for (let i = 0; i < usersData.length; i += 1) {
      // console.log(usersData[i]);

      if (usersData[i].pin === meetingCode) {
        codeExists = true;

        sessionAttributes.userEmail = usersData[i].email;
        sessionAttributes.userName = usersData[i].name;
      }
    }

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    if (meetingCode && codeExists) {
      return handlerInput.responseBuilder
        .addDelegateDirective({
          name: 'GetReportIntent',
          confirmationStatus: 'NONE',
          slots: {},
        })
        .speak(speechText)
        .getResponse();
    }
    speechText = 'Your meeting code is not valid.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const GetReportIntentCompleteHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetReportIntent'
      && handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
  },
  async handle(handlerInput) {
    const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();

    const questionYesterday = Alexa.getSlotValue(requestEnvelope, 'questionYesterday');
    const questionToday = Alexa.getSlotValue(requestEnvelope, 'questionToday');
    const questionBlocking = Alexa.getSlotValue(requestEnvelope, 'questionBlocking');

    const reportData = {
      reportDate: luxon.DateTime.local().toLocaleString(luxon.DateTime.DATE_HUGE),
      name: sessionAttributes.userEmail, // TODO:get name from session
      yesterday: questionYesterday,
      today: questionToday,
      blocking: questionBlocking,
    };

    let speechText = 'Thank you. Your report was sent.';

    await sendEmail(reportData).then((result) => {
      speechText = result;
    });

    return responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const AboutIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AboutIntent';
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;
    const requestAttributes = attributesManager.getRequestAttributes();

    const speakOutput = requestAttributes.t('ABOUT');
    const repromptOutput = requestAttributes.t('ABOUT_REPROMPT');

    return responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;

    const requestAttributes = attributesManager.getRequestAttributes();

    const speakOutput = requestAttributes.t('HELP');
    const repromptOutput = requestAttributes.t('HELP_REPROMPT');

    return responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const { attributesManager, responseBuilder } = handlerInput;

    const requestAttributes = attributesManager.getRequestAttributes();

    const speakOutput = requestAttributes.t('CANCEL_STOP_RESPONSE');

    return responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error Request: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
    console.log(`Error handled: ${error.message}`);

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput = requestAttributes.t('ERROR');
    const repromptOutput = requestAttributes.t('ERROR_REPROMPT');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
    // .reprompt('add a reprompt if you want to keep the session open for the user to respond')
      .getResponse();
  },
};

/* INTERCEPTORS */
const EnvironmentCheckInterceptor = {
  process(handlerInput) {
    // load environment variable from .env
    dotenv.config();

    // check for process.env.S3_PERSISTENCE_BUCKET
    if (!process.env.S3_PERSISTENCE_BUCKET) {
      handlerInput.attributesManager.setRequestAttributes({ invalidConfig: true });
    }

    // check for process.env.SENDGRID_API_KEY
    if (!process.env.SENDGRID_API_KEY) {
      handlerInput.attributesManager.setRequestAttributes({ invalidConfig: true });
    }
  },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    const { requestEnvelope, attributesManager } = handlerInput;

    const localizationClient = i18n.use(sprintf).init({
      lng: requestEnvelope.request.locale,
      fallbackLng: 'en',
      resources: languageStrings,
    });

    localizationClient.localize = (...args) => {
      // const args = arguments;
      const values = [];

      for (let i = 1; i < args.length; i += 1) {
        values.push(args[i]);
      }
      const value = i18n.t(args[0], {
        returnObjects: true,
        postProcess: 'sprintf',
        sprintf: values,
      });

      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      }
      return value;
    };

    const attributes = attributesManager.getRequestAttributes();
    attributes.t = (...args) => localizationClient.localize(...args);
  },
};

/* FUNCTIONS */
function sendEmail(reportData) {
  return new Promise(((resolve, reject) => {
    try {
      // save report to s3
      const s3 = new AWS.S3();

      const s3Params = {
        Body: getEmailBodyText(reportData),
        Bucket: process.env.S3_PERSISTENCE_BUCKET,
        Key: `reports/${luxon.DateTime.local().toISODate()}/${reportData.name.replace(/ /g, '-').toLowerCase()}-${luxon.DateTime.utc().toMillis()}.txt`,
      };

      s3.putObject(s3Params, () => {
        const msg = {
          to: process.env.TO_EMAIL,
          from: process.env.FROM_EMAIL,
          subject: `Stand Up Report for ${reportData.name}`,
          text: getEmailBodyText(reportData),
          html: getEmailBodyHtml(reportData),
        };

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        sgMail.send(msg).then(() => {
          // mail done sending
          resolve('Thank you. Your report was sent.');
        });
      });
    } catch (ex) {
      // console.log(`bookAppointment() ERROR: ${ex.message}`);
      reject(ex);
    }
  }));
}

function getEmailBodyText(appointmentData) {
  const textBody = 'Stand Up Report for {{name}} ({{reportDate}}):\n\n'
  + 'What did you work on yesterday?\nANSWER: {{yesterday}}\n\n'
  + 'What are you working on today?\nANSWER: {{today}}\n\n'
  + 'What is blocking your progress?\nANSWER: {{blocking}}\n\n';

  const textBodyTemplate = handlebars.compile(textBody);

  return textBodyTemplate(appointmentData);
}

function getEmailBodyHtml(appointmentData) {
  const htmlBody = '<strong>Stand Up Report for {{name}}  ({{reportDate}}):</strong><br/><br/>'
  + 'What did you work on yesterday?<br/><strong>ANSWER:</strong> {{yesterday}}<br/></br/>'
  + 'What are you working on today?<br/><strong>ANSWER:</strong> {{today}}<br/></br/>'
  + 'What is blocking your progress?<br/><strong>ANSWER:</strong> {{blocking}}<br/></br/>';

  const htmlBodyTemplate = handlebars.compile(htmlBody);

  return htmlBodyTemplate(appointmentData);
}

/* LAMBDA SETUP */
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    InvalidConfigHandler,
    LaunchRequestHandler,
    GetCodeIntentHandler,
    GetReportIntentCompleteHandler,
    AboutIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
  )
  .addRequestInterceptors(
    EnvironmentCheckInterceptor,
    LocalizationInterceptor,
  )
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
