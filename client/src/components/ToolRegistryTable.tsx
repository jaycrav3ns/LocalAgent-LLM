import React, { useState, useEffect } from "react";
import axios from "axios";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface ToolEntry {
  name: string;
  description: string;
  
  enabled: boolean;
  path?: string;
  lastUsed?: string;
  allowedUsers?: string[]; // usernames or roles
}

interface Props {
  onEdit: (tool: ToolEntry) => void;
  onDelete: (tool: ToolEntry) => void;
}

export const ToolRegistryTable: React.FC<Props> = ({
  onEdit,
  onDelete,
}) => {
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (tool: ToolEntry) => {
    try {
      await axios.put(`/api/tools/${tool.name}/enabled`, { enabled: !tool.enabled });
      setTools(tools.map(t => t.name === tool.name ? { ...t, enabled: !t.enabled } : t));
    } catch (err: any) {
      console.error("Failed to toggle tool:", err);
    }
  };

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await axios.get("/api/tools");
        if (Array.isArray(response.data)) {
          setTools(response.data);
        } else {
          setError("Received unexpected data format from /tools API.");
          console.error("Unexpected data from /tools:", response.data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch tools.");
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500"><i className="fas fa-exclamation-triangle text-4xl mb-4"></i><p>Error: {error}</p></div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left py-3 px-2 text-[var(--text-muted)]">Enabled</th>
            <th className="text-left py-3 px-2 text-[var(--text-muted)]">Name</th>
            <th className="text-left py-3 px-2 text-[var(--text-muted)]">Description</th>
            
            <th className="text-left py-3 px-2 text-[var(--text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(tools) && tools.map((tool) => (
            <tr key={tool.name} className="border-b border-gray-700 hover:bg-gray-800/50">
              <td className="py-3 px-2">
                <Switch
                  checked={tool.enabled}
                  onCheckedChange={() => handleToggle(tool)}
                />
              </td>
              <td className="py-3 px-2 font-medium text-[var(--text-primary)]">{tool.name}</td>
              <td className="py-3 px-2 text-[var(--text-muted)] max-w-sm truncate">{tool.description}</td>
              
              <td className="py-3 px-2">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(tool)}><i className="fas fa-pencil-alt"></i></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(tool)} className="text-red-500 hover:text-red-400"><i className="fas fa-trash"></i></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
