const { app } = require('@azure/functions');

const { OpenAI } = require("openai");

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

async function voicegptprompt(request, context) {
    context.log(`Http function processed request for url "${request.url}"`);

    const openai = new OpenAI({
        apiKey: process.env["OPENAI_API_KEY"]
    });

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

    const req = await request.json();

    if (!process.env["OPENAI_API_KEY"]) {

        context.error("OpenAI API key not configured!");

        return {
            status: 500,
            jsonBody: {
                error: {
                    message: "OpenAI API key not configured!",
                }
            }
        };
    }

    if (!req.prompt || req.prompt.trim().length === 0) {

        context.error("Please enter a valid prompt");

        return {
            status: 400,
            jsonBody: {
                error: {
                    message: "Please enter a valid prompt",
                }
            }
        };
    }

    let gptResponse;

    try {

        gptResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: req.prompt }],
        });

    } catch (error) {
        if (error.response) {
            context.error(error.response.status, error.response.data);
        } else {
            context.error(`Error with OpenAI API request: ${error.message}`);
            return {
                status: 500,
                jsonBody: {
                    error: {
                        message: 'An error occurred during your request.',
                    }
                }
            }
        }
    }

    // The text to syjnthesize
    if (!gptResponse) return;
    // remove ``` ``` for code in text
    const text = gptResponse.choices[0].message.content.replace(/`+/g, '');
    // console.log(splitAndProcessText(text)[0].length)

    // Construct the text-to-speech request
    const ttsRequest = {
        input: { text: text },
        // Select the language and SSML voice gender
        voice: { languageCode: 'en-US', ssmlGender: 'MALE', name: 'en-US-Neural2-J' },
        // select the type of audio encoding
        audioConfig: { audioEncoding: 'MP3' },
    };
    let response;
    try {
        // Performs the text-to-speech request
        [response] = await client.synthesizeSpeech(ttsRequest);
    }
    catch (error) {

        context.error(`Error with Google API request: ${error.message}`);
        return {
            status: 500,
            jsonBody: {
                error: {
                    message: 'An error occurred during your request.',
                }
            }
        }
    }

    // context.log({ message: gptResponse.data, audio: response.audioContent });

    return { jsonBody: { message: gptResponse, audio: response.audioContent } };


}

app.http('voicegptprompt', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: voicegptprompt
});
