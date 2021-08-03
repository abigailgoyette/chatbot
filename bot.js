// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory, TurnContext, CardFactory } = require('botbuilder');
const fs = require('fs');
const Card = require('./Card.json');
const emtpyCard = require('./Card.json');
const { exec } = require("child_process");

class EchoBot extends ActivityHandler {
    constructor(conversationReferences) {
        super();

        // Used for proactive message
        this.conversationReferences = conversationReferences;
        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await next();
        });

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            this.addConversationReference(context.activity);

            var data = "";
            var joburl = "";
            var newdata = ""; 
            var jobname = ""; 
            var editeddata = "";
            var messageText = "";
            var lineRemove = 0;
            var amtRem = 0;
            var adapter = context.adapter;
            var inject = true;
           
            data = fs.readFileSync('link.txt', "utf8");

            // Checks for if the message is from the card or command
            if(context.activity.hasOwnProperty('text')){
                messageText = context.activity.text;

                // Shows all active job
                if(messageText === "show list"){
                    await context.sendActivity(data);
                    await next();

                 // Shows all commands
                }else if(messageText === "command list"){
                    await context.sendActivity("Command list:\n" + " - show list\n" + " - approve (job name)");
                    await next();

                // Gets approve message
                }else if(messageText.substring(0, 7) === "approve"){
                    jobname = messageText.substring(8, messageText.length);

                    //checks for job name
                    var data2 = data.substring(data.indexOf(jobname), data.length);

                    if(data.indexOf(jobname) != -1 && data2.substring(0, data2.indexOf("JOB URL:")-5) === jobname){
                        joburl = data2.substring(data2.indexOf("JOB URL:") + 9, data2.length);

                        // Checks if it's the last job on the list
                        if(joburl.indexOf("JOB NAME:") != -1){
                            joburl = joburl.substring(0, joburl.indexOf("JOB NAME:") - 5);
                        }

                        // Sends card for user to sign into
                        await context.sendActivity({
                            jobtext:`${jobname}`,
                            attachments: [CardFactory.adaptiveCard(Card)]
                        });

                        // Gets the job name and URL for text file
                        joburl = joburl.replace("\n", "");
                        fs.writeFileSync('job_next.txt', jobname + "  ^ " + joburl, 'utf8');
        
                        await next();

                    }else{
                        // Job doesnt exsist
                        await context.sendActivity(`'${jobname}' could not be found.`);
                        await next();
                    }
                }else{
                    // Not a command
                    await context.sendActivity(`'${ messageText }' is not a command, use command list to see all commands.`);
                    await next();
                }
            }else{
                // Card submitted for curl post
                var userinput = context.activity.value.name;
                var usertoken = context.activity.value.token;

                var symbols = ['-', '$', '@', '?', '\\', '\'', '\"', '!', '#', '%', '^', '&', '*', '(', ')', '=', '+', ':', ';', '.', ','];

                joburl = fs.readFileSync('job_next.txt', 'utf8');
                jobname = joburl.substring(0, joburl.indexOf("^")-2);
                joburl = joburl.substring(joburl.indexOf("^")+1, joburl.length)
                
                for(var i = 0; i < symbols.length; i++){
                    if(userinput.indexOf(symbols[i]) != -1){
                        inject = false;
                        i += 20;
                    }
                }

                for(var j = 0; j < symbols.length; j++){
                    if(usertoken.indexOf(symbols[j]) != -1){
                        inject = false;
                        i += 20;
                    }
                }

                if(inject){
                    await context.sendActivity("Processing request. Please wait...");
                    await exec(`curl -X POST -u ${userinput}:${usertoken} ${joburl}build/`, async (error, stdout, stderr) => {
                        if (stderr) {
                            if(stdout.indexOf("head") != -1 || error != null){
                                for (const conversationReference of Object.values(conversationReferences)) {
                                    await adapter.continueConversation(conversationReference, async turnContext => {
                                        await turnContext.sendActivity("Request not approved."+"\n\n"+"Incorrect username or token.");
                                        fs.writeFileSync('job_next.txt', "", 'utf8');
                                    });
                                }
                            }else{
                                editeddata = data.split('\n');
                                lineRemove = lineFinder(editeddata, jobname);
                                while(amtRem < 4){
                                    editeddata.splice(lineRemove, 1);
                                    amtRem++;
                                }
                                                                
                                for(var i = 0; i < editeddata.length - 1; i++){
                                    newdata = newdata + editeddata[i] + "\n";
                                }
                                        
                                // Puts new list into file
                                fs.writeFileSync('link.txt', newdata, 'utf-8');
                    
                                fs.writeFileSync('job_next.txt', "", 'utf8');

                                for (const conversationReference of Object.values(conversationReferences)) {
                                    await adapter.continueConversation(conversationReference, async turnContext => {
                                        await turnContext.sendActivity(`${jobname} has been built.`);
                                    });
                                }
                            }
                        }
                    });
                }else{
                    await context.sendActivity("Illegal Character Usage.");
                    fs.writeFileSync('job_next.txt', "", 'utf8');
                }

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
    
    // Gives proactive message reference
    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.conversation.id] = conversationReference;
    }

}

// Finds which line the job is on in file
function lineFinder(array, jobname){
    for(var i = 0; i < array.length; i++){
        if((" - JOB NAME: " + jobname) === array[i]){
            return i;
        }
    }
}

module.exports.EchoBot = EchoBot;
