import { AppHeader } from "./_components/ui";
import { CreatePollForm } from "./create-poll-form";

export default function Home() {
  return (
    <>
      <AppHeader label="新しい日程調整" />
      <CreatePollForm />
    </>
  );
}
