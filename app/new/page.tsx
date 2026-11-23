import type { Metadata } from "next";
import { AppHeader } from "../_components/ui";
import { CreatePollForm } from "./create-poll-form";

export const metadata: Metadata = { title: "新しい日程調整" };

export default function NewPollPage() {
  return (
    <>
      <AppHeader label="新しい日程調整" />
      <CreatePollForm />
    </>
  );
}
