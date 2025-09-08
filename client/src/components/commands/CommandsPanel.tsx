import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommandTerminal from "./CommandTerminal";
import CommandUserFiles from "./CommandUserFiles";
import CommandSchedule from "./CommandSchedule";

export default function CommandsPanel() {
  return (
    <Tabs defaultValue="terminal" className="h-full flex flex-col flex-1 min-h-0 bg-[var(--muted)] mb-0">
      <TabsList className="grid w-full grid-cols-3 mt-1">
        <TabsTrigger value="terminal">
        <h6 className="text-med flex items-center text-[var(--text-primary)]">
          <i className="fas fa-terminal text-green-400 mr-3"></i>
          Terminal
        </h6>
			</TabsTrigger>
        <TabsTrigger value="user-files">
        <h6 className="text-med flex items-center text-[var(--text-primary)]">
					<i className="fas fa-folder text-yellow-300 mr-3"></i>
          User Files
        </h6>
			</TabsTrigger>
        <TabsTrigger value="schedule">
        <h6 className="text-med flex items-center text-[var(--text-primary)]">
          <i className="fas fa-clock text-orange-300 mr-3"></i>
          Schedule
        </h6>
			</TabsTrigger>
      </TabsList>

      <TabsContent value="terminal" className="flex-grow border-t border-gray-600 mt-1 min-h-0">
        <CommandTerminal />
      </TabsContent>

      <TabsContent value="user-files" className="flex-grow border-t border-gray-600 mt-1 min-h-0">
        <CommandUserFiles />
      </TabsContent>
      
      <TabsContent value="schedule" className="flex-grow border-t border-gray-600 mt-1 min-h-0">
        <CommandSchedule />
      </TabsContent>
    </Tabs>
  );
}
