import UserFilesDisplay from "../tools/UserFilesDisplay";

export default function CommandUserFiles() {
  return (
    <div className="flex flex-col neumorphic rounded-xl p-6 h-full overflow-y-auto scrollbar-thin">
      <UserFilesDisplay />
    </div>
  );
}
