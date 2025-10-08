import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Heart, QrCode, Phone } from 'lucide-react';
import siiviLogo from '@/assets/siivi-logo-chatgpt-style.png';

export const DonationPage = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-purple-500/10">
      <Card className="w-full max-w-2xl shadow-2xl fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={siiviLogo} alt="Siivi Logo" className="h-20 w-20 rounded-full glow" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Support Siivi Development
          </CardTitle>
          <CardDescription className="text-lg">
            Your contribution helps us build a better AI assistant for everyone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <Heart className="h-12 w-12 text-red-500 mx-auto animate-pulse" />
            <p className="text-muted-foreground">
              Siivi is built with passion by LazyDev. Your support means the world to us and helps keep this project alive and growing.
            </p>
          </div>

          <div className="space-y-4">
            <Card className="bg-gradient-bg border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Scan QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src="/lovable-uploads/21880cad-fd57-4513-b86a-e7e391bf677c.png" 
                    alt="UPI QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-bg border-primary/20 hover:glow transition-all">
              <CardHeader>
                <CardTitle>UPI ID</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-full">
                  <code className="text-sm font-mono">lazydev963@axl</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('lazydev963@axl', 'UPI ID')}
                    className="rounded-full"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-bg border-primary/20 hover:glow transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Mobile Number
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-full">
                  <code className="text-sm font-mono">+91 9638562787</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard('+919638562787', 'Mobile number')}
                    className="rounded-full"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Every contribution, no matter how small, makes a huge difference. Thank you for being part of our journey! 🚀
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
