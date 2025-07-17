import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageCircle, FolderTree, Terminal, Brain, LogIn } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[var(--bg-card)] border-gray-700">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-[var(--text-primary)]">
            LocalAgent LLM
          </CardTitle>
          <p className="text-[var(--text-muted)] mt-2">
            Your intelligent AI assistant for development, automation, and productivity
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span>Interactive chat with local AI models</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <FolderTree className="w-5 h-5 text-primary" />
              <span>File workspace management</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Terminal className="w-5 h-5 text-primary" />
              <span>Command execution tools</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Brain className="w-5 h-5 text-primary" />
              <span>Persistent conversation memory</span>
            </div>
          </div>
          
          <Button 
            className="w-full bg-primary hover:bg-primary/80 text-white"
            onClick={() => window.location.href = "/api/login"}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Get Started
          </Button>
          
          <p className="text-xs text-[var(--text-muted)] text-center">
            Sign in with your Replit account to continue
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
