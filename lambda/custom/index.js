/*
  ISC License (ISC)
  Copyright (c) 2020 Dabble Lab - http://dabblelab.com

  Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby 
  granted, provided that the above copyright notice and this permission notice appear in all copies.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING 
  ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, 
  DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, 
  WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION 
  WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

/*
  ABOUT: 
  This is an example skill that lets users provide a daily stand up meeting report.

  SETUP:
  See the included README.md file

  RESOURCES:
  For a video tutorial and support visit https://dabblelab.com/templates
*/
const Alexa = require('ask-sdk-core');
const dotenv = require('dotenv');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const handlebars = require('handlebars');
const luxon = require('luxon');

const usersData = require('./users.json');

/* CONSTANTS */
const constants = {
  "FROM_NAME": "Dabble Lab",
  "FROM_EMAIL": "learn@dabblelab.com",
  "NOTIFY_EMAIL": "steve@dabblelab.com",
};

/* LANGUAGE STRINGS */
const languageStrings = {
  //  'de': require('./languages/de.js'),
  //  'de-DE': require('./languages/de-DE.js'),
  'en': require('./languages/en.js'),
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
    const speechText = `Hello. Welcome to the daily stand-up meeting. To continue, I'll need your meeting code.`;
    const repromptText = 'Please tell me your meeting code.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};

const GetCodeHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetCodeIntent';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    let speechText;

    const meetingCode = +currentIntent.slots.MeetingCode.value;
    let codeExists;
    
    for ( let i = 0; i < usersData.length; i++ ) {
      console.log(usersData[i]);
      if ( usersData[i].role === 'user' && usersData[i].meetingCode === meetingCode ) {
        codeExists = true;

        sessionAttributes.userEmail = usersData[i].email;

      } else if ( usersData[i].role === 'manager' ) {
        sessionAttributes.managerEmail = usersData[i].email;
      }
    }

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    if ( meetingCode && codeExists ) {
      // speechText = `${meetingCode}`;
      // console.log(meetingCode);
      
      return handlerInput.responseBuilder
        .addDelegateDirective({
          name: 'GetReportIntent',
          confirmationStatus: 'NONE',
          slots: {}
        })
        .speak(speechText)
        .getResponse();

    } else {
      speechText = `Your meeting code is not valid.`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
  },
};

const GetReportHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetReportIntent';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    let speechText;

    const firstQuestion = currentIntent.slots.firstQuestion.value;
    const secondQuestion = currentIntent.slots.secondQuestion.value;
    const thirdQuestion = currentIntent.slots.thirdQuestion.value;

    sessionAttributes.answer1 = firstQuestion;
    sessionAttributes.answer2 = secondQuestion;
    sessionAttributes.answer3 = thirdQuestion;

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    speechText = `You answered: ${firstQuestion} and ${secondQuestion}`;

    return handlerInput.responseBuilder
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

    const speechText = `This is an Alexa Skill Template from dabblelab.com. You can use this template as the starting point for creating a custom skill or template.`;

    return handlerInput.responseBuilder
      .speak(speechText)
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

    const speakOutput = requestAttributes.t('HELP'),
      repromptOutput = requestAttributes.t('HELP_REPROMPT');

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

/* INTERCEPTORS */
const EnvironmentCheckInterceptor = {
  process(handlerInput) {

    //load environment variable from .env
    const result = dotenv.config();

    //check for process.env.S3_PERSISTENCE_BUCKET
    if (!process.env.S3_PERSISTENCE_BUCKET) {
      handlerInput.attributesManager.setRequestAttributes({ invalidConfig: true });
    }

    //check for process.env.SENDGRID_API_KEY
    if (!process.env.SENDGRID_API_KEY) {
      handlerInput.attributesManager.setRequestAttributes({ invalidConfig: true });
    }

  }
};

const LocalizationInterceptor = {
  process(handlerInput) {
    const { requestEnvelope, attributesManager } = handlerInput;

    const localizationClient = i18n.use(sprintf).init({
      lng: requestEnvelope.request.locale,
      fallbackLng: 'en',
      resources: languageStrings
    });

    localizationClient.localize = function () {
      const args = arguments;
      let values = [];

      for (var i = 1; i < args.length; i++) {
        values.push(args[i]);
      }
      const value = i18n.t(args[0], {
        returnObjects: true,
        postProcess: 'sprintf',
        sprintf: values
      });

      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      } else {
        return value;
      }
    }

    const attributes = attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.localize(...args);
    };
  },
};

/* FUNCTIONS */
function sendEmail(report) {
  
}

function getEmailBodyText(appointmentData) {

  let textBody = `Meeting Details:\n`;

  textBody += `Timezone: {{userTimezone}}\n`,
    textBody += `Name: {{profileName}}\n`,
    textBody += `Email: {{profileEmail}}\n`,
    textBody += `Mobile Number: {{profileMobileNumber}}\n`,
    textBody += `Date: {{appointmentDate}}\n`,
    textBody += `Time: {{appointmentTime}}\n`;

  const textBodyTemplate = handlebars.compile(textBody);

  return textBodyTemplate(appointmentData);

}

function getEmailBodyHtml(appointmentData) {

  let htmlBody = `<strong>Meeting Details:</strong><br/>`;

  htmlBody += `Timezone: {{userTimezone}}<br/>`,
    htmlBody += `Name: {{profileName}}<br/>`,
    htmlBody += `Email: {{profileEmail}}<br/>`,
    htmlBody += `Mobile Number: {{profileMobileNumber}}<br/>`,
    htmlBody += `Date: {{appointmentDate}}<br/>`,
    htmlBody += `Time: {{appointmentTime}}<br/>`;

  const htmlBodyTemplate = handlebars.compile(htmlBody);

  return htmlBodyTemplate(appointmentData);

}

/* LAMBDA SETUP */
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    InvalidConfigHandler,
    LaunchRequestHandler,
    GetCodeHandler,
    GetReportHandler,
    AboutIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addRequestInterceptors(
    EnvironmentCheckInterceptor,
    LocalizationInterceptor
  )
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
