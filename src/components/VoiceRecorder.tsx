import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
        setAudioChunks([]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak now, tap stop when finished",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice recording",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Send to transcription API
      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: base64 }),
      });

      if (!response.ok) throw new Error('Transcription failed');

      const { text } = await response.json();
      
      if (text.trim()) {
        onTranscription(text.trim());
        toast({
          title: "Voice transcribed",
          description: "Your speech has been converted to text",
        });
      } else {
        toast({
          title: "No speech detected",
          description: "Please try speaking more clearly",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Transcription failed",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder, isRecording]);

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={isProcessing}
          variant="outline"
          size="sm"
          className="hover:bg-primary hover:text-primary-foreground"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <Button
          onClick={stopRecording}
          variant="destructive"
          size="sm"
          className="animate-pulse"
        >
          <Square className="h-4 w-4" />
        </Button>
      )}
      
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          Recording...
        </div>
      )}
    </div>
  );
};