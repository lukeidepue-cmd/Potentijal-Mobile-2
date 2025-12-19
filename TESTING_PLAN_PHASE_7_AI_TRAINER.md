# Testing Plan: Phase 7 - AI Trainer Feature

## Overview
This testing guide covers the AI Trainer feature (Section 7 from the documentation). The AI Trainer is a personalized chatbot that has access to all user data (workouts, games, practices, meals) and provides personalized training advice.

## Prerequisites
1. **OpenAI API Key Setup**: 
   - You need to set up an OpenAI API key to test this feature
   - **IMPORTANT**: The API key is stored securely in Supabase, NOT in your frontend code
   - Follow the setup instructions in `AI_TRAINER_SETUP.md`:
     - Deploy the Supabase Edge Function: `supabase functions deploy ai-trainer`
     - Set the API key as a secret: `supabase secrets set OPENAI_API_KEY=your_api_key_here`
   - Note: You can get an API key from https://platform.openai.com/api-keys

2. **User Data**: 
   - Have at least one logged workout
   - Optionally have logged games, practices, and meals for more comprehensive testing

## Testing Checklist

### 7.1: AI Trainer Button Visibility and Access

#### 7.1.1: Button Appearance
- [ ] Navigate to the Home tab
- [ ] Verify a circular button with a sparkles icon appears in the bottom left corner
- [ ] Verify the button is sticky (stays in position when scrolling)
- [ ] Verify the button has a green/primary color background
- [ ] Verify the button has proper shadow/elevation

#### 7.1.2: Button Interaction
- [ ] Tap the AI Trainer button
- [ ] Verify the chat interface expands to full screen
- [ ] Verify a smooth slide-up animation occurs
- [ ] Verify the button is accessible from all sport modes (lifting, basketball, football, etc.)

### 7.2: Chat Interface

#### 7.2.1: Initial State
- [ ] Verify the chat opens with a welcome message from the AI Trainer
- [ ] Verify the welcome message mentions the AI has access to workouts, games, practices, and meals
- [ ] Verify the header shows "AI Trainer" title
- [ ] Verify the header shows "Your personalized training coach" subtitle
- [ ] Verify a back arrow button is visible in the top left

#### 7.2.2: Chat UI Elements
- [ ] Verify the input field is at the bottom of the screen
- [ ] Verify the input field has placeholder text: "Ask me anything about your training..."
- [ ] Verify a send button is next to the input field
- [ ] Verify the send button is disabled when input is empty
- [ ] Verify the send button is enabled when text is entered
- [ ] Verify messages appear in chat bubbles
- [ ] Verify user messages appear on the right with green/primary color
- [ ] Verify AI messages appear on the left with dark background

#### 7.2.3: Closing the Chat
- [ ] Tap the back arrow in the header
- [ ] Verify the chat closes and returns to the Home tab
- [ ] Verify the AI Trainer button is still visible after closing

### 7.3: AI Responses and Context

#### 7.3.1: Basic Questions
- [ ] Ask: "What sports do I play?"
- [ ] Verify the AI responds with your actual sports from your profile
- [ ] Ask: "How can I improve my bench press?"
- [ ] Verify the AI provides relevant advice
- [ ] Ask: "What workouts have I done recently?"
- [ ] Verify the AI references your actual recent workouts

#### 7.3.2: Personalized Advice
- [ ] Ask: "Based on my recent workouts, what should I focus on?"
- [ ] Verify the AI references specific exercises or workouts you've logged
- [ ] Ask: "How is my diet looking?"
- [ ] Verify the AI references your meal data if you have logged meals
- [ ] Ask: "What's my progress in [specific exercise]?"
- [ ] Verify the AI can reference specific exercises from your workouts

#### 7.3.3: Context Memory
- [ ] Tell the AI: "I have a leg injury for the next month"
- [ ] Ask: "What workouts should I do?"
- [ ] Verify the AI takes the injury into account in its recommendations
- [ ] Ask follow-up questions about training
- [ ] Verify the AI remembers the injury context

#### 7.3.4: Data Integration
- [ ] Ask about a specific game you logged
- [ ] Verify the AI can reference game stats and results
- [ ] Ask about a specific practice you logged
- [ ] Verify the AI can reference practice drills and notes
- [ ] Ask about your meal tracking
- [ ] Verify the AI can reference your macro intake

