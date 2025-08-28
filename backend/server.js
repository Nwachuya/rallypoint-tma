const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Telegram Bot
const bot = new TelegramBot(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL;

// Middleware
app.use(express.json());

// Store active polls
const activePolls = new Map();

// Set webhook
bot.setWebHook(`${process.env.WEBHOOK_URL}/webhook`);

// Webhook endpoint
app.post('/webhook', (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Handle /plan command
bot.onText(/\/plan/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, "🎯 Ready to plan an event? Let's set it up!", {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: "Create Event",
                    switch_inline_query_current_chat: "create_event"
                }
            ]]
        }
    });
});

// Handle inline queries
bot.on('inline_query', async (query) => {
    const queryText = query.query;
    console.log('Inline query:', queryText);
    
    if (queryText === 'create_event') {
        const results = [{
            type: 'article',
            id: '1',
            title: '🎯 Create New Event',
            description: 'Plan an event with multiple time options',
            input_message_content: {
                message_text: 'Opening event planner...'
            },
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: "📝 Plan Event",
                        web_app: { url: MINI_APP_URL }
                    }
                ]]
            }
        }];
        
        await bot.answerInlineQuery(query.id, results, {
            cache_time: 0,
            is_personal: true
        });
    }
});

// Handle Mini App data
bot.on('message', async (msg) => {
    if (msg.web_app_data) {
        console.log('Web app data received:', msg.web_app_data.data);
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'User';
        
        try {
            const data = JSON.parse(msg.web_app_data.data);
            const { title, options } = data;
            
            // Create poll message
            const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Initialize poll data
            activePolls.set(pollId, {
                title,
                options: options.map(option => ({ text: option, voters: [] })),
                createdBy: userName,
                chatId
            });
            
            // Create inline keyboard for voting
            const keyboard = options.map((option, index) => [{
                text: `${option} (0)`,
                callback_data: `vote_${pollId}_${index}`
            }]);
            
            const message = `🎯 **${title}**\n\n` +
                           `Created by ${userName}\n\n` +
                           `Please vote for your preferred option:`;
            
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
            
        } catch (error) {
            console.error('Error processing web app data:', error);
        }
    }
});

// Handle voting
bot.on('callback_query', async (query) => {
    const callbackData = query.data;
    
    if (callbackData.startsWith('vote_')) {
        const [, pollId, optionIndex] = callbackData.split('_');
        const poll = activePolls.get(pollId);
        
        if (!poll) {
            bot.answerCallbackQuery(query.id, 'Poll not found');
            return;
        }
        
        const userId = query.from.id;
        const userName = query.from.first_name || 'User';
        const optionIdx = parseInt(optionIndex);
        
        // Remove user from all options first
        poll.options.forEach(option => {
            const voterIndex = option.voters.findIndex(voter => voter.id === userId);
            if (voterIndex > -1) {
                option.voters.splice(voterIndex, 1);
            }
        });
        
        // Add user to selected option
        poll.options[optionIdx].voters.push({ id: userId, name: userName });
        
        // Update the message
        const keyboard = poll.options.map((option, index) => [{
            text: `${option.text} (${option.voters.length})`,
            callback_data: `vote_${pollId}_${index}`
        }]);
        
        let message = `🎯 **${poll.title}**\n\n` +
                     `Created by ${poll.createdBy}\n\n` +
                     `Please vote for your preferred option:\n\n`;
        
        // Add vote summary
        poll.options.forEach(option => {
            if (option.voters.length > 0) {
                message += `**${option.text}:**\n`;
                option.voters.forEach(voter => {
                    message += `• ${voter.name}\n`;
                });
                message += '\n';
            }
        });
        
        try {
            await bot.editMessageText(message, {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
            
            bot.answerCallbackQuery(query.id, `Voted for: ${poll.options[optionIdx].text}`);
        } catch (error) {
            console.error('Error updating poll:', error);
            bot.answerCallbackQuery(query.id, 'Error updating vote');
        }
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'RallyPoint Bot is running!' });
});

app.listen(port, () => {
    console.log(`Bot server running on port ${port}`);
});
