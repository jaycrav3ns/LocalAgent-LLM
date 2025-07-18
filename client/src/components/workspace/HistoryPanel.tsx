import React from "react";
import { useWorkspaceHistory } from "../../hooks/useWorkspaces";

export function HistoryPanel({ workspaceId }: { workspaceId: string }) {
  const { data: history } = useWorkspaceHistory(workspaceId);

  return (
    <div>
      <h3>Workspace History</h3>
      <ul style={{ maxHeight: "200px", overflowY: "auto" }}>
        {history?.map((item: any) => (
          <li key={item.id}>
            <em>{item.eventType}</em> @ {item.timestamp}: {JSON.stringify(item.data)}
          </li>
        ))}
      </ul>
    </div>
  );
}
