import { Configuration, OpenAIApi } from "openai";

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export const handler = async (event) => {

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const client = new TextToSpeechClient(
  {
    credentials: {
    "type": process.env.TYPE,
    "project_id": process.env.PROJECT_ID,
    "private_key_id": process.env.PRIVATE_KEY_ID,
    "private_key": process.env.PRIVATE_KEY.split(String.raw`\n`).join('\n'),
    "client_email": process.env.CLIENT_EMAIL,
    "client_id": process.env.CLIENT_ID,
    "auth_uri": process.env.AUTH_URI,
    "token_uri": process.env.TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL,
    "universe_domain": process.env.UNIVERSE_DOMAIN,
  }
}

);

function splitAndProcessText(inputText) {
    const maxLength = 5000;
    const chunks = [];

    // Split the input text into chunks of maximum length
    for (let i = 0; i < inputText.length; i += maxLength) {
        chunks.push(inputText.slice(i, i + maxLength));
    }

    return chunks;
}

const req = JSON.parse(event.body);

  if (!configuration.apiKey) {
    return {
      statusCode:500,
      error: {
        message: "OpenAI API key not configured!",
      }
    };
  }

  if (!req.prompt || req.prompt.trim().length === 0) {
    return {
      statusCode:400,
      error: {
        message: "Please enter a valid prompt",
      }
    };
  }

  let gptResponse;

  try {
    gptResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: req.prompt }],
    });
  } catch(error) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return {
        error: {
          statusCode:500,
          message: 'An error occurred during your request.',
        }
      }
    }
  }


// The text to syjnthesize
if(!gptResponse) return;
// remove ``` ``` for code in text
const text = gptResponse.data.choices[0].message.content.replace(/`+/g, '');
// console.log(splitAndProcessText(text)[0].length)

// Construct the request
const request = {
input: {text: text},
// Select the language and SSML voice gender
voice: {languageCode: 'en-US', ssmlGender: 'MALE', name: 'en-US-Neural2-J'},
// select the type of audio encoding
audioConfig: {audioEncoding: 'MP3'},
};
let response;
try{
  // Performs the text-to-speech request
[response] = await client.synthesizeSpeech(request);
}
catch(error){
    console.error(`Error with Google API request: ${error.message}`);
    res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
  return;s
}

return { message: gptResponse.data, audio: response.audioContent};




};
