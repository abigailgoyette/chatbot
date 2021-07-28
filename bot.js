// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory, TurnContext } = require('botbuilder');
const fs = require('fs');

class EchoBot extends ActivityHandler {
    constructor(conversationReferences) {
        super();

        // Jenkins info
        this.conversationReferences = conversationReferences;
        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await next();
        });

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

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