### 7.4: Error Handling

#### 7.4.1: No API Key
- [ ] Remove or invalidate the `OPENAI_API_KEY` secret from Supabase
- [ ] Try to send a message
- [ ] Verify an appropriate error message is shown
- [ ] Verify the error message indicates the service is not configured
- [ ] Re-add the secret and verify it works again

#### 7.4.2: Network Errors
- [ ] Turn off internet connection
- [ ] Try to send a message
- [ ] Verify an appropriate error message is shown
- [ ] Verify the app doesn't crash

#### 7.4.3: Empty Responses
- [ ] Send a message that might cause an empty response
- [ ] Verify the app handles empty responses gracefully
- [ ] Verify an error message is shown if the AI doesn't respond

### 7.5: Performance and UX

#### 7.5.1: Loading States
- [ ] Send a message
- [ ] Verify a loading indicator appears while waiting for AI response
- [ ] Verify the loading indicator is in the assistant message bubble style
- [ ] Verify the input is disabled while loading

#### 7.5.2: Message History
- [ ] Send multiple messages in a conversation
- [ ] Verify all messages are displayed in order
- [ ] Verify the conversation history is maintained during the session
- [ ] Verify scrolling works properly with many messages

#### 7.5.3: Keyboard Handling
- [ ] Open the chat
- [ ] Tap the input field
- [ ] Verify the keyboard appears
- [ ] Verify the input field and send button remain visible above the keyboard
- [ ] Verify messages are still visible when keyboard is open
- [ ] Verify the chat scrolls to show new messages when keyboard is open

### 7.6: Edge Cases

#### 7.6.1: No User Data
- [ ] Test with a new account that has no workouts, games, practices, or meals
- [ ] Ask: "What workouts have I done?"
- [ ] Verify the AI handles the empty data gracefully
- [ ] Verify the AI still provides general advice

#### 7.6.2: Long Messages
- [ ] Send a very long message (500+ characters)
- [ ] Verify the message is sent successfully
- [ ] Verify the AI response is displayed correctly even if it's long
- [ ] Verify scrolling works for long messages

#### 7.6.3: Special Characters
- [ ] Send messages with special characters, emojis, or numbers
- [ ] Verify all characters are displayed correctly
- [ ] Verify the AI can understand and respond appropriately

### 7.7: Integration with Home Tab

#### 7.7.1: Button Positioning
- [ ] Verify the button doesn't overlap with other UI elements
- [ ] Verify the button is accessible on different screen sizes
- [ ] Verify the button respects safe area insets (not hidden by home indicator)

#### 7.7.2: Mode Switching
- [ ] Open the AI Trainer from lifting mode
- [ ] Close it and switch to basketball mode
- [ ] Open the AI Trainer again
- [ ] Verify it works correctly in all modes

## Known Issues / Notes

### Setup Requirements
- The AI Trainer requires an OpenAI API key to function
- Without the API key, users will see an error message
- The API key should be kept secure and not committed to version control

### Cost Considerations
- Each message sent to the AI uses OpenAI API credits
- The current implementation uses `gpt-4o-mini` which is cost-effective
- Monitor API usage to avoid unexpected costs

### Future Enhancements (Not in Current Scope)
- Premium feature gating (will be added in Section 8)
- Conversation history persistence across app sessions
- Voice input support
- Image analysis for form checks

## Testing Tips

1. **Start Simple**: Begin with basic questions to verify the AI is responding
2. **Test Data Integration**: Make sure you have some logged data before testing personalized questions
3. **Check Console**: Look for any error logs in the terminal/console
4. **Test Error Cases**: Don't just test the happy path - verify error handling works
5. **Test on Real Device**: Some keyboard/UI behaviors may differ on real devices vs. simulator

## Success Criteria

✅ All checklist items should be tested and verified
✅ The AI Trainer should provide relevant, personalized advice based on user data
✅ The UI should be smooth and responsive
✅ Error handling should be graceful and informative
✅ The feature should work across all sport modes

## Reporting Issues

When reporting issues, please include:
- The exact question/message you sent
- The response you received (or error message)
- Your user data context (what workouts/games/practices/meals you have logged)
- Any console errors or logs
- Steps to reproduce the issue

