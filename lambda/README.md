# Daily Stand Up Meeting Skill
This is an example skill that lets users submit a daily stand up meeting report. The skill prompts the user for a 4-digit pin then ask three standard agile meeting questions. The responses are then emailed to a manager. 

## Prerequisites / Dependencies
* Amazon Developer Account (https://developer.amazon.com)
* SendGrid.com Account (https://sendgrid.com/)

> **NOTE:** As an alternative to using SendGrid, you could also modify this code to work with other  
> email services like [MailChimp](https://mailchimp.com) or [AWS SES](https://aws.amazon.com/ses/).

## Setup
- Create a new Alexa-Hosted skill using this template.
- Get a Sendgrid API key. See: https://sendgrid.com/docs/ui/account-and-settings/api-keys/
- Create a file named `.env`, in the same location as the index.js file, copy in the following code, and replace the dummy values with your values.
```
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_sender_email
TO_EMAIL=your_recipient_email
```
- Set up team members in the `team.json` file like the example below. Be sure to use a unique 4-digit pin for each user.

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