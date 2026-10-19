import { MessageCircle, Send, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappUrl, telegramUrl } from "@/lib/share";

interface ShareButtonsProps {
  sessionUrl: string;
  placeName?: string;
  onCopied?: () => void;
  compact?: boolean;
}

export function ShareButtons({ sessionUrl, placeName, onCopied, compact }: ShareButtonsProps) {
  const open = (url: string) => window.open(url, "_blank", "noopener");

  const copy = async () => {
    await navigator.clipboard.writeText(sessionUrl);
    onCopied?.();
  };

  if (compact) {
    return (
      <div className="flex gap-1.5">
        <Button
          size="icon"
          variant="outline"
          aria-label="Share on WhatsApp"
          onClick={() => open(whatsappUrl(sessionUrl, placeName))}
        >
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Share on Telegram"
          onClick={() => open(telegramUrl(sessionUrl, placeName))}
        >
          <Send className="w-4 h-4 text-[#229ED9]" />
        </Button>
        <Button size="icon" variant="outline" aria-label="Copy link" onClick={copy}>
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="outline"
        onClick={() => open(whatsappUrl(sessionUrl, placeName))}
        className="font-display"
      >
        <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" /> WhatsApp
      </Button>
      <Button
        variant="outline"
        onClick={() => open(telegramUrl(sessionUrl, placeName))}
        className="font-display"
      >
        <Send className="w-4 h-4 mr-2 text-[#229ED9]" /> Telegram
      </Button>
      <Button variant="outline" onClick={copy} className="font-display">
        <Copy className="w-4 h-4 mr-2" /> Copy Link
      </Button>
    </div>
  );
}
