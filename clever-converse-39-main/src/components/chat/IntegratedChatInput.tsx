import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Image, 
  Mic, 
  Sparkles, 
  Paperclip,
  Smile,
  MoreHorizontal,
  FileText,
  Clock,
  Heart,
  Brain
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IntegratedChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageAnalyze: () => void;
  onImageGenerate: () => void;
  onVoiceRecord: (text: string) => void;
  onCommandSelect: (command: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const IntegratedChatInput = ({
  value,
  onChange,
  onSend,
  onImageAnalyze,
  onImageGenerate,
  onVoiceRecord,
  onCommandSelect,
  loading,
  disabled
}: IntegratedChatInputProps) => {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCommands, setShowCommands] = useState(false);

  const commands = [
    { icon: FileText, label: '/summarize', description: 'Summarize text or document' },
    { icon: Clock, label: '/translate', description: 'Translate to another language' },
    { icon: Brain, label: '/plan', description: 'Create a plan or outline' },
    { icon: Heart, label: '/mood', description: 'Log your current mood' },
    { icon: Sparkles, label: '/remind', description: 'Set a reminder' },
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Detect slash commands
  useEffect(() => {
    setShowCommands(value.startsWith('/'));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
    if (e.key === 'Escape') {
      setShowCommands(false);
    }
  };

  const handleCommandSelect = (command: string) => {
    onChange(command + ' ');
    setShowCommands(false);
    onCommandSelect(command);
    textareaRef.current?.focus();
  };

  return (
    <TooltipProvider>
      <div className="relative border border-input rounded-2xl bg-background shadow-lg focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
        {/* Command suggestions */}
        {showCommands && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-2 animate-fade-in">
            <div className="text-xs text-muted-foreground px-2 py-1 font-medium">Quick Commands</div>
            {commands.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => handleCommandSelect(cmd.label)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                <cmd.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <div>
                  <div className="text-sm font-medium">{cmd.label}</div>
                  <div className="text-xs text-muted-foreground">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 p-2">
          {/* Attach button - mobile priority */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                onClick={onImageAnalyze}
                disabled={disabled}
                aria-label="Analyze image"
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Analyze image</TooltipContent>
          </Tooltip>

          {/* Textarea with inline controls */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Siivi... (Try /summarize)"
              className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-32 min-h-[44px] max-h-[200px] bg-transparent"
              rows={1}
              disabled={disabled || loading}
              aria-label="Chat message input"
            />
            
            {/* Inline action buttons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* Voice button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={disabled}
                    aria-label="Voice input"
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Voice input</TooltipContent>
              </Tooltip>

              {/* Image generate */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onImageGenerate}
                    disabled={!value.trim() || disabled}
                    aria-label="Generate image"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Generate image</TooltipContent>
              </Tooltip>

              {/* Overflow menu for secondary actions */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        disabled={disabled}
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">More options</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleCommandSelect('/summarize')}>
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                    Summarize
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCommandSelect('/translate')}>
                    <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                    Translate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCommandSelect('/plan')}>
                    <Brain className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create Plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleCommandSelect('/mood')}>
                    <Heart className="h-4 w-4 mr-2" aria-hidden="true" />
                    Log Mood
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCommandSelect('/remind')}>
                    <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                    Set Reminder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={onSend}
                    disabled={!value.trim() || loading || disabled}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Send (Enter)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Screen reader instructions */}
        <div className="sr-only" aria-live="polite">
          Press Enter to send, Shift+Enter for new line, Escape to close menus
        </div>
      </div>
    </TooltipProvider>
  );
};