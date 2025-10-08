import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse slash commands
const parseCommand = (message: string) => {
  const commandMatch = message.match(/^\/(\w+)\s*(.*)/);
  if (!commandMatch) return null;
  
  return {
    command: commandMatch[1],
    args: commandMatch[2].trim(),
  };
};

// Build system prompt based on personality
const buildSystemPrompt = (personality: string = 'casual') => {
  const basePrompt = 'You are Siivi, a helpful AI assistant that can generate text, write code, solve problems, and create detailed explanations. When writing code, ALWAYS use proper markdown code blocks with language specification like ```javascript, ```python, ```html, etc. Format your responses with markdown for better readability. Use **bold** for emphasis, lists for organization, and code blocks with syntax highlighting.';
  
  const personalities = {
    funny: basePrompt + ' Use humor, emojis, and witty responses. Keep things light and entertaining.',
    professional: basePrompt + ' Use formal language, be concise and direct. Focus on accuracy and efficiency.',
    casual: basePrompt + ' Be friendly and conversational. Use a relaxed, approachable tone.',
    motivational: basePrompt + ' Be encouraging and inspiring. Help users achieve their goals with positivity.',
  };
  
  return personalities[personality as keyof typeof personalities] || personalities.casual;
};

// Handle commands
const handleCommand = (command: string, args: string) => {
  switch (command) {
    case 'summarize':
      return `Please provide a concise summary of: ${args}`;
    case 'translate':
      return `Please translate the following to the target language: ${args}`;
    case 'plan':
      return `Please create a detailed plan or outline for: ${args}`;
    case 'mood':
      return `I'd like to log my mood. ${args}`;
    case 'remind':
      return `Please help me set a reminder: ${args}`;
    default:
      return args;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = 'text', prompt, personality = 'casual' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle image generation
    if (type === 'image') {
      if (!prompt) {
        throw new Error('Prompt is required for image generation');
      }

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errorText = await response.text();
        console.error('Image generation error:', response.status, errorText);
        throw new Error(`Image generation failed: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      return new Response(JSON.stringify({ 
        imageUrl,
        message: data.choices?.[0]?.message?.content || 'Image generated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle text generation
    if (type === 'text') {
      console.log('Generating text response with personality:', personality);
      
      // Check for commands in last message
      const lastMessage = messages[messages.length - 1];
      const command = parseCommand(lastMessage.content);
      
      let processedMessages = [...messages];
      if (command) {
        console.log('Processing command:', command.command);
        processedMessages[processedMessages.length - 1] = {
          ...lastMessage,
          content: handleCommand(command.command, command.args),
        };
      }
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: buildSystemPrompt(personality)
            },
            ...processedMessages
          ],
        }),
      });

      if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});