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

    speechText = `You answered: ${firstQuestion} and ${secondQuestion}.`;
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

function sendEmail(report) {
  
}

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetCodeHandler,
    GetReportHandler,
    AboutIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
