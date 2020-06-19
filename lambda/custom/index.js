 /* 
 * Copyright (C) 2020 Dabble Lab - All Rights Reserved
 * You may use, distribute and modify this code under the 
 * terms and conditions defined in file 'LICENSE.txt', which 
 * is part of this source code package.
 *
 * For additional copyright information please
 * visit : http://dabblelab.com/copyright
 */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const handlebars = require('handlebars');
const sgMail = require('@sendgrid/mail');
const dotenv = require('dotenv');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const usersData = require('./users.json');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = `Hello. Welcome to the daily stand-up meeting. To continue, I’ll need your meeting code.`;
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
        sessionAttributes.userName = usersData[i].name;

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

    const firstAnswer = currentIntent.slots.firstQuestion.value;
    const secondAnswer = currentIntent.slots.secondQuestion.value;
    const thirdAnswer = currentIntent.slots.thirdQuestion.value;

    sessionAttributes.answer1 = firstAnswer;
    sessionAttributes.answer2 = secondAnswer;
    sessionAttributes.answer3 = thirdAnswer;

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    
    if ( thirdAnswer === 'no' ) {
      speechText = `Alright. That’s it for today’s stand up. Thanks so much for your report.`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();

    } else if ( thirdAnswer === 'yes' ) {

      return handlerInput.responseBuilder
        .addDelegateDirective({
          name: 'ProgressBlockingIntent',
          confirmationStatus: 'NONE',
          slots: {}
        })
        .getResponse();
    }
  },
};

const ProgressBlockingHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ProgressBlockingIntent';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    let speechText;

    const firstAnswer = sessionAttributes.answer1;
    const secondAnswer = sessionAttributes.answer2;
    const thirdAnswer = sessionAttributes.answer3;
    const fourthAnswer = currentIntent.slots.progressBlock.value;

    sessionAttributes.answer4 = fourthAnswer;

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    
    speechText = `Alright. That’s it for today’s stand up. Thanks so much for your report.`;

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
    const speechText = 'Replace this with your help message';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
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
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
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
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

function getEmailBodyText(reportData) {

  let textBody = `A daily report has been accepted by Alexa. Here are the details:\n`;

  textBody += `Name: {{userName}}\n`,
    textBody += `Email: {{userEmail}}\n`,
    textBody += `Work progress: {{answer1}}\n`,
    textBody += `Work to do: {{answer2}}\n`,
    textBody += `Progress blocked: {{answer3}}\n`,
    textBody += `Reason of blocking: {{answer4}}\n`;

  const textBodyTemplate = handlebars.compile(textBody);

  return textBodyTemplate(reportData);

}

function getEmailBodyHtml(reportData) {

  let htmlBody = `<strong>A daily report has been accepted by Alexa. Here are the details:</strong><br/>`;

  htmlBody += `Name: {{userName}}<br/>`,
    htmlBody += `Email: {{userEmail}}<br/>`,
    htmlBody += `Work progress: {{answer1}}<br/>`,
    htmlBody += `Work to do: {{answer2}}<br/>`,
    htmlBody += `Progress blocked: {{answer3}}<br/>`,
    htmlBody += `Reason of blocking: {{answer4}}<br/>`;

  const htmlBodyTemplate = handlebars.compile(htmlBody);

  return htmlBodyTemplate(reportData);

}

function saveAppointmentS3(reportData) {

  return new Promise(function (resolve, reject) {
    const s3 = new AWS.S3();

    const params = {
      Body: value,
      Bucket: process.env.S3_PERSISTENCE_BUCKET,
      Key: `reports/${reportData.reportDate}/${event.title.replace(/ /g, "-").toLowerCase()}-${luxon.DateTime.utc().toMillis()}.txt`
    };

    s3.putObject(params, function (err, data) {
      if (err) {
        // error
        console.log(err, err.stack);
        reject(err);
      }
      else {
        //success
        console.log(data);
        resolve(value);
      }
    });
  });
}

/* LAMBDA SETUP */
const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetCodeHandler,
    GetReportHandler,
    ProgressBlockingHandler,
    AboutIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
