const { app } = require('@azure/functions');

const { MongoClient, ServerApiVersion } = require('mongodb');

async function voicegptauth(request, context) {
    context.log(`Http function processed request for url "${request.url}"`);

    const payload  = await request.json();

    try{
        const uri = "mongodb+srv://beodwilson:KR4wiDfW9b4aufzK@voicegpt.tjkpcx1.mongodb.net/?retryWrites=true&w=majority";
        // Create a MongoClient with a MongoClientOptions object to set the Stable API version
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        await client.connect()
        const database = client.db("voicegpt")
        const users = database.collection(("users"))
        const userRecord = await users.findOne({oauthCode: payload.oauthCode})
        const today = new Date()
        if(!userRecord){
            await users.insertOne({numberOfVisits: 1, oauthCode: payload.oauthCode, lastLogin:today})
        }
        else {
            await users.updateOne(
                { "oauthCode" : payload.oauthCode  },
                {
                    $set: {numberOfVisits: userRecord.numberOfVisits+1}
                },
                { upsert: true }
            )
        }
        client.close()
        return {status:200}
    }
    catch(exception) {
        return {status:500, jsonBody : { error:exception.message} }
    }
};

app.http('voicegptauth', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: voicegptauth
});
