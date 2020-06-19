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
- Create a file named `.env`, copy in the following code, and replace the dummy value(s) that begin with 'your_' with your values.
```
SENDGRID_API_KEY=your_sendgrid_api_key
```
- Set up team members and a manager in the `users.json` file like the example below.
```json
[
  { 
    "role": "manager",
    "name": "Gabi Botner",
    "email": "gabi@dabblelab.com"
  },
  { 
    "role": "user",
    "name": "Mary",
    "email": "mary@test.com",
    "pin": 1111
  },
  { 
    "role": "user",
    "name": "David",
    "email": "david@test.com",
    "pin": 1112
  }
]
```

## Running the Demo
Start the skill by saying: Alexa, start Daily Stand Up

## Resources
For a video tutorial and support for this skill template visit https://dabblelab.com/templates