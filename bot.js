// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory, TurnContext } = require('botbuilder');
const fs = require('fs');
const { QnAMaker } = require('botbuilder-ai');

class EchoBot extends ActivityHandler {
    constructor(conversationReferences, configuration, qnaOptions) {
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // now create a QnAMaker connector.
        this.qnaMaker = new QnAMaker(configuration, qnaOptions);

        // Jenkins info
        this.conversationReferences = conversationReferences;
        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await next();
        });

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            //Echo bot
            /*
            const replyText = `Echo: ${ context.activity.text }`;
            await context.sendActivity(MessageFactory.text(replyText, replyText));
            */

            //send Jenkins info to chat
            this.addConversationReference(context.activity);
            const messageText = context.activity.text;
            var editeddata = "";
            var newdata = "";
            var data = fs.readFileSync('link.txt', "utf8");
            var lineRemove = 0;
            var amtRem = 0;
            if(messageText === "show list"){
            
                await context.sendActivity(data);
                await next();
            
            }else if(messageText === "command list"){
                await context.sendActivity("Command list:\n"+
                                            " - show list\n"+
                                            " - approve (job name)");
                await next();
            }else if(messageText.substring(0, 7) === "approve"){
                let jobname = messageText.substring(8, messageText.length);
                if(data.indexOf(jobname) != -1){
                    
                    let joburl = data.substring(data.indexOf("JOB URL:", data.indexOf(jobname)) + 9, data.length);
                    if(joburl.indexOf("JOB NAME:") != -1){
                        joburl = joburl.substring(0, joburl.indexOf("JOB NAME:") - 6);
                    }

                    //exucute curl command

                    editeddata = data.split('\n');
                    lineRemove = lineFinder(editeddata, jobname);
                    while(amtRem < 4){
                        editeddata.splice(lineRemove, 1);
                        amtRem++;
                    }
                    
                    for(var i = 0; i < editeddata.length; i++){
                        newdata = newdata + editeddata[i] + "\n";
                    }

                    fs.writeFileSync('link.txt', newdata, 'utf-8');

                    await context.sendActivity(`'${jobname}' has been approved.`);
                    await next();
                }
                else{
                    await context.sendActivity(`'${jobname}' could not be found.`);
                    await next();
                }
            }
            else{
                await context.sendActivity(`'${ messageText }' is not a command, use command list to see all commands.`);
                await next();
            }
                       

            // send user input to QnA Maker.
            const qnaResults = await this.qnaMaker.getAnswers(context);

            // If an answer was received from QnA Maker, send the answer back to the user.
            if (qnaResults[0]) {
                await context.sendActivity(`${ qnaResults[0].answer}`);
            }
            else {
                // If no answers were returned from QnA Maker, reply with help.
                await context.sendActivity('No QnA Maker response was returned.'
                + 'This example uses a QnA Maker Knowledge Base that focuses on smart light bulbs. '
                + `Ask the bot questions like "Why won't it turn on?" or "I need help."`);
            }


             // By calling next() you ensure that the next BotHandler is run.
             await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello! Use \'command list\' to view commands.';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.conversation.id] = conversationReference;
    }

}

function lineFinder(array, jobname){
    for(var i = 0; i < array.length; i++){
        if((" - JOB NAME: " + jobname) === array[i]){
            return i;
        }
    }
}

module.exports.EchoBot = EchoBot;
