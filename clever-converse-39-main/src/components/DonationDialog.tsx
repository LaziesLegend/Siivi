import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, X, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Using the uploaded QR code directly from uploads
const donationQR = '/lovable-uploads/21880cad-fd57-4513-b86a-e7e391bf677c.png';

interface DonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationDialog = ({ isOpen, onClose }: DonationDialogProps) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <Heart className="h-5 w-5 text-red-500" />
            Support Siivi
          </DialogTitle>
          <DialogDescription>
            Help us keep Siivi free and improve our AI assistance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-2 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="mb-3">
                <img 
                  src={donationQR} 
                  alt="Donation QR Code" 
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Scan the QR code above with your UPI app to donate
              </p>
              <div className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold">trio UPI</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">UPI ID</p>
                <p className="text-xs text-muted-foreground">siivi@upi</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard('siivi@upi', 'UPI ID')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Mobile</p>
                <p className="text-xs text-muted-foreground">+91 9876543210</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard('+91 9876543210', 'Mobile number')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>Your support helps us maintain servers and improve AI models</p>
            <p className="mt-1">Thank you for being part of the Siivi community! 💙</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={onClose} className="flex-1">
              <Heart className="h-4 w-4 mr-2" />
              Thanks!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};