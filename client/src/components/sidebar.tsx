import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

interface SidebarProps {
  user: User;
  activeTab: 'chat' | 'workspace' | 'tools';
  onTabChange: (tab: 'chat' | 'workspace' | 'tools') => void;
  onShowUsernameModal: () => void;
  onShowModelModal: () => void;
  onShowHelp: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

export default function Sidebar({ 
  user, 
  activeTab, 
  onTabChange, 
  onShowUsernameModal, 
  onShowModelModal, 
  onShowHelp,
  onLogout,
  isLoggingOut 
}: SidebarProps) {
  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email || "User";
  };

  return (
    <div className="icon-bar">
      {/* User Profile Section */}
      <div className="sidebar-item">
        <div 
          className="user-avatar"
          onClick={onShowUsernameModal}
          title={`Welcome, ${getDisplayName()}`}
        >
          <span>{getUserInitials()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sidebar-item">
        <Button
          variant="ghost"
          className="sidebar-icon-btn"
          title="New Chat"
        >
          <i className="fas fa-plus"></i>
        </Button>
      </div>
      
      <div className="sidebar-item">
        <Button
          variant="ghost"
          className="sidebar-icon-btn"
          title="Save Session"
        >
          <i className="fas fa-save"></i>
        </Button>
      </div>
      
      <div className="sidebar-item">
        <Button
          variant="ghost"
          className="sidebar-icon-btn"
          title="Download Chat"
        >
          <i className="fas fa-download"></i>
        </Button>
      </div>

      <div className="sidebar-item">
        <Button
          variant="ghost"
          className="sidebar-icon-btn"
          title="Chat History"
        >
          <i className="fas fa-history"></i>
        </Button>
      </div>

      {/* Spacer */}
      <div style={{ margin: '0.7em 0' }}></div>

      {/* Settings & Model Selection */}
      <div className="sidebar-item">
        <Button
          variant="ghost"
          className="sidebar-icon-btn"
          onClick={onShowModelModal}
          title={`Model: ${user.preferences?.currentModel || "deepseek-r1:latest"}`}
        >
          <i className="fas fa-microchip"></i>
        </Button>
      </div>
      
      <div className="sidebar-item">
        <Button
          variant="ghost"
          className="sidebar-icon-btn"
          onClick={onShowHelp}
          title="Settings & Help"
        >
          <i className="fas fa-gear"></i>
        </Button>
      </div>
    </div>
  );
}
