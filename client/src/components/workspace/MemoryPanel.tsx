import React, { useState } from "react";
import { useWorkspaceMemory, useAddMemory } from "../../hooks/useWorkspaces";

export function MemoryPanel({ workspaceId }: { workspaceId: string }) {
  const { data: memory } = useWorkspaceMemory(workspaceId);
  const addMemory = useAddMemory(workspaceId);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  return (
    <div>
      <h3>Workspace Memory</h3>
      <ul>
        {memory?.map((item: any) => (
          <li key={item.id}>
            <strong>{item.key}:</strong> {JSON.stringify(item.value)}
          </li>
        ))}
      </ul>
      <form onSubmit={e => {
        e.preventDefault();
        if (!key || !value) return;
        addMemory.mutate({ key, value });
        setKey("");
        setValue("");
      }}>
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="Key" />
        <input value={value} onChange={e => setValue(e.target.value)} placeholder="Value" />
        <button type="submit">Add Memory</button>
      </form>
    </div>
  );
}
