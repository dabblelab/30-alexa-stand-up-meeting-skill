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

// edit the team.json file to add uer pins
const usersData = require('./team.json');

/* CONSTANTS */
// set constants in the .env file. see README.md for details

/* LANGUAGE STRINGS */
const languageStrings = require('./languages/languageStrings');

/* HANDLERS */

// This handler responds when required environment variables
// missing or a .env file has not been created.
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

// This handler validates the user's pin using the values
// in the team.json file.
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

// This handler completes the GetReportIntent by calling the sendEmail
// helper function and confirming that the stand up report was sent.
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

// This function handles syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented
// a handler for the intent or included it in the skill builder below
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

// This function is used for testing and debugging. It will echo back an
// intent name for an intent that does not have a suitable intent handler.
// a respond from this function indicates an intent handler function should
// be created or modified to handle the user's intent.
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

// This function checks to make sure required environment vairables
// exists. This function will only be called if required configuration
// is not found so it's only a utilty function.
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

// This interceptor function is used for localization.
// It uses the i18n module, along with defined language
// string to return localized content. It defaults to 'en'
// if it can't find a matching language.
const LocalizationInterceptor = {
  process(handlerInput) {
    const { requestEnvelope, attributesManager } = handlerInput;

    const localizationClient = i18n.use(sprintf).init({
      lng: requestEnvelope.request.locale,
      fallbackLng: 'en',
      resources: languageStrings,
    });

    localizationClient.localize = (...args) => {
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

// This function saves a copy of the stand up report to S3
// and emails the report using SendGrid.com. This function
// could be modified to use other email services providers
// like https://mailchimp.com or https://aws.amazon.com/ses
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

// A helper function that formats and returns the
// text content for the email notification
function getEmailBodyText(appointmentData) {
  const textBody = 'Stand Up Report for {{name}} ({{reportDate}}):\n\n'
  + 'What did you work on yesterday?\nANSWER: {{yesterday}}\n\n'
  + 'What are you working on today?\nANSWER: {{today}}\n\n'
  + 'What is blocking your progress?\nANSWER: {{blocking}}\n\n';

  const textBodyTemplate = handlebars.compile(textBody);

  return textBodyTemplate(appointmentData);
}

// A helper function that formats and returns the
// html content for the email notification
function getEmailBodyHtml(appointmentData) {
  const htmlBody = '<strong>Stand Up Report for {{name}}  ({{reportDate}}):</strong><br/><br/>'
  + 'What did you work on yesterday?<br/><strong>ANSWER:</strong> {{yesterday}}<br/></br/>'
  + 'What are you working on today?<br/><strong>ANSWER:</strong> {{today}}<br/></br/>'
  + 'What is blocking your progress?<br/><strong>ANSWER:</strong> {{blocking}}<br/></br/>';

  const htmlBodyTemplate = handlebars.compile(htmlBody);

  return htmlBodyTemplate(appointmentData);
}

/* LAMBDA SETUP */

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
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
