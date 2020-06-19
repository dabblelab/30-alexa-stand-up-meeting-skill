# Daily Stand Up Meeting Skill
This is an example skill that lets users submit a daily stand up meeting report. The skill prompts the user for a pin and three standard agile meeting questions. The responses are then email to a manager. 

## Prerequisites / Dependencies
* Amazon Developer Account (https://developer.amazon.com)
* SendGrid.com Account (https://sendgrid.com/)

## Setup
- Create a new Alexa-Hosted skill using this template.
- Get a Sendgrid API key. See: https://sendgrid.com/docs/ui/account-and-settings/api-keys/
    > NOTE: You could also modify the code to use MailChimp, AWS SES or other 
    > emails providers.
- Create a file named `.env`, copy in the following code, and replace the dummy value(s) begining with 'your_' with your values.
```
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email
TO_EMAIL=your_recipient_email
```
- Set up team members in the `team.json` file like the example below.
```json
[
  { 
    "name": "Steve",
    "email": "steve@test.com",
    "pin": 1111
  },
  { 
    "name": "Gabi",
    "email": "gabi@test.com",
    "pin": 1112
  }
]
```

## Running the Demo
Start the skill by saying: Alexa, start Daily Stand Up

## Resources
For a video tutorial and support for this skill template visit https://dabblelab.com/templates