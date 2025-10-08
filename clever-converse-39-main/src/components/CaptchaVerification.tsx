import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield } from 'lucide-react';

interface CaptchaVerificationProps {
  isOpen: boolean;
  onVerify: (token: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export const CaptchaVerification = ({ 
  isOpen, 
  onVerify, 
  onCancel, 
  title = "Human Verification Required",
  description = "Please complete the verification to continue" 
}: CaptchaVerificationProps) => {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Note: In production, you would get this from environment variables
  // For demo purposes, using test site key (works on localhost)
  const RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleVerify = () => {
    if (captchaToken) {
      onVerify(captchaToken);
      setCaptchaToken(null);
      recaptchaRef.current?.reset();
    }
  };

  const handleCancel = () => {
    setCaptchaToken(null);
    recaptchaRef.current?.reset();
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={RECAPTCHA_SITE_KEY}
            onChange={handleCaptchaChange}
            theme="light"
          />
          
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={!captchaToken}
              className="flex-1"
            >
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};